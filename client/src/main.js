import './style.css';
import * as THREE from 'three';
import { io } from 'socket.io-client';

const app = document.querySelector('#app');

app.innerHTML = [
  '<div id="game">',
    '<div id="world"></div>',
    '<div id="join" class="overlay">',
      '<form id="join-form" class="join-card glass">',
        '<div class="mark">H</div>',
        '<p class="eyebrow">MULTIPLAYER SOCIAL WORLD</p>',
        '<h1>HAVEN</h1>',
        '<p class="lead">A virtual neighborhood where friends can hang out, visit homes, live together and talk privately in parties.</p>',
        '<label for="name">Display name</label>',
        '<input id="name" maxlength="18" autocomplete="nickname" value="Guest" />',
        '<span class="label">Avatar color</span>',
        '<div id="swatches" class="swatches"></div>',
        '<button class="primary" type="submit">Enter Haven</button>',
        '<p class="fine">WASD to move · Shift to run · Drag to look · E to interact</p>',
      '</form>',
    '</div>',
    '<div id="hud" class="hidden">',
      '<div class="topbar">',
        '<div class="brand glass"><span class="brand-dot"></span><div><strong>HAVEN</strong><small id="online">1 online</small></div></div>',
        '<div class="top-actions">',
          '<button id="home-btn" class="round glass" title="Go home">⌂</button>',
          '<button id="social-btn" class="round glass" title="Social">☻</button>',
          '<button id="voice-btn" class="round glass" title="Party voice" disabled>♬</button>',
        '</div>',
      '</div>',
      '<div id="status" class="status glass"><strong id="status-name">Guest</strong><span id="status-home">Home #1</span><div class="keys"><kbd>WASD</kbd> move <kbd>Shift</kbd> run <kbd>E</kbd> interact</div></div>',
      '<div id="prompt" class="prompt glass"><kbd>E</kbd><span id="prompt-text">Interact</span></div>',
      '<div class="minimap glass"><canvas id="map" width="250" height="250"></canvas><span>NEIGHBORHOOD</span></div>',
      '<aside id="social" class="social glass">',
        '<header><div><small>SOCIAL</small><h2>Friends & Party</h2></div><button id="close-social">×</button></header>',
        '<div class="tabs"><button data-tab="nearby" class="active">Nearby</button><button data-tab="friends">Friends</button><button data-tab="party">Party</button></div>',
        '<div id="social-body" class="social-body"></div>',
      '</aside>',
      '<div id="party-invite" class="invite glass hidden"><strong>Party invitation</strong><span id="invite-copy"></span><div><button id="join-party" class="small primary">Join</button><button id="dismiss-party" class="small">Not now</button></div></div>',
      '<div id="toasts"></div>',
      '<div id="mobile-controls">',
        '<div id="joystick" class="joystick"><div id="stick"></div></div>',
        '<div id="lookpad" class="lookpad"></div>',
        '<button id="mobile-e" class="mobile-e">E</button>',
      '</div>',
    '</div>',
  '</div>'
].join('');

const socket = io({ transports: ['websocket', 'polling'] });

const COLORS = ['#7c3aed', '#2563eb', '#0f9f87', '#f97316', '#e11d48', '#d4a72c', '#6b7280'];
let selectedColor = COLORS[0];
let selfId = null;
let joined = false;
let me = null;
let socialState = null;
let currentTab = 'nearby';
let pendingPartyInvite = null;
let lastNetworkSend = 0;
let voiceEnabled = false;
let localStream = null;
let joystick = { x: 0, y: 0 };

const remotePlayers = new Map();
const peers = new Map();

const worldEl = document.querySelector('#world');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
worldEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8d8f0);
scene.fog = new THREE.Fog(0xa8d8f0, 70, 165);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 240);
const clock = new THREE.Clock();

scene.add(new THREE.HemisphereLight(0xe9f7ff, 0x4b6249, 1.9));
const sun = new THREE.DirectionalLight(0xffefd4, 3.1);
sun.position.set(-35, 60, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -90;
sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90;
sun.shadow.camera.bottom = -90;
scene.add(sun);

const world = new THREE.Group();
scene.add(world);

function material(color, roughness = 0.9) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function cube(w, h, d, color, x, y, z, parent = world) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const grass = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), material(0x86b77a, 1));
grass.rotation.x = -Math.PI / 2;
grass.receiveShadow = true;
world.add(grass);

