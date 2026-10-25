import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { PROJECTS_COPY, ABOUT_COPY, EXIT_COPY, CAREER_COPY, CONTACT_COPY } from "./content.js?v=e9b05065";
import { makeGalaxy, makeWormhole, makeUnclaimedPlanet } from "./galaxies.js?v=e9b05065";
import { makeBlackHole } from "./blackhole.js?v=e9b05065";
import { PROJECTS } from "./planets.js?v=e9b05065";
import { noOrphans } from "./typeset.js?v=e9b05065";
noOrphans();
import { playIntro } from "./intro.js?v=e9b05065";
import { WatercolorShader } from "./watercolor.js?v=e9b05065";
import { themeButton } from "./warp-reveal.js?v=e9b05065";
// two looks for the same ride: light, painted in watercolour on paper (the default), and dark, realistic space. The
// head of index.html picks one before anything draws; the Dark / Light button in the header switches and remembers
let PAINT = document.documentElement.classList.contains("paint");
import { planetMaterial, atmosphereMaterial, starMaterial, ringMaterial, makeLiquid, FilmShader } from "./shaders.js?v=e9b05065";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const remap = (v, a, b) => clamp01((v - a) / (b - a));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---------- Renderer, scene, camera
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
// iOS may take the 3D context away when memory runs short (the page goes white): reload once to get it back
renderer.domElement.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  let last = 0; try { last = +sessionStorage.getItem("v2-gl-reload") || 0; } catch {}
  if (Date.now() - last < 15000) return; // (once: never a reload loop)
  try { sessionStorage.setItem("v2-gl-reload", String(Date.now())); } catch {}
  location.reload();
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050507);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 9000);
camera.layers.enable(2);
scene.add(camera);

// ---------- Textures drawn on canvas
function canvasTexture(size, draw) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const glowTex = canvasTexture(128, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.18, "rgba(255,255,255,.45)");
  gr.addColorStop(0.45, "rgba(255,255,255,.1)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
const sparkleTex = canvasTexture(128, (g, s) => {
  const m = s / 2;
  g.fillStyle = "#fff"; g.beginPath();
  g.moveTo(m, 4); g.quadraticCurveTo(m, m, s - 4 - m * 0.55, m);
  g.quadraticCurveTo(m, m, m, s - 4); g.quadraticCurveTo(m, m, 4 + m * 0.55, m);
  g.quadraticCurveTo(m, m, m, 4); g.fill();
  const gr = g.createRadialGradient(m, m, 0, m, m, m * 0.5);
  gr.addColorStop(0, "rgba(255,255,255,.8)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});

function glowSprite(color, scale, opacity) {
  const mat = new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(scale);
  return s;
}

// ---------- Starfield: dust, bright stars, sparkles
const stars = (() => {
  const n = 7000, pos = new Float32Array(n * 3), size = new Float32Array(n), bright = new Float32Array(n), seed = new Float32Array(n);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.randomDirection().multiplyScalar(rand(160, 760));
    pos.set([v.x, v.y, v.z], i * 3);
    const r = Math.random();
    size[i] = r < 0.9 ? rand(1.2, 2.2) : r < 0.985 ? rand(2.6, 4) : rand(5, 8);
    bright[i] = r < 0.9 ? rand(0.25, 0.8) : r < 0.985 ? rand(0.9, 1.4) : rand(2.5, 4);
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("aBright", new THREE.BufferAttribute(bright, 1));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aSize; attribute float aBright; attribute float aSeed;
      uniform float uTime; uniform float uPR; varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vA = aBright * (0.78 + 0.22 * sin(uTime * (0.5 + aSeed * 2.0) + aSeed * 40.0));
        gl_PointSize = aSize * uPR;
      }`,
    fragmentShader: `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = pow(smoothstep(0.5, 0.0, d), 1.8);
        gl_FragColor = vec4(vec3(0.95, 0.97, 1.0) * vA, a);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.layers.set(2); // main camera only, so the board reflects clean light
  scene.add(pts);
  return pts;
})();

const sparkles = [];
for (let i = 0; i < 16; i++) {
  const mat = new THREE.SpriteMaterial({ map: sparkleTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 });
  const s = new THREE.Sprite(mat);
  s.position.copy(new THREE.Vector3().randomDirection().multiplyScalar(rand(140, 260)));
  s.scale.setScalar(rand(2, 4.2));
  s.userData.seed = Math.random() * 10;
  s.layers.set(2);
  scene.add(s); sparkles.push(s);
}

// ---------- The system: centre star, orbit lines, 7 project planets
const system = new THREE.Group();
system.rotation.z = 0; // a flat plane keeps the ride level
scene.add(system);
const C = new THREE.Vector3(0, -4, -30);

const core = new THREE.Mesh(new THREE.SphereGeometry(1.1, 64, 32), starMaterial({ color: "#FFF4E2", intensity: 1.35 }));
core.position.copy(C);
system.add(core);
core.layers.set(2); // the board reflects a softer stand-in instead, or the sun blooms across it
const coreReflection = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFF1DC").multiplyScalar(0.55) }));
coreReflection.position.copy(C);
coreReflection.layers.set(1);
system.add(coreReflection);
const coreGlow = glowSprite(0xfff1dc, 18, 0.32);
coreGlow.layers.set(2);
coreGlow.position.copy(C);
system.add(coreGlow);

// Rings run newest (outside) to oldest (inside), so the ride spirals in toward the sun.
// Angles (76-127 degrees apart along the direction of travel) were searched so all seven read clearly from the system view.
// PROJECTS (each planet's recipe) lives in planets.js, shared with the case study page


// Points with per-point size and alpha, used for the comet tail
function trailPoints(color, from, dir, count, length) {
  const pos = new Float32Array(count * 3), size = new Float32Array(count), alpha = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const t = Math.pow(i / count, 0.8);
    const p = from.clone().addScaledVector(dir, t * length).add(new THREE.Vector3().randomDirection().multiplyScalar(t * 0.28 * Math.random()));
    pos.set([p.x, p.y, p.z], i * 3);
    size[i] = (1 - t) * 5 + 1.2;
    alpha[i] = Math.pow(1 - t, 1.6);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  return new THREE.Points(geo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color).multiplyScalar(1.6) }, uPR: { value: renderer.getPixelRatio() }, uTime: { value: 0 } },
    vertexShader: `
      attribute float aSize; attribute float aAlpha; uniform float uPR; uniform float uTime; varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vA = aAlpha * (0.8 + 0.2 * sin(uTime * 3.0 + position.x * 4.0));
        gl_PointSize = aSize * uPR * (40.0 / -mv.z);
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vA;
      void main() {
        float a = pow(smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)), 1.5) * vA;
        gl_FragColor = vec4(uColor, a);
      }`,
  }));
}

system.updateMatrixWorld(true);
const planets = PROJECTS.map((p, i) => {
  const rad = THREE.MathUtils.degToRad(p.a);
  const pos = new THREE.Vector3(C.x + p.R * Math.cos(rad), C.y, C.z + p.R * Math.sin(rad));

  // Orbit line through the planet
  const pts = [];
  for (let k = 0; k <= 256; k++) { const t = (k / 256) * Math.PI * 2; pts.push(new THREE.Vector3(C.x + p.R * Math.cos(t), C.y, C.z + p.R * Math.sin(t))); }
  const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = p.kind === "comet"
    ? new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, dashSize: 0.6, gapSize: 0.5 }))
    : new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07 }));
  if (p.kind === "comet") line.computeLineDistances();
  system.add(line);

  const g = new THREE.Group();
  g.position.copy(pos);
  system.add(g);
  const light = C.clone().applyMatrix4(system.matrixWorld);
  const bodyMat = p.kind === "giant"
    ? starMaterial({ color: p.color, intensity: 1.25 })
    : planetMaterial({ color: p.color, type: p.type, seed: p.seed || i, clouds: p.clouds || 0, tilt: p.tilt || 0, light });
  const body = new THREE.Mesh(new THREE.SphereGeometry(p.r, 96, 48), bodyMat);
  g.add(body);
  let glow;
  if (p.kind === "giant") {
    glow = glowSprite(new THREE.Color(p.color).multiplyScalar(1.3), p.r * 3.4, 0.45);
  } else if (p.kind === "comet") {
    glow = glowSprite(new THREE.Color(p.color).multiplyScalar(1.6), p.r * 5.3, 0.55); // the coma around the icy nucleus
  }
  if (glow) { glow.layers.set(2); g.add(glow); } // halos stay out of the board reflection
  if (p.atmo) {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(p.r * 1.12, 96, 48), atmosphereMaterial({ color: p.color, light, strength: p.atmo }));
    shell.layers.set(2);
    g.add(shell);
  }

  const extra = {};
  // the ride passes every planet on its sun side, so tilt what sticks out away from that lane
  const toSun = C.clone().sub(pos).setY(0).normalize();
  const along = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), toSun).normalize();
  if (p.kind === "comet") {
    const dir = pos.clone().sub(C).normalize();
    // Soft dust plume: a ribbon that always turns its face to the camera
    const tail = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 48), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(p.color).lerp(new THREE.Color("#8FA4F8"), 0.25).multiplyScalar(1.3) }, uDir: { value: dir }, uLen: { value: 10 }, uR: { value: p.r }, uTime: { value: 0 } },
      vertexShader: `
        uniform vec3 uDir; uniform float uLen; uniform float uR; varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 o = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec3 ax = normalize(mat3(modelMatrix) * uDir);
          vec3 along = o + ax * (uv.y * uLen + uR * 0.2);
          vec3 side = normalize(cross(ax, normalize(cameraPosition - along)));
          float w = mix(uR * 1.6, uR * 7.0, pow(uv.y, 0.8));
          gl_Position = projectionMatrix * viewMatrix * vec4(along + side * (uv.x - 0.5) * w, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
        void main() {
          float x = (vUv.x - 0.5) * 2.0;
          float core = exp(-x * x * 7.0), haze = exp(-x * x * 2.0) * 0.35;
          float streak = 0.8 + 0.2 * sin(vUv.x * 40.0 + vUv.y * 6.0 - uTime * 0.6);
          float a = pow(1.0 - vUv.y, 1.6) * (core * streak + haze) * smoothstep(0.0, 0.04, vUv.y);
          gl_FragColor = vec4(uColor, a * 0.7);
        }`,
    }));
    tail.frustumCulled = false;
    g.add(tail);
    extra.tail = tail;
  }
  if (p.kind === "moon") {
    extra.moon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 24), planetMaterial({ color: "#9AA3B5", type: 1, seed: 4.4, light: C.clone().applyMatrix4(system.matrixWorld) }));
    // orbit tilted 70 degrees: high on the sun side, so the board passes underneath the moon
    const lift = 70 * Math.PI / 180;
    extra.moonAxes = { a: along, b: toSun.clone().multiplyScalar(Math.cos(lift)).add(new THREE.Vector3(0, Math.sin(lift), 0)) };
    g.add(extra.moon);
  }
  if (p.kind === "rings") {
    extra.rings = new THREE.Mesh(new THREE.RingGeometry(p.r * 1.4, p.r * 2.4, 256, 1), ringMaterial({ inner: p.r * 1.4, outer: p.r * 2.4 }));
    // tilted 25 degrees so the rings dip on the sun side and the board passes over them
    const tiltRad = 25 * Math.PI / 180;
    const normal = new THREE.Vector3(0, Math.cos(tiltRad), 0).addScaledVector(toSun, Math.sin(tiltRad)).normalize();
    extra.rings.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    g.add(extra.rings);
  }
  if (p.kind === "route") {
    const stops = [new THREE.Vector3(-3.2, 1.4, 1), new THREE.Vector3(-1.2, 2.6, 2.2), new THREE.Vector3(1.6, 2.8, 1.4), new THREE.Vector3(3.4, 1.2, -0.4)];
    const curve = new THREE.CatmullRomCurve3(stops);
    // the satellites sit on the far side of the planet from the sun, away from the ride
    const sats = new THREE.Group();
    sats.rotation.y = Math.atan2(-toSun.x, -toSun.z);
    sats.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)), new THREE.LineBasicMaterial({ color: 0x8fb0ff, transparent: true, opacity: 0.35 })));
    stops.forEach((s) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fc0ff).multiplyScalar(0.9) })); m.position.copy(s); sats.add(m); });
    g.add(sats);
    extra.sats = sats;
  }
  return { ...p, group: g, body, glow, extra, index: i };
});
system.updateMatrixWorld(true);

