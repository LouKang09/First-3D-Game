import './style.css';
import * as THREE from 'three';
import { io } from 'socket.io-client';

const app = document.querySelector('#app');

app.innerHTML = [
  '<div id="game">',
    '<div id="world"></div>',
    '<div id="house-loading" class="house-loading"><div class="house-loading-card"><div class="house-loader"></div><strong id="house-loading-title">Entering home…</strong><span>Preparing your space</span></div></div>',
    '<div id="join" class="overlay">',
      '<form id="join-form" class="join-card glass">',
        '<div class="mark">H</div>',
        '<p class="eyebrow">MULTIPLAYER SOCIAL WORLD</p>',
        '<h1>HAVEN</h1>',
        '<p class="lead">A virtual neighborhood where friends can hang out, visit homes, live together and talk privately in parties.</p>',
        '<label for="name">Display name</label>',
        '<input id="name" maxlength="18" autocomplete="nickname" value="Guest" />',
        '<div class="avatar-preview-card">',
          '<div id="avatar-preview" class="avatar-preview" data-hair="classic">',
            '<div class="preview-hair-back"></div>',
            '<div class="preview-head"><i class="preview-eye left"></i><i class="preview-eye right"></i><i class="preview-mouth"></i><i class="preview-fringe"></i></div>',
            '<div class="preview-body"></div>',
          '</div>',
          '<div><strong>Preview</strong><span>Customize before entering Haven</span></div>',
        '</div>',
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
        '<div class="appearance-grid">',
          '<div><span class="label">Hair style</span><div id="hair-style-options" class="choice-row">',
            '<button type="button" class="appearance-choice selected" data-value="classic">Classic</button>',
            '<button type="button" class="appearance-choice" data-value="short">Short</button>',
            '<button type="button" class="appearance-choice" data-value="pony">Pony/Spiky</button>',
          '</div></div>',
          '<div><span class="label">Hair color</span><div id="hair-color-options" class="swatch-row">',
            '<button type="button" class="appearance-swatch selected" data-value="espresso" style="--swatch:#2b2022" aria-label="Espresso"></button>',
            '<button type="button" class="appearance-swatch" data-value="chestnut" style="--swatch:#6b3f2c" aria-label="Chestnut"></button>',
            '<button type="button" class="appearance-swatch" data-value="midnight" style="--swatch:#171923" aria-label="Midnight"></button>',
          '</div></div>',
          '<div><span class="label">Skin tone</span><div id="skin-tone-options" class="swatch-row">',
            '<button type="button" class="appearance-swatch selected" data-value="light" style="--swatch:#f1c2a2" aria-label="Light"></button>',
            '<button type="button" class="appearance-swatch" data-value="warm" style="--swatch:#d99b73" aria-label="Warm"></button>',
            '<button type="button" class="appearance-swatch" data-value="deep" style="--swatch:#8e5b42" aria-label="Deep"></button>',
          '</div></div>',
          '<div><span class="label">Eye color</span><div id="eye-color-options" class="swatch-row">',
            '<button type="button" class="appearance-swatch selected" data-value="violet" style="--swatch:#6266a6" aria-label="Violet"></button>',
            '<button type="button" class="appearance-swatch" data-value="ocean" style="--swatch:#3d789b" aria-label="Ocean"></button>',
            '<button type="button" class="appearance-swatch" data-value="hazel" style="--swatch:#8b6a3f" aria-label="Hazel"></button>',
          '</div></div>',
        '</div>',
        '<div class="avatar-note"><strong>Anime style</strong><span>Face details now hug the head · rounded hands & shoes</span></div>',
        '<button class="primary" type="submit">Enter Haven</button>',
        '<p class="fine">WASD to move · Shift sprint · Space jump · Drag to look · Left-click players · E interact</p>',
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
          '<button id="voice-btn" class="round glass voice-control" title="Join a party to enable speaking" disabled>🎙</button>',
          '<button id="music-btn" class="round glass active" title="Background music">♫</button>',
        '</div>',
      '</div>',
      '<div id="status" class="status glass"><strong id="status-name">Guest</strong><span id="status-home">Home #1</span><div class="keys"><kbd>WASD</kbd> move <kbd>Shift</kbd> sprint <kbd>Space</kbd> jump <kbd>E</kbd> interact <kbd>R</kbd> punch</div></div>',
      '<div id="prompt" class="house-prompt glass">',
        '<div class="house-prompt-icon">⌂</div>',
        '<div class="house-prompt-copy"><small id="house-kicker">NEARBY HOME</small><strong id="prompt-text">Interact</strong><span id="house-distance"></span></div>',
        '<kbd>E</kbd>',
      '</div>',
      '<div class="minimap glass">',
        '<div class="map-head"><strong>LOCAL MAP</strong><span id="map-coords">0, 0</span></div>',
        '<div class="map-canvas-wrap"><canvas id="map" width="320" height="320"></canvas><span class="map-north">N</span></div>',
        '<div class="map-legend"><span><i class="legend-you"></i>You</span><span><i class="legend-house"></i>Home</span><span><i class="legend-tree"></i>Tree</span></div>',
      '</div>',
      '<aside id="social" class="social glass">',
        '<header><div><small>SOCIAL</small><h2>Friends & Party</h2></div><button id="close-social">×</button></header>',
        '<div class="tabs"><button data-tab="nearby" class="active">Nearby</button><button data-tab="friends">Friends</button><button data-tab="party">Party</button></div>',
        '<div id="social-body" class="social-body"></div>',
      '</aside>',
      '<div id="party-invite" class="invite glass hidden"><strong>Party invitation</strong><span id="invite-copy"></span><div><button id="join-party" class="small primary">Join</button><button id="dismiss-party" class="small">Not now</button></div></div>',
      '<div id="player-popup" class="player-popup glass hidden" role="dialog" aria-label="Player actions"></div>',
      '<div id="toasts"></div>',
      '<div id="mobile-controls">',
        '<div id="joystick" class="joystick" aria-label="Movement joystick"><span class="joystick-label">MOVE</span><div id="stick"></div></div>',
        '<div id="lookpad" class="lookpad"><span class="look-hint">DRAG TO LOOK</span></div>',
        '<div class="mobile-actions">',
          '<button id="mobile-jump" class="mobile-action mobile-jump"><strong>↑</strong><span>JUMP</span></button>',
          '<button id="mobile-punch" class="mobile-action mobile-punch"><strong>✦</strong><span>PUNCH</span></button>',
          '<button id="mobile-e" class="mobile-action mobile-e"><strong>E</strong><span>INTERACT</span></button>',
        '</div>',
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
const SKIN_TONES = {
  light: 0xf1c2a2,
  warm: 0xd99b73,
  deep: 0x8e5b42
};
const HAIR_COLORS = {
  espresso: 0x2b2022,
  chestnut: 0x6b3f2c,
  midnight: 0x171923
};
const EYE_COLORS = {
  violet: 0x6266a6,
  ocean: 0x3d789b,
  hazel: 0x8b6a3f
};

let selectedGender = 'female';
let selectedOutfit = 'sky';
let selectedHairStyle = 'classic';
let selectedHairColor = 'espresso';
let selectedSkinTone = 'light';
let selectedEyeColor = 'violet';
let selfId = null;
let joined = false;
let me = null;
let socialState = null;
let currentTab = 'nearby';
let pendingPartyInvite = null;
let pendingInviteAfterCreate = null;
let selectedPlayerId = null;
let lastNetworkSend = 0;
let voiceEnabled = false;
let localStream = null;
let joystick = { x: 0, y: 0 };
let insideHouse = null;
let transitioningHouse = false;
let seatedBench = null;
let savedCameraDistance = null;

const remotePlayers = new Map();
const peers = new Map();
const voiceReadyPeers = new Set();
const pendingIceCandidates = new Map();
let voiceAudioContext = null;
let voiceInputSource = null;
let voiceProcessor = null;
let voiceSilentGain = null;
let voiceOutputGain = null;
let voiceRelayActive = false;
const voicePlaybackCursors = new Map();
const VOICE_SAMPLE_RATE = 16000;
const defaultIceServers = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
];
let rtcIceServers = defaultIceServers;

fetch('/voice-config')
  .then((response) => response.ok ? response.json() : null)
  .then((config) => {
    if (config && Array.isArray(config.iceServers) && config.iceServers.length) {
      rtcIceServers = config.iceServers;
    }
  })
  .catch(() => {});

const worldEl = document.querySelector('#world');
const IS_COARSE_POINTER = window.matchMedia('(pointer: coarse)').matches;
const MOBILE_PERF_MODE = IS_COARSE_POINTER || window.innerWidth < 760;
const renderer = new THREE.WebGLRenderer({
  antialias: !MOBILE_PERF_MODE,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MOBILE_PERF_MODE ? 1.25 : 1.75));
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
sun.shadow.mapSize.set(MOBILE_PERF_MODE ? 1024 : 2048, MOBILE_PERF_MODE ? 1024 : 2048);
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

function isRoadDecorSafe(x, z, clearance = 12.5) {
  return Math.abs(x) > clearance && Math.abs(z) > clearance;
}