cube(18, 0.08, 150, 0x4c5360, 0, 0.04, 0);
cube(150, 0.08, 18, 0x4c5360, 0, 0.045, 0);
cube(2.2, 0.14, 150, 0xd7d3ca, -10.2, 0.07, 0);
cube(2.2, 0.14, 150, 0xd7d3ca, 10.2, 0.07, 0);
cube(150, 0.14, 2.2, 0xd7d3ca, 0, 0.071, -10.2);
cube(150, 0.14, 2.2, 0xd7d3ca, 0, 0.071, 10.2);

const stripeMat = material(0xf5e9ba, 0.8);
for (let z = -68; z <= 68; z += 8) cube(0.24, 0.1, 3.2, 0xf5e9ba, 0, 0.1, z);
for (let x = -68; x <= 68; x += 8) cube(3.2, 0.1, 0.24, 0xf5e9ba, x, 0.101, 0);

const homePositions = [
  [-43, -48], [-23, -48], [24, -48], [44, -48],
  [-43, -25], [-24, -24], [25, -24], [45, -25],
  [-44, 26], [-24, 26], [25, 48], [45, 48]
];

const homeGroups = [];

function makeTextSprite(text, fg = '#ffffff', bg = 'rgba(17,24,39,.82)') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.roundRect(12, 18, 488, 92, 28);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = '700 42px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(5.3, 1.32, 1);
  return sprite;
}

function makeHouse(index, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const palette = [0xf2c8ae, 0xc6d7ed, 0xdac7ed, 0xc8dfcb, 0xead6aa, 0xd7c6ba];
  cube(12, 6.6, 9.5, palette[index % palette.length], 0, 3.3, 0, group);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.3, 4.4, 4), material(0x594943));
  roof.position.y = 8.1;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);
  cube(2.3, 4.1, 0.35, 0x6b4d3b, 0, 2.05, 4.9, group);
  cube(2.3, 1.8, 0.25, 0xbde3f2, -3.6, 3.8, 4.94, group);
  cube(2.3, 1.8, 0.25, 0xbde3f2, 3.6, 3.8, 4.94, group);
  cube(5.8, 0.35, 3.5, 0xa8a29e, 0, 0.18, 6.1, group);
  const sign = makeTextSprite('HOME ' + (index + 1), '#ffffff', 'rgba(32,37,47,.86)');
  sign.position.set(0, 10.8, 0);
  group.add(sign);
  world.add(group);
  homeGroups[index] = group;
}

homePositions.forEach((p, i) => makeHouse(i, p[0], p[1]));

function makeTree(x, z, scale = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.5 * scale, 3.2 * scale, 9), material(0x765135));
  trunk.position.y = 1.6 * scale;
  trunk.castShadow = true;
  g.add(trunk);
  const leafMat = material(0x397746, 1);
  [[0, 3.7, 0, 1.7], [-0.9, 3.3, 0.2, 1.1], [0.9, 3.3, -0.2, 1.15]].forEach((v) => {
    const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(v[3] * scale), leafMat);
    leaf.position.set(v[0] * scale, v[1] * scale, v[2] * scale);
    leaf.castShadow = true;
    g.add(leaf);
  });
  g.position.set(x, 0, z);
  world.add(g);
}

[
  [-60, -58], [-60, -12], [-62, 34], [-36, 45], [-15, 58],
  [14, 34], [36, 25], [61, 15], [61, -35], [33, -61],
  [-31, -65], [16, -28], [-16, 28]
].forEach((p, i) => makeTree(p[0], p[1], 0.9 + (i % 3) * 0.08));

const park = new THREE.Mesh(new THREE.CircleGeometry(16, 48), material(0x6ca86d));
park.rotation.x = -Math.PI / 2;
park.position.set(30, 0.08, 29);
park.receiveShadow = true;
world.add(park);

const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5, 0.8, 36), material(0xb8c1ca, 0.7));
fountainBase.position.set(30, 0.45, 29);
fountainBase.receiveShadow = true;
world.add(fountainBase);

const fountainWater = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.18, 36), new THREE.MeshStandardMaterial({ color: 0x58b8d8, roughness: 0.2, metalness: 0.05 }));
fountainWater.position.set(30, 0.88, 29);
world.add(fountainWater);