// ---------- Reflections: the board sees a soft invisible studio light plus the real scene
const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
const cubeCam = new THREE.CubeCamera(0.1, 1500, cubeRT);
cubeCam.traverse((o) => o.layers && o.layers.enable(1));
scene.add(cubeCam);

const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  vertexShader: `varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    varying vec3 vD;
    void main() {
      vec3 d = normalize(vD);
      // two long softboxes running the length of the board, a broad top light, a cool rim, a dark floor
      float up = smoothstep(0.05, 0.6, d.y);
      float s1 = smoothstep(0.07, 0.015, abs(d.x - 0.2)) * up;
      float s2 = smoothstep(0.07, 0.015, abs(d.x + 0.2)) * up;
      float top = smoothstep(0.55, 1.0, d.y);
      float rim = smoothstep(0.3, 0.9, -d.z) * smoothstep(-0.1, 0.25, d.y) * 0.35;
      float side = smoothstep(0.6, 1.0, abs(d.x)) * smoothstep(-0.2, 0.3, d.y) * 0.18;
      vec3 col = vec3(0.008, 0.009, 0.013)
        + vec3(1.0, 0.99, 0.97) * (s1 + s2) * 1.25
        + vec3(0.6, 0.66, 0.8) * top * 0.6
        + vec3(0.2, 0.22, 0.27) * smoothstep(-0.2, 0.5, d.y)
        + vec3(0.6, 0.7, 0.95) * (rim + side);
      gl_FragColor = vec4(col, 1.0);
    }`,
}));
sky.layers.set(1);
sky.renderOrder = -1;
scene.add(sky);

// ---------- The board: liquid metal, a third of it in view
const board = new THREE.Group();
const A = 0.44, H = 0.055, L = 2.6;
const boardGeo = new THREE.SphereGeometry(1, 128, 64);
boardGeo.scale(A, H, L);
const chrome = new THREE.MeshPhysicalMaterial({
  color: 0xf4f6fa, metalness: 1, roughness: 0.1, envMap: cubeRT.texture, envMapIntensity: 1.3,
});
const boardMesh = new THREE.Mesh(boardGeo, chrome);
const liquid = makeLiquid(chrome, boardMesh);
board.add(boardMesh);

const boardRig = new THREE.Group();
boardRig.add(board);
camera.add(boardRig);
boardRig.position.set(0, -1.3, -2.5);
boardRig.rotation.x = 0.1;

// ---------- Hyperspeed streaks for the loader
const warp = (() => {
  const n = 700, pos = new Float32Array(n * 6), data = [];
  for (let i = 0; i < n; i++) data.push({ a: rand(0, Math.PI * 2), r: rand(1.4, 22), z: -rand(2, 140) });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(2.2, 2.3, 2.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  camera.add(lines);
  return { lines, data, pos, geo, mat };
})();
function updateWarp(speed, dt) {
  warp.mat.opacity = Math.min(1, speed * 1.4);
  warp.lines.visible = speed > 0.01;
  if (!warp.lines.visible) return;
  const len = 0.4 + speed * 26;
  warp.data.forEach((d, i) => {
    d.z += dt * speed * 260;
    if (d.z > -1) { d.z = -140; d.a = rand(0, Math.PI * 2); d.r = rand(1.4, 22); }
    const x = Math.cos(d.a) * d.r, y = Math.sin(d.a) * d.r;
    warp.pos.set([x, y, d.z, x, y, d.z - len], i * 6);
  });
  warp.geo.attributes.position.needsUpdate = true;
}

// ---------- Post: bloom for star and planet glow
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.75, 0.5, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const film = new ShaderPass(FilmShader); // dark: film grain
film.uniforms.uRes.value.set(innerWidth, innerHeight);
composer.addPass(film);
const wash = new ShaderPass(WatercolorShader); // light: watercolour on paper, in the film grain's place
wash.uniforms.uRes.value = new THREE.Vector2(innerWidth, innerHeight);
composer.addPass(wash);
// a colour layer is a one-pixel canvas stretched over the screen: iOS Safari 26 tints its bars with whatever colour a
// full-screen fixed layer paints, except a canvas's (so the bars stay white)
const fillLayer = (el, c) => { const g = el.getContext("2d"); g.clearRect(0, 0, 1, 1); if (c) { g.fillStyle = c; g.fillRect(0, 0, 1, 1); } };
fillLayer(document.querySelector(".veil"), "#050507");
function setTheme(paint) {
  PAINT = paint;
  document.documentElement.classList.toggle("paint", paint);
  fillLayer(document.querySelector(".veil"), paint ? "#F4EEE4" : "#050507"); // the veil between scenes: paper, or space
  film.enabled = !paint; wash.enabled = paint;
  // painted planets are lit all round, as an illustration is
  scene.traverse((o) => [].concat(o.material || []).forEach((m) => { if (m.uniforms && m.uniforms.uEven) m.uniforms.uEven.value = paint ? 1 : 0; }));
}
setTheme(PAINT);
// the mode button: the other look warps in from it as an uneven, marbled blob (warp-reveal.js)
themeButton(document.querySelector(".theme"), { isPaint: () => PAINT, apply: (p) => { setTheme(p); composer.render(); }, reduce });

// ---------- The route: one continuous curve. It spirals inward along the rings, bends out to each
// viewing spot and flows back onto the spiral, reaches the sun, then slingshots out of the system.
const HERO_POS = new THREE.Vector3(0, 34, 58);
const HERO_LOOK = new THREE.Vector3(-16, -10, -34);
const up = new THREE.Vector3(0, 1, 0);
const Cw = C.clone().applyMatrix4(system.matrixWorld);
const DEG = Math.PI / 180;
const RIDE_Y = Cw.y + 1.8; // constant ride height above the ring plane, so the view never pitches between stops

const polar = (v) => ({ r: Math.hypot(v.x - Cw.x, v.z - Cw.z), a: Math.atan2(v.z - Cw.z, v.x - Cw.x) });
const fromPolar = (r, a, y, out = new THREE.Vector3()) => out.set(Cw.x + r * Math.cos(a), y, Cw.z + r * Math.sin(a));
const forwardAt = (a) => new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)); // travel runs toward decreasing angle
const outwardAt = (a) => new THREE.Vector3(Math.cos(a), 0, Math.sin(a));

// Horizontal framing only: slide the subject to the side opposite the copy, keep it just above the board
function framing(pos, target, textLeft, dist) {
  const f = target.clone().sub(pos).setY(0).normalize();
  const right = new THREE.Vector3().crossVectors(f, up).normalize();
  const t = target.clone().addScaledVector(right, (textLeft ? -1 : 1) * dist * 0.3);
  t.y = target.y - 0.35;
  return t;
}

// ---------- The ride, as Arieff drew it (20 Oct 2026): one smooth spiral.
// The radius shrinks steadily from outside the outer ring to the sun. Each planet is passed on its sun side,
// halfway to the next ring in, so it slides by on your right. You look straight ahead and never detour.
const stops = planets.map((p) => {
  const P = p.group.getWorldPosition(new THREE.Vector3());
  return { kind: "project", p, P, pol: polar(P), textLeft: true, copy: PROJECTS_COPY[p.name], name: p.name, color: p.color };
});
// Unwrap the angles so they keep decreasing along the ride (atan2 wraps at 180 degrees)
for (let i = 1; i < stops.length; i++) {
  const a = stops[i - 1].pol.a;
  while (stops[i].pol.a > a) stops[i].pol.a -= Math.PI * 2;
  while (a - stops[i].pol.a > Math.PI * 2) stops[i].pol.a += Math.PI * 2;
}
const PROJECT_COUNT = planets.length;
const ABOUT_R = 7;
// pass 60% of the way from each planet's ring to the next ring in: close enough to feel, far enough to never brush it
stops.forEach((s, i) => { const inner = i < PROJECT_COUNT - 1 ? stops[i + 1].pol.r : ABOUT_R; s.passR = s.pol.r - 0.6 * (s.pol.r - inner); });
const lastPlanet = stops[PROJECT_COUNT - 1];
// About: on the far side of the sun from the system view. The sun is on your left there, so the copy sits right.
let aboutA = -Math.PI / 2;
while (aboutA > lastPlanet.pol.a - 40 * DEG) aboutA -= Math.PI * 2;
stops.push({ kind: "about", P: Cw.clone(), pol: { r: ABOUT_R, a: aboutA }, passR: ABOUT_R, textLeft: false, copy: ABOUT_COPY, name: "About", color: "#FFF1DC" });
stops.push({ kind: "exit", P: Cw.clone(), pol: { r: ABOUT_R, a: aboutA }, textLeft: true, copy: EXIT_COPY, name: "Leaving", color: "#FFFFFF" });

// Radius as a smooth, always-shrinking function of angle (monotone cubic through the passing points)
const ENTRY_A = stops[0].pol.a + 75 * DEG;
const knots = [[ENTRY_A, stops[0].pol.r + 6], ...stops.slice(0, PROJECT_COUNT).map((s) => [s.pol.a, s.passR]), [aboutA, ABOUT_R]]
  .map(([a, r]) => [-a, r]); // ascending x