function makeTree(x, z, scale = 1) {
  if (!isRoadDecorSafe(x, z, 12.5)) return null;
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

const centralTreePositions = [
  [-60, -58], [-60, -12], [-62, 34], [-36, 45], [-15, 58],
  [14, 34], [36, 25], [61, 15], [61, -35], [33, -61],
  [-31, -65], [16, -28], [-16, 28]
];
centralTreePositions.forEach((p, i) => makeTree(p[0], p[1], 0.9 + (i % 3) * 0.08));

function makeShrub(x, z, scale = 1, color = 0x4e8a50) {
  if (!isRoadDecorSafe(x, z, 11.8)) return null;
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

const benchSpots = [];

function makeBench(x, z, rot = 0) {
  const g = new THREE.Group();
  cube(3.0, 0.2, 0.75, 0x8a6147, 0, 1.0, 0, g);
  cube(3.0, 1.0, 0.18, 0x8a6147, 0, 1.55, -0.34, g);
  cube(0.16, 1.05, 0.16, 0x404750, -1.1, 0.5, 0, g);
  cube(0.16, 1.05, 0.16, 0x404750, 1.1, 0.5, 0, g);
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  world.add(g);

  benchSpots.push({
    id: 'bench-' + benchSpots.length,
    x,
    z,
    rot,
    standX: x + Math.sin(rot) * 1.8,
    standZ: z + Math.cos(rot) * 1.8
  });
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

// Block-style skyline objects removed because they could overlap the streamed road grid.

const interiorGroup = new THREE.Group();
interiorGroup.visible = false;
scene.add(interiorGroup);

function buildHouseInterior() {
  const floorMat = 0xb98f68;
  const wallMat = 0xf0e9dd;
  const trimMat = 0xe7dfd3;

  cube(18, .18, 16, floorMat, 0, .02, 0, interiorGroup);
  cube(18, 6.5, .35, wallMat, 0, 3.25, -8, interiorGroup);
  cube(.35, 6.5, 16, wallMat, -9, 3.25, 0, interiorGroup);
  cube(.35, 6.5, 16, wallMat, 9, 3.25, 0, interiorGroup);
  cube(6.4, 6.5, .35, wallMat, -5.8, 3.25, 8, interiorGroup);
  cube(6.4, 6.5, .35, wallMat, 5.8, 3.25, 8, interiorGroup);
  cube(18, .2, 16, 0xf8f4ec, 0, 6.5, 0, interiorGroup);

  // Entry trim around the open doorway.
  cube(.28, 4.5, .35, trimMat, -2.55, 2.25, 7.78, interiorGroup);
  cube(.28, 4.5, .35, trimMat, 2.55, 2.25, 7.78, interiorGroup);
  cube(5.4, .28, .35, trimMat, 0, 4.45, 7.78, interiorGroup);

  // Living room.
  cube(5.2, 1.0, 1.8, 0x7e91ad, -3.1, .72, -3.5, interiorGroup);
  cube(5.2, 1.9, .5, 0x687b98, -3.1, 1.45, -4.15, interiorGroup);
  cube(2.7, .38, 1.6, 0x8c674a, -3.0, .55, -1.0, interiorGroup);
  cube(4.5, .06, 3.6, 0xc7b9d9, -3.0, .14, -2.1, interiorGroup);

  // Dining nook.
  cube(3.1, .22, 2.2, 0x8c674a, 4.6, 1.15, -2.2, interiorGroup);
  [[3.2,-2.2],[6.0,-2.2],[4.6,-3.6],[4.6,-.8]].forEach(([x,z]) => {
    cube(.9, .18, .9, 0x806048, x, .86, z, interiorGroup);
    cube(.15, .85, .15, 0x4b4d55, x, .42, z, interiorGroup);
  });

  // Bed and side table.
  cube(5.2, .55, 3.4, 0xf2f0e9, 4.5, .7, 3.8, interiorGroup);
  cube(5.0, .55, 1.2, 0x88a7c6, 4.5, 1.15, 4.8, interiorGroup);
  cube(1.2, .8, 1.2, 0x8c674a, 7.3, .48, 4.3, interiorGroup);

  // Compact kitchen counter.
  cube(5.8, 1.7, 1.0, 0xb7b1a8, -5.5, .9, 5.6, interiorGroup);
  cube(5.8, .16, 1.15, 0xe7e2db, -5.5, 1.82, 5.6, interiorGroup);
  cube(1.2, 2.7, 1.2, 0xd9dde2, -7.4, 1.35, 4.1, interiorGroup);

  const warmLight = new THREE.PointLight(0xffd9a3, 32, 24, 1.8);
  warmLight.position.set(0, 5.5, 0);
  interiorGroup.add(warmLight);

  const lamp = new THREE.PointLight(0xffc879, 16, 10, 2);
  lamp.position.set(-4, 3.0, -2.5);
  interiorGroup.add(lamp);
}
buildHouseInterior();

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
const ACTIVE_CHUNK_RADIUS = MOBILE_PERF_MODE ? 1 : 2;
let populationReady = false;
let streamedCenterChunkX = null;
let streamedCenterChunkZ = null;
const chunkGroups = new Map();
const proceduralHouses = new Map();
const proceduralTrees = new Map();

function seededValue(x, z, salt = 0) {
  const value = Math.sin(x * 127.1 + z * 311.7 + salt * 74.7) * 43758.5453123;
  return value - Math.floor(value);
}

function procHouse(parent, globalX, globalZ, localX, localZ, seed, key, rotation = 0) {
  const house = new THREE.Group();
  house.position.set(localX, 0, localZ);
  house.rotation.y = rotation;

  const wallPalette = [0xf2cbb5, 0xc7d9ed, 0xdcc9eb, 0xc9dfcd, 0xecd8ac, 0xd8c9be];
  const roofPalette = [0x654b43, 0x49586a, 0x5d4c68, 0x4e604e, 0x735249];
  const walls = wallPalette[Math.floor(seededValue(seed, 0, 1) * wallPalette.length)];
  const roofColor = roofPalette[Math.floor(seededValue(seed, 0, 2) * roofPalette.length)];
  const trim = 0xf8f5ed;
  const style = Math.floor(seededValue(seed, 0, 4) * 3);

  // Clearly defined private lot: lawn pad + walkway + driveway.
  cube(17.5, .08, 18.5, 0x76a86c, 0, .035, 0, house);
  cube(3.0, .1, 9.0, 0xd2ccc0, 0, .09, 8.0, house);
  cube(4.4, .11, 9.0, 0xbdb8b0, style === 1 ? 4.5 : -4.5, .095, 8.0, house);

  // Foundation and primary living volume.
  cube(12.2, .48, 10.2, 0xb7b1a8, 0, .24, 0, house);
  cube(11.5, style === 1 ? 6.2 : 5.8, 9.4, walls, 0, style === 1 ? 3.35 : 3.15, 0, house);

  // A projecting front bay breaks the box silhouette.
  const bayX = style === 2 ? 2.65 : -2.65;
  cube(4.3, 4.4, 2.4, walls, bayX, 2.45, 5.0, house);

  // Main pitched roof.
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.0, 4.25, 4), material(roofColor, .82));
  roof.position.y = style === 1 ? 8.35 : 7.85;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  house.add(roof);

  // Front gable over the projecting bay.
  const gable = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.25, 4), material(roofColor, .82));
  gable.position.set(bayX, 5.55, 5.0);
  gable.rotation.y = Math.PI / 4;
  gable.castShadow = true;
  house.add(gable);

  // Two-storey variant gets an upper facade and balcony.
  if (style === 1) {
    cube(7.8, 2.3, 7.5, walls, 0, 6.15, -.25, house);
    cube(6.0, .22, 1.55, 0xd1cbc0, 0, 5.05, 5.05, house);
    [-2.7, 2.7].forEach((x) => cube(.16, 1.25, .16, trim, x, 5.65, 5.55, house));
    cube(5.7, .12, .12, trim, 0, 6.22, 5.55, house);
  }

  // Porch + columns + front door.
  cube(5.5, .28, 3.0, 0xb9b3a9, 0, .18, 5.8, house);
  cube(4.8, .22, 2.1, roofColor, 0, 4.9, 5.7, house);
  [-1.9, 1.9].forEach((x) => cube(.18, 3.8, .18, trim, x, 2.8, 6.05, house));
  cube(2.05, 3.65, .28, 0x704d3a, 0, 2.05, 4.84, house);
  cube(2.42, .18, .32, trim, 0, 3.95, 4.94, house);
  cube(.16, 3.9, .3, trim, -1.12, 2.05, 4.93, house);
  cube(.16, 3.9, .3, trim, 1.12, 2.05, 4.93, house);

  // Front windows with trim and shutters.
  [-3.75, 3.75].forEach((wx) => {
    cube(2.35, 2.05, .18, trim, wx, 3.25, 4.79, house);
    cube(1.94, 1.65, .22, 0x91cfe5, wx, 3.25, 4.91, house);
    cube(.11, 1.65, .25, trim, wx, 3.25, 5.03, house);
    cube(1.94, .11, .25, trim, wx, 3.25, 5.04, house);
    cube(.26, 1.75, .18, roofColor, wx - 1.16, 3.25, 4.96, house);
    cube(.26, 1.75, .18, roofColor, wx + 1.16, 3.25, 4.96, house);
  });

  // Side windows make the structure read as a full house from orbiting views.
  [-1, 1].forEach((side) => {
    cube(.18, 1.75, 2.15, trim, side * 5.79, 3.1, -.8, house);
    cube(.2, 1.42, 1.78, 0x91cfe5, side * 5.91, 3.1, -.8, house);
  });

  // Chimney, flower beds and garden details.
  cube(1.0, 3.0, 1.0, 0x82665a, 3.55, style === 1 ? 8.4 : 7.6, -1.5, house);
  [-3.9, 3.9].forEach((x) => {
    cube(2.4, .58, .75, 0x4f7f4e, x, .43, 5.2, house);
    const flowers = new THREE.Mesh(new THREE.SphereGeometry(.32, 9, 7), material(x < 0 ? 0xe89bb7 : 0xf0c76b, .8));
    flowers.position.set(x, .9, 5.25);
    house.add(flowers);
  });

  const porchLight = new THREE.Mesh(
    new THREE.SphereGeometry(.14, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffefb8, emissive: 0xffc85d, emissiveIntensity: 1.5 })
  );
  porchLight.position.set(1.45, 3.85, 5.08);
  house.add(porchLight);

  const plate = makeTextSprite('HOUSE', '#ffffff', 'rgba(31,41,55,.72)');
  plate.position.set(0, style === 1 ? 10.6 : 9.9, 0);
  plate.scale.set(3.0, .75, 1);
  house.add(plate);

  parent.add(house);
  proceduralHouses.set(key, { id: key, x: globalX, z: globalZ, group: house, style });
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
  ground.position.y = -.015;
  ground.receiveShadow = true;
  group.add(ground);

  // Cross-street grid. Houses are deliberately kept 27+ units from either road center.
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
    { x: -31, z: -30, face: 'x' },
    { x: 31, z: -30, face: 'z' },
    { x: -31, z: 30, face: 'z' },
    { x: 31, z: 30, face: 'x' }
  ];

  lots.forEach((lot, i) => {
    const tangentJitter = (seededValue(cx, cz, 10 + i) - .5) * 5.0;
    const lx = lot.face === 'x' ? lot.x : lot.x + tangentJitter;
    const lz = lot.face === 'z' ? lot.z : lot.z + tangentJitter;
    const rotation = lot.face === 'x'
      ? (lx < 0 ? Math.PI / 2 : -Math.PI / 2)
      : (lz < 0 ? 0 : Math.PI);

    const houseKey = key + ':h' + i;
    procHouse(
      group,
      originX + lx,
      originZ + lz,
      lx,
      lz,
      cx * 97 + cz * 193 + i * 31,
      houseKey,
      rotation
    );
  });

  // Trees occupy lawn areas, never road/sidewalk corridors or house footprints.
  for (let i = 0; i < 12; i += 1) {
    let lx = (seededValue(cx, cz, 100 + i * 2) - .5) * 84;
    let lz = (seededValue(cx, cz, 101 + i * 2) - .5) * 84;
    if (Math.abs(lx) < 15) lx = (lx < 0 ? -1 : 1) * (17 + seededValue(cx, cz, 300 + i) * 8);
    if (Math.abs(lz) < 15) lz = (lz < 0 ? -1 : 1) * (17 + seededValue(cx, cz, 400 + i) * 8);

    const tooCloseToHouse = lots.some((lot) => Math.hypot(lx - lot.x, lz - lot.z) < 11);
    if (tooCloseToHouse) continue;

    const scale = .82 + seededValue(cx, cz, 200 + i) * .38;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.28 * scale, .4 * scale, 2.9 * scale, 9), material(0x755238));
    trunk.position.set(lx, 1.45 * scale, lz);
    trunk.castShadow = true;
    group.add(trunk);

    const canopy = new THREE.Group();
    const leafMat = material(i % 3 === 0 ? 0x467f49 : 0x397746, 1);
    [[0, 0, 0, 1.45], [-.9, -.2, .15, .92], [.9, -.18, -.12, .95]].forEach((v) => {
      const leaf = new THREE.Mesh(new THREE.DodecahedronGeometry(v[3] * scale, 0), leafMat);
      leaf.position.set(v[0] * scale, v[1] * scale, v[2] * scale);
      leaf.castShadow = true;
      canopy.add(leaf);
    });
    canopy.position.set(lx, 3.8 * scale, lz);
    group.add(canopy);

    proceduralTrees.set(key + ':t' + i, { x: originX + lx, z: originZ + lz, scale });
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
  for (const treeKey of proceduralTrees.keys()) {
    if (treeKey.startsWith(key + ':')) proceduralTrees.delete(treeKey);
  }
}

function updateWorldStreaming(x, z, force = false) {
  const centerX = Math.round(x / CHUNK_SIZE);
  const centerZ = Math.round(z / CHUNK_SIZE);

  if (
    !force &&
    centerX === streamedCenterChunkX &&
    centerZ === streamedCenterChunkZ
  ) return;

  streamedCenterChunkX = centerX;
  streamedCenterChunkZ = centerZ;

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

  if (populationReady) {
    updatePopulationZone(centerX, centerZ);
  }
}

updateWorldStreaming(0, 0, true);