const fountainStem = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.1, 3.4, 22), material(0xc8cfd5, 0.7));
fountainStem.position.set(30, 2.1, 29);
fountainStem.castShadow = true;
world.add(fountainStem);

function createAvatar(data, local = false) {
  const g = new THREE.Group();
  const bodyMat = material(data.color || '#7c3aed', 0.65);
  const skinMat = material(0xf2c6a0, 0.75);
  const darkMat = material(0x2c3441, 0.8);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 1.25, 5, 10), bodyMat);
  torso.position.y = 2.05;
  torso.castShadow = true;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 14), skinMat);
  head.position.y = 3.65;
  head.castShadow = true;
  g.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.48), darkMat);
  hair.position.y = 3.93;
  hair.castShadow = true;
  g.add(hair);

  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.85, 3, 7), darkMat);
  const legR = legL.clone();
  legL.position.set(-0.3, 0.75, 0);
  legR.position.set(0.3, 0.75, 0);
  legL.castShadow = legR.castShadow = true;
  g.add(legL, legR);

  const name = makeTextSprite(data.name || 'Player');
  name.position.y = 5.2;
  name.scale.set(3.8, 0.95, 1);
  g.add(name);

  g.position.set(data.x || 0, 0, data.z || 0);
  g.rotation.y = data.rot || Math.PI;
  g.userData = {
    legL,
    legR,
    moving: false,
    target: new THREE.Vector3(data.x || 0, 0, data.z || 0),
    targetRot: data.rot || Math.PI,
    local
  };
  scene.add(g);
  return g;
}

let cameraYaw = Math.PI;
let cameraPitch = 0.34;
let cameraDistance = 8.5;
const keys = new Set();

function lerpAngle(a, b, t) {
  let d = (b - a + Math.PI) % (Math.PI * 2) - Math.PI;
  return a + d * t;
}

function updateLocal(delta) {
  if (!me) return;

  let forward = 0;
  let strafe = 0;

  if (keys.has('KeyW')) forward += 1;
  if (keys.has('KeyS')) forward -= 1;
  if (keys.has('KeyD')) strafe += 1;
  if (keys.has('KeyA')) strafe -= 1;

  forward += -joystick.y;
  strafe += joystick.x;

  const length = Math.hypot(forward, strafe);
  const moving = length > 0.08;

  if (moving) {
    forward /= Math.max(length, 1);
    strafe /= Math.max(length, 1);

    const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const speed = run ? 9.5 : 5.6;
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);

    const dx = (strafe * cos + forward * sin) * speed * delta;
    const dz = (forward * cos - strafe * sin) * speed * delta;

    me.position.x = THREE.MathUtils.clamp(me.position.x + dx, -82, 82);
    me.position.z = THREE.MathUtils.clamp(me.position.z + dz, -82, 82);

    const targetRot = Math.atan2(dx, dz);
    me.rotation.y = lerpAngle(me.rotation.y, targetRot, Math.min(1, delta * 12));
  }

  me.userData.moving = moving;
}

function updateAvatarAnimation(group, time, delta) {
  const moving = group.userData.moving;
  const amp = moving ? 0.55 : 0.04;
  const speed = moving ? 9 : 2;
  group.userData.legL.rotation.x = Math.sin(time * speed) * amp;
  group.userData.legR.rotation.x = -Math.sin(time * speed) * amp;
  const base = moving ? Math.abs(Math.sin(time * speed * 2)) * 0.04 : 0;
  group.position.y = THREE.MathUtils.lerp(group.position.y, base, Math.min(1, delta * 12));
}

function updateCamera(delta) {
  if (!me) return;
  const target = me.position.clone().add(new THREE.Vector3(0, 2.6, 0));
  const cp = Math.cos(cameraPitch);
  const offset = new THREE.Vector3(
    Math.sin(cameraYaw) * cp,
    Math.sin(cameraPitch),
    Math.cos(cameraYaw) * cp
  ).multiplyScalar(cameraDistance);

  const desired = target.clone().add(offset);
  camera.position.lerp(desired, 1 - Math.pow(0.0004, delta));
  camera.lookAt(target);
}