const radiusAt = (() => {
  const n = knots.length, x = knots.map((k) => k[0]), y = knots.map((k) => k[1]);
  const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return (a) => {
    const xv = Math.min(x[n - 1], Math.max(x[0], -a));
    let i = 0; while (i < n - 2 && xv > x[i + 1]) i++;
    const h = x[i + 1] - x[i], t = (xv - x[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * y[i + 1] + (t3 - t2) * h * m[i + 1];
  };
})();

// Sample the ride every ~2.5 units, so position along the curve tracks distance travelled
const rideY = (a) => RIDE_Y + 6 * THREE.MathUtils.smoothstep(a, stops[0].pol.a + 25 * DEG, ENTRY_A); // settle onto the ride height before RETA
// The swoop from the system view onto the spiral: a smooth curve that meets the spiral heading the same way,
// so leaving the hero view has no corner.
const pts = [];
{
  const E = fromPolar(radiusAt(ENTRY_A), ENTRY_A, rideY(ENTRY_A));
  const fwd = forwardAt(ENTRY_A), span = HERO_POS.distanceTo(E);
  const P1 = HERO_POS.clone().addScaledVector(E.clone().sub(HERO_POS).normalize(), span * 0.35);
  const P2 = E.clone().addScaledVector(fwd, -span * 0.4).addScaledVector(up, 3);
  const swoop = new THREE.CubicBezierCurve3(HERO_POS.clone(), P1, P2, E);
  const n = Math.ceil(swoop.getLength() / 2.5);
  for (let k = 0; k < n; k++) pts.push(swoop.getPointAt(k / n));
}
const mark = {}; // sample index of each named angle
const named = [];
// The slow glide for each planet: from the approach (lines play, eyes on the path) to 8 units past it (glance and
// title). The approach is up to 30 units, but never more than 55% of the ride from the previous planet, so on the
// small inner rings one planet's glide never runs into the next.
let prevEndA = ENTRY_A;
stops.slice(0, PROJECT_COUNT).forEach((s, i) => {
  const rp = radiusAt(s.pol.a), endA = s.pol.a - 8 / rp;
  const approach = Math.min(30, 0.55 * (prevEndA - s.pol.a) * rp);
  named.push([s.pol.a + approach / rp, `p${i}a`], [endA, `p${i}b`]);
  prevEndA = endA;
});
named.push([aboutA + 22 * DEG, "aboutA"], [aboutA - 2 * DEG, "aboutB"]);
named.sort((p, q) => q[0] - p[0]);
for (let a = ENTRY_A, ni = 0; a >= aboutA; ) {
  pts.push(fromPolar(radiusAt(a), a, rideY(a)));
  const next = a - 2.5 / radiusAt(a);
  // markers snap to the nearest sample: inserting extra points this close to samples would kink the path
  while (ni < named.length && named[ni][0] <= a && named[ni][0] > next) { mark[named[ni][1]] = a - named[ni][0] < named[ni][0] - next ? pts.length - 1 : pts.length; ni++; }
  a = next;
}
// After About: straight out to the left of the map, leaving the system
const aboutEnd = fromPolar(ABOUT_R, aboutA, RIDE_Y);
const EXIT_DIR = new THREE.Vector3(-1, 0, 0);
for (let d = 2.5; d <= 180; d += 2.5) {
  if (d === 10) mark.exitA = pts.length;
  if (d === 180) mark.exitB = pts.length;
  pts.push(aboutEnd.clone().addScaledVector(EXIT_DIR, d).addScaledVector(up, d * 0.03));
}

// ---------- Beyond the system: the career galaxies, past to present, then the unclaimed planet.
// The exit line carries straight on through deep space at hyperspeed, so it is all one ride and one scroll.
const careerStops = [];
{
  const E = pts[pts.length - 1].clone();
  const pr = renderer.getPixelRatio();
  // where each one sits, relative to the end of the exit line (the ride heads left, along -x).
  // Spaced so one galaxy's exit run finishes well before the next one's approach, or the path would zig-zag.
  const LAYOUT = {
    sabirin: { at: [-700, 30, -60], radius: 70, arms: 2, bar: 0, count: 12000, tint: [1.0, 0.86, 0.7], bright: 0.75, wind: 1.3, seed: 11 },
    sno: { at: [-1150, -10, 50], radius: 95, arms: 2, bar: 0.35, count: 16000, tint: [1.0, 0.88, 0.74], bright: 0.9, wind: 1.5, seed: 23 },
    switch: { at: [-1550, 10, 0], len: 150, radius: 10 },
    upstack: { at: [-2050, 35, -55], radius: 125, arms: 4, bar: 0, count: 22000, tint: [0.82, 0.88, 1.0], bright: 1.0, wind: 1.7, seed: 37 },
    appetiser: { at: [-2650, 0, 45], radius: 150, arms: 3, bar: 0.2, count: 26000, tint: [0.88, 0.92, 1.0], bright: 1.2, wind: 1.6, seed: 41 },
  };
  const key = [E.clone()];
  let prev = E.clone();
  const marks = []; // [position, name]
  CAREER_COPY.forEach((c) => {
    const L = LAYOUT[c.key], center = E.clone().add(new THREE.Vector3(...L.at));
    const dir = center.clone().sub(prev).normalize();
    const stop = { kind: c.kind, P: center, copy: c, name: c.org, color: "#FFFFFF", textLeft: true };
    if (c.kind === "galaxy") {
      // the disc faces back toward you on the way in, so you see the spiral, then you cross it beside the core
      const normal = new THREE.Vector3(0, 0.6, 0).addScaledVector(dir, -0.8).normalize();
      const g = makeGalaxy({ ...L, pr });
      g.position.copy(center);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      scene.add(g);
      stop.object = g;
      const lateral = new THREE.Vector3().crossVectors(dir, normal).normalize();
      const through = center.clone().addScaledVector(lateral, -0.28 * L.radius);
      const A = through.clone().addScaledVector(dir, -1.5 * L.radius);
      key.push(A, through, through.clone().addScaledVector(dir, 0.9 * L.radius));
      marks.push([A, c.key + "a"], [through.clone().addScaledVector(dir, -0.3 * L.radius), c.key + "b"]);
      prev = through;
    } else {
      // the wormhole: a short tunnel straight along the ride
      const M0 = center.clone().addScaledVector(dir, -L.len / 2), M1 = center.clone().addScaledVector(dir, L.len / 2);
      const w = makeWormhole({ len: L.len, radius: L.radius, pr });
      w.position.copy(M0);
      w.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      scene.add(w);
      stop.object = w;
      stop.axisPitch = Math.asin(dir.y); // the tunnel climbs a little: look along it, not level, so it sits dead centre
      key.push(M0.clone().addScaledVector(dir, -90), M0.clone().addScaledVector(dir, -45), M0, M1, M1.clone().addScaledVector(dir, 45));
      marks.push([M0, c.key + "a"], [M1, c.key + "b"]);
      prev = M1;
    }
    careerStops.push(stop);
  });
  // the unclaimed planet: you glide up to it and stop, with it on your right
  const Pc = E.clone().add(new THREE.Vector3(-3100, 10, 20));
  const dir = Pc.clone().sub(prev).normalize(), right = new THREE.Vector3().crossVectors(dir, up).normalize();
  const planet = makeUnclaimedPlanet({ radius: 6 });
  planet.position.copy(Pc);
  scene.add(planet);
  const A = Pc.clone().addScaledVector(dir, -110).addScaledVector(right, -10), F = Pc.clone().addScaledVector(dir, -26).addScaledVector(right, -9);
  key.push(A, F);
  marks.push([A, "contactA"], [F, "contactB"]);
  careerStops.push({ kind: "contact", P: Pc, copy: CONTACT_COPY, name: "Contact", color: "#FFFFFF", textLeft: true, object: planet });
  // sample the stretch evenly and add it to the one ride
  const helper = new THREE.CatmullRomCurve3(key, false, "centripetal");
  const sampled = helper.getSpacedPoints(Math.ceil(helper.getLength() / 4));
  const base = pts.length;
  sampled.slice(1).forEach((p) => pts.push(p));
  for (const [p, name] of marks) {
    let best = 0, bd = Infinity;
    for (let k = base; k < pts.length; k++) { const d = pts[k].distanceToSquared(p); if (d < bd) { bd = d; best = k; } }
    mark[name] = best;
  }
}
stops.push(...careerStops);
const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
curve.arcLengthDivisions = pts.length * 6; // fine enough that distance along the ride is exact
// curve parameter (by distance) of each sample
const uOfIdx = (() => {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return (idx) => L[idx] / L[L.length - 1];
})();
stops.forEach((s, i) => {
  if (s.kind === "project") { s.u0 = uOfIdx(mark[`p${i}a`]); s.u1 = uOfIdx(mark[`p${i}b`]); }
  else if (s.kind === "about") { s.u0 = uOfIdx(mark.aboutA); s.u1 = uOfIdx(mark.aboutB); }
  else if (s.kind === "exit") { s.u0 = uOfIdx(mark.exitA); s.u1 = uOfIdx(mark.exitB); }
  else if (s.kind === "contact") { s.u0 = uOfIdx(mark.contactA); s.u1 = 1; }
  else { s.u0 = uOfIdx(mark[s.copy.key + "a"]); s.u1 = uOfIdx(mark[s.copy.key + "b"]); }
});

// The black hole sits behind the unclaimed planet, centred in the final view, so the last frame shows the planet
// silhouetted against its glowing ring. It is also the way home ("Back to where it all started").
const blackHole = (() => {
  const end = curve.getPointAt(1), fwd = curve.getTangentAt(1).setY(0).normalize();
  const bh = makeBlackHole({ radius: 12 });
  bh.position.copy(end).addScaledVector(fwd, 150); // closer than the starfield, so the horizon hides every star behind it
  bh.position.y = end.y - 15; // where the final view's gentle downward gaze is centred
  scene.add(bh);
  return bh;
})();

// Scroll timeline. Each stop has a ride (u 0 to TRAVEL) and a slow glide (TRAVEL to 1). Every glide gets the same
// scroll, so each planet has the same reading time; each ride gets scroll in proportion to its length, so the board
// keeps an even pace and never seems to float in place on the short inner hops.
const HERO_END = 0.012; // the ride starts almost at once, so the name leaves as the board moves
const TRAVEL = 0.45;
const NAME_GONE = TRAVEL * 0.03; // how far into the first ride the name has fully faded
{
  const L = curve.getLength();
  const rideLen = stops.map((s, i) => Math.max(0, (s.u0 - (i ? stops[i - 1].u1 : 0)) * L));
  const mean = rideLen.reduce((a, b) => a + b, 0) / rideLen.length;
  const w = stops.map((s, i) => ({ ride: THREE.MathUtils.clamp(0.45 * rideLen[i] / mean, 0.12, 0.8) /* capped, so the opening swoop doesn't keep you waiting */, glide: 0.55 }));
  const total = w.reduce((a, b) => a + b.ride + b.glide, 0), scale = (1 - HERO_END) / total;
  // page length grows with the ride, at the pace the solar system was tuned to (9 stops over 2160vh)
  const sysW = w.slice(0, 9).reduce((a, b) => a + b.ride + b.glide, 0);
  document.querySelector(".scroll-track").style.height = `${150 + (2160 * total) / sysW}vh`;
  let at = HERO_END;
  stops.forEach((s, i) => {
    s.ps0 = at; s.psT = at + w[i].ride * scale; s.ps1 = s.psT + w[i].glide * scale; at = s.ps1;
  });
}
const segStart = (i) => (i < stops.length ? stops[i].ps0 : 1);
const atStop = (i, u) => {
  if (i >= stops.length) return 1 + (u || 0);
  const s = stops[i];
  return u <= TRAVEL ? THREE.MathUtils.lerp(s.ps0, s.psT, u / TRAVEL) : THREE.MathUtils.lerp(s.psT, s.ps1, (u - TRAVEL) / (1 - TRAVEL));
};
// scroll position -> which stop, and how far through it (u 0..1, same meaning as atStop)
function stopAt(ps) {
  let i = 0; while (i < stops.length - 1 && ps >= stops[i].ps1) i++;
  const s = stops[i];
  const u = ps < s.psT ? TRAVEL * (ps - s.ps0) / (s.psT - s.ps0) : TRAVEL + (1 - TRAVEL) * (ps - s.psT) / (s.ps1 - s.psT);
  return { i, u: Math.max(0, u) };
}

// ---------- Build the copy for each stop, and the project index
// the two lines sit a short, even gap apart whether the first wraps to one line or two: each knows the other's height
const fitBeats = [];
const fitBeatGaps = () => fitBeats.forEach((el) => {
  el.style.setProperty("--b1h", el.querySelector(".b1").offsetHeight + "px");
  el.style.setProperty("--b2h", el.querySelector(".b2").offsetHeight + "px");
  // a stacked name (About) is set as wide as the description under it: the longer of its two lines fills that width
  const h = el.querySelector("h2.stack"), p = h && h.parentNode.querySelector("p");
  if (h && p) {
    h.style.fontSize = "";
    const fs = parseFloat(getComputedStyle(h).fontSize), wide = Math.max(...[...h.children].map((c) => c.getBoundingClientRect().width));
    // (phones: 60% of it, or the name fills the screen and runs into the header)
    if (wide) h.style.fontSize = (fs * p.getBoundingClientRect().width * (innerWidth < 760 ? 0.6 : 1) / wide).toFixed(2) + "px";
  }
});
const orbitsEl = document.querySelector(".orbits");
const indexEl = document.querySelector(".index");
stops.forEach((s, i) => {
  const n = String(i + 1).padStart(2, "0");
  const el = document.createElement("section");
  el.className = `orbit-copy ${s.textLeft ? "tl" : "br"}${s.kind === "galaxy" || s.kind === "wormhole" ? " over-stars" : ""}`;
  el.style.setProperty("--c", s.color);
  let block = "";
  if (s.kind === "project") {
    // View project: for phones and touch screens, where there is no planet cursor to click (desktop clicks the planet)
    block = `<span class="pos">${n} / 0${PROJECT_COUNT} · In orbit</span><h2>${s.name}</h2><button type="button" class="enter view">View project</button><p>${s.copy.line}</p>`;
  } else if (s.kind === "about") {
    block = `<span class="pos">${s.copy.label}</span><h2 class="stack"><span>Arieff</span> <i>Hizer</i></h2><p>${s.copy.line}</p>
      <a class="enter" href="${s.copy.link.href}" target="_blank" rel="noopener">${s.copy.link.text}</a>`;
  }
  if (s.kind === "galaxy" || s.kind === "wormhole") {
    // the wormhole carries no date, and can list more than one credential, one per line
    block = `<span class="pos">${[s.copy.years, s.copy.field].filter(Boolean).join(" · ")}</span><h2 class="org">${s.copy.org}</h2><p class="role">${[].concat(s.copy.role).join("<br>")}</p><p>${s.copy.line}</p>`;
  } else if (s.kind === "contact") {
    block = `<span class="pos">${s.copy.label}</span><h2>Arieff <i>Hizer</i></h2><p class="links">${s.copy.links.map((l) => `<a class="enter" href="${l.href}" ${l.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${l.text}</a>`).join(" ")}</p>
      <button type="button" class="enter home" data-jump="home">Back to where it all started</button>`;
  }
  const beats = s.copy.beats || ["", ""];
  el.innerHTML = `<p class="beat b1">${beats[0]}</p><p class="beat b2">${beats[1]}</p>${block ? `<div class="project">${block}</div>` : ""}`;
  orbitsEl.append(el);
  s.el = { b1: el.querySelector(".b1"), b2: el.querySelector(".b2"), project: el.querySelector(".project") };
  el.querySelector(".view")?.addEventListener("click", () => warpTo(i));
  fitBeats.push(el);
  if (s.kind !== "project") return;
  const li = document.createElement("li");
  li.textContent = `${n} ${s.name}`;
  li.style.setProperty("--c", s.color);
  li.tabIndex = 0;
  li.addEventListener("click", () => warpTo(i)); // the index opens a case study directly, no flying first
  li.addEventListener("keydown", (e) => { if (e.key === "Enter") warpTo(i); });
  indexEl.append(li);
  s.li = li;
});
fitBeatGaps();
document.fonts.ready.then(fitBeatGaps);
addEventListener("resize", fitBeatGaps);

// ---------- Input and scroll state
const state = { speed: reduce ? 0 : 1, push: 0, skip: 0, p: 0, ps: 0, mx: 0, my: 0, smx: 0, smy: 0, heroIn: reduce }; // heroIn: the name has finished arriving
// only a mouse tilts the view. A finger scrolling a phone would jump it toward wherever each swipe began and leave it
// there; on touch screens the view stays centred and the scroll alone moves the ride
addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; state.mx = (e.clientX / innerWidth) * 2 - 1; state.my = (e.clientY / innerHeight) * 2 - 1; });

history.scrollRestoration = "manual";
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.create({ trigger: ".scroll-track", start: "top top", end: "bottom bottom", onUpdate: (s) => (state.p = s.progress) });
const maxScroll = () => document.documentElement.scrollHeight - innerHeight;

const hero = document.querySelector(".hero");
const flood = document.querySelector(".flood");
// (cleared once that return has landed: from then on the scroll drives the name like on any other visit)
let back = stops.findIndex((s) => s.kind === "project" && `#${s.copy.slug}` === location.hash);
if (back >= 0) {
  // Returning from a case study: the dive in reverse. The colour fades to the planet's surface filling the screen,
  // then you pull back out of it into that orbit
  state.speed = 0;
  hero.style.opacity = 0;
  const target = atStop(back, 0.86);
  // back to the planet's place: now, on load, and again until it holds (iOS can restore or reset the scroll after load)
  const land = () => { scrollTo(0, target * maxScroll()); state.p = state.ps = target; };
  land();
  addEventListener("load", land);
  for (const t of [120, 400, 900, 1600]) setTimeout(() => { if (Math.abs(scrollY - target * maxScroll()) > 4) land(); }, t);
  state.warpPlanet = stops[back].p;
  state.push = 1;
  document.body.classList.add("transiting");
  // (fillLayer: a canvas, which iOS Safari's bar tint ignores)
  fillLayer(flood, stops[back].color);
  flood.style.clipPath = "none";
  gsap.set(flood, { autoAlpha: 1 });
  gsap.timeline({ delay: 0.25 })
    .to(flood, { autoAlpha: 0, duration: reduce ? 0.01 : 0.7, ease: "power1.inOut", onComplete: () => (fillLayer(flood, null)) })
    .to(state, { push: 0, duration: reduce ? 0.01 : 2.0, ease: "power2.inOut" }, "-=0.15")
    .add(() => showCopy(), "-=0.6")
    .add(() => { back = -1; state.heroIn = true; }); // landed: scrolling up to the start shows the name, and scrolling on fades it
} else {
  scrollTo(0, 0);
  addEventListener("load", () => scrollTo(0, 0));
  if (!reduce) gsap.set(hero, { opacity: 0 });
  // on a first visit the opening plays first (it ends in a whiteout at full speed), then the arrival decelerates
  // into the system as usual; returning visitors go straight to the arrival
  playIntro({ reduce }).then(({ played }) => {
    if (reduce) return;
    const lead = played ? 0.9 : 0.35; // after the opening, a beat at full superspeed before it slows
    gsap.to(state, { speed: 0, duration: 2.8, ease: "power3.out", delay: lead });
    // the name fades up out of a blur: opacity and filter only (a letter-spacing tween re-laid the text out every
    // frame, just as the scene is at its heaviest, and stuttered)
    gsap.fromTo(hero, { opacity: 0, filter: "blur(10px)" }, { opacity: 1, filter: "blur(0px)", duration: 1.6, ease: "power3.out", delay: lead + 1.55, onComplete: () => (state.heroIn = true) });
  });
}
// where the board sits on screen in the hero (it rides with the camera, so this never changes)
function boardRect() {
  camera.updateMatrixWorld(true);
  // the board's own surface points, not its bounding box: a box's corners sit beside the camera and project huge
  const pos = boardMesh.geometry.attributes.position, v = new THREE.Vector3();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let k = 0; k < pos.count; k += 3) {
    v.fromBufferAttribute(pos, k).applyMatrix4(boardMesh.matrixWorld).project(camera);
    if (v.z > 1 || Math.abs(v.x) > 3) continue; // behind the camera, or far off screen
    const px = (v.x + 1) / 2 * innerWidth, py = (1 - v.y) / 2 * innerHeight;
    if (py > innerHeight) continue; // only the part you can see: its tail runs below the screen, right up to the camera
    x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
  }
  return { left: x0, top: y0, width: x1 - x0, height: innerHeight * 1.08 - y0 }; // it runs off the bottom of the screen
}