function createAvatar(data, local = false) {
  const gender = data.gender === 'male' ? 'male' : 'female';
  const outfit = OUTFITS[data.outfit] || OUTFITS.sky;
  const root = new THREE.Group();
  const visual = new THREE.Group();
  root.add(visual);

  const skinTone = SKIN_TONES[data.skinTone] || SKIN_TONES.light;
  const hairColor = HAIR_COLORS[data.hairColor] || HAIR_COLORS.espresso;
  const eyeColor = EYE_COLORS[data.eyeColor] || EYE_COLORS.violet;
  const hairStyle = ['classic', 'short', 'pony'].includes(data.hairStyle) ? data.hairStyle : 'classic';

  const skin = material(skinTone, .68);
  const hair = material(hairColor, .8);
  const top = material(outfit.top, .55);
  const top2 = material(outfit.top2, .6);
  const bottom = material(outfit.bottom, .7);
  const accent = material(outfit.accent, .55);
  const shoes = material(outfit.shoes, .58);
  const eyeDark = new THREE.MeshStandardMaterial({ color: 0x202638, roughness: .26 });
  const eyeTint = new THREE.MeshStandardMaterial({ color: eyeColor, roughness: .24 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Head with facial features parented directly to it so they stay flush at every angle.
  const head = new THREE.Mesh(new THREE.SphereGeometry(.72, 28, 22), skin);
  head.position.y = 4.55;
  head.scale.set(.92, 1.04, .88);
  head.castShadow = true;
  visual.add(head);

  const faceRig = new THREE.Group();
  head.add(faceRig);

  [-.29, .29].forEach((x) => {
    const eyeWhite = new THREE.Mesh(new THREE.CircleGeometry(.155, 22), white);
    eyeWhite.position.set(x, .035, .665);
    eyeWhite.scale.set(1, .72, 1);
    faceRig.add(eyeWhite);

    const iris = new THREE.Mesh(new THREE.CircleGeometry(.09, 20), eyeTint);
    iris.position.set(x, .025, .671);
    iris.scale.set(.92, 1.08, 1);
    faceRig.add(iris);

    const pupil = new THREE.Mesh(new THREE.CircleGeometry(.042, 16), eyeDark);
    pupil.position.set(x, .025, .676);
    faceRig.add(pupil);

    const shine = new THREE.Mesh(new THREE.CircleGeometry(.018, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    shine.position.set(x - .025, .075, .678);
    faceRig.add(shine);

    const lash = new THREE.Mesh(new THREE.BoxGeometry(.245, .026, .012), eyeDark);
    lash.position.set(x, .155, .647);
    lash.rotation.z = x < 0 ? -.08 : .08;
    faceRig.add(lash);
  });

  // Nose is intentionally low-relief instead of a detached sphere.
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), material(0xd59a79, .8));
  nose.position.set(0, -.115, .713);
  nose.scale.set(.6, .7, .22);
  faceRig.add(nose);

  const smileCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-.115, -.29, .655),
    new THREE.Vector3(0, -.37, .625),
    new THREE.Vector3(.115, -.29, .655)
  );
  const mouth = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(smileCurve.getPoints(14)),
    new THREE.LineBasicMaterial({ color: 0xa85f67 })
  );
  faceRig.add(mouth);

  if (gender === 'female') {
    [-.43, .43].forEach((x) => {
      const blush = new THREE.Mesh(
        new THREE.CircleGeometry(.07, 16),
        new THREE.MeshBasicMaterial({ color: 0xe69b9c, transparent: true, opacity: .24 })
      );
      blush.position.set(x, -.18, .555);
      blush.scale.set(1.6, .5, 1);
      faceRig.add(blush);
    });
  }

  // Layered anime hair cap.
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(.77, 26, 18, 0, Math.PI * 2, 0, Math.PI * .65), hair);
  hairCap.position.set(0, 4.78, -.03);
  hairCap.scale.set(1.02, .9, 1.02);
  hairCap.castShadow = true;
  visual.add(hairCap);

  const fringe = new THREE.Group();
  [-.48, -.25, 0, .25, .48].forEach((x, i) => {
    const lock = new THREE.Mesh(new THREE.ConeGeometry(.13 + (i === 2 ? .03 : 0), .72 - Math.abs(x) * .22, 8), hair);
    lock.position.set(x, 4.72 - Math.abs(x) * .08, .54);
    lock.rotation.x = Math.PI;
    lock.rotation.z = x * .28;
    fringe.add(lock);
  });
  visual.add(fringe);

  if (hairStyle === 'short') {
    [-1, 1].forEach((side) => {
      const sideLayer = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .55, 5, 9), hair);
      sideLayer.position.set(side * .6, 4.28, -.08);
      sideLayer.castShadow = true;
      visual.add(sideLayer);
    });
  } else if (hairStyle === 'pony') {
    if (gender === 'female') {
      const pony = new THREE.Mesh(new THREE.CapsuleGeometry(.28, 1.25, 6, 11), hair);
      pony.position.set(.38, 3.95, -.66);
      pony.rotation.z = -.18;
      pony.castShadow = true;
      visual.add(pony);
      [-1, 1].forEach((side) => {
        const sideLayer = new THREE.Mesh(new THREE.CapsuleGeometry(.15, .85, 5, 9), hair);
        sideLayer.position.set(side * .6, 4.05, -.04);
        visual.add(sideLayer);
      });
    } else {
      [-.58, -.36, -.12, .12, .36, .58].forEach((x, i) => {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(.14, .54 + (i % 2) * .14, 8), hair);
        spike.position.set(x, 5.2 + (i % 2) * .06, -.02);
        spike.rotation.z = -x * .48;
        visual.add(spike);
      });
    }
  } else if (gender === 'female') {
    [-1, 1].forEach((side) => {
      const sideLayer = new THREE.Mesh(new THREE.CapsuleGeometry(.18, 1.28, 5, 9), hair);
      sideLayer.position.set(side * .61, 3.86, -.08);
      sideLayer.rotation.z = side * -.05;
      sideLayer.castShadow = true;
      visual.add(sideLayer);
    });
    const backHair = new THREE.Mesh(new THREE.CapsuleGeometry(.46, 1.42, 6, 11), hair);
    backHair.position.set(0, 3.78, -.48);
    backHair.scale.set(1.05, 1, .72);
    backHair.castShadow = true;
    visual.add(backHair);
  } else {
    [-.54, -.3, 0, .3, .54].forEach((x, i) => {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(.13, .4 + (i % 2) * .1, 8), hair);
      spike.position.set(x, 5.14 + (i % 2) * .04, -.02);
      spike.rotation.z = -x * .35;
      visual.add(spike);
    });
  }

  // Slim anime torso and waist.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.48, 1.16, 7, 12), top);
  torso.position.y = 3.15;
  torso.scale.set(gender === 'female' ? .88 : 1.02, 1, .72);
  torso.castShadow = true;
  visual.add(torso);

  const waist = new THREE.Mesh(new THREE.CylinderGeometry(.4, .46, .5, 14), bottom);
  waist.position.y = 2.25;
  waist.castShadow = true;
  visual.add(waist);

  // Outfit details retained but re-shaped for the anime body.
  if (data.outfit === 'street') {
    const jacket = new THREE.Mesh(new THREE.BoxGeometry(1.02, .96, .14), top2);
    jacket.position.set(0, 3.18, .46);
    jacket.castShadow = true;
    visual.add(jacket);
    const zip = new THREE.Mesh(new THREE.BoxGeometry(.03, .82, .02), accent);
    zip.position.set(0, 3.18, .55);
    visual.add(zip);
  } else if (data.outfit === 'berry') {
    const ribbon = new THREE.Mesh(new THREE.OctahedronGeometry(.16), accent);
    ribbon.position.set(0, 3.55, .53);
    ribbon.scale.set(1.55, .65, .45);
    visual.add(ribbon);
  } else if (data.outfit === 'mint') {
    const badge = new THREE.Mesh(new THREE.CircleGeometry(.13, 16), accent);
    badge.position.set(.26, 3.22, .54);
    visual.add(badge);
  } else if (data.outfit === 'sunrise') {
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(.28, .07, 8, 20), accent);
    scarf.position.set(0, 3.75, .02);
    scarf.rotation.x = Math.PI / 2;
    visual.add(scarf);
  } else {
    const collarL = new THREE.Mesh(new THREE.BoxGeometry(.38, .12, .08), top2);
    collarL.position.set(-.18, 3.63, .48);
    collarL.rotation.z = -.35;
    visual.add(collarL);
    const collarR = collarL.clone();
    collarR.position.x = .18;
    collarR.rotation.z = .35;
    visual.add(collarR);
  }

  if (gender === 'female') {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(.4, .58, .58, 18), bottom);
    skirt.position.y = 2.0;
    skirt.castShadow = true;
    visual.add(skirt);
  }

  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * .58, 3.55, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(.13, .74, 4, 8), top2);
    upper.position.y = -.47;
    upper.castShadow = true;
    pivot.add(upper);

    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(.115, .62, 4, 8), skin);
    fore.position.y = -1.05;
    fore.castShadow = true;
    pivot.add(fore);

    const hand = new THREE.Mesh(new THREE.CapsuleGeometry(.115, .12, 4, 10), skin);
    hand.position.y = -1.43;
    hand.scale.set(.9, 1.05, .72);
    hand.castShadow = true;
    pivot.add(hand);

    const thumb = new THREE.Mesh(new THREE.SphereGeometry(.055, 9, 7), skin);
    thumb.position.set(side * .105, -1.4, .015);
    thumb.scale.set(.9, 1.1, .7);
    pivot.add(thumb);

    visual.add(pivot);
    return pivot;
  }

  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * .25, 2.15, 0);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(.15, .74, 4, 8), bottom);
    thigh.position.y = -.48;
    thigh.castShadow = true;
    pivot.add(thigh);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(.13, .72, 4, 8), gender === 'female' ? skin : bottom);
    shin.position.y = -1.12;
    shin.castShadow = true;
    pivot.add(shin);

    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .34, 5, 12), shoes);
    shoe.rotation.x = Math.PI / 2;
    shoe.position.set(0, -1.58, .16);
    shoe.scale.set(1.15, .72, 1.08);
    shoe.castShadow = true;
    pivot.add(shoe);

    const sole = new THREE.Mesh(new THREE.CapsuleGeometry(.17, .35, 4, 10), material(0xe5e7eb, .7));
    sole.rotation.x = Math.PI / 2;
    sole.position.set(0, -1.67, .18);
    sole.scale.set(1.16, .34, 1.08);
    pivot.add(sole);

    visual.add(pivot);
    return pivot;
  }

  const armL = makeArm(-1);
  const armR = makeArm(1);
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(local ? .62 : .5, local ? .79 : .63, 32),
    new THREE.MeshBasicMaterial({
      color: local ? 0xffffff : new THREE.Color(outfit.top),
      transparent: true,
      opacity: local ? .5 : .14,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .025;
  root.add(ring);

  const name = makeTextSprite(data.name || 'Player', '#ffffff', local ? 'rgba(79,70,229,.9)' : 'rgba(17,24,39,.82)');
  name.position.y = 5.72;
  name.scale.set(2.85, .7, 1);
  root.add(name);

  root.position.set(data.x || 0, data.y || 0, data.z || 0);
  root.rotation.y = data.rot || Math.PI;
  root.scale.setScalar(0.74);
  root.userData = {
    playerId: data.id || null,
    visual, torso, head, armL, armR, legL, legR, groundRing: ring,
    moving: false,
    sprinting: false,
    seated: false,
    punchStartedAt: 0,
    punchUntil: 0,
    hitUntil: 0,
    grounded: (data.y || 0) <= 0.001,
    verticalVelocity: 0,
    target: new THREE.Vector3(data.x || 0, data.y || 0, data.z || 0),
    targetRot: data.rot || Math.PI,
    local
  };

  root.traverse((node) => {
    node.userData.playerRoot = root;
    node.userData.playerId = data.id || null;
  });

  scene.add(root);
  return root;
}

const npcActors = [];
const npcCars = [];

function makeNpcWalker(index, route, runner = false) {
  const outfits = ['sky', 'berry', 'mint', 'street', 'sunrise'];
  const names = ['Mika', 'Ari', 'Ken', 'Lia', 'Noah', 'Sora', 'Aya', 'Jin'];
  const start = route[index % route.length];
  const npcHairStyles = ['classic', 'short', 'pony'];
  const npcHairColors = ['espresso', 'chestnut', 'midnight'];
  const npcSkinTones = ['light', 'warm', 'deep'];
  const npcEyeColors = ['violet', 'ocean', 'hazel'];
  const mesh = createAvatar({
    id: 'npc-' + index,
    name: names[index % names.length],
    gender: index % 2 ? 'male' : 'female',
    outfit: outfits[index % outfits.length],
    hairStyle: npcHairStyles[index % npcHairStyles.length],
    hairColor: npcHairColors[(index + 1) % npcHairColors.length],
    skinTone: npcSkinTones[index % npcSkinTones.length],
    eyeColor: npcEyeColors[(index + 2) % npcEyeColors.length],
    x: start[0],
    y: 0,
    z: start[1],
    rot: 0
  }, false);

  mesh.userData.groundRing.visible = false;
  if (MOBILE_PERF_MODE) {
    mesh.traverse((node) => {
      if (node.isMesh) node.castShadow = false;
    });
  }
  npcActors.push({
    id: 'npc-' + index,
    name: names[index % names.length],
    gender: index % 2 ? 'male' : 'female',
    mesh,
    route,
    routeTemplate: route.map((point) => [point[0], point[1]]),
    segment: index % route.length,
    progress: (index * .19) % 1,
    speed: runner ? 4.0 + (index % 2) * .35 : 1.75 + (index % 3) * .16,
    runner,
    pauseUntil: 0
  });
}

function makeNpcCar(index, axis, lane, direction) {
  const g = new THREE.Group();
  const colors = [0xd85f5f, 0x5c80c7, 0xe0a84f, 0x5fa078, 0x8c6cc0, 0xd7d9dc];
  const bodyColor = colors[index % colors.length];
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x8fc1d7,
    roughness: .18,
    metalness: .08,
    transparent: true,
    opacity: .88
  });

  // Stylized compact sedan: lower chassis, sculpted hood/trunk and raised cabin.
  cube(3.55, .58, 5.8, bodyColor, 0, .68, 0, g);
  cube(3.35, .42, 1.75, bodyColor, 0, 1.02, 2.02, g);
  cube(3.35, .36, 1.45, bodyColor, 0, .98, -2.12, g);
  cube(2.95, 1.05, 2.7, bodyColor, 0, 1.47, -.22, g);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.5, .72, .08), glassMat);
  windshield.position.set(0, 1.72, 1.12);
  windshield.rotation.x = -.4;
  g.add(windshield);

  const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(2.45, .68, .08), glassMat);
  rearWindow.position.set(0, 1.68, -1.42);
  rearWindow.rotation.x = .4;
  g.add(rearWindow);

  [-1, 1].forEach((side) => {
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(.07, .72, 1.45), glassMat);
    sideGlass.position.set(side * 1.48, 1.62, -.16);
    g.add(sideGlass);

    const mirror = cube(.28, .18, .42, bodyColor, side * 1.88, 1.35, .75, g);
    mirror.castShadow = true;
  });

  // Bumpers, grille and lights.
  cube(3.2, .2, .24, 0x343b45, 0, .62, 3.0, g);
  cube(3.2, .18, .22, 0x343b45, 0, .62, -3.0, g);
  cube(1.35, .24, .08, 0x20252c, 0, .82, 3.14, g);

  [-1.12, 1.12].forEach((x) => {
    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(.52, .26, .1),
      new THREE.MeshStandardMaterial({ color: 0xfff2b8, emissive: 0xffd76a, emissiveIntensity: 1.35 })
    );
    headlight.position.set(x, .9, 3.13);
    g.add(headlight);
  });

  const brakeMaterial = new THREE.MeshStandardMaterial({
    color: 0x9f2525,
    emissive: 0x4b0909,
    emissiveIntensity: .55,
    roughness: .55
  });
  [-1.12, 1.12].forEach((x) => {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(.5, .25, .1), brakeMaterial);
    tail.position.set(x, .88, -3.13);
    g.add(tail);
  });

  const wheels = [];
  [[-1.58,-1.95],[1.58,-1.95],[-1.58,1.95],[1.58,1.95]].forEach(([x,z]) => {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(.48, .48, .34, 16),
      material(0x24282f,.92)
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x,.48,z);
    wheel.castShadow = true;
    g.add(wheel);
    wheels.push(wheel);
  });

  // Visible driver.
  const driverHead = new THREE.Mesh(new THREE.SphereGeometry(.28, 14, 10), material(0xefbd9b,.7));
  driverHead.position.set(-.62, 1.86, .02);
  g.add(driverHead);
  const driverTorso = new THREE.Mesh(
    new THREE.BoxGeometry(.62,.66,.48),
    material(index % 2 ? 0x4b6a8d : 0x885b7e,.7)
  );
  driverTorso.position.set(-.62,1.45,-.02);
  g.add(driverTorso);

  if (axis === 'x') {
    g.position.set(direction > 0 ? -82 : 82, 0, lane);
    g.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    g.position.set(lane, 0, direction > 0 ? -82 : 82);
    g.rotation.y = direction > 0 ? 0 : Math.PI;
  }

  g.scale.set(1.34, 1.22, 1.34);

  if (MOBILE_PERF_MODE) {
    g.traverse((node) => {
      if (node.isMesh) node.castShadow = false;
    });
  }

  scene.add(g);
  const speed = 8 + (index % 3) * 1.4;
  npcCars.push({
    mesh: g,
    axis,
    lane,
    laneOffset: lane,
    direction,
    speed,
    currentSpeed: speed,
    wheels,
    brakeMaterial,
    blockedSince: 0,
    hornCount: 0,
    pendingReverse: false,
    clearSince: 0
  });
}

