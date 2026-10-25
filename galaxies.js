import * as THREE from "three";

// Seeded random so every visit draws the same galaxies
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const gauss = (r) => { let u = 0; for (let i = 0; i < 4; i++) u += r(); return (u - 2) / 1.15; };

const pointsVertex = /* glsl */ `
  attribute float aR; attribute float aTheta; attribute float aH; attribute float aSize; attribute vec3 aCol; attribute float aSeed;
  uniform float uTime, uPR, uRadius, uSpin, uFade;
  varying vec3 vCol;
  void main() {
    float r = aR * uRadius;
    float th = aTheta + uTime * uSpin / (0.25 + aR); // inner stars orbit faster than outer ones
    vec3 p = vec3(cos(th) * r, aH, sin(th) * r);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(aSize * uPR * (260.0 / -mv.z), 7.0 * uPR);
    vCol = aCol * (0.85 + 0.15 * sin(uTime * 2.0 + aSeed * 30.0)) * smoothstep(2.0, 14.0, -mv.z) * uFade; // no blobs up close; uFade reveals it
  }`;
const pointsFragment = /* glsl */ `
  varying vec3 vCol;
  void main() {
    float a = pow(smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)), 1.6);
    gl_FragColor = vec4(vCol, a);
  }`;

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.2, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const GLOW = glowTexture();

// A spiral galaxy of particles. Silver-white, with an optional faint tint, so colour still belongs to the planets.
export function makeGalaxy({ radius = 100, arms = 2, bar = 0, count = 16000, tint = [0.9, 0.93, 1], bright = 1, wind = 1.6, seed = 1, pr = 1 }) {
  const r = rng(seed);
  const aR = new Float32Array(count), aTheta = new Float32Array(count), aH = new Float32Array(count);
  const aSize = new Float32Array(count), aCol = new Float32Array(count * 3), aSeed = new Float32Array(count);
  const warm = [1.0, 0.9, 0.78], cool = [0.82, 0.88, 1.0];
  for (let i = 0; i < count; i++) {
    const kind = r();
    let rad, th, h, size = 1.2 + r() * 1.2, b = 0.35 + r() * 0.5, col = cool;
    if (kind < 0.22) { // bulge
      rad = Math.abs(gauss(r)) * 0.1; th = r() * Math.PI * 2; h = gauss(r) * 0.05 * radius; b *= 1.6; col = warm;
    } else if (kind < 0.22 + bar * 0.4) { // bar
      const x = (r() - 0.5) * 0.6, y = gauss(r) * 0.03;
      rad = Math.hypot(x, y); th = Math.atan2(y, x) + (r() < 0.5 ? 0 : Math.PI); h = gauss(r) * 0.02 * radius; col = warm;
    } else if (kind < 0.9) { // arms
      const k = Math.floor(r() * arms), t = Math.pow(r(), 0.75);
      rad = 0.08 + t * 0.92 + gauss(r) * 0.025;
      th = (k * Math.PI * 2) / arms + wind * Math.PI * rad + gauss(r) * 0.28 * (1.1 - rad * 0.5);
      h = gauss(r) * 0.015 * radius;
      if (r() < 0.05) { size = 2.6 + r() * 1.5; b = 1.6 + r(); } // bright star knots along the arms
    } else { // faint halo
      rad = Math.sqrt(r()) * 1.1; th = r() * Math.PI * 2; h = gauss(r) * 0.08 * radius; b *= 0.35;
    }
    aR[i] = Math.max(0.005, rad); aTheta[i] = th; aH[i] = h; aSize[i] = size; aSeed[i] = r();
    const m = 0.3; // how much of the galaxy's tint shows
    for (let c = 0; c < 3; c++) aCol[i * 3 + c] = (col[c] * (1 - m) + tint[c] * m) * b * bright;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  for (const [n, a, s] of [["aR", aR, 1], ["aTheta", aTheta, 1], ["aH", aH, 1], ["aSize", aSize, 1], ["aCol", aCol, 3], ["aSeed", aSeed, 1]]) geo.setAttribute(n, new THREE.BufferAttribute(a, s));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius * 1.2);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: pr }, uRadius: { value: radius }, uSpin: { value: 0.02 }, uFade: { value: 0 } },
    vertexShader: pointsVertex, fragmentShader: pointsFragment,
  });
  const group = new THREE.Group();
  const pts = new THREE.Points(geo, mat);
  pts.layers.set(2);
  group.add(pts);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: new THREE.Color(1, 0.95, 0.88).multiplyScalar(1.2 * bright), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
  core.scale.setScalar(radius * 0.32); // a soft core, not a haze over everything
  core.layers.set(2);
  group.add(core);
  group.userData.tick = (t) => (mat.uniforms.uTime.value = t);
  // fade in and out (hidden until you are near enough to see it)
  group.userData.setFade = (f) => { mat.uniforms.uFade.value = f; core.material.opacity = 0.3 * f; group.visible = f > 0.001; };
  group.userData.setFade(0);
  return group;
}