function updateRemote(delta, time) {
  for (const remote of remotePlayers.values()) {
    remote.mesh.position.lerp(remote.mesh.userData.target, Math.min(1, delta * 9));
    remote.mesh.rotation.y = lerpAngle(remote.mesh.rotation.y, remote.mesh.userData.targetRot, Math.min(1, delta * 10));
    remote.mesh.userData.moving = Boolean(remote.data.moving);
    updateAvatarAnimation(remote.mesh, time, delta);
  }
}

function nearestHouse() {
  if (!me) return null;
  let best = null;
  homePositions.forEach((p, index) => {
    const d = Math.hypot(me.position.x - p[0], me.position.z - p[1]);
    if (d < 8 && (!best || d < best.distance)) best = { homeId: index, distance: d };
  });
  return best;
}

function visitHouse(homeId) {
  if (!me || !homePositions[homeId]) return;
  const p = homePositions[homeId];
  me.position.set(p[0], 0, p[1] + 7.6);
  toast('Visiting Home #' + (homeId + 1) + '. Interiors are coming in the next milestone.');
}

document.addEventListener('keydown', (event) => {
  if (!joined) return;
  keys.add(event.code);
  if (event.code === 'KeyE') {
    const h = nearestHouse();
    if (h) visitHouse(h.homeId);
  }
});

document.addEventListener('keyup', (event) => keys.delete(event.code));

let dragging = false;
let lastPointer = null;

renderer.domElement.addEventListener('pointerdown', (event) => {
  dragging = true;
  lastPointer = { x: event.clientX, y: event.clientY };
  renderer.domElement.setPointerCapture(event.pointerId);
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!dragging || !lastPointer) return;
  cameraYaw -= (event.clientX - lastPointer.x) * 0.005;
  cameraPitch = THREE.MathUtils.clamp(cameraPitch + (event.clientY - lastPointer.y) * 0.004, 0.08, 0.75);
  lastPointer = { x: event.clientX, y: event.clientY };
});

renderer.domElement.addEventListener('pointerup', () => {
  dragging = false;
  lastPointer = null;
});

renderer.domElement.addEventListener('wheel', (event) => {
  cameraDistance = THREE.MathUtils.clamp(cameraDistance + Math.sign(event.deltaY) * 0.8, 5.2, 13);
}, { passive: true });

const swatches = document.querySelector('#swatches');
COLORS.forEach((color, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'swatch' + (index === 0 ? ' selected' : '');
  button.style.background = color;
  button.setAttribute('aria-label', 'Choose avatar color');
  button.addEventListener('click', () => {
    selectedColor = color;
    swatches.querySelectorAll('.swatch').forEach((item) => item.classList.remove('selected'));
    button.classList.add('selected');
  });
  swatches.appendChild(button);
});

document.querySelector('#join-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (joined) return;
  const name = document.querySelector('#name').value.trim() || 'Guest';
  socket.emit('player:join', { name, color: selectedColor });
});

function showHud() {
  document.querySelector('#join').classList.add('hidden');
  document.querySelector('#hud').classList.remove('hidden');
}

function addRemote(data) {
  if (!data || data.id === selfId || remotePlayers.has(data.id)) return;
  const mesh = createAvatar(data, false);
  mesh.userData.target.set(data.x || 0, 0, data.z || 0);
  mesh.userData.targetRot = data.rot || 0;
  remotePlayers.set(data.id, { mesh, data });
}

function toast(message, actions = []) {
  const host = document.querySelector('#toasts');
  const card = document.createElement('div');
  card.className = 'toast glass';
  const text = document.createElement('span');
  text.textContent = message;
  card.appendChild(text);

  if (actions.length) {
    const wrap = document.createElement('div');
    wrap.className = 'toast-actions';
    actions.forEach((action) => {
      const button = document.createElement('button');
      button.textContent = action.label;
      button.className = action.primary ? 'small primary' : 'small';
      button.addEventListener('click', () => {
        action.run();
        card.remove();
      });
      wrap.appendChild(button);
    });
    card.appendChild(wrap);
  }

  host.appendChild(card);
  window.setTimeout(() => card.remove(), actions.length ? 12000 : 4200);
}

function updateHud() {
  if (!socialState) return;
  document.querySelector('#status-name').textContent = socialState.self.name;
  document.querySelector('#status-home').textContent = 'Residence · Home #' + (socialState.self.residenceHomeId + 1);
  const total = remotePlayers.size + 1;
  document.querySelector('#online').textContent = total + (total === 1 ? ' online' : ' online');
  const voiceButton = document.querySelector('#voice-btn');
  voiceButton.disabled = !socialState.party;
  voiceButton.title = socialState.party ? 'Party voice' : 'Join a party to enable voice';
}