function initNpcLife() {
  const routes = [
    [[-14,-14],[-14,-60],[-60,-60],[-60,-14]],
    [[14,14],[14,60],[60,60],[60,14]],
    [[-60,14],[-14,14],[-14,60],[-60,60]],
    [[14,-60],[60,-60],[60,-14],[14,-14]],
    [[18,29],[21,38],[30,41],[39,38],[42,29],[39,20],[30,17],[21,20]]
  ];

  for (let i = 0; i < 8; i += 1) makeNpcWalker(i, routes[i % routes.length], i === 2 || i === 6);

  makeNpcCar(0, 'x', -3.8, 1);
  makeNpcCar(1, 'x', 3.8, -1);
  makeNpcCar(2, 'z', -3.8, 1);
  makeNpcCar(3, 'z', 3.8, -1);
  makeNpcCar(4, 'x', -5.4, -1);
  makeNpcCar(5, 'z', 5.4, 1);
}
initNpcLife();

let populationChunkX = 0;
let populationChunkZ = 0;
let populationOriginX = 0;
let populationOriginZ = 0;

function updatePopulationZone(chunkX, chunkZ) {
  if (chunkX === populationChunkX && chunkZ === populationChunkZ) return;

  populationChunkX = chunkX;
  populationChunkZ = chunkZ;
  populationOriginX = chunkX * CHUNK_SIZE;
  populationOriginZ = chunkZ * CHUNK_SIZE;

  npcActors.forEach((npc, index) => {
    npc.route = npc.routeTemplate.map((point) => [
      populationOriginX + point[0],
      populationOriginZ + point[1]
    ]);

    npc.segment = (npc.segment + index) % npc.route.length;
    npc.progress = seededValue(chunkX, chunkZ, 700 + index);

    const from = npc.route[npc.segment];
    const to = npc.route[(npc.segment + 1) % npc.route.length];
    npc.mesh.position.set(
      THREE.MathUtils.lerp(from[0], to[0], npc.progress),
      0,
      THREE.MathUtils.lerp(from[1], to[1], npc.progress)
    );
  });

  npcCars.forEach((car, index) => {
    car.currentSpeed = car.speed;

    if (car.axis === 'x') {
      car.lane = populationOriginZ + car.laneOffset;
      car.mesh.position.set(
        populationOriginX + (car.direction > 0 ? -42 : 42) + index * .35,
        0,
        car.lane
      );
    } else {
      car.lane = populationOriginX + car.laneOffset;
      car.mesh.position.set(
        car.lane,
        0,
        populationOriginZ + (car.direction > 0 ? -42 : 42) + index * .35
      );
    }
  });
}

populationReady = true;
updatePopulationZone(0, 0);

function trafficCharacters() {
  const characters = [];

  if (me && !insideHouse) characters.push(me.position);
  remotePlayers.forEach((remote) => {
    if (remote.mesh.visible) characters.push(remote.mesh.position);
  });
  npcActors.forEach((npc) => {
    if (npc.mesh.visible) characters.push(npc.mesh.position);
  });

  return characters;
}

function pointAheadOfCar(car, point, forwardDistance = 9.5, lateralDistance = 2.8, direction = car.direction) {
  const cx = car.mesh.position.x;
  const cz = car.mesh.position.z;

  if (car.axis === 'x') {
    const ahead = (point.x - cx) * direction;
    const lateral = Math.abs(point.z - car.lane);
    return ahead > 0 && ahead < forwardDistance && lateral < lateralDistance;
  }

  const ahead = (point.z - cz) * direction;
  const lateral = Math.abs(point.x - car.lane);
  return ahead > 0 && ahead < forwardDistance && lateral < lateralDistance;
}

function carRoadBlocked(car, direction = car.direction) {
  if (trafficCharacters().some((p) => pointAheadOfCar(car, p, 9.5, 2.8, direction))) {
    return true;
  }

  return npcCars.some((other) => {
    if (other === car || !other.mesh.visible) return false;

    const dx = other.mesh.position.x - car.mesh.position.x;
    const dz = other.mesh.position.z - car.mesh.position.z;
    const distance = Math.hypot(dx, dz);

    // Close cars at intersections get priority spacing regardless of axis.
    if (distance < 5.8) {
      const forwardX = car.axis === 'x' ? direction : 0;
      const forwardZ = car.axis === 'z' ? direction : 0;
      const dot = dx * forwardX + dz * forwardZ;
      if (dot > 0) return true;
    }

    if (car.axis === other.axis) {
      return pointAheadOfCar(car, other.mesh.position, 11.5, 3.3, direction);
    }

    return false;
  });
}

function carShouldBrake(car) {
  return carRoadBlocked(car, car.direction);
}

function reverseCarDirection(car) {
  car.direction *= -1;
  car.mesh.rotation.y += Math.PI;
  car.currentSpeed = 0;
  car.blockedSince = 0;
  car.hornCount = 0;
  car.pendingReverse = false;
}

let gameAudioContext = null;
let musicMaster = null;
let musicInterval = null;
let musicEnabled = true;
let ambientStep = 0;

function ensureGameAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!gameAudioContext || gameAudioContext.state === 'closed') {
    gameAudioContext = new AudioContextClass({ latencyHint: 'interactive' });
  }
  if (gameAudioContext.state === 'suspended') gameAudioContext.resume().catch(() => {});
  return gameAudioContext;
}

function playAmbientChord() {
  const ctx = ensureGameAudio();
  if (!ctx || !musicEnabled) return;

  if (!musicMaster) {
    musicMaster = ctx.createGain();
    musicMaster.gain.value = .026;
    musicMaster.connect(ctx.destination);
  }

  const chords = [
    [196.00, 246.94, 293.66],
    [174.61, 220.00, 261.63],
    [146.83, 196.00, 246.94],
    [164.81, 207.65, 261.63]
  ];
  const notes = chords[ambientStep % chords.length];
  ambientStep += 1;

  const now = ctx.currentTime;
  notes.forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = index === 1 ? 'triangle' : 'sine';
    osc.frequency.value = frequency / 2;
    filter.type = 'lowpass';
    filter.frequency.value = 780;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(.018 / notes.length, now + 1.4);
    gain.gain.setValueAtTime(.018 / notes.length, now + 4.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 6.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(musicMaster);
    osc.start(now);
    osc.stop(now + 6.5);
  });
}

function startAmbientMusic() {
  ensureGameAudio();
  if (!musicEnabled) return;
  if (!musicInterval) {
    playAmbientChord();
    musicInterval = window.setInterval(playAmbientChord, 5600);
  }
}

function setMusicEnabled(enabled) {
  musicEnabled = enabled;
  const button = document.querySelector('#music-btn');
  if (button) button.classList.toggle('active', musicEnabled);

  if (musicEnabled) {
    startAmbientMusic();
  } else {
    if (musicInterval) window.clearInterval(musicInterval);
    musicInterval = null;
    if (musicMaster && gameAudioContext) {
      musicMaster.gain.setTargetAtTime(.0001, gameAudioContext.currentTime, .08);
    }
  }
}

function playCarHorn(car) {
  const ctx = ensureGameAudio();
  if (!ctx) return;
  const now = ctx.currentTime;

  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (pan && me) {
    pan.pan.value = THREE.MathUtils.clamp((car.mesh.position.x - me.position.x) / 30, -1, 1);
  }

  const output = ctx.createGain();
  output.gain.setValueAtTime(.0001, now);
  output.gain.exponentialRampToValueAtTime(.045, now + .025);
  output.gain.exponentialRampToValueAtTime(.0001, now + .24);

  if (pan) {
    output.connect(pan);
    pan.connect(ctx.destination);
  } else {
    output.connect(ctx.destination);
  }

  [392, 493.88].forEach((frequency) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    osc.connect(output);
    osc.start(now);
    osc.stop(now + .25);
  });
}

function bestSpeechVoice(gender = 'female') {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const preferred = gender === 'male'
    ? /Guy|Daniel|David|Alex|Ryan|Google UK English Male|Microsoft.*Male/i
    : /Ava|Aria|Jenny|Samantha|Karen|Moira|Tessa|Google US English|Microsoft.*Female/i;

  return (
    voices.find((voice) => /^en(-|_)/i.test(voice.lang) && preferred.test(voice.name)) ||
    voices.find((voice) => /^en(-|_)/i.test(voice.lang) && /Natural|Neural|Premium|Enhanced/i.test(voice.name)) ||
    voices.find((voice) => /^en(-|_)/i.test(voice.lang)) ||
    voices[0]
  );
}

function speakNpcGreeting(text, gender) {
  if (!('speechSynthesis' in window) || !text) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = bestSpeechVoice(gender);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || 'en-US';
  utterance.rate = .96;
  utterance.pitch = gender === 'male' ? .93 : 1.03;
  utterance.volume = .8;

  const ctx = gameAudioContext;
  if (ctx && musicMaster) {
    musicMaster.gain.setTargetAtTime(.012, ctx.currentTime, .08);
    utterance.onend = () => {
      if (musicEnabled && gameAudioContext && musicMaster) {
        musicMaster.gain.setTargetAtTime(.026, gameAudioContext.currentTime, .18);
      }
    };
  }

  window.speechSynthesis.speak(utterance);
}

const NPC_PLEASANTRIES = [
  'Hey there! Beautiful day in Haven.',
  'Hi! Hope your day is going well.',
  'Hello! Nice to see someone around.',
  'Hey! Enjoying the neighborhood?',
  'Hi there! Take care out here.',
  'Good to see you! The town feels lively today.',
  'Hello! I was just out for a walk.',
  'Hey! Have a great time in Haven.'
];

function nearestNpc(maxDistance = 3.25) {
  if (!me || insideHouse) return null;
  let best = null;

  npcActors.forEach((npc) => {
    const d = Math.hypot(me.position.x - npc.mesh.position.x, me.position.z - npc.mesh.position.z);
    if (d < maxDistance && (!best || d < best.distance)) {
      best = { type: 'npc', npc, distance: d };
    }
  });

  return best;
}

function greetNpc(npc) {
  if (!npc || !me) return;
  npc.pauseUntil = performance.now() + 1800;
  npc.mesh.userData.moving = false;
  npc.mesh.userData.sprinting = false;
  npc.mesh.rotation.y = Math.atan2(
    me.position.x - npc.mesh.position.x,
    me.position.z - npc.mesh.position.z
  );
  const greeting = NPC_PLEASANTRIES[Math.floor(Math.random() * NPC_PLEASANTRIES.length)];
  toast(npc.name + ': “' + greeting + '”');
  speakNpcGreeting(greeting, npc.gender);
}

