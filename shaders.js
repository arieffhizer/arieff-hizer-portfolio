import * as THREE from "three";

// 3D simplex noise (Ashima Arts, MIT) plus fbm helpers
export const NOISE = /* glsl */ `
vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm(vec3 p) { float f = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { f += a * snoise(p); p *= 2.03; a *= 0.5; } return f; }
float fbm2(vec3 p) { return 0.65 * snoise(p) + 0.35 * snoise(p * 2.1 + 3.7); }
float fbm3(vec3 p) { float f = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { f += a * snoise(p); p *= 2.07; a *= 0.5; } return f; }
`;

const sphereVertex = /* glsl */ `
  varying vec3 vN; varying vec3 vW; varying vec3 vP;
  void main() {
    vP = normalize(position);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

// painted (index.html?paint): planets are lit all round, as an illustration is, not half in the sun's shadow
const evenLight = () => (document.documentElement.classList.contains("paint") ? 1 : 0);

// Planet surface, generated from the project colour. type: 0 gas, 1 rocky with clouds, 2 icy nucleus
export function planetMaterial({ color, type = 0, seed = 0, clouds = 0, light, tilt = 0 }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uLight: { value: light.clone() }, uTime: { value: 0 },
      uType: { value: type }, uSeed: { value: seed }, uClouds: { value: clouds }, uTilt: { value: tilt }, uEven: { value: evenLight() },
    },
    vertexShader: sphereVertex,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform vec3 uLight; uniform float uTime, uType, uSeed, uClouds, uTilt, uEven;
      varying vec3 vN; varying vec3 vW; varying vec3 vP;
      ${NOISE}
      void main() {
        vec3 n = normalize(vN), v = normalize(cameraPosition - vW), l = normalize(uLight - vW);
        vec3 p = vP;
        p.y += p.x * uTilt;
        vec3 q = p + uSeed;
        vec3 deep = uColor * 0.18, mid = uColor * 0.75, pale = mix(uColor, vec3(0.95, 0.93, 0.9), 0.45);
        vec3 albedo;
        if (uType < 0.5) {
          float warp = fbm(q * 1.8 + vec3(0.0, 0.0, uTime * 0.01));
          float bands = sin((p.y + warp * 0.22) * 15.0) * 0.5 + 0.5;
          float fine = fbm(vec3(q.x * 1.2, p.y * 30.0 + warp * 4.0, q.z * 1.2));
          float storm = smoothstep(0.55, 0.8, fbm(q * 3.5 + 7.0));
          float t = clamp(bands * 0.65 + fine * 0.45 + 0.2, 0.0, 1.0);
          albedo = mix(mix(deep, mid, smoothstep(0.0, 0.5, t)), pale, smoothstep(0.55, 1.0, t));
          albedo = mix(albedo, pale * 1.1, storm * 0.5);
        } else if (uType < 1.5) {
          float h = fbm(q * 2.4);
          float rough = fbm(q * 9.0);
          albedo = mix(deep * 1.3, mid, smoothstep(-0.35, 0.45, h)) * (0.8 + 0.35 * rough);
          float cl = smoothstep(0.05, 0.55, fbm(q * 2.8 + vec3(uTime * 0.006, 0.0, 0.0)));
          albedo = mix(albedo, vec3(0.9, 0.91, 0.93), cl * uClouds);
        } else {
          float h = fbm(q * 4.0);
          albedo = vec3(0.32, 0.33, 0.36) * (0.55 + 0.6 * h);
        }
        float d = mix(dot(n, l), 0.75, uEven); // even light: every side as if facing the sun
        float diff = smoothstep(-0.06, 1.0, d);
        vec3 col = albedo * diff * 1.35;
        // thin atmosphere on the lit limb
        float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
        col += mix(uColor, vec3(0.75, 0.85, 1.0), 0.3) * fres * smoothstep(-0.2, 0.7, d) * 0.9;
        // specular glint on the lit side
        vec3 hv = normalize(l + v);
        col += vec3(pow(max(dot(n, hv), 0.0), 60.0)) * 0.08 * step(0.0, d);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// Soft atmospheric halo that hugs the planet, brighter on the lit side
export function atmosphereMaterial({ color, light, strength = 1 }) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color).lerp(new THREE.Color(0.8, 0.88, 1), 0.25) }, uLight: { value: light.clone() }, uStrength: { value: strength }, uEven: { value: evenLight() } },
    vertexShader: /* glsl */ `
      varying vec3 vNV; varying vec3 vNW; varying vec3 vW;
      void main() {
        vNV = normalize(normalMatrix * normal);
        vNW = normalize(mat3(modelMatrix) * normal);
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform vec3 uLight; uniform float uStrength, uEven;
      varying vec3 vNV; varying vec3 vNW; varying vec3 vW;
      void main() {
        // far side of the shell: strongest just outside the planet's edge, fading to the shell's rim
        float i = pow(smoothstep(0.0, 0.45, -dot(vNV, vec3(0.0, 0.0, 1.0))), 2.2) * smoothstep(0.62, 0.42, -dot(vNV, vec3(0.0, 0.0, 1.0)));
        float lit = mix(smoothstep(-0.35, 0.6, dot(vNW, normalize(uLight - vW))), 1.0, uEven);
        gl_FragColor = vec4(uColor * i * lit * uStrength * 1.6, 1.0);
      }`,
  });
}

// Self-lit star surface with granulation and limb darkening
export function starMaterial({ color, intensity = 1.2 }) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uIntensity: { value: intensity } },
    vertexShader: sphereVertex,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uTime, uIntensity;
      varying vec3 vN; varying vec3 vW; varying vec3 vP;
      ${NOISE}
      void main() {
        vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
        float g = fbm(vP * 5.0 + vec3(uTime * 0.04));
        float g2 = fbm(vP * 16.0 - vec3(uTime * 0.07));
        float heat = clamp(0.55 + 0.4 * g + 0.2 * g2, 0.0, 1.0);
        float limb = pow(max(dot(n, v), 0.0), 0.5);
        vec3 hot = mix(uColor * 0.4, mix(uColor, vec3(1.0, 0.72, 0.45), 0.3), heat);
        gl_FragColor = vec4(hot * (0.3 + 0.95 * limb) * uIntensity, 1.0);
      }`,
  });
}

