# First-3D-Game — Haven

Haven is a browser-based third-person multiplayer social hangout prototype.

## Current prototype

- 3D shared neighborhood built with Three.js
- Third-person walking/running and follow camera
- Desktop and touch controls
- Real-time multiplayer synchronization with Socket.IO
- Individual player houses and home teleport
- Friend requests and acceptance
- Friends-only "live together" invitations
- Private party creation and invitations
- Party-only WebRTC voice signaling
- Minimap, online player list and social panel
- Responsive phone/tablet layout
- Railway-ready production build

## Important prototype limitation

Accounts, friendships, residences and parties currently live in server memory. A server restart resets them. This is intentional for the prototype stage. Persistence should be added with PostgreSQL/Prisma after the gameplay direction is approved.

The current voice layer uses peer-to-peer WebRTC with a public STUN server. For reliable production voice across restrictive networks, add TURN or an SFU service.

## Local development

Node.js 20+ is recommended.

```bash
npm install
npm run dev
```

Then open:

```
http://localhost:5173
```

## Production

The repository includes a Railway configuration. Railway builds the Vite client and serves the generated files from the Express/Socket.IO server.

Health endpoint:

```
/health
```

## Security notes

The repository intentionally ignores environment files, credentials, private keys, cloud/deployment credentials, local databases, runtime uploads, dependency directories, build output, caches, logs and editor/OS metadata.

Never commit real secrets. Configure future secrets through Railway environment variables.
