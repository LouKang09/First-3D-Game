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
        '<div class="creator-grid">',
          '<div>',
            '<span class="label">Gender</span>',
            '<div id="gender-options" class="gender-options">',
              '<button type="button" class="gender-choice selected" data-gender="female"><span>♀</span>Female</button>',
              '<button type="button" class="gender-choice" data-gender="male"><span>♂</span>Male</button>',
            '</div>',
          '</div>',
          '<div>',
            '<span class="label">Outfit</span>',
            '<div id="outfit-options" class="outfit-options"></div>',
          '</div>',
        '</div>',
        '<div class="avatar-note"><strong>Chibi style</strong><span>Big head · expressive eyes · compact proportions</span></div>',
        '<button class="primary" type="submit">Enter Haven</button>',
        '<p class="fine">WASD to move · Shift to run · Drag to look · E to interact</p>',
      '</form>',
    '</div>',
    '<div id="hud" class="hidden">',
      '<div class="topbar">',
        '<div class="brand glass"><span class="brand-dot"></span><div><strong>HAVEN</strong><small id="online">1 online</small></div></div>',
        '<div class="top-actions">',
          '<button id="zoom-out-btn" class="round glass zoom-control" title="Zoom out">−</button>',
          '<button id="zoom-in-btn" class="round glass zoom-control" title="Zoom in">+</button>',
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
        '<div id="joystick" class="joystick" aria-label="Movement joystick"><span class="joystick-label">MOVE</span><div id="stick"></div></div>',
        '<div id="lookpad" class="lookpad"></div>',
        '<button id="mobile-e" class="mobile-e">E</button>',
      '</div>',
    '</div>',
  '</div>'
].join('');

const socket = io({ transports: ['websocket', 'polling'] });

const OUTFITS = {
  sky: {
    id: 'sky', name: 'Sky Day', top: '#78a9e8', top2: '#e9f3ff',
    bottom: '#314763', accent: '#f5c76e', shoes: '#ffffff', hair: '#3a2b2a'
  },
  berry: {
    id: 'berry', name: 'Berry Pop', top: '#b768a4', top2: '#f1c5df',
    bottom: '#6b3c6c', accent: '#f8df71', shoes: '#fff2f7', hair: '#39282b'
  },
  mint: {
    id: 'mint', name: 'Mint Club', top: '#58a993', top2: '#d8f0e8',
    bottom: '#2e4c53', accent: '#f1b85b', shoes: '#f2f7f5', hair: '#302724'
  },
  street: {
    id: 'street', name: 'Street', top: '#343a49', top2: '#71798a',
    bottom: '#1f2937', accent: '#e45858', shoes: '#f2f2f2', hair: '#201b1c'
  },
  sunrise: {
    id: 'sunrise', name: 'Sunrise', top: '#e99868', top2: '#ffe0b5',
    bottom: '#6d5547', accent: '#68a6b8', shoes: '#fff7ec', hair: '#51352d'
  }
};
let selectedGender = 'female';
let selectedOutfit = 'sky';
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
renderer.toneMappingExposure = 1.12;
worldEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb7def3);
scene.fog = new THREE.FogExp2(0xb7def3, 0.0082);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 520);
const clock = new THREE.Clock();

scene.add(new THREE.HemisphereLight(0xf4fbff, 0x52684c, 2.15));
const sun = new THREE.DirectionalLight(0xfff0d8, 3.35);
sun.position.set(-42, 68, 34);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -92;
sun.shadow.camera.right = 92;
sun.shadow.camera.top = 92;
sun.shadow.camera.bottom = -92;
sun.shadow.bias = -0.00015;
scene.add(sun);