document.documentElement.classList.remove("booting"); // the name's opacity is now set by the script

// ---------- Enter a case study: turn to the planet and dive at it until its surface fills the whole screen,
// then that fades into the project's colour, which is where the case study page begins
let warping = false;
function warpTo(i) {
  if (warping) return;
  warping = true;
  const s = stops[i];
  const go = () => (location.href = `case.html?p=${s.copy.slug}`);
  if (reduce) return go();
  endSkips();
  document.body.classList.add("transiting");
  fillLayer(flood, s.color);
  flood.style.clipPath = "none";
  gsap.set(flood, { autoAlpha: 0 }); // (autoAlpha: hidden outright when clear, so Safari never tints its bars with it)
  // far from the planet (out in the Journey, say): superspeed, and its colour floods in at full streak
  if (s.p.group.getWorldPosition(new THREE.Vector3()).distanceTo(camera.position) > 45) {
    gsap.timeline({ onComplete: go })
      .to(state, { skip: 1, duration: 0.9, ease: "power2.in" })
      .to(flood, { autoAlpha: 1, duration: 0.45, ease: "power1.in" }, "-=0.3");
    return;
  }
  state.warpPlanet = s.p;
  gsap.timeline({ onComplete: go })
    .to(state, { push: 1, duration: 1.7, ease: "power3.inOut" })
    .to(flood, { autoAlpha: 1, duration: 0.55, ease: "power1.in" }, "-=0.35");
}
// where the dive is: just above the planet's surface on your side of it, looking at its centre
const divePos = new THREE.Vector3(), diveCentre = new THREE.Vector3();
function applyDive(pos, look) {
  const p = state.warpPlanet;
  if (!p || state.push <= 0) return;
  const k = state.push;
  p.group.getWorldPosition(diveCentre);
  divePos.copy(pos).sub(diveCentre).normalize().multiplyScalar(p.r * 1.06).add(diveCentre);
  look.lerp(diveCentre, THREE.MathUtils.smoothstep(k, 0, 0.45)); // turn to it first
  pos.lerp(divePos, k);
}
addEventListener("pageshow", (e) => { if (e.persisted) location.reload(); });

