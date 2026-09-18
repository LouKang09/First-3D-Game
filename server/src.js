import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)');
  next();
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true },
  maxHttpBufferSize: 200000
});

const players = new Map();
const friendships = new Set();
const friendRequests = new Map();
const roommateRequests = new Map();
const parties = new Map();

let nextHome = 0;
let nextPartyId = 1;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const pairKey = (a, b) => [a, b].sort().join(':');
const listFor = (map, id) => Array.from(map.get(id) || []);

function safeName(value) {
  return String(value || 'Guest')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 18) || 'Guest';
}

const VALID_OUTFITS = new Set(['sky', 'berry', 'mint', 'street', 'sunrise']);

function safeGender(value) {
  return value === 'male' ? 'male' : 'female';
}

function safeOutfit(value) {
  const outfit = String(value || '');
  return VALID_OUTFITS.has(outfit) ? outfit : 'sky';
}

function publicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    gender: player.gender,
    outfit: player.outfit,
    x: player.x,
    y: player.y,
    z: player.z,
    rot: player.rot,
    moving: player.moving,
    sprinting: Boolean(player.sprinting),
    homeId: player.homeId,
    residenceHomeId: player.residenceHomeId,
    partyId: player.partyId || null
  };
}

function friendIds(id) {
  return Array.from(players.keys()).filter((other) =>
    other !== id && friendships.has(pairKey(id, other))
  );
}

function stateFor(id) {
  const player = players.get(id);
  if (!player) return null;

  const party = player.partyId ? parties.get(player.partyId) : null;

  return {
    self: publicPlayer(player),
    friends: friendIds(id)
      .filter((friendId) => players.has(friendId))
      .map((friendId) => publicPlayer(players.get(friendId))),
    incomingRequests: listFor(friendRequests, id)
      .filter((fromId) => players.has(fromId))
      .map((fromId) => publicPlayer(players.get(fromId))),
    incomingRoommateRequests: listFor(roommateRequests, id)
      .filter((fromId) => players.has(fromId))
      .map((fromId) => publicPlayer(players.get(fromId))),
    party: party
      ? {
          id: party.id,
          leaderId: party.leaderId,
          members: Array.from(party.members)
            .filter((memberId) => players.has(memberId))
            .map((memberId) => publicPlayer(players.get(memberId))),
          invites: Array.from(party.invites)
        }
      : null
  };
}

function emitSocial(ids = Array.from(players.keys())) {
  for (const id of ids) {
    const state = stateFor(id);
    if (state) io.to(id).emit('social:state', state);
  }
}

function setFor(map, id) {
  if (!map.has(id)) map.set(id, new Set());
  return map.get(id);
}

function leaveParty(id) {
  const player = players.get(id);
  if (!player || !player.partyId) return;

  const party = parties.get(player.partyId);
  player.partyId = null;

  if (!party) return;

  party.members.delete(id);
  party.invites.delete(id);

  if (party.members.size === 0) {
    parties.delete(party.id);
    return;
  }

  if (party.leaderId === id) {
    party.leaderId = Array.from(party.members)[0];
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, players: players.size, parties: parties.size });
});

app.get('/voice-config', (_req, res) => {
  const iceServers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
  ];

  const turnUrls = String(process.env.TURN_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (turnUrls.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    iceServers.push({
      urls: turnUrls,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL
    });
  }

  res.setHeader('Cache-Control', 'no-store');
  res.json({ iceServers });
});