function startPunchAnimation(group) {
  if (!group) return;
  const now = performance.now();
  group.userData.punchStartedAt = now;
  group.userData.punchUntil = now + 360;
}

function startHitReaction(group) {
  if (!group) return;
  group.userData.hitUntil = performance.now() + 320;
}

function nearestPunchTarget(maxDistance = 2.7) {
  if (!me || insideHouse || me.userData.seated) return null;
  const forwardX = Math.sin(me.rotation.y);
  const forwardZ = Math.cos(me.rotation.y);
  let best = null;

  const consider = (type, id, mesh, extra = null) => {
    const dx = mesh.position.x - me.position.x;
    const dz = mesh.position.z - me.position.z;
    const d = Math.hypot(dx, dz);
    if (d <= .01 || d > maxDistance) return;
    const dot = (dx / d) * forwardX + (dz / d) * forwardZ;
    if (dot < .15) return;
    if (!best || d < best.distance) best = { type, id, mesh, extra, distance: d };
  };

  remotePlayers.forEach((remote, id) => consider('player', id, remote.mesh));
  npcActors.forEach((npc) => consider('npc', npc.id, npc.mesh, npc));

  return best;
}

function punchNearest() {
  if (!me || transitioningHouse || insideHouse || me.userData.seated) return;
  startPunchAnimation(me);

  const target = nearestPunchTarget();
  if (!target) return;

  if (target.type === 'npc') {
    startHitReaction(target.mesh);
    target.extra.pauseUntil = performance.now() + 900;
    const reactions = ['Hey!', 'Whoa!', 'Watch it!', 'Easy there!'];
    toast(target.extra.name + ': “' + reactions[Math.floor(Math.random() * reactions.length)] + '”');
    return;
  }

  socket.emit('combat:punch', target.id);
}

function updateNpcLife(delta, time) {
  if (insideHouse) return;

  npcActors.forEach((npc) => {
    if (npc.pauseUntil > performance.now()) {
      npc.mesh.userData.moving = false;
      npc.mesh.userData.sprinting = false;
      updateAvatarAnimation(npc.mesh, time, delta);
      return;
    }

    const route = npc.route;
    const a = route[npc.segment % route.length];
    const b = route[(npc.segment + 1) % route.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const length = Math.max(.001, Math.hypot(dx, dz));

    npc.progress += (npc.speed * delta) / length;
    if (npc.progress >= 1) {
      npc.progress -= 1;
      npc.segment = (npc.segment + 1) % route.length;
    }

    const from = route[npc.segment % route.length];
    const to = route[(npc.segment + 1) % route.length];
    npc.mesh.position.x = THREE.MathUtils.lerp(from[0], to[0], npc.progress);
    npc.mesh.position.z = THREE.MathUtils.lerp(from[1], to[1], npc.progress);
    npc.mesh.rotation.y = Math.atan2(to[0] - from[0], to[1] - from[1]);
    npc.mesh.userData.moving = true;
    npc.mesh.userData.sprinting = npc.runner;
    updateAvatarAnimation(npc.mesh, time + npc.segment * .7, delta);
  });

  npcCars.forEach((car) => {
    const now = performance.now();
    const braking = carShouldBrake(car);

    if (braking) {
      if (!car.blockedSince) car.blockedSince = now;
      const stoppedFor = now - car.blockedSince;

      if (stoppedFor >= 5000 && car.hornCount < 1) {
        playCarHorn(car);
        car.hornCount = 1;
      }

      if (stoppedFor >= 10000 && car.hornCount < 2) {
        playCarHorn(car);
        car.hornCount = 2;
        car.pendingReverse = true;
      }

      // After two honks (~10 seconds stopped), reverse only when the path behind is clear.
      if (car.pendingReverse && !carRoadBlocked(car, -car.direction)) {
        reverseCarDirection(car);
      }
    } else {
      car.blockedSince = 0;
      car.hornCount = 0;
      car.pendingReverse = false;
    }

    const targetSpeed = braking ? 0 : car.speed;
    car.currentSpeed = THREE.MathUtils.lerp(
      car.currentSpeed,
      targetSpeed,
      Math.min(1, delta * (braking ? 8.5 : 2.4))
    );

    car.brakeMaterial.emissiveIntensity = braking ? 2.2 : .55;

    car.wheels.forEach((wheel) => {
      wheel.rotation.x -= car.currentSpeed * delta * .72;
    });

    if (car.axis === 'x') {
      car.mesh.position.x += car.direction * car.currentSpeed * delta;
      if (car.mesh.position.x > populationOriginX + 44) car.mesh.position.x = populationOriginX - 44;
      if (car.mesh.position.x < populationOriginX - 44) car.mesh.position.x = populationOriginX + 44;
    } else {
      car.mesh.position.z += car.direction * car.currentSpeed * delta;
      if (car.mesh.position.z > populationOriginZ + 44) car.mesh.position.z = populationOriginZ - 44;
      if (car.mesh.position.z < populationOriginZ - 44) car.mesh.position.z = populationOriginZ + 44;
    }
  });
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

  if (transitioningHouse || me.userData.seated) {
    me.userData.moving = false;
    me.userData.sprinting = false;
    return;
  }

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

    const mobileSprint = IS_COARSE_POINTER && Math.hypot(joystick.x, joystick.y) > .9;
    const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight') || mobileSprint;
    const speed = sprinting ? 11.4 : 5.6;
    me.userData.sprinting = sprinting;
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);

    // CameraYaw describes the camera's offset from the player, so movement must
    // use the opposite vector for screen-forward and a perpendicular vector for right.
    const dx = (-forward * sin + strafe * cos) * speed * delta;
    const dz = (-forward * cos - strafe * sin) * speed * delta;

    me.position.x += dx;
    me.position.z += dz;

    if (insideHouse) {
      // Keep the player inside the furnished room; leaving is only through E at the door.
      me.position.x = THREE.MathUtils.clamp(me.position.x, insideHouse.x - 8.0, insideHouse.x + 8.0);
      me.position.z = THREE.MathUtils.clamp(me.position.z, insideHouse.z - 7.1, insideHouse.z + 6.1);
    }

    const targetRot = Math.atan2(dx, dz);
    me.rotation.y = lerpAngle(me.rotation.y, targetRot, Math.min(1, delta * 12));
  }

  me.userData.moving = moving;
  if (!moving) me.userData.sprinting = false;

  if (!me.userData.grounded || me.position.y > 0) {
    me.userData.verticalVelocity -= 22 * delta;
    me.position.y += me.userData.verticalVelocity * delta;

    if (me.position.y <= 0) {
      me.position.y = 0;
      me.userData.verticalVelocity = 0;
      me.userData.grounded = true;
    }
  }
}

function updateAvatarAnimation(group, time, delta) {
  if (group.userData.seated) {
    group.userData.moving = false;
    group.userData.sprinting = false;
    group.userData.legL.rotation.x = THREE.MathUtils.lerp(group.userData.legL.rotation.x, -1.42, Math.min(1, delta * 10));
    group.userData.legR.rotation.x = THREE.MathUtils.lerp(group.userData.legR.rotation.x, -1.42, Math.min(1, delta * 10));
    group.userData.armL.rotation.x = THREE.MathUtils.lerp(group.userData.armL.rotation.x, -.25, Math.min(1, delta * 10));
    group.userData.armR.rotation.x = THREE.MathUtils.lerp(group.userData.armR.rotation.x, -.25, Math.min(1, delta * 10));
    group.userData.visual.position.y = THREE.MathUtils.lerp(group.userData.visual.position.y, -.9, Math.min(1, delta * 10));
    group.userData.visual.rotation.z = THREE.MathUtils.lerp(group.userData.visual.rotation.z, 0, Math.min(1, delta * 10));
    group.userData.torso.rotation.x = THREE.MathUtils.lerp(group.userData.torso.rotation.x, .08, Math.min(1, delta * 10));
    return;
  }

  const moving = group.userData.moving;
  const sprinting = Boolean(group.userData.sprinting);
  const speed = moving ? (sprinting ? 13.5 : 9.0) : 1.6;
  const stride = Math.sin(time * speed);
  const legAmp = moving ? (sprinting ? .82 : .58) : .018;
  const armAmp = moving ? (sprinting ? .74 : .48) : .026;

  group.userData.legL.rotation.x = stride * legAmp;
  group.userData.legR.rotation.x = -stride * legAmp;
  group.userData.armL.rotation.x = -stride * armAmp;
  group.userData.armR.rotation.x = stride * armAmp;

  const nowMs = performance.now();
  if (group.userData.punchUntil > nowMs) {
    const total = Math.max(1, group.userData.punchUntil - group.userData.punchStartedAt);
    const progress = THREE.MathUtils.clamp((nowMs - group.userData.punchStartedAt) / total, 0, 1);
    const swing = Math.sin(progress * Math.PI);
    group.userData.armR.rotation.x = -1.75 * swing;
    group.userData.armR.rotation.z = -.34 * swing;
    group.userData.torso.rotation.y = -.18 * swing;
  } else {
    group.userData.armR.rotation.z = THREE.MathUtils.lerp(group.userData.armR.rotation.z, 0, Math.min(1, delta * 12));
    group.userData.torso.rotation.y = THREE.MathUtils.lerp(group.userData.torso.rotation.y, 0, Math.min(1, delta * 12));
  }

  const bob = moving
    ? Math.abs(Math.sin(time * speed * 2)) * (sprinting ? .075 : .045)
    : Math.sin(time * 1.6) * .008;
  group.userData.visual.position.y = THREE.MathUtils.lerp(
    group.userData.visual.position.y,
    bob,
    Math.min(1, delta * 13)
  );

  const hitLean = group.userData.hitUntil > performance.now() ? .22 : 0;
  group.userData.visual.rotation.z = THREE.MathUtils.lerp(
    group.userData.visual.rotation.z,
    hitLean || (moving ? -stride * (sprinting ? .035 : .02) : Math.sin(time * 1.05) * .006),
    Math.min(1, delta * 8)
  );

  group.userData.torso.rotation.x = THREE.MathUtils.lerp(
    group.userData.torso.rotation.x,
    sprinting ? .12 : moving ? .035 : 0,
    Math.min(1, delta * 9)
  );

  group.userData.head.rotation.y = Math.sin(time * .72) * .025;
  group.userData.groundRing.rotation.z += delta * (group.userData.local ? .55 : .18);
}

function updateCamera(delta) {
  if (!me) return;
  const target = me.position.clone().add(new THREE.Vector3(0, cameraDistance > 18 ? 3.2 : 2.25, 0));
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
    remote.mesh.userData.sprinting = Boolean(remote.data.sprinting);
    updateAvatarAnimation(remote.mesh, time, delta);
  }
}

function nearestHouse() {
  if (!me || insideHouse) return null;
  let best = null;

  homePositions.forEach((p, index) => {
    const d = Math.hypot(me.position.x - p[0], me.position.z - p[1]);
    if (d < 8 && (!best || d < best.distance)) {
      best = { type: 'house', homeId: index, distance: d, permanent: true, x: p[0], z: p[1] };
    }
  });

  proceduralHouses.forEach((house) => {
    const d = Math.hypot(me.position.x - house.x, me.position.z - house.z);
    if (d < 7.5 && (!best || d < best.distance)) {
      best = { type: 'house', homeId: house.id, distance: d, permanent: false, x: house.x, z: house.z };
    }
  });

  return best;
}

function nearestBench() {
  if (!me || insideHouse) return null;
  let best = null;
  benchSpots.forEach((bench) => {
    const d = Math.hypot(me.position.x - bench.x, me.position.z - bench.z);
    if (d < 3.6 && (!best || d < best.distance)) best = { type: 'bench', bench, distance: d };
  });
  return best;
}

function nearestInteractable() {
  if (!me) return null;

  if (insideHouse) {
    const d = Math.hypot(me.position.x - insideHouse.exitX, me.position.z - insideHouse.exitZ);
    return d < 4.2 ? { type: 'exit', distance: d } : null;
  }

  if (me.userData.seated && seatedBench) {
    return { type: 'bench-exit', bench: seatedBench, distance: 0 };
  }

  const npc = nearestNpc();
  const house = nearestHouse();
  const bench = nearestBench();

  let best = npc;
  if (bench && (!best || bench.distance < best.distance)) best = bench;
  if (house && (!best || house.distance < best.distance)) best = house;
  return best;
}

function setExteriorVisibility(visible) {
  world.visible = visible;
  remotePlayers.forEach((remote) => { remote.mesh.visible = visible; });
  npcActors.forEach((npc) => { npc.mesh.visible = visible; });
  npcCars.forEach((car) => { car.mesh.visible = visible; });
}

function showHouseLoading(title, duration = 520) {
  const loading = document.querySelector('#house-loading');
  const label = document.querySelector('#house-loading-title');
  if (label) label.textContent = title;
  loading.classList.add('show');
  return new Promise((resolve) => {
    window.setTimeout(() => {
      loading.classList.remove('show');
      resolve();
    }, duration);
  });
}