function isFriend(id) {
  return Boolean(socialState && socialState.friends.some((friend) => friend.id === id));
}

function makePersonCard(player, mode) {
  const card = document.createElement('div');
  card.className = 'person';

  const avatar = document.createElement('span');
  avatar.className = 'person-avatar';
  avatar.style.background = player.color;

  const copy = document.createElement('div');
  copy.className = 'person-copy';
  const name = document.createElement('strong');
  name.textContent = player.name;
  const meta = document.createElement('small');
  meta.textContent = mode === 'friend' ? 'Friend · Home #' + (player.residenceHomeId + 1) : 'Online now';
  copy.append(name, meta);

  const actions = document.createElement('div');
  actions.className = 'person-actions';

  if (mode === 'nearby') {
    const add = document.createElement('button');
    add.className = 'small primary';
    add.textContent = isFriend(player.id) ? 'Friends' : 'Add';
    add.disabled = isFriend(player.id);
    add.addEventListener('click', () => socket.emit('friend:request', player.id));
    actions.appendChild(add);
  }

  if (mode === 'friend') {
    const live = document.createElement('button');
    live.className = 'small';
    live.textContent = 'Live together';
    live.addEventListener('click', () => socket.emit('roommate:request', player.id));
    actions.appendChild(live);

    if (socialState.party && socialState.party.leaderId === selfId && !socialState.party.members.some((m) => m.id === player.id)) {
      const invite = document.createElement('button');
      invite.className = 'small primary';
      invite.textContent = 'Party invite';
      invite.addEventListener('click', () => socket.emit('party:invite', player.id));
      actions.appendChild(invite);
    }
  }

  card.append(avatar, copy, actions);
  return card;
}

function sectionTitle(text) {
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = text;
  return title;
}

function empty(text) {
  const node = document.createElement('div');
  node.className = 'empty';
  node.textContent = text;
  return node;
}

function renderSocial() {
  const body = document.querySelector('#social-body');
  body.innerHTML = '';

  if (!socialState) {
    body.appendChild(empty('Connecting to social services…'));
    return;
  }

  if (socialState.incomingRequests.length) {
    body.appendChild(sectionTitle('Friend requests'));
    socialState.incomingRequests.forEach((player) => {
      const card = makePersonCard(player, 'request');
      const actions = card.querySelector('.person-actions');
      const accept = document.createElement('button');
      accept.className = 'small primary';
      accept.textContent = 'Accept';
      accept.addEventListener('click', () => socket.emit('friend:respond', { fromId: player.id, accept: true }));
      const reject = document.createElement('button');
      reject.className = 'small';
      reject.textContent = 'Decline';
      reject.addEventListener('click', () => socket.emit('friend:respond', { fromId: player.id, accept: false }));
      actions.append(accept, reject);
      body.appendChild(card);
    });
  }

  if (socialState.incomingRoommateRequests.length) {
    body.appendChild(sectionTitle('Live together invitations'));
    socialState.incomingRoommateRequests.forEach((player) => {
      const card = makePersonCard(player, 'request');
      const actions = card.querySelector('.person-actions');
      const accept = document.createElement('button');
      accept.className = 'small primary';
      accept.textContent = 'Move in';
      accept.addEventListener('click', () => socket.emit('roommate:respond', { fromId: player.id, accept: true }));
      const reject = document.createElement('button');
      reject.className = 'small';
      reject.textContent = 'Decline';
      reject.addEventListener('click', () => socket.emit('roommate:respond', { fromId: player.id, accept: false }));
      actions.append(accept, reject);
      body.appendChild(card);
    });
  }

  if (currentTab === 'nearby') {
    body.appendChild(sectionTitle('Players online'));
    const players = Array.from(remotePlayers.values()).map((value) => value.data);
    if (!players.length) body.appendChild(empty('You have the neighborhood to yourself right now.'));
    players.forEach((player) => body.appendChild(makePersonCard(player, 'nearby')));
  }

  if (currentTab === 'friends') {
    body.appendChild(sectionTitle('Your friends'));
    if (!socialState.friends.length) body.appendChild(empty('Add someone nearby. Once they accept, you can invite them to live with you.'));
    socialState.friends.forEach((player) => body.appendChild(makePersonCard(player, 'friend')));
  }

  if (currentTab === 'party') {
    if (!socialState.party) {
      const intro = document.createElement('div');
      intro.className = 'party-empty';
      intro.innerHTML = '<div class="party-icon">♬</div><h3>Private party</h3><p>Create a party, invite friends, then enable voice chat. Only party members can connect to the party voice channel.</p>';
      const create = document.createElement('button');
      create.className = 'primary';
      create.textContent = 'Create party';
      create.addEventListener('click', () => socket.emit('party:create'));
      intro.appendChild(create);
      body.appendChild(intro);
    } else {
      const heading = document.createElement('div');
      heading.className = 'party-head';
      const title = document.createElement('div');
      title.innerHTML = '<small>YOUR PARTY</small><strong>' + socialState.party.members.length + ' member(s)</strong>';
      const leave = document.createElement('button');
      leave.className = 'small danger';
      leave.textContent = 'Leave';
      leave.addEventListener('click', () => socket.emit('party:leave'));
      heading.append(title, leave);
      body.appendChild(heading);

      socialState.party.members.forEach((member) => {
        const card = makePersonCard(member, 'request');
        const meta = card.querySelector('.person-copy small');
        meta.textContent = member.id === socialState.party.leaderId ? 'Party leader' : 'Party member';
        body.appendChild(card);
      });

      const voiceNote = document.createElement('div');
      voiceNote.className = 'voice-note';
      voiceNote.textContent = voiceEnabled ? 'Party voice is active. Your microphone is shared only with current party peers.' : 'Use the music-note button above to enable party voice.';
      body.appendChild(voiceNote);
    }
  }
}