// ---------- The planet is the button. While its title is fully up, hovering the planet brings up a spark and "View"
// beside the pointer (as the mockups on a case page do), and clicking the planet dives in. The text button stays, for
// keyboards, screen readers and touch.
const ring = document.querySelector(".planet-cursor");
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hitSphere = new THREE.Sphere();
const pointer = { x: -1, y: -1, mouse: false };
addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.mouse = e.pointerType === "mouse"; });
addEventListener("pointerleave", () => { pointer.x = -1; });
document.documentElement.addEventListener("mouseleave", () => { pointer.x = -1; });
// which planet (if any) is under a screen point, counting a little of its atmosphere
function planetAt(x, y) {
  if (warping || transit || skipTl) return -1;
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return stops.findIndex((s) => s.kind === "project" && s.titleOn
    && ray.ray.intersectsSphere(hitSphere.set(s.p.group.getWorldPosition(hitSphere.center), s.p.r * 1.12)));
}
let hoverStop = -1;
function updatePlanetCursor() {
  const i = pointer.mouse && pointer.x >= 0 ? planetAt(pointer.x, pointer.y) : -1;
  if (i !== hoverStop) {
    hoverStop = i;
    ring.classList.toggle("on", i >= 0);
    document.body.classList.toggle("over-planet", i >= 0);
  }
  ring.style.transform = `translate(${pointer.x}px, ${pointer.y}px)`;
}
// a tap, read from the pointer itself: iOS only sends a click to the page when the tapped element looks clickable,
// and the planets live in the canvas
let tapDown = null;
addEventListener("pointerdown", (e) => { tapDown = e.isPrimary ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; });
addEventListener("pointerup", (e) => {
  const tap = tapDown && Math.hypot(e.clientX - tapDown.x, e.clientY - tapDown.y) < 12 && performance.now() - tapDown.t < 600;
  tapDown = null;
  if (!tap || e.target.closest("a, button, li, input")) return;
  const i = planetAt(e.clientX, e.clientY);
  if (i >= 0) warpTo(i);
});

// ---------- Text choreography driven by scroll
const chapter = document.querySelector(".chapter-name"), fill = document.querySelector(".fill");
// Arrives softly, leaves by streaking in the direction of travel
function choreograph(el, inA, inB, outA, outB, dir = -1) {
  const a = remap(state.ps, inA, inB), o = outA == null ? 0 : remap(state.ps, outA, outB);
  el.style.opacity = (a * (1 - o)).toFixed(3);
  el.style.visibility = a * (1 - o) < 0.002 ? "hidden" : "visible";
  el.style.filter = `blur(${((1 - a) * 6 + o * 12).toFixed(2)}px)`;
  el.style.transform = `translate(${(dir * o * 90).toFixed(1)}px, ${((1 - a) * 16 + dir * o * 40).toFixed(1)}px) scale(${(1 + o * 0.35).toFixed(3)}, ${(1 - o * 0.1).toFixed(3)})`;
}
function updateText() {
  const o = remap(state.ps, HERO_END, atStop(0, NAME_GONE)); // fades out at the start of the ride (quick, so the rests after it have room)
  if (state.speed < 0.2 && back < 0 && state.heroIn) { // never while the name is still fading in
    hero.style.opacity = (1 - o).toFixed(3);
    hero.style.filter = `blur(${(o * 12).toFixed(2)}px)`;
    hero.style.transform = `translate(${(-o * 120).toFixed(1)}px, calc(-58% - ${(o * 50).toFixed(1)}px)) scale(${(1 + o * 0.4).toFixed(3)}, ${(1 - o * 0.08).toFixed(3)})`;
  }
  let active = -1;
  stops.forEach((s, i) => {
    const dir = s.textLeft ? -1 : 1;
    // Planets: the two lines play on the approach; the title shows exactly while the head glances at the planet.
    const T = timesOf(s);
    const at = (v) => (v == null ? null : atStop(i, v)); // null means the copy stays (the end of the ride)
    choreograph(s.el.b1, ...T.b1.map(at), dir);
    choreograph(s.el.b2, ...T.b2.map(at), dir);
    if (s.el.project) {
      choreograph(s.el.project, ...T.pr.map(at), dir);
      if (s.kind === "project") s.titleOn = parseFloat(s.el.project.style.opacity) > 0.9; // the planet is clickable while its title is fully up
      s.el.project.style.pointerEvents = state.ps > atStop(i, T.click[0]) && state.ps < atStop(i, T.click[1]) ? "auto" : "none";
    }
    if (state.ps > atStop(i, 0.25)) active = i;
  });
  stops.forEach((s, i) => s.li && s.li.classList.toggle("on", i === active));
  const s = stops[active];
  chapter.textContent = state.ps < HERO_END * 0.6 ? "Arrival" : !s ? "Gliding in"
    : s.kind === "project" ? `Projects · ${String(active + 1).padStart(2, "0")} ${s.name}`
    : s.kind === "about" ? "The rider"
    : s.kind === "exit" ? "Leaving the system"
    : s.kind === "contact" ? "Contact" : `Journey · ${s.copy.org}`;
  fill.style.transform = `scaleX(${state.ps.toFixed(3)})`;
}