function standFromBench() {
  if (!me || !seatedBench) return;
  me.userData.seated = false;
  me.userData.visual.position.y = 0;
  me.userData.groundRing.visible = true;
  me.position.set(seatedBench.standX, 0, seatedBench.standZ);
  me.rotation.y = seatedBench.rot;
  seatedBench = null;
  toast('You stood up.');
}

function sitOnBench(bench) {
  if (!me || !bench || insideHouse) return;
  seatedBench = bench;
  me.userData.seated = true;
  me.userData.grounded = true;
  me.userData.verticalVelocity = 0;
  me.userData.groundRing.visible = false;
  me.position.set(bench.x, 0, bench.z);
  me.rotation.y = bench.rot;
  toast('Press E again to stand.');
}

function houseDescriptor(homeId) {
  if (typeof homeId === 'number' && homePositions[homeId]) {
    const p = homePositions[homeId];
    return {
      homeId,
      x: p[0],
      z: p[1],
      label: 'Home #' + (homeId + 1),
      entranceX: p[0],
      entranceZ: p[1] + 7.6
    };
  }

  const house = proceduralHouses.get(homeId);
  if (!house) return null;
  return {
    homeId,
    x: house.x,
    z: house.z,
    label: 'Neighborhood Home',
    entranceX: house.x,
    entranceZ: house.z + 7.4
  };
}

async function visitHouse(homeId) {
  if (!me || transitioningHouse) return;
  const house = houseDescriptor(homeId);
  if (!house) return;

  if (me.userData.seated) standFromBench();
  transitioningHouse = true;
  keys.clear();
  await showHouseLoading('Entering ' + house.label + '…', 560);

  savedCameraDistance = cameraDistance;
  cameraDistance = Math.min(cameraDistance, 5.8);
  interiorGroup.position.set(house.x, 0, house.z);
  interiorGroup.visible = true;
  setExteriorVisibility(false);

  insideHouse = {
    homeId: house.homeId,
    label: house.label,
    entranceX: house.entranceX,
    entranceZ: house.entranceZ,
    x: house.x,
    z: house.z,
    exitX: house.x,
    exitZ: house.z + 6.3
  };

  me.position.set(house.x, 0, house.z + 1.5);
  me.rotation.y = 0;
  me.userData.grounded = true;
  me.userData.verticalVelocity = 0;
  const homeButton = document.querySelector('#home-btn');
  homeButton.disabled = true;
  homeButton.title = 'Unavailable while inside a house';
  transitioningHouse = false;
  toast('Inside ' + house.label + '. Walk to the front door and press E to leave.');
}

async function leaveHouse() {
  if (!me || !insideHouse || transitioningHouse) return;
  transitioningHouse = true;
  keys.clear();
  const destination = { x: insideHouse.entranceX, z: insideHouse.entranceZ };
  await showHouseLoading('Stepping outside…', 380);

  interiorGroup.visible = false;
  setExteriorVisibility(true);
  me.position.set(destination.x, 0, destination.z);
  me.userData.grounded = true;
  me.userData.verticalVelocity = 0;
  insideHouse = null;
  if (savedCameraDistance != null) cameraDistance = savedCameraDistance;
  savedCameraDistance = null;
  const homeButton = document.querySelector('#home-btn');
  homeButton.disabled = false;
  homeButton.title = 'Go home';
  transitioningHouse = false;
}

function interactNearest() {
  const target = nearestInteractable();
  if (!target) return;

  if (target.type === 'npc') greetNpc(target.npc);
  else if (target.type === 'house') visitHouse(target.homeId);
  else if (target.type === 'bench') sitOnBench(target.bench);
  else if (target.type === 'bench-exit') standFromBench();
  else if (target.type === 'exit') leaveHouse();
}

document.addEventListener('keydown', (event) => {
  if (!joined) return;

  if (event.code === 'Space') {
    event.preventDefault();
    if (me && !me.userData.seated && !transitioningHouse && me.userData.grounded && !event.repeat) {
      me.userData.grounded = false;
      me.userData.verticalVelocity = insideHouse ? 5.2 : 8.4;
    }
  }

  keys.add(event.code);
  if (event.code === 'KeyE' && !event.repeat) {
    interactNearest();
  }

  if (event.code === 'KeyR' && !event.repeat) {
    event.preventDefault();
    punchNearest();
  }
});

document.addEventListener('keyup', (event) => keys.delete(event.code));

let dragging = false;
let dragButton = null;
let lastPointer = null;
let pointerDownPoint = null;
let pointerMoved = false;
let rightHoldReady = false;
let rightHoldTimer = null;

document.addEventListener('contextmenu', (event) => {
  if (window.matchMedia('(pointer: fine)').matches) event.preventDefault();
});

renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 && event.button !== 2) return;

  dragging = true;
  dragButton = event.button;
  pointerMoved = false;
  rightHoldReady = false;
  pointerDownPoint = { x: event.clientX, y: event.clientY };
  lastPointer = { x: event.clientX, y: event.clientY };
  renderer.domElement.setPointerCapture(event.pointerId);

  if (event.button === 2) {
    rightHoldTimer = window.setTimeout(() => {
      rightHoldReady = true;
      renderer.domElement.style.cursor = 'grabbing';
    }, 180);
  }
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!dragging || !lastPointer) return;

  const totalDx = event.clientX - pointerDownPoint.x;
  const totalDy = event.clientY - pointerDownPoint.y;

  if (dragButton === 0 && Math.hypot(totalDx, totalDy) > 5) {
    pointerMoved = true;
  }

  const canRotate = dragButton === 0 ? pointerMoved : rightHoldReady;
  if (canRotate) {
    pointerMoved = true;
    cameraYaw -= (event.clientX - lastPointer.x) * .005;
    cameraPitch = THREE.MathUtils.clamp(
      cameraPitch + (event.clientY - lastPointer.y) * .004,
      .08,
      .75
    );
  }

  lastPointer = { x: event.clientX, y: event.clientY };
});

renderer.domElement.addEventListener('pointerup', (event) => {
  if (event.button !== dragButton) return;

  if (rightHoldTimer) {
    clearTimeout(rightHoldTimer);
    rightHoldTimer = null;
  }

  const wasLeftClick = dragButton === 0 && !pointerMoved;
  dragging = false;
  dragButton = null;
  lastPointer = null;
  pointerDownPoint = null;
  rightHoldReady = false;
  renderer.domElement.style.cursor = '';

  if (wasLeftClick) {
    const playerId = pickPlayerAt(event.clientX, event.clientY);
    if (playerId) showPlayerPopup(playerId, event.clientX, event.clientY);
    else hidePlayerPopup();
  }
});

renderer.domElement.addEventListener('pointercancel', () => {
  if (rightHoldTimer) clearTimeout(rightHoldTimer);
  rightHoldTimer = null;
  dragging = false;
  dragButton = null;
  lastPointer = null;
  pointerDownPoint = null;
  pointerMoved = false;
  rightHoldReady = false;
  renderer.domElement.style.cursor = '';
});

document.addEventListener('pointerdown', (event) => {
  if (
    !playerPopup.classList.contains('hidden') &&
    !playerPopup.contains(event.target) &&
    event.target !== renderer.domElement
  ) {
    hidePlayerPopup();
  }
});

function cameraZoomLimits() {
  return insideHouse
    ? { min: 3.4, max: 7.0 }
    : { min: 4.8, max: MOBILE_PERF_MODE ? 27 : 38 };
}

function changeCameraZoom(amount) {
  const limits = cameraZoomLimits();
  cameraDistance = THREE.MathUtils.clamp(cameraDistance + amount, limits.min, limits.max);
}

renderer.domElement.addEventListener('wheel', (event) => {
  changeCameraZoom(Math.sign(event.deltaY) * 1.8);
}, { passive: true });

document.querySelector('#zoom-out-btn').addEventListener('click', () => {
  changeCameraZoom(4);
});

document.querySelector('#zoom-in-btn').addEventListener('click', () => {
  changeCameraZoom(-4);
});

const genderOptions = document.querySelector('#gender-options');
genderOptions.querySelectorAll('.gender-choice').forEach((button) => {
  button.addEventListener('click', () => {
    selectedGender = button.dataset.gender;
    genderOptions.querySelectorAll('.gender-choice').forEach((item) => item.classList.toggle('selected', item === button));
    updateAvatarPreview();
  });
});

function updateAvatarPreview() {
  const preview = document.querySelector('#avatar-preview');
  if (!preview) return;
  const outfit = OUTFITS[selectedOutfit] || OUTFITS.sky;
  const skinHex = '#' + (SKIN_TONES[selectedSkinTone] || SKIN_TONES.light).toString(16).padStart(6, '0');
  const hairHex = '#' + (HAIR_COLORS[selectedHairColor] || HAIR_COLORS.espresso).toString(16).padStart(6, '0');
  const eyeHex = '#' + (EYE_COLORS[selectedEyeColor] || EYE_COLORS.violet).toString(16).padStart(6, '0');

  preview.dataset.hair = selectedHairStyle;
  preview.style.setProperty('--skin', skinHex);
  preview.style.setProperty('--hair', hairHex);
  preview.style.setProperty('--eye', eyeHex);
  preview.style.setProperty('--top', outfit.top);
}

function bindChoiceGroup(selector, onSelect) {
  const host = document.querySelector(selector);
  if (!host) return;
  host.querySelectorAll('[data-value]').forEach((button) => {
    button.addEventListener('click', () => {
      host.querySelectorAll('[data-value]').forEach((item) => item.classList.toggle('selected', item === button));
      onSelect(button.dataset.value);
      updateAvatarPreview();
    });
  });
}

bindChoiceGroup('#hair-style-options', (value) => { selectedHairStyle = value; });
bindChoiceGroup('#hair-color-options', (value) => { selectedHairColor = value; });
bindChoiceGroup('#skin-tone-options', (value) => { selectedSkinTone = value; });
bindChoiceGroup('#eye-color-options', (value) => { selectedEyeColor = value; });

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
    updateAvatarPreview();
  });
  outfitOptions.appendChild(button);
});

document.querySelector('#join-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (joined) return;
  const name = document.querySelector('#name').value.trim() || 'Guest';
  startAmbientMusic();
  socket.emit('player:join', {
    name,
    gender: selectedGender,
    outfit: selectedOutfit,
    hairStyle: selectedHairStyle,
    hairColor: selectedHairColor,
    skinTone: selectedSkinTone,
    eyeColor: selectedEyeColor
  });
});
updateAvatarPreview();

document.querySelector('#music-btn').addEventListener('click', () => {
  setMusicEnabled(!musicEnabled);
});


const playerPopup = document.querySelector('#player-popup');

function hidePlayerPopup() {
  selectedPlayerId = null;
  playerPopup.classList.add('hidden');
  playerPopup.innerHTML = '';
}

function isPartyMember(playerId) {
  return Boolean(
    socialState &&
    socialState.party &&
    socialState.party.members.some((member) => member.id === playerId)
  );
}

function playerById(playerId) {
  const remote = remotePlayers.get(playerId);
  return remote ? remote.data : null;
}

function popupAction(label, handler, options = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'player-action' + (options.primary ? ' primary-action' : '') + (options.danger ? ' danger-action' : '');
  button.textContent = label;
  button.disabled = Boolean(options.disabled);
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!button.disabled) handler();
  });
  return button;
}