const world = new THREE.Group();
scene.add(world);

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(220, 32, 18),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x72b6e8) },
      horizonColor: { value: new THREE.Color(0xdaf0fb) },
      sunColor: { value: new THREE.Color(0xffe8b6) }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPosition;
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 sunColor;
      void main() {
        float h = normalize(vWorldPosition).y;
        float mixValue = smoothstep(-0.12, 0.72, h);
        vec3 color = mix(horizonColor, topColor, mixValue);
        float glow = pow(max(0.0, dot(normalize(vWorldPosition), normalize(vec3(-0.45, 0.55, 0.55)))), 12.0);
        color = mix(color, sunColor, glow * 0.22);
        gl_FragColor = vec4(color, 1.0);
      }
    `
  })
);
scene.add(sky);

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

// Raised curbs visually separate walkable sidewalks from the road.
cube(0.32, 0.28, 150, 0xb9b5ad, -9.05, 0.14, 0);
cube(0.32, 0.28, 150, 0xb9b5ad, 9.05, 0.14, 0);
cube(150, 0.28, 0.32, 0xb9b5ad, 0, 0.14, -9.05);
cube(150, 0.28, 0.32, 0xb9b5ad, 0, 0.14, 9.05);

for (let z = -68; z <= 68; z += 8) cube(0.24, 0.1, 3.2, 0xf5e9ba, 0, 0.1, z);
for (let x = -68; x <= 68; x += 8) cube(3.2, 0.1, 0.24, 0xf5e9ba, x, 0.101, 0);

// Crosswalks make the central intersection feel like a designed town center.
for (let i = -3; i <= 3; i += 1) {
  cube(1.1, 0.11, 4.6, 0xf5f4ef, i * 2.1, 0.12, -7.1);
  cube(4.6, 0.11, 1.1, 0xf5f4ef, 7.1, 0.12, i * 2.1);
}

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

  const palette = [0xf3c8b1, 0xc7d9ed, 0xdcc9eb, 0xc7dfcb, 0xecd8aa, 0xd9c7ba];
  const trim = 0xf7f4eb;
  const roofColors = [0x654b43, 0x49566a, 0x5a4b6d, 0x4c5b4c];
  const wallColor = palette[index % palette.length];

  // Foundation, home volume and porch.
  cube(12.8, 0.45, 10.3, 0xbab5ac, 0, 0.23, 0, group);
  cube(12, 6.6, 9.5, wallColor, 0, 3.55, 0, group);
  cube(6.8, 0.35, 4.1, 0xb7b1a8, 0, 0.2, 6.0, group);
  cube(7.2, 0.25, 0.4, 0xf5f1e8, 0, 4.9, 5.05, group);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.3, 4.4, 4), material(roofColors[index % roofColors.length], 0.82));
  roof.position.y = 8.35;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  // Door, inset frame and porch awning.
  cube(2.35, 4.15, 0.32, 0x704d39, 0, 2.28, 4.9, group);
  cube(2.78, 0.22, 0.42, trim, 0, 4.43, 4.95, group);
  cube(0.2, 4.45, 0.42, trim, -1.29, 2.3, 4.95, group);
  cube(0.2, 4.45, 0.42, trim, 1.29, 2.3, 4.95, group);
  cube(4.2, 0.24, 2.25, roofColors[index % roofColors.length], 0, 5.3, 5.55, group);
  cube(0.18, 2.0, 0.18, 0xf5f1e8, -1.75, 4.35, 6.0, group);
  cube(0.18, 2.0, 0.18, 0xf5f1e8, 1.75, 4.35, 6.0, group);

  // Window glass + trim gives the facade depth.
  [-3.65, 3.65].forEach((wx) => {
    cube(2.65, 2.25, 0.22, trim, wx, 3.75, 4.93, group);
    cube(2.25, 1.85, 0.25, 0x9fd9ec, wx, 3.75, 5.05, group);
    cube(0.11, 1.85, 0.28, trim, wx, 3.75, 5.19, group);
    cube(2.25, 0.11, 0.28, trim, wx, 3.75, 5.2, group);
  });

  // Chimney, hedges and a front path.
  cube(1.1, 3.2, 1.1, 0x82675b, 3.5, 8.8, -1.6, group);
  cube(2.8, 0.85, 1.0, 0x4f7d4d, -4.25, 0.55, 5.45, group);
  cube(2.8, 0.85, 1.0, 0x4f7d4d, 4.25, 0.55, 5.45, group);
  cube(2.1, 0.12, 5.2, 0xd4cec3, 0, 0.1, 9.4, group);

  const porchLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xfff1b8, emissive: 0xffc75d, emissiveIntensity: 1.3 })
  );
  porchLight.position.set(1.75, 4.15, 5.18);
  group.add(porchLight);

  const sign = makeTextSprite('HOME ' + (index + 1), '#ffffff', 'rgba(32,37,47,.86)');
  sign.position.set(0, 11.1, 0);
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

function makeShrub(x, z, scale = 1, color = 0x4e8a50) {
  const shrub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85 * scale, 0), material(color, 1));
  shrub.scale.y = 0.72;
  shrub.position.set(x, 0.58 * scale, z);
  shrub.castShadow = true;
  world.add(shrub);
}

function makeLamp(x, z) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 4.5, 10), material(0x3f4853, 0.72));
  pole.position.y = 2.25;
  pole.castShadow = true;
  g.add(pole);

  const arm = cube(0.95, 0.1, 0.1, 0x3f4853, 0.38, 4.45, 0, g);
  arm.castShadow = true;

  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 12, 9),
    new THREE.MeshStandardMaterial({ color: 0xffefbd, emissive: 0xffd36a, emissiveIntensity: 1.35 })
  );
  lamp.position.set(0.82, 4.28, 0);
  g.add(lamp);
  g.position.set(x, 0, z);
  world.add(g);
}

function makeBench(x, z, rot = 0) {
  const g = new THREE.Group();
  cube(3.0, 0.2, 0.75, 0x8a6147, 0, 1.0, 0, g);
  cube(3.0, 1.0, 0.18, 0x8a6147, 0, 1.55, -0.34, g);
  cube(0.16, 1.05, 0.16, 0x404750, -1.1, 0.5, 0, g);
  cube(0.16, 1.05, 0.16, 0x404750, 1.1, 0.5, 0, g);
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  world.add(g);
}

[
  [-12, -36], [12, -36], [-12, 36], [12, 36],
  [-36, -12], [-36, 12], [36, -12], [36, 12]
].forEach((p) => makeLamp(p[0], p[1]));

[
  [-55, 2], [-52, 6], [-53, 10], [-18, 45], [-13, 45],
  [17, -44], [22, -44], [57, 3], [55, 8], [41, 37]
].forEach((p, i) => makeShrub(p[0], p[1], 0.85 + (i % 3) * 0.12, i % 4 === 0 ? 0x6b9250 : 0x4e8a50));

makeBench(23, 19, 0.25);
makeBench(38, 32, -1.15);
makeBench(26, 41, Math.PI);
makeBench(-14, 17, Math.PI / 2);

// Distant low-poly town silhouettes add depth without expensive assets.
for (let i = 0; i < 20; i += 1) {
  const side = i % 4;
  const offset = -72 + (i % 5) * 35;
  const height = 9 + (i % 4) * 4;
  if (side === 0) cube(16, height, 12, 0x8ca0a9, offset, height / 2, -88);
  if (side === 1) cube(16, height, 12, 0x8a9aa3, offset, height / 2, 88);
  if (side === 2) cube(12, height, 16, 0x93a2aa, -88, height / 2, offset);
  if (side === 3) cube(12, height, 16, 0x879aa3, 88, height / 2, offset);
}

const clouds = [];
function makeCloud(x, y, z, scale = 1) {
  const g = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.74, depthWrite: false });
  [[0, 0, 0, 2.0], [2.1, 0.2, 0.1, 1.55], [-2.0, -0.05, 0.2, 1.45], [0.7, 0.65, 0, 1.6]].forEach((v) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(v[3] * scale, 14, 10), cloudMat);
    puff.position.set(v[0] * scale, v[1] * scale, v[2] * scale);
    g.add(puff);
  });
  g.position.set(x, y, z);
  scene.add(g);
  clouds.push(g);
}
makeCloud(-48, 34, -44, 1.5);
makeCloud(22, 39, -68, 1.25);
makeCloud(58, 31, 18, 1.1);

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

const parkPath = new THREE.Mesh(
  new THREE.RingGeometry(10.6, 12.0, 64),
  material(0xd6d0c5, 0.96)
);
parkPath.rotation.x = -Math.PI / 2;
parkPath.position.set(30, 0.095, 29);
parkPath.receiveShadow = true;
world.add(parkPath);

for (let i = 0; i < 12; i += 1) {
  const a = (i / 12) * Math.PI * 2;
  makeShrub(30 + Math.cos(a) * 14.0, 29 + Math.sin(a) * 14.0, 0.72, i % 3 === 0 ? 0x739d51 : 0x4f8650);
}


const CHUNK_SIZE = 96;
const ACTIVE_CHUNK_RADIUS = 2;
const chunkGroups = new Map();
const proceduralHouses = new Map();

function seededValue(x, z, salt = 0) {
  const value = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453123;
  return value - Math.floor(value);
}

function procHouse(parent, globalX, globalZ, localX, localZ, seed, key) {
  const house = new THREE.Group();
  house.position.set(localX, 0, localZ);
  const walls = [0xf3cfba, 0xc9dced, 0xd8caeb, 0xc9e1cf, 0xead5a8][Math.floor(seededValue(seed, 0, 1) * 5)];
  const roof = [0x624a43, 0x4a5768, 0x5b4a68, 0x52604b][Math.floor(seededValue(seed, 0, 2) * 4)];
  const trim = 0xf5f2e9;

  cube(11.4, 0.38, 9.5, 0xbab5aa, 0, 0.2, 0, house);
  cube(10.8, 5.8, 9.0, walls, 0, 3.1, 0, house);
  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(7.5, 4.0, 4), material(roof, .84));
  roofMesh.position.y = 7.35;
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.castShadow = true;
  house.add(roofMesh);

  cube(2.0, 3.65, .28, 0x704e3a, 0, 2.0, 4.57, house);
  [-3.1, 3.1].forEach((wx) => {
    cube(2.3, 2.0, .2, trim, wx, 3.3, 4.62, house);
    cube(1.92, 1.62, .24, 0x9fd7e9, wx, 3.3, 4.76, house);
  });
  cube(2.0, .12, 4.0, 0xd5cfc2, 0, .08, 7.0, house);

  if (seededValue(seed, 0, 3) > .45) {
    cube(2.4, .75, .85, 0x4f8051, -3.6, .5, 5.1, house);
    cube(2.4, .75, .85, 0x4f8051, 3.6, .5, 5.1, house);
  }

  const plate = makeTextSprite('HOUSE', '#ffffff', 'rgba(31,41,55,.74)');
  plate.position.set(0, 9.4, 0);
  plate.scale.set(3.2, .8, 1);
  house.add(plate);

  parent.add(house);
  proceduralHouses.set(key, { id: key, x: globalX, z: globalZ, group: house });
}

function createChunk(cx, cz) {
  const key = cx + ':' + cz;
  if (chunkGroups.has(key)) return;
  if (cx === 0 && cz === 0) {
    chunkGroups.set(key, null);
    return;
  }

  const originX = cx * CHUNK_SIZE;
  const originZ = cz * CHUNK_SIZE;
  const group = new THREE.Group();
  group.position.set(originX, 0, originZ);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CHUNK_SIZE + .6, CHUNK_SIZE + .6), material(0x86b77a, 1));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.015;
  ground.receiveShadow = true;
  group.add(ground);

  cube(16, .08, CHUNK_SIZE, 0x4d5561, 0, .035, 0, group);
  cube(CHUNK_SIZE, .08, 16, 0x4d5561, 0, .036, 0, group);
  cube(2.1, .13, CHUNK_SIZE, 0xd7d3ca, -9.2, .065, 0, group);
  cube(2.1, .13, CHUNK_SIZE, 0xd7d3ca, 9.2, .065, 0, group);
  cube(CHUNK_SIZE, .13, 2.1, 0xd7d3ca, 0, .066, -9.2, group);
  cube(CHUNK_SIZE, .13, 2.1, 0xd7d3ca, 0, .066, 9.2, group);

  for (let p = -40; p <= 40; p += 8) {
    cube(.22, .09, 3.0, 0xf3e8b8, 0, .095, p, group);
    cube(3.0, .09, .22, 0xf3e8b8, p, .096, 0, group);
  }

  const lots = [
    [-27, -27], [27, -27], [-27, 27], [27, 27]
  ];
  lots.forEach((lot, i) => {
    const jx = (seededValue(cx, cz, 10 + i) - .5) * 7;
    const jz = (seededValue(cx, cz, 20 + i) - .5) * 7;
    const lx = lot[0] + jx;
    const lz = lot[1] + jz;
    const houseKey = key + ':h' + i;
    procHouse(group, originX + lx, originZ + lz, lx, lz, cx * 97 + cz * 193 + i * 31, houseKey);
  });

  for (let i = 0; i < 10; i += 1) {
    let lx = (seededValue(cx, cz, 100 + i * 2) - .5) * 82;
    let lz = (seededValue(cx, cz, 101 + i * 2) - .5) * 82;
    if (Math.abs(lx) < 13) lx += lx < 0 ? -16 : 16;
    if (Math.abs(lz) < 13) lz += lz < 0 ? -16 : 16;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.26, .38, 2.7, 8), material(0x755238));
    trunk.position.set(lx, 1.35, lz);
    trunk.castShadow = true;
    group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(1.35 + seededValue(cx, cz, 200 + i) * .45), material(0x3f7b49, 1));
    leaves.position.set(lx, 3.4, lz);
    leaves.castShadow = true;
    group.add(leaves);
  }

  chunkGroups.set(key, group);
  world.add(group);
}

function removeChunk(key) {
  const group = chunkGroups.get(key);
  if (group) {
    world.remove(group);
    group.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material && !Array.isArray(node.material)) node.material.dispose();
    });
  }
  chunkGroups.delete(key);
  for (const houseKey of proceduralHouses.keys()) {
    if (houseKey.startsWith(key + ':')) proceduralHouses.delete(houseKey);
  }
}

function updateWorldStreaming(x, z) {
  const centerX = Math.round(x / CHUNK_SIZE);
  const centerZ = Math.round(z / CHUNK_SIZE);
  const needed = new Set();

  for (let dx = -ACTIVE_CHUNK_RADIUS; dx <= ACTIVE_CHUNK_RADIUS; dx += 1) {
    for (let dz = -ACTIVE_CHUNK_RADIUS; dz <= ACTIVE_CHUNK_RADIUS; dz += 1) {
      const cx = centerX + dx;
      const cz = centerZ + dz;
      const key = cx + ':' + cz;
      needed.add(key);
      createChunk(cx, cz);
    }
  }

  for (const key of Array.from(chunkGroups.keys())) {
    if (!needed.has(key)) removeChunk(key);
  }
}

updateWorldStreaming(0, 0);

function createAvatar(data, local = false) {
  const gender = data.gender === 'male' ? 'male' : 'female';
  const outfit = OUTFITS[data.outfit] || OUTFITS.sky;
  const root = new THREE.Group();
  const visual = new THREE.Group();
  root.add(visual);

  const skin = material(gender === 'female' ? 0xf2c3a2 : 0xeebc98, .7);
  const hair = material(outfit.hair, .82);
  const top = material(outfit.top, .58);
  const top2 = material(outfit.top2, .64);
  const bottom = material(outfit.bottom, .68);
  const accent = material(outfit.accent, .6);
  const shoes = material(outfit.shoes, .55);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x202631, roughness: .32 });
  const whiteMat = material(0xffffff, .46);

  // Chibi reference proportions: head is almost half the total character height.
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.02, 26, 20), skin);
  head.position.y = 3.55;
  head.scale.set(.98, 1.05, .94);
  head.castShadow = true;
  visual.add(head);

  const cheekMat = new THREE.MeshBasicMaterial({ color: 0xe99b96, transparent: true, opacity: .45 });
  [-.5, .5].forEach((x) => {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), cheekMat);
    cheek.position.set(x, 3.42, .86);
    cheek.scale.set(1.55, .7, .32);
    visual.add(cheek);
  });

  [-.36, .36].forEach((x) => {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(.19, 13, 10), whiteMat);
    eyeWhite.position.set(x, 3.66, .89);
    eyeWhite.scale.set(.78, 1.08, .34);
    visual.add(eyeWhite);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(.105, 12, 9), eyeMat);
    eye.position.set(x, 3.66, .99);
    eye.scale.set(.82, 1.18, .42);
    visual.add(eye);

    const sparkle = new THREE.Mesh(new THREE.SphereGeometry(.025, 7, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    sparkle.position.set(x - .025, 3.72, 1.04);
    visual.add(sparkle);
  });

  const mouthCurve = new THREE.Mesh(new THREE.TorusGeometry(.115, .018, 6, 18, Math.PI), new THREE.MeshBasicMaterial({ color: 0x8f5b5d }));
  mouthCurve.position.set(0, 3.3, .99);
  mouthCurve.rotation.z = Math.PI;
  visual.add(mouthCurve);

  // Full, soft hair cap with gender-specific silhouette.
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(1.055, 24, 18, 0, Math.PI * 2, 0, Math.PI * .62), hair);
  hairCap.position.set(0, 3.82, -.06);
  hairCap.scale.set(1.02, .9, 1.01);
  hairCap.castShadow = true;
  visual.add(hairCap);

  const fringe = new THREE.Group();
  [-.56, -.27, .02, .31, .58].forEach((x, i) => {
    const lock = new THREE.Mesh(new THREE.ConeGeometry(.2, .62 + (i % 2) * .08, 8), hair);
    lock.position.set(x, 4.08 - Math.abs(x) * .12, .73);
    lock.rotation.x = Math.PI;
    lock.rotation.z = x * .18;
    fringe.add(lock);
  });
  visual.add(fringe);

  if (gender === 'female') {
    [-1, 1].forEach((side) => {
      const sideHair = new THREE.Mesh(new THREE.CapsuleGeometry(.28, .68, 5, 9), hair);
      sideHair.position.set(side * .82, 3.17, -.06);
      sideHair.rotation.z = side * -.08;
      sideHair.castShadow = true;
      visual.add(sideHair);
    });
    const pony = new THREE.Mesh(new THREE.SphereGeometry(.42, 14, 10), hair);
    pony.position.set(.78, 3.75, -.7);
    pony.scale.set(.75, 1.25, .75);
    pony.castShadow = true;
    visual.add(pony);
    const bow = new THREE.Mesh(new THREE.OctahedronGeometry(.23), accent);
    bow.position.set(.7, 4.05, -.64);
    visual.add(bow);
  } else {
    [-.62, -.31, 0, .31, .62].forEach((x, i) => {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(.22, .48, 8), hair);
      spike.position.set(x, 4.57 + (i % 2) * .08, -.05);
      spike.rotation.z = -x * .36;
      visual.add(spike);
    });
  }

  // Compact rounded torso.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.65, .72, 7, 12), top);
  torso.position.y = 2.08;
  torso.scale.set(gender === 'female' ? .92 : 1.02, 1, .8);
  torso.castShadow = true;
  visual.add(torso);

  // Outfit-specific overlay pieces make presets visibly different.
  if (data.outfit === 'street') {
    const jacket = new THREE.Mesh(new THREE.BoxGeometry(1.42, .9, .18), top2);
    jacket.position.set(0, 2.18, .62);
    jacket.castShadow = true;
    visual.add(jacket);
    [-.36, .36].forEach((x) => {
      const snap = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6), accent);
      snap.position.set(x, 2.15, .74);
      visual.add(snap);
    });
  } else if (data.outfit === 'berry') {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(.38, .09, 8, 20, Math.PI), top2);
    collar.position.set(0, 2.53, .56);
    collar.rotation.z = Math.PI;
    visual.add(collar);
  } else if (data.outfit === 'mint') {
    const badge = new THREE.Mesh(new THREE.CircleGeometry(.16, 14), accent);
    badge.position.set(.35, 2.25, .71);
    visual.add(badge);
  } else if (data.outfit === 'sunrise') {
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(.38, .105, 8, 20), accent);
    scarf.position.set(0, 2.64, 0);
    scarf.rotation.x = Math.PI / 2;
    visual.add(scarf);
  } else {
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(.38, .28, .08), top2);
    pocket.position.set(.3, 2.05, .69);
    visual.add(pocket);
  }

  const hip = new THREE.Mesh(new THREE.CylinderGeometry(.52, .58, .42, 14), bottom);
  hip.position.y = 1.39;
  hip.castShadow = true;
  visual.add(hip);

  if (gender === 'female') {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(.48, .72, .55, 16), bottom);
    skirt.position.y = 1.28;
    skirt.castShadow = true;
    visual.add(skirt);
  }

  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * .66, 2.37, 0);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(.17, .42, 4, 8), top2);
    sleeve.position.y = -.28;
    sleeve.castShadow = true;
    pivot.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 9), skin);
    hand.position.y = -.7;
    hand.castShadow = true;
    pivot.add(hand);
    visual.add(pivot);
    return pivot;
  }

  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * .28, 1.15, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .48, 4, 8), bottom);
    leg.position.y = -.34;
    leg.castShadow = true;
    pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 9), shoes);
    shoe.position.set(0, -.76, .16);
    shoe.scale.set(1.0, .58, 1.3);
    shoe.castShadow = true;
    pivot.add(shoe);
    visual.add(pivot);
    return pivot;
  }

  const armL = makeArm(-1);
  const armR = makeArm(1);
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(local ? .72 : .58, local ? .92 : .72, 32),
    new THREE.MeshBasicMaterial({
      color: local ? 0xffffff : new THREE.Color(outfit.top),
      transparent: true,
      opacity: local ? .5 : .16,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .025;
  root.add(ring);

  const name = makeTextSprite(data.name || 'Player', '#ffffff', local ? 'rgba(79,70,229,.9)' : 'rgba(17,24,39,.82)');
  name.position.y = 5.05;
  name.scale.set(3.7, .92, 1);
  root.add(name);

  root.position.set(data.x || 0, 0, data.z || 0);
  root.rotation.y = data.rot || Math.PI;
  root.userData = {
    visual, torso, head, armL, armR, legL, legR, groundRing: ring,
    moving: false,
    target: new THREE.Vector3(data.x || 0, 0, data.z || 0),
    targetRot: data.rot || Math.PI,
    local
  };
  scene.add(root);
  return root;
}

let cameraYaw = Math.PI;
let cameraPitch = 0.34;
let cameraDistance = 9.5;
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

    // CameraYaw describes the camera's offset from the player, so movement must
    // use the opposite vector for screen-forward and a perpendicular vector for right.
    const dx = (-forward * sin + strafe * cos) * speed * delta;
    const dz = (-forward * cos - strafe * sin) * speed * delta;

    me.position.x += dx;
    me.position.z += dz;

    const targetRot = Math.atan2(dx, dz);
    me.rotation.y = lerpAngle(me.rotation.y, targetRot, Math.min(1, delta * 12));
  }

  me.userData.moving = moving;
}

function updateAvatarAnimation(group, time, delta) {
  const moving = group.userData.moving;
  const speed = moving ? 9.2 : 1.8;
  const stride = Math.sin(time * speed);
  const legAmp = moving ? 0.62 : 0.025;
  const armAmp = moving ? 0.5 : 0.035;

  group.userData.legL.rotation.x = stride * legAmp;
  group.userData.legR.rotation.x = -stride * legAmp;
  group.userData.armL.rotation.x = -stride * armAmp;
  group.userData.armR.rotation.x = stride * armAmp;

  const bob = moving ? Math.abs(Math.sin(time * speed * 2)) * 0.055 : Math.sin(time * 1.8) * 0.012;
  group.position.y = THREE.MathUtils.lerp(group.position.y, bob, Math.min(1, delta * 12));

  group.userData.visual.rotation.z = THREE.MathUtils.lerp(
    group.userData.visual.rotation.z,
    moving ? -stride * 0.025 : Math.sin(time * 1.1) * 0.008,
    Math.min(1, delta * 8)
  );
  group.userData.torso.rotation.x = THREE.MathUtils.lerp(
    group.userData.torso.rotation.x,
    moving ? 0.045 : 0,
    Math.min(1, delta * 8)
  );
  group.userData.head.rotation.y = Math.sin(time * 0.8 + (group.userData.local ? 0 : group.id || 0)) * 0.035;
  group.userData.groundRing.rotation.z += delta * (group.userData.local ? 0.55 : 0.18);
}

function updateCamera(delta) {
  if (!me) return;
  const target = me.position.clone().add(new THREE.Vector3(0, cameraDistance > 18 ? 3.7 : 2.7, 0));
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
    if (d < 8 && (!best || d < best.distance)) best = { homeId: index, distance: d, permanent: true };
  });

  proceduralHouses.forEach((house) => {
    const d = Math.hypot(me.position.x - house.x, me.position.z - house.z);
    if (d < 7.5 && (!best || d < best.distance)) best = { homeId: house.id, distance: d, permanent: false, x: house.x, z: house.z };
  });

  return best;
}

function visitHouse(homeId) {
  if (!me) return;
  if (typeof homeId === 'number' && homePositions[homeId]) {
    const p = homePositions[homeId];
    me.position.set(p[0], 0, p[1] + 7.6);
    toast('Visiting Home #' + (homeId + 1) + '.');
    return;
  }
  const house = proceduralHouses.get(homeId);
  if (house) toast('You found a new neighborhood home. Interior visits are planned for the next home milestone.');
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
  cameraDistance = THREE.MathUtils.clamp(cameraDistance + Math.sign(event.deltaY) * 1.8, 4.8, 38);
}, { passive: true });

document.querySelector('#zoom-out-btn').addEventListener('click', () => {
  cameraDistance = THREE.MathUtils.clamp(cameraDistance + 4, 4.8, 38);
});

document.querySelector('#zoom-in-btn').addEventListener('click', () => {
  cameraDistance = THREE.MathUtils.clamp(cameraDistance - 4, 4.8, 38);
});

const genderOptions = document.querySelector('#gender-options');
genderOptions.querySelectorAll('.gender-choice').forEach((button) => {
  button.addEventListener('click', () => {
    selectedGender = button.dataset.gender;
    genderOptions.querySelectorAll('.gender-choice').forEach((item) => item.classList.toggle('selected', item === button));
  });
});

const outfitOptions = document.querySelector('#outfit-options');
Object.values(OUTFITS).forEach((outfit, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'outfit-choice' + (index === 0 ? ' selected' : '');
  button.dataset.outfit = outfit.id;
  button.innerHTML =
    '<span class="outfit-swatch"><i style="--top:' + outfit.top + ';--top2:' + outfit.top2 + ';--bottom:' + outfit.bottom + ';--accent:' + outfit.accent + '"></i></span>' +
    '<strong>' + outfit.name + '</strong>';
  button.addEventListener('click', () => {
    selectedOutfit = outfit.id;
    outfitOptions.querySelectorAll('.outfit-choice').forEach((item) => item.classList.toggle('selected', item === button));
  });
  outfitOptions.appendChild(button);
});

document.querySelector('#join-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (joined) return;
  const name = document.querySelector('#name').value.trim() || 'Guest';
  socket.emit('player:join', { name, gender: selectedGender, outfit: selectedOutfit });
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
  const outfit = OUTFITS[player.outfit] || OUTFITS.sky;
  avatar.style.background = 'linear-gradient(135deg,' + outfit.top + ',' + outfit.bottom + ')';
  avatar.textContent = player.gender === 'male' ? '♂' : '♀';

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
  const scale = 1.15;
  const worldToMap = (x, z) => ({
    x: w / 2 + (x - me.position.x) * scale,
    y: h / 2 + (z - me.position.z) * scale
  });

  mapCtx.clearRect(0, 0, w, h);
  mapCtx.fillStyle = '#243348';
  mapCtx.fillRect(0, 0, w, h);

  const centerChunkX = Math.round(me.position.x / CHUNK_SIZE);
  const centerChunkZ = Math.round(me.position.z / CHUNK_SIZE);
  mapCtx.strokeStyle = '#626c77';
  mapCtx.lineWidth = 10;

  for (let cx = centerChunkX - 2; cx <= centerChunkX + 2; cx += 1) {
    for (let cz = centerChunkZ - 2; cz <= centerChunkZ + 2; cz += 1) {
      const ox = cx * CHUNK_SIZE;
      const oz = cz * CHUNK_SIZE;
      const v1 = worldToMap(ox, oz - CHUNK_SIZE / 2);
      const v2 = worldToMap(ox, oz + CHUNK_SIZE / 2);
      mapCtx.beginPath(); mapCtx.moveTo(v1.x, v1.y); mapCtx.lineTo(v2.x, v2.y); mapCtx.stroke();
      const h1 = worldToMap(ox - CHUNK_SIZE / 2, oz);
      const h2 = worldToMap(ox + CHUNK_SIZE / 2, oz);
      mapCtx.beginPath(); mapCtx.moveTo(h1.x, h1.y); mapCtx.lineTo(h2.x, h2.y); mapCtx.stroke();
    }
  }

  mapCtx.fillStyle = '#8aad76';
  proceduralHouses.forEach((house) => {
    const p = worldToMap(house.x, house.z);
    if (p.x > -8 && p.x < w + 8 && p.y > -8 && p.y < h + 8) {
      mapCtx.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
  });

  homePositions.forEach((p, index) => {
    const m = worldToMap(p[0], p[1]);
    if (m.x > -10 && m.x < w + 10 && m.y > -10 && m.y < h + 10) {
      mapCtx.fillStyle = socialState && index === socialState.self.residenceHomeId ? '#ffffff' : '#9fc08c';
      mapCtx.fillRect(m.x - 4, m.y - 4, 8, 8);
    }
  });

  remotePlayers.forEach((remote) => {
    const p = worldToMap(remote.mesh.position.x, remote.mesh.position.z);
    if (p.x > 0 && p.x < w && p.y > 0 && p.y < h) {
      const outfit = OUTFITS[remote.data.outfit] || OUTFITS.sky;
      mapCtx.beginPath();
      mapCtx.fillStyle = outfit.top;
      mapCtx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      mapCtx.fill();
    }
  });

  mapCtx.save();
  mapCtx.translate(w / 2, h / 2);
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
    document.querySelector('#prompt-text').textContent = nearest.permanent ? 'Visit Home #' + (nearest.homeId + 1) : 'Explore this home';
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
    updateWorldStreaming(me.position.x, me.position.z);
    sky.position.set(me.position.x, 0, me.position.z);
    sun.position.set(me.position.x - 42, 68, me.position.z + 34);
    sun.target.position.set(me.position.x, 0, me.position.z);
    if (!sun.target.parent) scene.add(sun.target);
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
  clouds.forEach((cloud, index) => {
    cloud.position.x += delta * (0.32 + index * 0.05);
    if (cloud.position.x > 105) cloud.position.x = -105;
  });
  renderer.render(scene, camera);
}

requestAnimationFrame(frame);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