// ---------- Camera pose along the spiral. The board always points along the path.
// You read each planet's copy with your eyes on the path, while the planet is still ahead.
// As you pass alongside, the head glances at it, then returns to the path. At About the head turns to the sun.
const look = new THREE.Vector3(), ahead = new THREE.Vector3(), tmp = new THREE.Vector3();
const pathDir = new THREE.Vector3(0, 0, -1);
const SUN_GAZE = 0.72;
const sunLook = Cw.clone().add(new THREE.Vector3(0, 1, 0));
let boardFollow = 0; // how much the board holds the path heading, eased in as the ride leaves the system view
// The passing glance is driven by where the planet actually is: it builds as you draw level and lets go
// as the planet falls behind, the same at every planet, and never holds while you read.
// The glance tracks the planet: once it is more than 25 degrees off the path, the head turns just enough to keep
// it about 25 degrees right of centre, up to 40 degrees. As it sweeps past the edge, the head returns to the path.
const GLANCE_LEAD = 25 * DEG, GLANCE_MAX = 40 * DEG;
function glanceYaw(s, pos, pathYaw) {
  const dx = s.P.x - pos.x, dz = s.P.z - pos.z, d = Math.hypot(dx, dz);
  if (d > 18) return 0;
  let dy = Math.atan2(dz, dx) - pathYaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  const a = Math.abs(dy);
  const track = THREE.MathUtils.clamp(a - GLANCE_LEAD, 0, GLANCE_MAX);
  const release = 1 - THREE.MathUtils.smoothstep(a, 70 * DEG, 110 * DEG);
  return Math.sign(dy) * track * release * (1 - THREE.MathUtils.smoothstep(d, 9, 18));
}
function passingGlance(pos, pathYaw) {
  let best = null, by = 0;
  const myR = Math.hypot(pos.x - Cw.x, pos.z - Cw.z);
  for (const s of stops) {
    if (s.kind !== "project" || s.pol.r < myR) continue; // planets on inner rings are ahead on your left, not being passed
    const y = glanceYaw(s, pos, pathYaw);
    if (Math.abs(y) > Math.abs(by)) { by = y; best = s; }
  }
  return { s: best, yaw: by };
}
// Copy timing per planet, measured from the glance itself: the title fades in as the head starts to turn
// and out as it comes back to the path. The two lines play before that, while the planet is still ahead.
// Where along each planet's slow glide the glance happens (as fractions of the glide)
function glanceSpan(s) {
  if (s.span) return s.span;
  const p = new THREE.Vector3(), t = new THREE.Vector3();
  let fS = null, fE = null;
  for (let k = 0; k <= 400; k++) {
    const uu = THREE.MathUtils.lerp(s.u0, s.u1, k / 400);
    curve.getPointAt(uu, p); curve.getTangentAt(uu, t);
    if (Math.abs(glanceYaw(s, p, Math.atan2(t.z, t.x))) > 5 * DEG) { if (fS === null) fS = k / 400; fE = k / 400; }
  }
  return (s.span = { fS: fS ?? 0.6, fE: fE ?? 0.9 });
}
// The scroll spends 35% of the glide on the approach (the two lines), 55% passing alongside (the glance and the
// title), and 10% easing away, so the title stays up for a good stretch instead of flashing by.
const GLIDE_Q = [0, 0.35, 0.9, 1];
function glideFraction(s, q) {
  const { fS, fE } = glanceSpan(s), F = [0, fS, fE, 1];
  let j = 0; while (j < 2 && q > GLIDE_Q[j + 1]) j++;
  return THREE.MathUtils.lerp(F[j], F[j + 1], (q - GLIDE_Q[j]) / (GLIDE_Q[j + 1] - GLIDE_Q[j]));
}
// when each stop's copy plays: [in from, fully in, out from, fully out] for the two lines (b1, b2) and the title (pr)
function timesOf(s) {
  return s.kind === "project" ? textTimes(s)
    // career: the copy plays as the galaxy fills the view, and leaves before you cross its core
    : s.kind === "galaxy" || s.kind === "wormhole" ? { b1: [2, 2, 2, 2], b2: [2, 2, 2, 2], pr: [0.42, 0.52, 0.9, 0.98], click: [2, 2] }
    // contact: two lines, then the planet's copy stays, since it is the end of the ride
    : s.kind === "contact" ? { b1: [0.3, 0.38, 0.55, 0.6], b2: [0.34, 0.42, 0.57, 0.62], pr: [0.62, 0.72, null, null], click: [0.66, 9] }
    : { b1: [0.4, 0.48, 0.62, 0.68], b2: [0.45, 0.53, 0.64, 0.7], pr: [0.7, 0.77, 0.96, 1.02], click: [0.74, 0.96] };
}
function textTimes(s) {
  if (s.textT) return s.textT;
  const toSeg = (q) => TRAVEL + (1 - TRAVEL) * q;
  const a = toSeg(GLIDE_Q[1]), b = toSeg(0.82); // the title leaves as the planet sweeps off the right edge
  s.textT = { b1: [0.33, 0.39, a - 0.12, a - 0.08], b2: [0.37, 0.43, a - 0.1, a - 0.06], pr: [a - 0.01, a + 0.04, b - 0.04, b + 0.01], click: [a + 0.03, b - 0.04] };
  return s.textT;
}
// One continuous pace for the whole ride: a smooth, always-forward curve through the key moments of every stop
// (each approach, the start and end of each title, the sun, the exit). The pace rises and falls but never jumps;
// a jump in pace is what made planets whip past at the end of a pass.
function monotone(xs, ys, endSlope) {
  const n = xs.length, d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = 0; m[n - 1] = endSlope ?? d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return (x) => {
    let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = THREE.MathUtils.clamp((x - xs[i]) / h, 0, 1), t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
let rideMap = null;
function rideU(ps) {
  if (!rideMap) {
    const xs = [HERO_END], ys = [0];
    const q2u = (q) => TRAVEL + (1 - TRAVEL) * q;
    stops.forEach((s, i) => {
      const at = (u) => atStop(i, u);
      xs.push(at(TRAVEL)); ys.push(s.u0);
      if (s.kind === "project") {
        const { fS, fE } = glanceSpan(s);
        xs.push(at(q2u(GLIDE_Q[1])), at(q2u(GLIDE_Q[2])), at(1));
        ys.push(THREE.MathUtils.lerp(s.u0, s.u1, fS), THREE.MathUtils.lerp(s.u0, s.u1, fE), s.u1);
      } else {
        xs.push(at(1)); ys.push(s.u1);
      }
    });
    rideMap = monotone(xs, ys);
  }
  return rideMap(Math.max(HERO_END, ps));
}
let levelGaze = 0;
const WORM_ALIGN = 0.4; // how far into the wormhole stretch the board is lined up on the tunnel's axis
function poseAt(ps, outPos, outLook) {
  if (ps <= HERO_END) {
    outPos.copy(HERO_POS); outLook.copy(HERO_LOOK);
    pathDir.copy(HERO_LOOK).sub(HERO_POS).setY(0).normalize();
    boardFollow = 0;
    return 0;
  }
  const { i, u } = stopAt(ps), s = stops[i];
  let k = 1, flight = 0;
  if (u < TRAVEL) { k = u / TRAVEL; flight = Math.sin(k * Math.PI); }
  else if (s.kind === "exit") flight = 0.4;
  const uu = rideU(ps);
  curve.getPointAt(uu, outPos);
  curve.getTangentAt(uu, pathDir).setY(0).normalize();
  // Blend the head turn as angles, not points, so "70% of the way" really is 70% of the turn
  let yaw = Math.atan2(pathDir.z, pathDir.x), pitch = Math.atan2(-3, 30); // eyes down the path, a gentle downward gaze
  const pathYaw = yaw;
  const turnToward = (target, w, minPitch = -0.32) => {
    if (w <= 0) return;
    const dx = target.x - outPos.x, dz = target.z - outPos.z;
    let dy = Math.atan2(dz, dx) - yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    w *= 1 - THREE.MathUtils.smoothstep(Math.abs(dy), 100 * DEG, 150 * DEG); // let go once it falls behind you
    yaw += dy * w;
    const tp = Math.max(minPitch, Math.atan2(target.y - outPos.y, Math.hypot(dx, dz))); // never stare down at your feet
    pitch += (tp - pitch) * w;
  };
  // leaving the system view: the head swings from the overview to the path over the whole first glide, not in a snap
  if (i === 0 && u < TRAVEL) turnToward(HERO_LOOK, 1 - THREE.MathUtils.smootherstep(k, 0, 0.95), -Math.PI / 2);
  boardFollow = i === 0 && u < TRAVEL ? THREE.MathUtils.smootherstep(k, 0, 0.95) : 1;
  // planets: a glance only while passing alongside
  const glance = passingGlance(outPos, pathYaw);
  if (glance.s) {
    yaw += glance.yaw;
    const g = glance.s.P, dist = Math.hypot(g.x - outPos.x, g.z - outPos.z);
    pitch += (Math.max(-0.32, Math.atan2(g.y - outPos.y, dist)) - pitch) * Math.min(1, Math.abs(glance.yaw) / GLANCE_MAX) * 0.6;
  }
  // the sun at About: the head turns to it while its copy plays, then eases back as you leave
  const prev = stops[i - 1];
  if (s.kind === "about") turnToward(sunLook, SUN_GAZE * (u < TRAVEL ? THREE.MathUtils.smoothstep(k, 0.5, 1) : 1));
  if (prev && prev.kind === "about" && u < TRAVEL) turnToward(sunLook, SUN_GAZE * (1 - THREE.MathUtils.smoothstep(k, 0, 0.65)));
  // through the wormhole: look straight down the tunnel's axis, so its centre is the centre of the speed lines.
  // Locked by the time the board is on the axis (WORM_ALIGN), which is when the burst starts.
  levelGaze = s.kind === "wormhole" ? (u < TRAVEL ? THREE.MathUtils.smoothstep(u, WORM_ALIGN * 0.5, WORM_ALIGN) : 1)
    : prev && prev.kind === "wormhole" && u < TRAVEL ? 1 - THREE.MathUtils.smoothstep(k, 0, 0.4) : 0;
  const axisPitch = s.kind === "wormhole" ? s.axisPitch : prev && prev.kind === "wormhole" ? prev.axisPitch : 0;
  pitch += (axisPitch - pitch) * levelGaze;
  outLook.set(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw)).multiplyScalar(30).add(outPos);
  return flight;
}

// Hero tilt of the system: a little toward the viewer, and rolled so the rings run on a diagonal
const HERO_TILT = { x: 0.1, z: 0.2 };
const tiltEuler = new THREE.Euler(), tiltPivot = new THREE.Vector3();

// Hyperspeed along the ride: up on the exit, a cruise through deep space, easing off into the first galaxy,
// and a short burst through the wormhole
const EXIT_I = stops.findIndex((s) => s.kind === "exit"), GAL1_I = stops.findIndex((s) => s.kind === "galaxy"), WORM_I = stops.findIndex((s) => s.kind === "wormhole");
function rideSpeed(ps) {
  const up = Math.pow(remap(ps, atStop(EXIT_I, 0.7), atStop(EXIT_I, 1)), 1.5);
  const cruise = ps < atStop(EXIT_I, 1) ? up : 1 - THREE.MathUtils.smoothstep(ps, atStop(GAL1_I, 0.05), atStop(GAL1_I, TRAVEL));
  const worm = WORM_I < 0 ? 0 : 0.55 * Math.sin(Math.PI * remap(ps, atStop(WORM_I, WORM_ALIGN), atStop(WORM_I, 1))) // only once you are lined up;
  return Math.max(ps < atStop(GAL1_I, TRAVEL) ? cruise : 0, worm);
}

// ---------- Shortcuts: About (a direct flight to the start of About) and Journey (superspeed to the galaxies)
const ABOUT_I = stops.findIndex((s) => s.kind === "about");
let transit = null, skipTl = null;
let restTween = null, restTo = null; // a glide between reading rests (below), and where it is going
const veil = document.querySelector(".veil");
const setScroll = (ps) => { scrollTo(0, ps * maxScroll()); state.p = state.ps = ps; };
// show the copy again, but only after it has been set for where you are now: otherwise the name, still fully
// visible from the hero underneath, flashes for a frame as you land
function showCopy() { updateText(); document.body.classList.remove("transiting"); }
function endSkips() {
  restTween?.kill(); restTween = null; restTo = null; chained = false;
  // a return home cut short on its way down: the name is still in its scrolled-out pose, so the scroll takes it back
  if (skipTl && skipTl.data === "home") state.heroIn = true;
  if (transit) { transit.tween.kill(); transit = null; }
  if (skipTl) { skipTl.kill(); skipTl = null; }
  gsap.to(state, { skip: 0, duration: 0.6 });
  gsap.to(veil, { opacity: 0, duration: 0.2 });
  showCopy();
}
// your own scrolling always wins over a shortcut
for (const ev of ["wheel", "touchstart", "keydown"]) addEventListener(ev, () => { if (transit || skipTl) endSkips(); }, { passive: true });

// The About flight, like riding toward a lighthouse: the view and the board turn to the sun, you glide straight at it,
// and as you get close you swing around it on the real ride path, eyes still on the sun, settling into the About
// view (sun on your left, copy on the right). It starts from exactly where you are with zero speed and lands
// exactly on the ride, so nothing snaps at either end.
function aimAt(pos, yaw, pitch, target, w, minPitch = -0.32) {
  const dx = target.x - pos.x, dz = target.z - pos.z;
  let dy = Math.atan2(dz, dx) - yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  const tp = Math.max(minPitch, Math.atan2(target.y - pos.y, Math.hypot(dx, dz)));
  return [yaw + dy * w, pitch + (tp - pitch) * w];
}
function flyTo(targetPs) {
  endSkips();
  const fromPos = new THREE.Vector3(), fromLook = new THREE.Vector3();
  poseAt(state.ps, fromPos, fromLook); // your pose without the cursor parallax, which keeps being applied on top
  const v0 = fromLook.clone().sub(fromPos);
  const yaw0 = Math.atan2(v0.z, v0.x), pitch0 = Math.atan2(v0.y, Math.hypot(v0.x, v0.z));
  const bf0 = boardFollow, tilt0 = system.userData.tiltAmt ?? 0;
  // join the real ride 16 units before the About view (about a 100 degree corner around the sun) and follow it in
  const L = curve.getLength(), toU = rideU(targetPs), joinU = Math.max(0, toU - 16 / L);
  const B = curve.getPointAt(joinU), tanB = curve.getTangentAt(joinU), d = fromPos.distanceTo(B);
  // the straight run aims just outside the corner, so the path makes one smooth bend into it (no S-bend)
  const A = B.clone().addScaledVector(tanB, -Math.min(25, d * 0.3));
  const run = new THREE.CubicBezierCurve3(fromPos, fromPos.clone().addScaledVector(A.clone().sub(fromPos).normalize(), d * 0.45), A, B);
  const L1 = run.getLength(), L2 = (toU - joinU) * L;
  // pace: the straight run takes the first 60% of the flight, the corner gets the slow, unhurried end
  const pace = monotone([0, 0.6, 1], [0, L1, L1 + L2], 0); // and comes to rest exactly on the About view
  transit = { run, L1, L2, L, joinU, yaw0, pitch0, bf0, tilt0, pace, t: 0, k: 0 };
  document.body.classList.add("transiting");
  transit.tween = gsap.to(transit, {
    k: 1, duration: reduce ? 0.01 : 4.8, ease: "none",
    onUpdate: () => { transit.t = transit.pace(transit.k) / (transit.L1 + transit.L2); },
    onComplete: () => { setScroll(targetPs); transit = null; showCopy(); },
  });
}
// where the About flight is at flight time k: position, path direction and view
function transitPose(tr, outPos, outLook) {
  const sm = THREE.MathUtils.smoothstep, s = tr.t * (tr.L1 + tr.L2);
  if (s < tr.L1) { tr.run.getPointAt(s / tr.L1, outPos); tr.run.getTangentAt(s / tr.L1, tmp); }
  else { const u = tr.joinU + (s - tr.L1) / tr.L; curve.getPointAt(u, outPos); curve.getTangentAt(u, tmp); }
  pathDir.copy(tmp).setY(0).normalize();
  // eyes on the sun the whole way, easing to the About view's 72% turn toward it as you settle
  let yaw = Math.atan2(pathDir.z, pathDir.x), pitch = Math.atan2(-3, 30);
  [yaw, pitch] = aimAt(outPos, yaw, pitch, sunLook, 1 - (1 - SUN_GAZE) * sm(tr.k, 0.6, 1));
  // and at the very start, turn to it from wherever you were looking (the shorter way round)
  const w0 = sm(tr.k, 0, 0.3);
  let dY = yaw - tr.yaw0; while (dY > Math.PI) dY -= Math.PI * 2; while (dY < -Math.PI) dY += Math.PI * 2;
  yaw = tr.yaw0 + dY * w0; pitch = THREE.MathUtils.lerp(tr.pitch0, pitch, w0);
  outLook.set(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw)).multiplyScalar(30).add(outPos);
}
// superspeed: build up, cut at full streak, then carry on along the ride and ease into the destination
function warpSkip(landPs, arrivePs) {
  endSkips();
  document.body.classList.add("transiting");
  const proxy = { ps: landPs };
  skipTl = gsap.timeline({ onComplete: () => { skipTl = null; } })
    .to(state, { skip: 1, duration: reduce ? 0.01 : 0.8, ease: "power2.in" })
    .to(veil, { opacity: 1, duration: 0.15 })
    .add(() => setScroll(landPs))
    .to(veil, { opacity: 0, duration: 0.35 })
    .add(showCopy)
    .to(state, { skip: 0, duration: 1.4, ease: "power2.out" }, "<")
    .to(proxy, { ps: arrivePs, duration: reduce ? 0.01 : 2.6, ease: "power2.out", onUpdate: () => setScroll(proxy.ps) }, "<");
}
// Back to where it all started: through the black hole from the end of the ride, or superspeed from elsewhere,
// coming out into the same hyperspeed arrival as the first visit, decelerating into the tilted system view
function returnHome(viaBlackHole) {
  endSkips();
  // one fade on the name at a time: an arrival still pending would otherwise finish mid-way through this one and hand
  // the name back to the scroll mid-fade
  gsap.killTweensOf(hero);
  state.heroIn = false;
  back = -1; // (a return from a case study still landing is over too)
  document.body.classList.add("transiting");
  const tl = gsap.timeline({ data: "home", onComplete: () => { skipTl = null; } });
  const fall = reduce ? 0.01 : viaBlackHole ? 2.8 : 0.9;
  if (viaBlackHole) {
    const fromPos = new THREE.Vector3(), fromLook = new THREE.Vector3();
    poseAt(state.ps, fromPos, fromLook);
    const v0 = fromLook.clone().sub(fromPos);
    transit = { kind: "dive", fromPos, target: blackHole.position.clone(), yaw0: Math.atan2(v0.z, v0.x), pitch0: Math.atan2(v0.y, Math.hypot(v0.x, v0.z)), k: 0, lin: 0 };
    transit.tween = tl;
    tl.to(transit, { lin: 1, duration: fall, ease: "none" }, 0)
      .to(transit, { k: 1, duration: fall, ease: "power3.in" }, 0);
  }
  tl.to(state, { skip: 1, duration: fall, ease: "power3.in" }, 0)
    .to(veil, { opacity: 1, duration: 0.3 }, fall - 0.3)
    .add(() => {
      transit = null;
      setScroll(0);
      state.skip = 0; state.speed = 1;
      state.heroIn = false; // the name waits for its own fade-in
      // and fades in at rest: clear the scroll-out pose (shifted, enlarged) it was left in when the ride moved on
      hero.style.transform = "";
      gsap.set(hero, { opacity: 0, filter: "blur(10px)" });
      document.body.classList.remove("transiting");
      // back at the start: the shortcut is over. The line plays again (without the notice), then the arrival runs on
      // its own, as on the first visit, so scrolling can no longer cut the name's fade-in short (it was left visible,
      // never handed back to the scroll)
      tl.kill(); skipTl = null;
      playIntro({ reduce }).then(() => {
        gsap.set(veil, { opacity: 0 });
        gsap.to(state, { speed: 0, duration: reduce ? 0.01 : 2.8, ease: "power3.out" });
        gsap.fromTo(hero, { opacity: 0, filter: "blur(10px)" }, { opacity: 1, filter: "blur(0px)", duration: 1.6, ease: "power3.out", delay: reduce ? 0 : 1.5, onComplete: () => (state.heroIn = true) });
      });
    });
  skipTl = tl;
}
const CONTACT_I = stops.findIndex((s) => s.kind === "contact");