// Planetary rings: fine radial bands, lit by the system star
export function ringMaterial({ inner, outer }) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uInner: { value: inner }, uOuter: { value: outer } },
    vertexShader: `varying float vR; void main() { vR = length(position.xy); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uInner, uOuter; varying float vR;
      float hash(float x) { return fract(sin(x * 127.1) * 43758.5453); }
      void main() {
        float t = (vR - uInner) / (uOuter - uInner);
        float b = 0.0;
        for (int i = 1; i < 6; i++) b += sin(t * float(i * i) * 23.0 + float(i)) * 0.5 / float(i);
        float dens = clamp(0.45 + b, 0.0, 1.0) * smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.9, t);
        dens *= 1.0 - smoothstep(0.58, 0.62, t) * smoothstep(0.68, 0.64, t);
        gl_FragColor = vec4(vec3(0.78, 0.79, 0.82) * (0.7 + 0.3 * hash(floor(t * 220.0))), dens * 0.55);
      }`,
  });
}

// Liquid metal: the mirror surface flows, as if the board were poured rather than polished
export function makeLiquid(material, mesh) {
  const uniforms = { uTime: { value: 0 }, uFlow: { value: 1 } };
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.uniforms.uFlow = uniforms.uFlow;
    sh.uniforms.uNM = { value: mesh.normalMatrix };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", /* glsl */ `#include <common>
        varying vec3 vObj; uniform float uTime; uniform float uFlow; uniform mat3 uNM;
        ${NOISE}
        // Four pinstripes pressed into the metal. They drift with the flow instead of sitting on top.
        float stripeDist(vec3 o, out float side) {
          float wob = snoise(vec3(o.z * 0.8 - uTime * 0.2 * uFlow, o.x * 3.0, uTime * 0.04)) * 0.009;
          float best = 1.0;
          for (int i = 0; i < 4; i++) {
            float xi = i == 0 ? -0.11 : i == 1 ? -0.04 : i == 2 ? 0.04 : 0.11;
            float dx = o.x + wob - xi;
            if (abs(dx) < abs(best)) best = dx;
          }
          side = sign(best);
          return abs(best);
        }`)
      .replace("#include <color_fragment>", /* glsl */ `#include <color_fragment>
        float sSide; float sD = stripeDist(vObj, sSide);
        float sTop = smoothstep(0.0, 0.025, vObj.y);
        float sGroove = smoothstep(0.0085, 0.0, sD) * sTop;
        diffuseColor.rgb *= 1.0 - 0.32 * sGroove;`)
      .replace("#include <normal_fragment_maps>", /* glsl */ `#include <normal_fragment_maps>
        vec3 lq = vObj * vec3(1.9, 1.9, 0.5) + vec3(0.0, uTime * 0.05, uTime * 0.22 * uFlow);
        float e = 0.08;
        float n0 = fbm2(lq);
        vec3 grad = vec3(fbm2(lq + vec3(e, 0.0, 0.0)) - n0, fbm2(lq + vec3(0.0, e, 0.0)) - n0, fbm2(lq + vec3(0.0, 0.0, e)) - n0) / e;
        grad.y *= 0.2;
        // rounded channel walls: each side of a stripe tilts toward its centre, so it catches light like an engraving
        float wall = sin(clamp(sD / 0.0085, 0.0, 1.0) * 3.14159) * sTop * step(sD, 0.0085);
        vec3 bevel = vec3(sSide * wall * 0.9, 0.0, 0.0);
        normal = normalize(normal - uNM * (grad * 0.02 + bevel));`);
  };
  return uniforms;
}

// Film: slight lens fringe at the edges, vignette, fine grain
export const FilmShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; varying vec2 vUv;
    void main() {
      vec2 c = vUv - 0.5; float r = dot(c, c);
      vec2 off = c * r * 0.012;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      col *= 1.0 - r * 0.7;
      float gr = fract(sin(dot(floor(vUv * uRes) + fract(uTime) * 97.0, vec2(12.9898, 78.233))) * 43758.5453);
      col += (gr - 0.5) * 0.04;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