document.querySelector('#social-btn').addEventListener('click', () => {
  document.querySelector('#social').classList.toggle('open');
  renderSocial();
});

document.querySelector('#close-social').addEventListener('click', () => {
  document.querySelector('#social').classList.remove('open');
});

document.querySelectorAll('.tabs button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    currentTab = button.dataset.tab;
    renderSocial();
  });
});

document.querySelector('#home-btn').addEventListener('click', () => {
  if (!me || !socialState) return;
  const homeId = socialState.self.residenceHomeId;
  const p = homePositions[homeId];
  me.position.set(p[0], 0, p[1] + 8);
  toast('Welcome home.');
});

async function toggleVoice() {
  if (voiceEnabled) {
    stopVoice();
    return;
  }

  if (!socialState || !socialState.party) {
    toast('Create or join a party first.');
    return;
  }

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false
    });
    voiceEnabled = true;
    document.querySelector('#voice-btn').classList.add('active');
    toast('Party voice is on.');
    await syncVoicePeers();
    renderSocial();
  } catch (error) {
    toast('Microphone access was not granted.');
  }
}

function stopVoice() {
  voiceEnabled = false;
  if (localStream) localStream.getTracks().forEach((track) => track.stop());
  localStream = null;
  peers.forEach((pc) => pc.close());
  peers.clear();
  document.querySelectorAll('audio[data-peer]').forEach((audio) => audio.remove());
  document.querySelector('#voice-btn').classList.remove('active');
  toast('Party voice is off.');
  renderSocial();
}

async function createPeer(peerId, initiator) {
  if (!localStream || peers.has(peerId)) return peers.get(peerId);

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  peers.set(peerId, pc);
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  pc.onicecandidate = (event) => {
    if (event.candidate) socket.emit('voice:signal', { targetId: peerId, candidate: event.candidate });
  };

  pc.ontrack = (event) => {
    let audio = document.querySelector('audio[data-peer="' + peerId + '"]');
    if (!audio) {
      audio = document.createElement('audio');
      audio.dataset.peer = peerId;
      audio.autoplay = true;
      audio.playsInline = true;
      document.body.appendChild(audio);
    }
    audio.srcObject = event.streams[0];
  };

  pc.onconnectionstatechange = () => {
    if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
      pc.close();
      peers.delete(peerId);
      const audio = document.querySelector('audio[data-peer="' + peerId + '"]');
      if (audio) audio.remove();
    }
  };

  if (initiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('voice:signal', { targetId: peerId, description: pc.localDescription });
  }

  return pc;
}