// ---------- Reading rests, the whole ride: a wheel flick, a swipe or an arrow key glides to the next rest and stops
// there. A rest is where there is something to read, fully up: the name; each stop's two lines, then its title or card
// (planets, About, leaving, each galaxy, contact). A free scroll could fly past the lines on one flick, or stop with
// them half gone. The long rides between planets also get rests along the way, so one flick never covers too much
// space: the user's counts, from the previous title (or the name) to the planet's lines, are the flicks it takes
// (hero to RETA 6, then one fewer each planet in, down to none from Tradelink to Selangor FC)
// (the counts are the flicks from the previous title to this one, its lines and title included; galaxies, the
// wormhole and contact get theirs on the way out too, so the journey never covers a galaxy in one flick)
const FLICKS = { reta: 6, viberist: 6, shetrades: 5, mori: 4, fitcoach: 3, tradelink: 3, selangorfc: 3 };
const ALONG_OUT = 3; // in-between rests before each galaxy, the wormhole and contact
const RESTS = [0];
// the in-between rests sit in the clear stretch only: after the last copy has fully gone (the name, or the previous
// title), before the next lines start to come in, so no rest ever stops on half-faded copy
let clearFrom = atStop(0, NAME_GONE); // where the name has fully gone
stops.forEach((s, i) => {
  const T = timesOf(s), full = (w) => w && w[0] < 2 && w[1] != null; // a part this stop really plays
  const lines = full(T.b1) && full(T.b2) && s.el.b1.textContent.trim() ? atStop(i, (Math.max(T.b1[1], T.b2[1]) + Math.min(T.b1[2] ?? 1, T.b2[2] ?? 1)) / 2) : null;
  const along = s.kind === "project" ? Math.max(0, (FLICKS[s.copy.slug] || 2) - 2)
    : s.kind === "galaxy" || s.kind === "wormhole" || s.kind === "contact" ? ALONG_OUT : 0;
  const firstIn = lines !== null ? Math.min(T.b1[0], T.b2[0]) : full(T.pr) ? T.pr[0] : null; // where its copy starts
  if (firstIn !== null && along) {
    const clearTo = atStop(i, firstIn);
    for (let k = 1; k <= along; k++) RESTS.push(clearFrom + (clearTo - clearFrom) * (k - 0.5) / along);
  }
  if (lines !== null) { RESTS.push(lines); clearFrom = atStop(i, Math.max(T.b1[3], T.b2[3])); }
  if (s.el.project && full(T.pr)) {
    RESTS.push(Math.min(0.999, atStop(i, T.pr[2] == null ? T.pr[1] + 0.08 : (T.pr[1] + T.pr[2]) / 2)));
    if (T.pr[3] != null) clearFrom = atStop(i, T.pr[3]);
  }
});
const LAST_REST = RESTS[RESTS.length - 1];
const restBusy = () => warping || transit || skipTl || document.body.classList.contains("transiting");
// is this gesture one for the rests? (below the last one; or going back up from right at it)
const inRests = (dir) => !restBusy() && (state.p < LAST_REST - 0.002 || (dir < 0 && state.p < LAST_REST + 0.002));
let chained = false; // a glide already carries one extra flick
function stepRest(dir) {
  // a second flick while gliding goes one further on, but no more: flicking hard never races through the ride
  if (restTween) { if (chained) return; chained = true; }
  const from = restTo ?? state.p;
  const next = dir > 0 ? RESTS.find((v) => v > from + 0.0015) : [...RESTS].reverse().find((v) => v < from - 0.0015);
  if (next === undefined) return;
  restTo = next;
  restTween?.kill();
  const proxy = { v: state.p };
  // slower over longer stretches, but never a crawl: about 1.4 s between the lines and the title, up to 3 s
  const dur = reduce ? 0.01 : THREE.MathUtils.clamp(1.1 + Math.abs(next - proxy.v) * 45, 1.4, 3.0);
  // it sets off at once (a flick should visibly answer), then eases into the rest
  restTween = gsap.to(proxy, { v: next, duration: dur, ease: "power2.out",
    onUpdate: () => scrollTo(0, proxy.v * maxScroll()), onComplete: () => { restTween = null; restTo = null; chained = false; } });
}
{
  let used = false, acc = 0, quiet, lastStep = 0;
  const go = (dir) => { const now = performance.now(); if (now - lastStep < 500) return false; lastStep = now; stepRest(dir); return true; };
  addEventListener("wheel", (e) => {
    const dir = Math.sign(e.deltaY);
    if (!dir || !inRests(dir) || e.ctrlKey) return;
    e.preventDefault();
    clearTimeout(quiet);
    quiet = setTimeout(() => { used = false; acc = 0; }, 180); // the gesture (and its momentum) has ended
    if (used) return;
    acc += e.deltaY * (e.deltaMode === 1 ? 16 : 1);
    if (Math.abs(acc) >= 30 && go(Math.sign(acc))) used = true;
  }, { passive: false });
  addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.("input, textarea")) return;
    const dir = { ArrowDown: 1, PageDown: 1, " ": e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1 }[e.key];
    if (dir && inRests(dir)) { e.preventDefault(); go(dir); }
  });
  // touch: the page does not scroll under the finger inside the rests; the swipe decides the step
  let y0 = null;
  addEventListener("touchstart", (e) => { y0 = e.touches.length === 1 ? e.touches[0].clientY : null; }, { passive: true });
  addEventListener("touchmove", (e) => { if (y0 !== null && inRests(Math.sign(y0 - e.touches[0].clientY) || 1)) e.preventDefault(); }, { passive: false });
  addEventListener("touchend", (e) => {
    if (y0 === null) return;
    const dy = y0 - e.changedTouches[0].clientY; y0 = null;
    if (Math.abs(dy) > 30 && inRests(Math.sign(dy))) go(Math.sign(dy));
  });
}
document.querySelector(".mark").addEventListener("click", (e) => {
  e.preventDefault();
  if (state.ps > HERO_END * 1.5) returnHome(state.ps >= stops[CONTACT_I].ps0); // your name always takes you home
});