// The wormhole: a short tunnel of swirling light along +z, length `len`
export function makeWormhole({ len = 150, radius = 10, count = 7000, seed = 7, pr = 1 }) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3), aZ = new Float32Array(count), aAng = new Float32Array(count), aRad = new Float32Array(count), aSeed = new Float32Array(count);
  for (let i = 0; i < count; i++) { aZ[i] = r() * len; aAng[i] = r() * Math.PI * 2; aRad[i] = radius * (1 + gauss(r) * 0.12); aSeed[i] = r(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aZ", new THREE.BufferAttribute(aZ, 1));
  geo.setAttribute("aAng", new THREE.BufferAttribute(aAng, 1));
  geo.setAttribute("aRad", new THREE.BufferAttribute(aRad, 1));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(aSeed, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, len / 2), len);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: pr }, uLen: { value: len }, uFade: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aZ; attribute float aAng; attribute float aRad; attribute float aSeed;
      uniform float uTime, uPR, uLen, uFade; varying float vB;
      void main() {
        float a = aAng + uTime * 0.6 + aZ * 0.05; // the tunnel swirls as you pass through
        vec3 p = vec3(cos(a) * aRad, sin(a) * aRad, aZ);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(2.2 * uPR * (180.0 / -mv.z), 6.0 * uPR);
        float rings = 0.55 + 0.45 * sin(aZ * 0.5 - uTime * 4.0);
        float ends = smoothstep(0.0, 0.15, aZ / uLen) * smoothstep(1.0, 0.85, aZ / uLen);
        vB = rings * ends * (0.6 + 0.4 * aSeed) * smoothstep(1.0, 6.0, -mv.z) * uFade;
      }`,
    fragmentShader: /* glsl */ `
      varying float vB;
      void main() {
        float a = pow(smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)), 1.5);
        gl_FragColor = vec4(vec3(0.86, 0.9, 1.0) * vB * 1.4, a);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.layers.set(2);
  pts.userData.tick = (t) => (mat.uniforms.uTime.value = t);
  pts.userData.setFade = (f) => { mat.uniforms.uFade.value = f; pts.visible = f > 0.001; };
  pts.userData.setFade(0);
  return pts;
}

// The unclaimed planet: unlit and dark, defined only by a thin silver rim
export function makeUnclaimedPlanet({ radius = 6 }) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uFade: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uFade; varying vec3 vN; varying vec3 vW;
      void main() {
        vec3 v = normalize(cameraPosition - vW);
        float rim = pow(1.0 - max(dot(normalize(vN), v), 0.0), 3.5);
        gl_FragColor = vec4(mix(vec3(0.0196, 0.0196, 0.0275), vec3(0.012, 0.013, 0.016) + vec3(0.82, 0.85, 0.92) * rim * 0.9, uFade), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 48), mat);
  mesh.userData.setFade = (f) => { mat.uniforms.uFade.value = f; mesh.visible = f > 0.001; };
  mesh.userData.setFade(0);
  return mesh;
}