io.on('connection', (socket) => {
  socket.on('player:join', (payload = {}) => {
    if (players.has(socket.id)) return;

    const homeId = nextHome++ % 12;
    const player = {
      id: socket.id,
      name: safeName(payload.name),
      gender: safeGender(payload.gender),
      outfit: safeOutfit(payload.outfit),
      x: 0,
      y: 0,
      z: 10 + (homeId % 3) * 2,
      rot: Math.PI,
      moving: false,
      sprinting: false,
      homeId,
      residenceHomeId: homeId,
      partyId: null
    };

    players.set(socket.id, player);

    socket.emit('world:init', {
      selfId: socket.id,
      players: Array.from(players.values()).map(publicPlayer),
      homeCount: 12
    });

    socket.broadcast.emit('player:joined', publicPlayer(player));
    emitSocial();
  });

  socket.on('player:update', (data = {}) => {
    const player = players.get(socket.id);
    if (!player) return;

    player.x = clamp(Number(data.x) || 0, -100000, 100000);
    player.y = clamp(Number(data.y) || 0, -2, 8);
    player.z = clamp(Number(data.z) || 0, -100000, 100000);
    player.rot = clamp(Number(data.rot) || 0, -Math.PI * 8, Math.PI * 8);
    player.moving = Boolean(data.moving);
    player.sprinting = player.moving && Boolean(data.sprinting);

    socket.broadcast.volatile.emit('player:update', publicPlayer(player));
  });

  socket.on('combat:punch', (targetId) => {
    const attacker = players.get(socket.id);
    const target = players.get(targetId);

    if (!attacker || !target || targetId === socket.id) return;

    const distance = Math.hypot(attacker.x - target.x, attacker.z - target.z);
    if (distance > 3.4) return;

    io.emit('combat:punch', {
      attackerId: socket.id,
      targetId
    });
  });

  socket.on('friend:request', (targetId) => {
    if (
      !players.has(targetId) ||
      targetId === socket.id ||
      friendships.has(pairKey(socket.id, targetId))
    ) return;

    setFor(friendRequests, targetId).add(socket.id);
    emitSocial([socket.id, targetId]);

    const sender = players.get(socket.id);
    io.to(targetId).emit(
      'toast',
      (sender ? sender.name : 'Someone') + ' sent you a friend request.'
    );
  });

  socket.on('friend:respond', (payload = {}) => {
    const requests = friendRequests.get(socket.id);
    const fromId = payload.fromId;

    if (!requests || !requests.has(fromId)) return;
    requests.delete(fromId);

    if (payload.accept && players.has(fromId)) {
      friendships.add(pairKey(socket.id, fromId));
      const acceptingPlayer = players.get(socket.id);
      io.to(fromId).emit(
        'toast',
        (acceptingPlayer ? acceptingPlayer.name : 'A player') +
          ' accepted your friend request.'
      );
    }

    emitSocial([socket.id, fromId]);
  });

  socket.on('roommate:request', (targetId) => {
    if (
      !players.has(targetId) ||
      !friendships.has(pairKey(socket.id, targetId))
    ) return;

    setFor(roommateRequests, targetId).add(socket.id);
    emitSocial([socket.id, targetId]);

    const sender = players.get(socket.id);
    io.to(targetId).emit(
      'toast',
      (sender ? sender.name : 'A friend') + ' invited you to live together.'
    );
  });

  socket.on('roommate:respond', (payload = {}) => {
    const requests = roommateRequests.get(socket.id);
    const fromId = payload.fromId;

    if (!requests || !requests.has(fromId)) return;
    requests.delete(fromId);

    const host = players.get(fromId);
    const guest = players.get(socket.id);

    if (
      payload.accept &&
      host &&
      guest &&
      friendships.has(pairKey(socket.id, fromId))
    ) {
      guest.residenceHomeId = host.residenceHomeId;
      io.to(fromId).emit('toast', guest.name + ' now lives at your home.');
      socket.emit('toast', 'You now live with ' + host.name + '.');
    }

    emitSocial([socket.id, fromId]);
  });

  socket.on('party:create', () => {
    const player = players.get(socket.id);
    if (!player || player.partyId) return;

    const id = 'party-' + nextPartyId++;
    parties.set(id, {
      id,
      leaderId: socket.id,
      members: new Set([socket.id]),
      invites: new Set()
    });

    player.partyId = id;
    emitSocial();
  });

  socket.on('party:invite', (targetId) => {
    const player = players.get(socket.id);
    const target = players.get(targetId);

    if (
      !player ||
      !player.partyId ||
      !target ||
      !friendships.has(pairKey(socket.id, targetId))
    ) return;

    const party = parties.get(player.partyId);
    if (!party || party.leaderId !== socket.id) return;

    party.invites.add(targetId);
    io.to(targetId).emit('party:invite', {
      partyId: party.id,
      from: publicPlayer(player)
    });

    emitSocial([socket.id]);
  });

  socket.on('party:accept', (partyId) => {
    const player = players.get(socket.id);
    const party = parties.get(partyId);

    if (!player || !party || !party.invites.has(socket.id)) return;

    leaveParty(socket.id);
    party.invites.delete(socket.id);
    party.members.add(socket.id);
    player.partyId = party.id;

    emitSocial();
  });

  socket.on('party:leave', () => {
    leaveParty(socket.id);
    emitSocial();
  });

  socket.on('voice:ready', () => {
    const player = players.get(socket.id);
    if (!player || !player.partyId) return;

    const party = parties.get(player.partyId);
    if (!party) return;

    for (const memberId of party.members) {
      if (memberId !== socket.id) {
        io.to(memberId).emit('voice:ready', { fromId: socket.id });
      }
    }
  });

  socket.on('voice:ready:ack', (payload = {}) => {
    const player = players.get(socket.id);
    const target = players.get(payload.targetId);

    if (
      !player ||
      !player.partyId ||
      !target ||
      target.partyId !== player.partyId
    ) return;

    io.to(payload.targetId).emit('voice:ready:ack', { fromId: socket.id });
  });

  socket.on('voice:pcm', (pcm) => {
    const player = players.get(socket.id);
    if (!player || !player.partyId) return;

    const party = parties.get(player.partyId);
    if (!party) return;

    if (typeof pcm !== 'string' || !pcm.length || pcm.length > 40000) return;
    if (!/^[A-Za-z0-9+/=]+$/.test(pcm)) return;

    for (const memberId of party.members) {
      if (memberId !== socket.id) {
        io.to(memberId).emit('voice:pcm', {
          fromId: socket.id,
          pcm
        });
      }
    }
  });

  socket.on('voice:signal', (payload = {}) => {
    const player = players.get(socket.id);
    const target = players.get(payload.targetId);

    if (
      !player ||
      !player.partyId ||
      !target ||
      target.partyId !== player.partyId
    ) return;

    io.to(payload.targetId).emit('voice:signal', {
      fromId: socket.id,
      description: payload.description || null,
      candidate: payload.candidate || null
    });
  });

  socket.on('disconnect', () => {
    if (!players.has(socket.id)) return;

    leaveParty(socket.id);
    players.delete(socket.id);

    friendRequests.delete(socket.id);
    roommateRequests.delete(socket.id);

    for (const requests of friendRequests.values()) requests.delete(socket.id);
    for (const requests of roommateRequests.values()) requests.delete(socket.id);
    for (const party of parties.values()) party.invites.delete(socket.id);

    socket.broadcast.emit('player:left', socket.id);
    emitSocial();
  });
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../client/dist');

app.use(express.static(dist, { maxAge: '1h' }));
app.get('*path', (req, res, next) => {
  if (req.path.startsWith('/socket.io')) return next();

  res.sendFile(path.join(dist, 'index.html'), (error) => {
    if (error) next(error);
  });
});

const PORT = Number(process.env.PORT || 3001);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('Haven server listening on port ' + PORT);
});