document.querySelectorAll("[data-jump]").forEach((b) => b.addEventListener("click", () => {
  if (b.dataset.jump === "home") returnHome(true);
  else if (b.dataset.jump === "journey") warpSkip(atStop(GAL1_I, 0.02), atStop(GAL1_I, TRAVEL + 0.05));
  // the end of the ride, where the email, LinkedIn and résumé links stay on screen
  else if (b.dataset.jump === "contact") warpSkip(atStop(CONTACT_I, 0.4), atStop(CONTACT_I, 1));
  // land where both About lines are fully on screen (the sun on your left, the copy on the right)
  else if (state.ps < atStop(EXIT_I, 0.5)) flyTo(atStop(ABOUT_I, 0.57)); // inside the system: fly straight there
  else warpSkip(atStop(ABOUT_I, 0.3), atStop(ABOUT_I, 0.57)); // from deep space: superspeed back
}));

// ---------- Loop
const clock = new THREE.Clock();
const baseCore = core.material.uniforms.uIntensity.value, baseGlow = coreGlow.material.opacity;
let frame = 0;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  state.ps += (state.p - state.ps) * (1 - Math.exp(-dt * 3.2));
  state.smx += (state.mx - state.smx) * (1 - Math.exp(-dt * 2.5));
  state.smy += (state.my - state.smy) * (1 - Math.exp(-dt * 2.5));

  let inFlight;
  if (transit && transit.kind === "dive") {
    // falling into the black hole: turn to it, then get pulled straight in, faster and faster
    const k = transit.k, sm = THREE.MathUtils.smoothstep;
    camera.position.copy(transit.fromPos).lerp(transit.target, k * 0.86); // stops at the horizon; the dark covers the rest
    const to = transit.target.clone().sub(camera.position);
    const yawT = Math.atan2(to.z, to.x), pitchT = Math.atan2(to.y, Math.hypot(to.x, to.z));
    let dY = yawT - transit.yaw0; while (dY > Math.PI) dY -= Math.PI * 2; while (dY < -Math.PI) dY += Math.PI * 2;
    const w = sm(transit.lin, 0, 0.45);
    const yaw = transit.yaw0 + dY * w, pitch = THREE.MathUtils.lerp(transit.pitch0, pitchT, w);
    look.set(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw)).multiplyScalar(30).add(camera.position);
    pathDir.copy(to).setY(0).normalize(); // the board points straight into it
    boardFollow = 1;
    inFlight = 0;
  } else if (transit) {
    transitPose(transit, camera.position, look);
    const kk = transit.k, sm = THREE.MathUtils.smoothstep;
    boardFollow = THREE.MathUtils.lerp(transit.bf0, 1, sm(kk, 0, 0.4)); // the board turns with you toward the sun
    inFlight = Math.sin(transit.t * Math.PI) * 0.6;
  } else inFlight = poseAt(state.ps, camera.position, look);
  // Arrival: pulled back along the view while at speed
  if (back < 0 && !warping) camera.position.z += state.speed * state.speed * 70;
  // Diving into a planet (or pulling back out of one)
  applyDive(camera.position, look);
  // the board drops away beneath you as you dive, so it never cuts into the planet
  // During a dive the board is drawn smaller and nearer by the same factor, which looks exactly the same from your
  // eye but keeps its nose in front of the planet's surface, so the planet never swallows it.
  // It drops away only after it has turned nose first.
  const near = state.push > 0 ? 0.25 : 1;
  boardRig.scale.setScalar(near);
  boardRig.position.set(0, -1.3 - THREE.MathUtils.smoothstep(state.push, 0.4, 0.85) * 2.4, -2.5).multiplyScalar(near);
  // Parallax from the cursor, softer in flight, and still on the tunnel axis or in a dive
  const tilt = reduce ? 0 : 1, calm = (1 - inFlight * 0.6) * (1 - levelGaze) * (1 - state.push);
  camera.position.x += state.smx * 1.4 * tilt * calm;
  camera.position.y -= state.smy * 0.8 * tilt * calm;
  camera.lookAt(look);
  camera.rotateY(-state.smx * 0.05 * tilt * (1 - levelGaze));
  camera.rotateX(-state.smy * 0.035 * tilt * (1 - levelGaze));
  camera.rotateZ(inFlight * 0.045 * tilt); // a slight bank into the turn around the sun
  // keep the board pointing along the path, whatever the head is looking at
  camera.getWorldDirection(tmp).setY(0).normalize();
  // the board holds the path heading, never sideways. Diving into a planet it turns with your head, nose first
  // at the planet, as the head turns to it (the same timing as the look in applyDive), so you go in head on
  const headOn = 1 - THREE.MathUtils.smoothstep(state.push, 0, 0.45);
  boardRig.rotation.y = boardFollow * headOn * THREE.MathUtils.clamp(Math.atan2(tmp.z * pathDir.x - tmp.x * pathDir.z, tmp.dot(pathDir)), -0.8, 0.8);

  // Slingshot: the scroll itself drives hyperspeed on the way out
  const speed = Math.max(state.speed, state.skip, reduce ? 0 : rideSpeed(state.ps));

  // Near the sun the eye adjusts: the core and its glow ease off so the copy stays readable
  const nearSun = 1 - THREE.MathUtils.smoothstep(camera.position.distanceTo(Cw), 9, 30);
  core.material.uniforms.uIntensity.value = baseCore * (1 + nearSun * 0.25);
  coreGlow.material.opacity = baseGlow * (1 - nearSun * 0.3);
  renderer.toneMappingExposure = (1 - nearSun * 0.12) * (PAINT ? 1.8 : 1); // painted: brighter, so shaded sides still carry pigment

  // Board: lean with the cursor and into turns, gentle float
  board.rotation.z = -state.smx * 0.14 * tilt - inFlight * 0.12 * tilt;
  board.rotation.y = state.smx * 0.05 * tilt;
  board.position.y = Math.sin(t * 0.9) * 0.012 - speed * 0.05;

  // Living details
  stars.material.uniforms.uTime.value = t;
  stars.position.copy(camera.position); // the starfield travels with you, so deep space is never empty
  sparkles.forEach((s) => {
    s.material.opacity = 0.45 + 0.45 * Math.sin(t * 1.3 + s.userData.seed);
    s.position.copy(s.userData.base ??= s.position.clone()).add(camera.position);
  });
  for (const c of careerStops) c.object.userData.tick?.(t);
  // Deep space reveals one destination at a time: nothing beyond the system shows until superspeed,
  // the first galaxy fades in during the cruise, and each next one only as you near the one before
  careerStops.forEach((c, k) => {
    const i = stops.indexOf(c);
    const [a, b] = k === 0 ? [atStop(i, 0), atStop(i, 0.25)] : [atStop(i - 1, 0.5), atStop(i - 1, 0.85)];
    c.object.userData.setFade(transit ? c.object.userData.fade ?? 0 : (c.object.userData.fade = THREE.MathUtils.smoothstep(state.ps, a, b)));
  });
  const bhFade = careerStops[careerStops.length - 1].object.userData.fade ?? 0;
  blackHole.userData.setFade(bhFade); // revealed with the unclaimed planet
  bloom.strength = (PAINT ? 0.5 : 0.75) * (1 - 0.7 * bhFade); // less bloom here, so the planet stays a dark silhouette against the light
  blackHole.userData.tick(t, camera);
  liquid.uTime.value = t;
  liquid.uFlow.value = 1 + speed * 6 + inFlight * 2;
  film.uniforms.uTime.value = t; wash.uniforms.uTime.value = t;
  core.material.uniforms.uTime.value = t;
  // The system view shows the whole system tilted, for depth. It levels out as the board starts moving,
  // so the rings are one flat plane by the time you join the outer ring. It pivots around the sun.
  const tiltAmt = transit && transit.kind !== "dive" ? transit.tilt0 * (1 - THREE.MathUtils.smoothstep(transit.k, 0, 0.8)) // levels out during the flight
    : 1 - THREE.MathUtils.smootherstep(state.ps, HERO_END, atStop(0, TRAVEL * 0.7));
  if (tiltAmt !== system.userData.tiltAmt) {
    system.userData.tiltAmt = tiltAmt;
    system.quaternion.setFromEuler(tiltEuler.set(HERO_TILT.x * tiltAmt, 0, HERO_TILT.z * tiltAmt));
    system.position.copy(C).sub(tiltPivot.copy(C).applyQuaternion(system.quaternion));
  }
  planets.forEach((p) => {
    p.body.rotation.y = t * 0.03;
    p.body.material.uniforms.uTime.value = t;
    if (p.extra.tail) p.extra.tail.material.uniforms.uTime.value = t;
    if (p.extra.moon) p.extra.moon.position.copy(p.extra.moonAxes.a).multiplyScalar(Math.cos(t * 0.4) * 3.4).addScaledVector(p.extra.moonAxes.b, Math.sin(t * 0.4) * 3.4);
    if (p.extra.rings) p.extra.rings.scale.setScalar(1 + Math.sin(t * 0.8) * 0.04);
  });
  updateWarp(speed, dt);
  updateText();

  // Reflections every other frame
  camera.updateMatrixWorld();
  updatePlanetCursor();
  // while the opening covers the page, skip drawing the scene underneath (it keeps its state, it just is not drawn)
  const covered = document.documentElement.classList.contains("intro-cover");
  if (!covered && frame++ % 2 === 0) {
    board.getWorldPosition(cubeCam.position);
    sky.position.copy(cubeCam.position);
    board.visible = false; warp.lines.visible = false;
    cubeCam.update(renderer, scene);
    cubeRT.texture.needsPMREMUpdate = true;
    board.visible = true; warp.lines.visible = speed > 0.01;
  }

  if (!covered) composer.render();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  film.uniforms.uRes.value.set(innerWidth, innerHeight); wash.uniforms.uRes.value.set(innerWidth, innerHeight);
});

window.__proto = { THREE, scene, state, camera, stops, atStop, maxScroll, bloom, chrome, curve, planets, Cw, boardRig, pathDir, poseAt, HERO_END, getBoardFollow: () => boardFollow, textTimes, passingGlance, glideFraction, glanceSpan };