function showPlayerPopup(playerId, clientX, clientY) {
  const player = playerById(playerId);
  if (!player || !socialState) return;

  selectedPlayerId = playerId;
  const outfit = OUTFITS[player.outfit] || OUTFITS.sky;
  const friend = isFriend(playerId);
  const sameParty = isPartyMember(playerId);
  const myParty = socialState.party;

  playerPopup.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'player-popup-header';
  const portrait = document.createElement('div');
  portrait.className = 'player-popup-avatar';
  portrait.style.background = 'linear-gradient(145deg,' + outfit.top + ',' + outfit.bottom + ')';
  portrait.textContent = player.gender === 'male' ? '♂' : '♀';

  const identity = document.createElement('div');
  const playerName = document.createElement('strong');
  playerName.textContent = player.name;
  const playerMeta = document.createElement('small');
  playerMeta.textContent =
    (player.gender === 'male' ? 'Male' : 'Female') +
    ' · ' + outfit.name +
    (friend ? ' · Friend' : '');
  identity.append(playerName, playerMeta);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'player-popup-close';
  close.textContent = '×';
  close.addEventListener('click', hidePlayerPopup);

  header.append(portrait, identity, close);

  const actions = document.createElement('div');
  actions.className = 'player-popup-actions';

  if (!friend) {
    actions.appendChild(popupAction('Add Friend', () => {
      socket.emit('friend:request', playerId);
      toast('Friend request sent to ' + player.name + '.');
      hidePlayerPopup();
    }, { primary: true }));
  }

  if (friend) {
    actions.appendChild(popupAction('Live Together', () => {
      socket.emit('roommate:request', playerId);
      toast('Live-together invitation sent to ' + player.name + '.');
      hidePlayerPopup();
    }));
  }

  if (friend && !sameParty) {
    if (!myParty) {
      actions.appendChild(popupAction('Create Party & Invite', () => {
        pendingInviteAfterCreate = playerId;
        socket.emit('party:create');
        toast('Creating a party for you and ' + player.name + '…');
        hidePlayerPopup();
      }, { primary: true }));
    } else if (myParty.leaderId === selfId) {
      actions.appendChild(popupAction('Invite to Party', () => {
        socket.emit('party:invite', playerId);
        toast('Party invitation sent to ' + player.name + '.');
        hidePlayerPopup();
      }, { primary: true }));
    } else {
      actions.appendChild(popupAction('Leader Invites Only', () => {}, { disabled: true }));
    }
  }

  if (sameParty) {
    actions.appendChild(popupAction(voiceEnabled ? 'Mute My Mic' : 'Enable Speaking', () => {
      toggleVoice();
      hidePlayerPopup();
    }, { primary: !voiceEnabled }));
  }

  if (Number.isInteger(player.residenceHomeId) && homePositions[player.residenceHomeId]) {
    actions.appendChild(popupAction('Visit Home', () => {
      visitHouse(player.residenceHomeId);
      hidePlayerPopup();
    }));
  }

  const hint = document.createElement('div');
  hint.className = 'player-popup-hint';
  hint.textContent = sameParty
    ? 'You are in the same party. Speaking can be enabled.'
    : friend
      ? 'Friends can live together and receive party invitations.'
      : 'Become friends to unlock more social actions.';

  playerPopup.append(header, actions, hint);
  playerPopup.classList.remove('hidden');

  const margin = 12;
  const rect = playerPopup.getBoundingClientRect();
  const left = Math.max(margin, Math.min(window.innerWidth - rect.width - margin, clientX + 14));
  const top = Math.max(margin, Math.min(window.innerHeight - rect.height - margin, clientY + 14));
  playerPopup.style.left = left + 'px';
  playerPopup.style.top = top + 'px';
}

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();

function pickPlayerAt(clientX, clientY) {
  if (!joined || remotePlayers.size === 0) return null;

  const rect = renderer.domElement.getBoundingClientRect();
  pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);

  const roots = Array.from(remotePlayers.values()).map((remote) => remote.mesh);
  const hits = raycaster.intersectObjects(roots, true);
  if (!hits.length) return null;

  let object = hits[0].object;
  while (object && !object.userData.playerId && object.parent) object = object.parent;
  return object && object.userData.playerId ? object.userData.playerId : null;
}

function showHud() {
  document.querySelector('#join').classList.add('hidden');
  document.querySelector('#hud').classList.remove('hidden');
}

function addRemote(data) {
  if (!data || data.id === selfId || remotePlayers.has(data.id)) return;
  const mesh = createAvatar(data, false);
  mesh.userData.playerId = data.id;
  mesh.userData.target.set(data.x || 0, data.y || 0, data.z || 0);
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
  voiceButton.title = socialState.party
    ? (voiceEnabled ? 'Mute microphone' : 'Enable speaking')
    : 'Join a party to enable speaking';
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
      voiceNote.textContent = voiceEnabled
        ? (voiceRelayActive
            ? 'Microphone on · Haven relay active. Other party members must also enable speaking.'
            : 'Starting party audio…')
        : 'Tap the microphone button above to enable speaking. Voice is limited to your party.';
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
  if (!me || !socialState || insideHouse) return;
  const homeId = socialState.self.residenceHomeId;
  const p = homePositions[homeId];
  me.position.set(p[0], 0, p[1] + 8);
  toast('Welcome home.');
});

function downsampleVoice(input, inputRate) {
  const ratio = inputRate / VOICE_SAMPLE_RATE;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += input[j];
    const sample = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output;
}

function pcmToBase64(pcm) {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

function base64ToPcm(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    if (bytes.byteLength < 2 || bytes.byteLength % 2 !== 0) return null;
    return new Int16Array(bytes.buffer);
  } catch {
    return null;
  }
}

async function startVoiceRelay() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass || !localStream) throw new Error('Web Audio is unavailable.');

  if (!voiceAudioContext || voiceAudioContext.state === 'closed') {
    voiceAudioContext = new AudioContextClass({ latencyHint: 'interactive' });
  }
  if (voiceAudioContext.state === 'suspended') await voiceAudioContext.resume();

  voiceOutputGain = voiceAudioContext.createGain();
  voiceOutputGain.gain.value = 1.65;
  voiceOutputGain.connect(voiceAudioContext.destination);

  voiceInputSource = voiceAudioContext.createMediaStreamSource(localStream);
  voiceProcessor = voiceAudioContext.createScriptProcessor(2048, 1, 1);
  voiceSilentGain = voiceAudioContext.createGain();
  voiceSilentGain.gain.value = 0;

  voiceProcessor.onaudioprocess = (event) => {
    if (!voiceEnabled || !socialState || !socialState.party) return;
    const input = event.inputBuffer.getChannelData(0);
    const pcm = downsampleVoice(input, voiceAudioContext.sampleRate);
    if (pcm.byteLength) socket.emit('voice:pcm', pcmToBase64(pcm));
  };

  voiceInputSource.connect(voiceProcessor);
  voiceProcessor.connect(voiceSilentGain);
  voiceSilentGain.connect(voiceAudioContext.destination);
  voiceRelayActive = true;
}

function stopVoiceRelay() {
  voiceRelayActive = false;
  voicePlaybackCursors.clear();

  if (voiceProcessor) {
    voiceProcessor.onaudioprocess = null;
    try { voiceProcessor.disconnect(); } catch {}
  }
  if (voiceInputSource) {
    try { voiceInputSource.disconnect(); } catch {}
  }
  if (voiceSilentGain) {
    try { voiceSilentGain.disconnect(); } catch {}
  }

  if (voiceOutputGain) {
    try { voiceOutputGain.disconnect(); } catch {}
  }

  voiceProcessor = null;
  voiceInputSource = null;
  voiceSilentGain = null;
  voiceOutputGain = null;

  if (voiceAudioContext && voiceAudioContext.state !== 'closed') {
    voiceAudioContext.close().catch(() => {});
  }
  voiceAudioContext = null;
}

function playRelayedVoice(fromId, rawPcm) {
  if (!voiceEnabled || !voiceRelayActive || !voiceAudioContext) return;
  if (!socialState || !socialState.party || !isPartyMember(fromId)) return;

  const pcm = base64ToPcm(rawPcm);
  if (!pcm || !pcm.length) return;

  if (voiceAudioContext.state === 'suspended') {
    voiceAudioContext.resume().catch(() => {});
  }

  const audioBuffer = voiceAudioContext.createBuffer(1, pcm.length, VOICE_SAMPLE_RATE);
  const samples = audioBuffer.getChannelData(0);
  for (let i = 0; i < pcm.length; i += 1) samples[i] = pcm[i] / 32768;

  const source = voiceAudioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(voiceOutputGain || voiceAudioContext.destination);

  let startAt = voicePlaybackCursors.get(fromId) || voiceAudioContext.currentTime + 0.06;
  if (startAt < voiceAudioContext.currentTime || startAt > voiceAudioContext.currentTime + 0.45) {
    startAt = voiceAudioContext.currentTime + 0.06;
  }

  source.start(startAt);
  voicePlaybackCursors.set(fromId, startAt + audioBuffer.duration);
}

async function toggleVoice() {
  if (voiceEnabled) {
    stopVoice();
    return;
  }

  if (!socialState || !socialState.party) {
    toast('Create or join a party first.');
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast('This browser does not support microphone voice chat.');
    return;
  }

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1
      },
      video: false
    });

    voiceEnabled = true;
    voiceReadyPeers.clear();
    document.querySelector('#voice-btn').classList.add('active');

    await startVoiceRelay();
    socket.emit('voice:ready');
    toast('Party voice is on. Haven is relaying audio for reliable playback.');
    renderSocial();
  } catch (error) {
    console.warn('Microphone error', error);
    toast('Microphone access failed. Check browser site permissions and try again.');
  }
}

function stopVoice() {
  voiceEnabled = false;
  voiceReadyPeers.clear();
  pendingIceCandidates.clear();
  stopVoiceRelay();

  if (localStream) localStream.getTracks().forEach((track) => track.stop());
  localStream = null;

  peers.forEach((pc) => pc.close());
  peers.clear();

  document.querySelectorAll('audio[data-peer]').forEach((audio) => {
    audio.srcObject = null;
    audio.remove();
  });

  document.querySelector('#voice-btn').classList.remove('active');
  toast('Your microphone is muted.');
  renderSocial();
}

async function createPeer(peerId) {
  if (!localStream) return null;
  if (peers.has(peerId)) return peers.get(peerId);

  const pc = new RTCPeerConnection({ iceServers: rtcIceServers });
  peers.set(peerId, pc);

  localStream.getAudioTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('voice:signal', { targetId: peerId, candidate: event.candidate });
    }
  };

  pc.ontrack = (event) => {
    let audio = document.querySelector('audio[data-peer="' + peerId + '"]');

    if (!audio) {
      audio = document.createElement('audio');
      audio.dataset.peer = peerId;
      audio.autoplay = true;
      audio.playsInline = true;
      audio.muted = false;
      audio.volume = 1;
      document.body.appendChild(audio);
    }

    const stream = event.streams && event.streams[0]
      ? event.streams[0]
      : new MediaStream([event.track]);

    audio.srcObject = stream;
    audio.play().catch(() => {
      toast('Party audio was blocked by the browser. Tap the microphone button off and on once.');
    });
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected' && !pc.__connectedNotice) {
      pc.__connectedNotice = true;
      const player = playerById(peerId);
      toast('Voice connected' + (player ? ' with ' + player.name : '') + '.');
      renderSocial();
    }

    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      pc.close();
      peers.delete(peerId);
      pendingIceCandidates.delete(peerId);

      const audio = document.querySelector('audio[data-peer="' + peerId + '"]');
      if (audio) audio.remove();

      if (voiceEnabled && isPartyMember(peerId)) {
        window.setTimeout(() => socket.emit('voice:ready'), 700);
      }
    }

    if (pc.connectionState === 'disconnected') {
      window.setTimeout(() => {
        if (pc.connectionState === 'disconnected') {
          pc.close();
          peers.delete(peerId);
          if (voiceEnabled && isPartyMember(peerId)) socket.emit('voice:ready');
        }
      }, 3500);
    }
  };

  return pc;
}

async function startVoiceOffer(peerId) {
  if (!voiceEnabled || !voiceReadyPeers.has(peerId)) return;
  const pc = await createPeer(peerId);
  if (!pc || pc.signalingState !== 'stable') return;

  const offer = await pc.createOffer({ offerToReceiveAudio: true });
  await pc.setLocalDescription(offer);
  socket.emit('voice:signal', {
    targetId: peerId,
    description: pc.localDescription
  });
}

async function flushPendingIce(peerId, pc) {
  const queue = pendingIceCandidates.get(peerId) || [];
  pendingIceCandidates.delete(peerId);

  for (const candidate of queue) {
    try {
      await pc.addIceCandidate(candidate);
    } catch (error) {
      console.warn('ICE candidate error', error);
    }
  }
}

function maybeStartVoiceConnection(peerId) {
  if (
    voiceRelayActive ||
    !voiceEnabled ||
    !voiceReadyPeers.has(peerId) ||
    !isPartyMember(peerId)
  ) return;

  // One deterministic initiator prevents offer glare.
  if (String(selfId) < String(peerId)) {
    startVoiceOffer(peerId).catch((error) => console.warn('Voice offer error', error));
  }
}

async function syncVoicePeers() {
  if (!voiceEnabled || !socialState || !socialState.party) return;

  const memberIds = socialState.party.members
    .map((member) => member.id)
    .filter((id) => id !== selfId);

  for (const [id, pc] of peers) {
    if (!memberIds.includes(id)) {
      pc.close();
      peers.delete(id);
      voiceReadyPeers.delete(id);
      pendingIceCandidates.delete(id);
      const audio = document.querySelector('audio[data-peer="' + id + '"]');
      if (audio) audio.remove();
    }
  }

  // Re-announce every time party state changes so late microphone activations reconnect.
  socket.emit('voice:ready');
}

document.querySelector('#voice-btn').addEventListener('click', toggleVoice);

socket.on('voice:ready', ({ fromId } = {}) => {
  if (
    !fromId ||
    !voiceEnabled ||
    !socialState ||
    !socialState.party ||
    !socialState.party.members.some((member) => member.id === fromId)
  ) return;

  voiceReadyPeers.add(fromId);
  socket.emit('voice:ready:ack', { targetId: fromId });
  maybeStartVoiceConnection(fromId);
});