async function syncVoicePeers() {
  if (!voiceEnabled || !socialState || !socialState.party) return;

  const memberIds = socialState.party.members.map((member) => member.id).filter((id) => id !== selfId);

  for (const id of memberIds) {
    if (!peers.has(id) && String(selfId) < String(id)) await createPeer(id, true);
  }

  for (const [id, pc] of peers) {
    if (!memberIds.includes(id)) {
      pc.close();
      peers.delete(id);
      const audio = document.querySelector('audio[data-peer="' + id + '"]');
      if (audio) audio.remove();
    }
  }
}

document.querySelector('#voice-btn').addEventListener('click', toggleVoice);

socket.on('voice:signal', async (payload) => {
  if (!voiceEnabled || !socialState || !socialState.party) return;
  if (!socialState.party.members.some((member) => member.id === payload.fromId)) return;

  let pc = peers.get(payload.fromId);
  if (!pc) pc = await createPeer(payload.fromId, false);
  if (!pc) return;

  try {
    if (payload.description) {
      await pc.setRemoteDescription(payload.description);
      if (payload.description.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice:signal', { targetId: payload.fromId, description: pc.localDescription });
      }
    } else if (payload.candidate) {
      await pc.addIceCandidate(payload.candidate);
    }
  } catch (error) {
    console.warn('Voice signaling error', error);
  }
});

socket.on('world:init', (data) => {
  selfId = data.selfId;
  const mine = data.players.find((player) => player.id === selfId);
  if (!mine) return;

  me = createAvatar(mine, true);
  data.players.forEach(addRemote);
  joined = true;
  showHud();
  toast('Welcome to Haven. Your house is marked on the minimap.');
});

socket.on('player:joined', (player) => {
  addRemote(player);
  updateHud();
  toast(player.name + ' joined the neighborhood.');
  renderSocial();
});

socket.on('player:update', (player) => {
  let remote = remotePlayers.get(player.id);
  if (!remote) {
    addRemote(player);
    remote = remotePlayers.get(player.id);
  }
  if (!remote) return;

  remote.data = player;
  remote.mesh.userData.target.set(player.x, 0, player.z);
  remote.mesh.userData.targetRot = player.rot;
  remote.mesh.userData.moving = Boolean(player.moving);
});

socket.on('player:left', (id) => {
  const remote = remotePlayers.get(id);
  if (remote) {
    scene.remove(remote.mesh);
    remotePlayers.delete(id);
  }
  updateHud();
  renderSocial();
});

socket.on('social:state', (state) => {
  socialState = state;
  if (voiceEnabled && !state.party) stopVoice();
  updateHud();
  renderSocial();
  syncVoicePeers();
});

socket.on('toast', (message) => toast(message));

socket.on('party:invite', (invite) => {
  pendingPartyInvite = invite;
  document.querySelector('#invite-copy').textContent = invite.from.name + ' invited you to a private party.';
  document.querySelector('#party-invite').classList.remove('hidden');
});

document.querySelector('#join-party').addEventListener('click', () => {
  if (pendingPartyInvite) socket.emit('party:accept', pendingPartyInvite.partyId);
  pendingPartyInvite = null;
  document.querySelector('#party-invite').classList.add('hidden');
});

document.querySelector('#dismiss-party').addEventListener('click', () => {
  pendingPartyInvite = null;
  document.querySelector('#party-invite').classList.add('hidden');
});

const map = document.querySelector('#map');
const mapCtx = map.getContext('2d');

