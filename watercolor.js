// A watercolour rendering of the scene (trial: index.html?paint). The scene still renders as light in dark space; this
// pass turns it into pigment on paper: brushy patches (a small Kuwahara filter), light read as pigment and lifted to
// pastel, laid on warm paper by multiplying (so washes layer as watercolour does), darker pigment pooling at shape
// edges, slow cloudy washes and fine granulation, paper grain, and a slight hand wobble. Motion and layout are untouched.
export const WatercolorShader = {
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: null }, // set by the caller: a THREE.Vector2 of the drawing size in px
    uTime: { value: 0 },
    uPaper: { value: [0.957, 0.933, 0.894] }, // warm cotton paper
    uTrue: { value: 0 }, // 1: lay the scene's own colours down (case pages, brand skies); 0: lift light to pastel (home)
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTime, uTrue; uniform vec3 uPaper; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
    // the mean colour of the calmest of four quadrants around a point: flat brushy patches that keep their edges
    vec3 kuwahara(vec2 uv) {
      vec2 px = 1.0 / uRes; vec3 best = vec3(0.0); float bestV = 1e9;
      for (int q = 0; q < 4; q++) {
        vec2 dir = vec2(q == 0 || q == 2 ? -1.0 : 1.0, q < 2 ? -1.0 : 1.0);
        vec3 m = vec3(0.0), s = vec3(0.0);
        for (int y = 0; y < 3; y++) for (int x = 0; x < 3; x++) {
          vec3 c = texture2D(tDiffuse, uv + dir * vec2(float(x), float(y)) * px * 1.6).rgb;
          m += c; s += c * c;
        }
        m /= 9.0; s = s / 9.0 - m * m;
        float v = s.r + s.g + s.b;
        if (v < bestV) { bestV = v; best = m; }
      }
      return best;
    }
    float lum(vec3 c) { return max(max(c.r, c.g), c.b); }
    void main() {
      vec2 px = 1.0 / uRes;
      // a hand never draws quite straight: sample through a slow wobble
      vec2 wob = (vec2(fbm(vUv * 6.0 + uTime * 0.02), fbm(vUv * 6.0 + 7.3 - uTime * 0.02)) - 0.5) * px * 3.0;
      vec2 uv = vUv + wob;
      vec3 c = kuwahara(uv);
      // true colour reads the scene as it will look on screen (the frame arrives in linear light)
      c = mix(c, pow(max(c, 0.0), vec3(1.0 / 2.2)), uTrue);
      float l = lum(c);
      // light becomes pigment: its strength from how bright it was, its hue lifted toward pastel
      float strength = smoothstep(mix(0.06, 0.13, uTrue), mix(0.42, 0.3, uTrue), l); // space (and the night sky) stays paper
      vec3 hue = c / max(l, 1e-3);
      vec3 pigment = mix(hue, vec3(1.0), 0.2);
      // true colour: the colour itself, multiplied onto the paper, as a wash of that very paint (white stays paper, so
      // screens stay white; pages that want white specks to show draw them in ink)
      pigment = mix(pigment, c, uTrue);
      // pigment pools darker where a shape meets the paper
      float e = 0.0;
      e += abs(lum(texture2D(tDiffuse, uv + vec2(px.x * 2.0, 0.0)).rgb) - lum(texture2D(tDiffuse, uv - vec2(px.x * 2.0, 0.0)).rgb));
      e += abs(lum(texture2D(tDiffuse, uv + vec2(0.0, px.y * 2.0)).rgb) - lum(texture2D(tDiffuse, uv - vec2(0.0, px.y * 2.0)).rgb));
      float edge = smoothstep(0.08, 0.5, e);
      // granulation: pigment settles unevenly in the paper\x27s tooth
      float gran = fbm(vUv * uRes / 7.0);
      // over a whole sky of colour (true colour) the granulation is gentle: a texture in the paint, not specks
      float amount = clamp(strength * mix(0.82 + 0.3 * gran, 0.94 + 0.08 * gran, uTrue) + edge * 0.35, 0.0, 1.0);
      vec3 wash = mix(vec3(1.0), pigment * mix(1.0, 0.72, edge), amount);
      // the paper: warm, with slow cloudy washes and a fine grain
      float cloud = fbm(vUv * vec2(2.2, 1.6) + 3.1);
      float grain = noise(vUv * uRes / 1.4);
      vec3 paper = uPaper * (0.95 + 0.06 * cloud) * (0.975 + 0.035 * grain);
      gl_FragColor = vec4(paper * wash, 1.0);
    }`,
};