socket.on('voice:ready:ack', ({ fromId } = {}) => {
  if (
    !fromId ||
    !voiceEnabled ||
    !socialState ||
    !socialState.party ||
    !socialState.party.members.some((member) => member.id === fromId)
  ) return;

  voiceReadyPeers.add(fromId);
  maybeStartVoiceConnection(fromId);
});

socket.on('voice:signal', async (payload) => {
  if (voiceRelayActive) return;
  if (!voiceEnabled || !socialState || !socialState.party) return;
  if (!socialState.party.members.some((member) => member.id === payload.fromId)) return;

  try {
    const pc = await createPeer(payload.fromId);
    if (!pc) return;

    if (payload.description) {
      await pc.setRemoteDescription(payload.description);
      await flushPendingIce(payload.fromId, pc);

      if (payload.description.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice:signal', {
          targetId: payload.fromId,
          description: pc.localDescription
        });
      }
      return;
    }

    if (payload.candidate) {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(payload.candidate);
      } else {
        if (!pendingIceCandidates.has(payload.fromId)) {
          pendingIceCandidates.set(payload.fromId, []);
        }
        pendingIceCandidates.get(payload.fromId).push(payload.candidate);
      }
    }
  } catch (error) {
    console.warn('Voice signaling error', error);
  }
});

socket.on('voice:pcm', ({ fromId, pcm } = {}) => {
  playRelayedVoice(fromId, pcm);
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
  remote.mesh.userData.target.set(player.x, player.y || 0, player.z);
  remote.mesh.userData.targetRot = player.rot;
  remote.mesh.userData.moving = Boolean(player.moving);
});

socket.on('combat:punch', ({ attackerId, targetId } = {}) => {
  const attacker = attackerId === selfId ? me : remotePlayers.get(attackerId)?.mesh;
  const target = targetId === selfId ? me : remotePlayers.get(targetId)?.mesh;

  if (attacker) startPunchAnimation(attacker);
  if (target) startHitReaction(target);

  if (targetId === selfId) {
    const attackerData = playerById(attackerId);
    toast((attackerData ? attackerData.name : 'Someone') + ' punched you.');
  }
});

socket.on('player:left', (id) => {
  if (selectedPlayerId === id) hidePlayerPopup();
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

  if (
    pendingInviteAfterCreate &&
    state.party &&
    state.party.leaderId === selfId &&
    !state.party.members.some((member) => member.id === pendingInviteAfterCreate)
  ) {
    const targetId = pendingInviteAfterCreate;
    pendingInviteAfterCreate = null;
    socket.emit('party:invite', targetId);
    const target = playerById(targetId);
    if (target) toast('Party invitation sent to ' + target.name + '.');
  }

  if (voiceEnabled && !state.party) stopVoice();
  updateHud();
  renderSocial();
  if (selectedPlayerId) {
    const selected = playerById(selectedPlayerId);
    if (!selected) hidePlayerPopup();
  }
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
  const scale = 1.32;
  const worldToMap = (x, z) => ({
    x: w / 2 + (x - me.position.x) * scale,
    y: h / 2 + (z - me.position.z) * scale
  });

  const drawHouseIcon = (x, y, size, selected = false) => {
    if (x < -size || x > w + size || y < -size || y > h + size) return;
    mapCtx.save();
    mapCtx.translate(x, y);
    mapCtx.fillStyle = selected ? '#ffffff' : '#f1d6b7';
    mapCtx.strokeStyle = selected ? '#7c3aed' : '#8f684f';
    mapCtx.lineWidth = selected ? 2.2 : 1.2;
    mapCtx.beginPath();
    mapCtx.rect(-size * .48, -size * .05, size * .96, size * .62);
    mapCtx.fill();
    mapCtx.stroke();
    mapCtx.fillStyle = selected ? '#8b5cf6' : '#9b5f50';
    mapCtx.beginPath();
    mapCtx.moveTo(-size * .62, -size * .05);
    mapCtx.lineTo(0, -size * .62);
    mapCtx.lineTo(size * .62, -size * .05);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.fillStyle = '#6f4b3a';
    mapCtx.fillRect(-size * .1, size * .23, size * .2, size * .34);
    mapCtx.restore();
  };

  const drawTreeIcon = (x, y, size = 4) => {
    if (x < -8 || x > w + 8 || y < -8 || y > h + 8) return;
    mapCtx.fillStyle = '#72543d';
    mapCtx.fillRect(x - 1, y + 1, 2, size + 2);
    mapCtx.fillStyle = '#4f8a55';
    mapCtx.beginPath();
    mapCtx.arc(x, y, size, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.fillStyle = '#6aa260';
    mapCtx.beginPath();
    mapCtx.arc(x - size * .35, y - size * .25, size * .48, 0, Math.PI * 2);
    mapCtx.fill();
  };

  mapCtx.clearRect(0, 0, w, h);
  mapCtx.fillStyle = '#789b6f';
  mapCtx.fillRect(0, 0, w, h);

  const centerChunkX = Math.round(me.position.x / CHUNK_SIZE);
  const centerChunkZ = Math.round(me.position.z / CHUNK_SIZE);

  // Sidewalk underlay, then asphalt road, then center stripes.
  mapCtx.lineCap = 'butt';
  for (let cx = centerChunkX - 2; cx <= centerChunkX + 2; cx += 1) {
    for (let cz = centerChunkZ - 2; cz <= centerChunkZ + 2; cz += 1) {
      const ox = cx * CHUNK_SIZE;
      const oz = cz * CHUNK_SIZE;

      const v1 = worldToMap(ox, oz - CHUNK_SIZE / 2);
      const v2 = worldToMap(ox, oz + CHUNK_SIZE / 2);
      const h1 = worldToMap(ox - CHUNK_SIZE / 2, oz);
      const h2 = worldToMap(ox + CHUNK_SIZE / 2, oz);

      mapCtx.strokeStyle = '#d6d1c8';
      mapCtx.lineWidth = 18;
      mapCtx.beginPath(); mapCtx.moveTo(v1.x, v1.y); mapCtx.lineTo(v2.x, v2.y); mapCtx.stroke();
      mapCtx.beginPath(); mapCtx.moveTo(h1.x, h1.y); mapCtx.lineTo(h2.x, h2.y); mapCtx.stroke();

      mapCtx.strokeStyle = '#515966';
      mapCtx.lineWidth = 13;
      mapCtx.beginPath(); mapCtx.moveTo(v1.x, v1.y); mapCtx.lineTo(v2.x, v2.y); mapCtx.stroke();
      mapCtx.beginPath(); mapCtx.moveTo(h1.x, h1.y); mapCtx.lineTo(h2.x, h2.y); mapCtx.stroke();

      mapCtx.strokeStyle = '#e9d58a';
      mapCtx.lineWidth = 1.2;
      mapCtx.setLineDash([6, 7]);
      mapCtx.beginPath(); mapCtx.moveTo(v1.x, v1.y); mapCtx.lineTo(v2.x, v2.y); mapCtx.stroke();
      mapCtx.beginPath(); mapCtx.moveTo(h1.x, h1.y); mapCtx.lineTo(h2.x, h2.y); mapCtx.stroke();
      mapCtx.setLineDash([]);
    }
  }

  proceduralTrees.forEach((tree) => {
    const p = worldToMap(tree.x, tree.z);
    drawTreeIcon(p.x, p.y, 3.1 + tree.scale);
  });

  centralTreePositions.forEach((tree) => {
    const p = worldToMap(tree[0], tree[1]);
    drawTreeIcon(p.x, p.y, 4);
  });

  proceduralHouses.forEach((house) => {
    const p = worldToMap(house.x, house.z);
    drawHouseIcon(p.x, p.y, 8, false);
  });

  homePositions.forEach((home, index) => {
    const p = worldToMap(home[0], home[1]);
    const selected = Boolean(
      socialState &&
      (index === socialState.self.residenceHomeId || index === socialState.self.homeId)
    );
    drawHouseIcon(p.x, p.y, selected ? 11 : 9, selected);
  });

  remotePlayers.forEach((remote) => {
    const p = worldToMap(remote.mesh.position.x, remote.mesh.position.z);
    if (p.x > 0 && p.x < w && p.y > 0 && p.y < h) {
      const outfit = OUTFITS[remote.data.outfit] || OUTFITS.sky;
      mapCtx.beginPath();
      mapCtx.fillStyle = outfit.top;
      mapCtx.strokeStyle = '#ffffff';
      mapCtx.lineWidth = 1.5;
      mapCtx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      mapCtx.fill();
      mapCtx.stroke();
    }
  });

  // Local player stays centered and points in the facing direction.
  mapCtx.save();
  mapCtx.translate(w / 2, h / 2);
  mapCtx.rotate(-me.rotation.y);
  mapCtx.fillStyle = '#ffffff';
  mapCtx.strokeStyle = '#4f46e5';
  mapCtx.lineWidth = 2;
  mapCtx.beginPath();
  mapCtx.moveTo(0, -10);
  mapCtx.lineTo(7, 7);
  mapCtx.lineTo(0, 4);
  mapCtx.lineTo(-7, 7);
  mapCtx.closePath();
  mapCtx.fill();
  mapCtx.stroke();
  mapCtx.restore();

  mapCtx.fillStyle = 'rgba(15,23,42,.72)';
  mapCtx.beginPath();
  mapCtx.arc(w - 22, 22, 14, 0, Math.PI * 2);
  mapCtx.fill();
  mapCtx.fillStyle = '#ffffff';
  mapCtx.font = '800 12px system-ui';
  mapCtx.textAlign = 'center';
  mapCtx.textBaseline = 'middle';
  mapCtx.fillText('N', w - 22, 22);

  const coords = document.querySelector('#map-coords');
  if (coords) coords.textContent = Math.round(me.position.x) + ', ' + Math.round(me.position.z);
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

function resetLookpad() {
  lookPointer = null;
  lookPoint = null;
}

lookpad.addEventListener('pointerup', resetLookpad);
lookpad.addEventListener('pointercancel', resetLookpad);

document.querySelector('#mobile-e').addEventListener('click', () => {
  interactNearest();
});

document.querySelector('#mobile-jump').addEventListener('click', () => {
  if (!me || me.userData.seated || transitioningHouse || !me.userData.grounded) return;
  me.userData.grounded = false;
  me.userData.verticalVelocity = insideHouse ? 5.2 : 8.4;
});

document.querySelector('#mobile-punch').addEventListener('click', () => {
  punchNearest();
});

function updatePrompt() {
  const prompt = document.querySelector('#prompt');
  const nearest = nearestInteractable();

  if (!nearest || transitioningHouse) {
    prompt.classList.remove('show');
    return;
  }

  let title = 'Interact';
  let kicker = 'NEARBY';
  let detail = 'Press E';

  if (nearest.type === 'npc') {
    kicker = 'NEIGHBOR';
    title = 'Talk to ' + nearest.npc.name;
    detail = Math.max(1, Math.round(nearest.distance)) + 'm away · Press E';
  } else if (nearest.type === 'bench') {
    kicker = 'PUBLIC SEAT';
    title = 'Sit down';
    detail = Math.max(1, Math.round(nearest.distance)) + 'm away · Press E';
  } else if (nearest.type === 'bench-exit') {
    kicker = 'PUBLIC SEAT';
    title = 'Stand up';
    detail = 'Press E';
  } else if (nearest.type === 'exit') {
    kicker = 'HOME INTERIOR';
    title = 'Leave house';
    detail = 'Front door · Press E';
  } else if (nearest.type === 'house') {
    title = nearest.permanent ? 'Home #' + (nearest.homeId + 1) : 'Neighborhood House';
    kicker = nearest.permanent ? 'NEARBY HOME' : 'EXPLORE';

    if (nearest.permanent && socialState && nearest.homeId === socialState.self.residenceHomeId) {
      kicker = 'YOUR RESIDENCE';
      title = 'Enter your home';
    } else if (nearest.permanent && socialState && nearest.homeId === socialState.self.homeId) {
      kicker = 'YOUR ASSIGNED HOME';
    }

    detail = Math.max(1, Math.round(nearest.distance)) + 'm away · Press E';
  }

  document.querySelector('#house-kicker').textContent = kicker;
  document.querySelector('#prompt-text').textContent = title;
  document.querySelector('#house-distance').textContent = detail;
  prompt.classList.add('show');
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
    if (!insideHouse) updateWorldStreaming(me.position.x, me.position.z);
    sky.position.set(me.position.x, 0, me.position.z);
    sun.position.set(me.position.x - 42, 68, me.position.z + 34);
    sun.target.position.set(me.position.x, 0, me.position.z);
    if (!sun.target.parent) scene.add(sun.target);
    updatePrompt();
    drawMinimap();
    updateNpcLife(delta, time);

    if (now - lastNetworkSend > 50) {
      socket.volatile.emit('player:update', {
        x: me.position.x,
        y: me.position.y,
        z: me.position.z,
        rot: me.rotation.y,
        moving: me.userData.moving,
        sprinting: me.userData.sprinting
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MOBILE_PERF_MODE ? 1.25 : 1.75));
});