function drawMinimap() {
  if (!joined || !me) return;
  const w = map.width;
  const h = map.height;
  const scale = w / 180;

  mapCtx.clearRect(0, 0, w, h);
  mapCtx.fillStyle = '#25334a';
  mapCtx.fillRect(0, 0, w, h);

  mapCtx.fillStyle = '#5a6370';
  mapCtx.fillRect(w / 2 - 9 * scale, 0, 18 * scale, h);
  mapCtx.fillRect(0, h / 2 - 9 * scale, w, 18 * scale);

  mapCtx.fillStyle = '#7da373';
  homePositions.forEach((p) => {
    mapCtx.fillRect(w / 2 + p[0] * scale - 5, h / 2 + p[1] * scale - 4, 10, 8);
  });

  if (socialState) {
    const home = homePositions[socialState.self.residenceHomeId];
    if (home) {
      mapCtx.strokeStyle = '#ffffff';
      mapCtx.lineWidth = 2;
      mapCtx.strokeRect(w / 2 + home[0] * scale - 7, h / 2 + home[1] * scale - 6, 14, 12);
    }
  }

  remotePlayers.forEach((remote) => {
    mapCtx.beginPath();
    mapCtx.fillStyle = remote.data.color || '#d1d5db';
    mapCtx.arc(w / 2 + remote.mesh.position.x * scale, h / 2 + remote.mesh.position.z * scale, 4, 0, Math.PI * 2);
    mapCtx.fill();
  });

  mapCtx.save();
  mapCtx.translate(w / 2 + me.position.x * scale, h / 2 + me.position.z * scale);
  mapCtx.rotate(-me.rotation.y);
  mapCtx.fillStyle = '#ffffff';
  mapCtx.beginPath();
  mapCtx.moveTo(0, -8);
  mapCtx.lineTo(6, 7);
  mapCtx.lineTo(-6, 7);
  mapCtx.closePath();
  mapCtx.fill();
  mapCtx.restore();
}

const joystickEl = document.querySelector('#joystick');
const stickEl = document.querySelector('#stick');
let joyPointer = null;

function updateJoystick(event) {
  const rect = joystickEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = event.clientX - cx;
  let dy = event.clientY - cy;
  const radius = rect.width * 0.31;
  const length = Math.hypot(dx, dy);
  if (length > radius) {
    dx = dx / length * radius;
    dy = dy / length * radius;
  }
  joystick.x = dx / radius;
  joystick.y = dy / radius;
  stickEl.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
}

joystickEl.addEventListener('pointerdown', (event) => {
  joyPointer = event.pointerId;
  joystickEl.setPointerCapture(event.pointerId);
  updateJoystick(event);
});

joystickEl.addEventListener('pointermove', (event) => {
  if (event.pointerId === joyPointer) updateJoystick(event);
});

function resetJoystick() {
  joyPointer = null;
  joystick.x = 0;
  joystick.y = 0;
  stickEl.style.transform = 'translate(0,0)';
}

joystickEl.addEventListener('pointerup', resetJoystick);
joystickEl.addEventListener('pointercancel', resetJoystick);

const lookpad = document.querySelector('#lookpad');
let lookPointer = null;
let lookPoint = null;

lookpad.addEventListener('pointerdown', (event) => {
  lookPointer = event.pointerId;
  lookPoint = { x: event.clientX, y: event.clientY };
  lookpad.setPointerCapture(event.pointerId);
});

lookpad.addEventListener('pointermove', (event) => {
  if (event.pointerId !== lookPointer || !lookPoint) return;
  cameraYaw -= (event.clientX - lookPoint.x) * 0.006;
  cameraPitch = THREE.MathUtils.clamp(cameraPitch + (event.clientY - lookPoint.y) * 0.004, 0.08, 0.75);
  lookPoint = { x: event.clientX, y: event.clientY };
});

lookpad.addEventListener('pointerup', () => {
  lookPointer = null;
  lookPoint = null;
});

document.querySelector('#mobile-e').addEventListener('click', () => {
  const h = nearestHouse();
  if (h) visitHouse(h.homeId);
});

function updatePrompt() {
  const prompt = document.querySelector('#prompt');
  const nearest = nearestHouse();
  if (nearest) {
    prompt.classList.add('show');
    document.querySelector('#prompt-text').textContent = 'Visit Home #' + (nearest.homeId + 1);
  } else {
    prompt.classList.remove('show');
  }
}

let previous = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const delta = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  const time = now / 1000;

  if (joined && me) {
    updateLocal(delta);
    updateRemote(delta, time);
    updateAvatarAnimation(me, time, delta);
    updateCamera(delta);
    updatePrompt();
    drawMinimap();

    if (now - lastNetworkSend > 50) {
      socket.volatile.emit('player:update', {
        x: me.position.x,
        y: 0,
        z: me.position.z,
        rot: me.rotation.y,
        moving: me.userData.moving
      });
      lastNetworkSend = now;
    }
  } else {
    camera.position.set(18, 16, 22);
    camera.lookAt(0, 2, 0);
  }

  fountainWater.position.y = 0.88 + Math.sin(time * 2.2) * 0.03;
  renderer.render(scene, camera);
}

requestAnimationFrame(frame);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
