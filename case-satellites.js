import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// A case study's screens carried by satellites on a dashed orbit around the planet. Each satellite is a small
// chrome body with two solar wings and a dish, and a giant screen hangs beneath it on a short mast. The screen's
// centre rides the orbit line; the whole craft stands on the planet's radial line, turned and tipped a little so
// you see its depth. By day the sun lights the chrome; at night the screen glows and the chrome goes dark.
// The screens are a book-style foldable (iPhone Duo): a phone shot shows on its cover display (folded, portrait,
// 1398x2034, square corners on the hinge side, round ones on the other, a round camera top right), a desktop shot on
// its inner display (open, landscape, 2670x1878, all corners round, a faint crease down the middle). Same height either way, as on the real device. A shot of another shape fills the screen from the top.
export function makeSatellites({ scene, renderer, camera, shots, color, onBuilt }) {
  const group = new THREE.Group();
  scene.add(group);

  // ---------- What the chrome reflects: a bright sky, a hard sun streak, the dark planet below
  const pmrem = new THREE.PMREMGenerator(renderer);
  function sky(top, horizon, ground, starCount) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, top); gr.addColorStop(0.44, horizon); gr.addColorStop(0.5, horizon); gr.addColorStop(0.53, ground); gr.addColorStop(1, "#000000");
    g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
    g.fillStyle = "rgba(255,255,255,.95)"; g.fillRect(0, 70, 512, 6);
    g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, 30, 512, 10);
    g.fillStyle = "rgba(255,255,255,.9)";
    for (let i = 0; i < starCount; i++) g.fillRect(Math.random() * 512, Math.random() * 110, 1, 1);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return pmrem.fromEquirectangular(tex).texture;
  }
  const brand = new THREE.Color(color), hex = (c) => `#${c.getHexString()}`;
  const ENV_DAY = sky(hex(brand.clone().lerp(new THREE.Color("#ffffff"), 0.15)), "#fff4ea", hex(brand.clone().multiplyScalar(0.22)), 0);
  const ENV_NIGHT = sky("#06060a", "#3a3d48", "#030304", 260);

  const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
  scene.add(sunLight, sunLight.target);

  // solar cells: a dark graphite grid with fine silver lines (colour stays with the planets)
  const cellTex = (() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 96;
    const g = c.getContext("2d");
    g.fillStyle = "#2b3140"; g.fillRect(0, 0, 256, 96); // dark slate cells, light enough to read against a night sky
    g.strokeStyle = "rgba(220,226,238,.85)"; g.lineWidth = 1.5;
    for (let x = 0; x <= 256; x += 16) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, 96); g.stroke(); }
    for (let y = 0; y <= 96; y += 16) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(256, y + 0.5); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  })();

  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  const DUO = { closed: 1398 / 2034, open: 2670 / 1878 };
  const R_ROUND = 0.105, R_HINGE = 0.012; // corner radii, as fractions of the display height (the same on both)
  const CAM = { inset: 0.105, r: 0.04 }; // the cover camera: its centre this far in from the top and right, of the width
  const screenFragment = /* glsl */ `
    uniform sampler2D uMap; uniform float uOpacity, uNight, uOpen, uCrease; uniform vec2 uSize, uRadius; uniform vec4 uUv; varying vec2 vUv;
    float roundBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
    void main() {
      vec2 p = (vUv - 0.5) * uSize;
      // the corners: uRadius.x on the left (the hinge, when folded), uRadius.y on the right
      float inside = 1.0 - smoothstep(-0.01, 0.01, roundBox(p, uSize * 0.5, p.x < 0.0 ? uRadius.x : uRadius.y));
      vec3 c = texture2D(uMap, uUv.xy + vUv * uUv.zw).rgb * mix(0.93, 1.1, uNight);
      // folded: the round camera, top right, a black lens in a faint ring with a glint
      vec2 cam = p - (uSize * 0.5 - vec2(${CAM.inset.toFixed(3)}) * uSize.x);
      float cr = ${CAM.r.toFixed(3)} * uSize.x, d = length(cam);
      vec3 lens = mix(vec3(0.01, 0.012, 0.02), vec3(0.09, 0.1, 0.13), smoothstep(cr * 0.55, cr * 0.9, d));
      lens += vec3(0.35, 0.4, 0.5) * (1.0 - smoothstep(0.0, cr * 0.16, length(cam - vec2(-0.32, 0.32) * cr)));
      c = mix(c, lens, (1.0 - smoothstep(cr - 0.006, cr + 0.006, d)) * (1.0 - uOpen));
      // open: the fold, a faint soft line down the middle that catches a little light on one side
      float x = p.x / (0.006 * uSize.x);
      c *= 1.0 - uOpen * uCrease * (0.07 * exp(-x * x) - 0.03 * exp(-(x - 1.6) * (x - 1.6)));
      gl_FragColor = vec4(c, inside * uOpacity);
      #include <colorspace_fragment>
    }`;

  const makeScreenMat = () => new THREE.ShaderMaterial({
    uniforms: { uMap: { value: null }, uOpacity: { value: 0 }, uNight: { value: 0 }, uRadius: { value: new THREE.Vector2(0.2, 0.2) }, uOpen: { value: 0 }, uCrease: { value: 1 }, uUv: { value: new THREE.Vector4(0, 0, 1, 1) }, uSize: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: screenFragment, transparent: true,
  });
  const items = shots.map((sh) => {
    const holder = new THREE.Group(), craft = new THREE.Group();
    holder.add(craft);
    holder.visible = false;
    group.add(holder);
    const chrome = new THREE.MeshPhysicalMaterial({ color: 0xe9ecf2, metalness: 1, roughness: 0.1, clearcoat: 0.7, clearcoatRoughness: 0.1, envMap: ENV_DAY, envMapIntensity: 1.15, transparent: true });
    const cells = new THREE.MeshPhysicalMaterial({ map: cellTex, metalness: 0.6, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08, envMap: ENV_DAY, envMapIntensity: 0.9, transparent: true });
    const screenMat = makeScreenMat();
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    const item = { sh, holder, craft, chrome, cells, screenMat, screenMats: [screenMat], screens: [], halo, aspect: 0, open: false, canvas: null, parts: [], screen: null, tint: new THREE.Color(1, 1, 1), flip: sh.slot === "flip", t: 0 };

    // a shot as a display: wide shots open the device, tall ones keep it folded; the shot fills that display, top first
    // bleed: the page was rendered to run under the status bar (its art to the top edge), so the bar is drawn over it
    const toDisplay = (img, src, crop, open, bleed) => {
      const [cx, cy, cw, ch] = crop || [0, 0, img.naturalWidth, img.naturalHeight];
      const aspect = open ? DUO.open : DUO.closed;
      const item = { open }; // (the display's own mode, for the code below)
      const c = document.createElement("canvas");
      c.width = Math.round(item.open ? 1600 : 1600 * aspect); c.height = Math.round(item.open ? 1600 / aspect : 1600);
      const g = c.getContext("2d");
      const fit = Math.max(c.width / cw, c.height / ch);
      // folded, a page rendered at the device's own viewport (media/<project>/duo/) sits under a status bar deep enough
      // to clear the camera, as in Safari; a phone screenshot already has its own, and the open display shows the page
      // edge to edge
      const camY = CAM.inset * c.width, camR = CAM.r * c.width;
      const bar = src.includes("/duo/") && !item.open ? Math.round(camY + camR * 1.6) : 0, top = bleed ? 0 : bar;
      // a screen is never see-through: a cut-out image (a logo, a 3D render) gets a dark backing, a screenshot white
      g.drawImage(img, cx, cy, cw, ch, (c.width - cw * fit) / 2, top, cw * fit, ch * fit);
      if (bar) {
        // the bar takes the page's own top colour (its background, near the edge, not whatever art crosses the middle),
        // and its ink reads on it
        const [r0, g0, b0] = g.getImageData(Math.round(c.width * 0.02), bar + 2, 1, 1).data;
        if (!bleed) { g.fillStyle = `rgb(${r0},${g0},${b0})`; g.fillRect(0, 0, c.width, bar); }
        g.fillStyle = 0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0 > 150 ? "#111" : "#fff";
        const u = c.height / 678; // one point of the display
        g.font = `600 ${Math.round(15 * u)}px -apple-system, "SF Pro Text", system-ui, sans-serif`;
        g.textBaseline = "middle";
        g.fillText("9:41", 30 * u, camY); // level with the camera
        const bx = c.width - camY - camR - 14 * u - 28 * u, by = camY - 6 * u; // the battery, just left of the camera
        g.globalAlpha = 0.45; g.strokeStyle = g.fillStyle; g.lineWidth = 1.2 * u;
        g.beginPath(); g.roundRect(bx, by, 25 * u, 12 * u, 3.5 * u); g.stroke();
        g.globalAlpha = 1; g.beginPath(); g.roundRect(bx + 2 * u, by + 2 * u, 18 * u, 8 * u, 2 * u); g.fill();
        g.fillRect(bx + 26.5 * u, by + 4 * u, 1.5 * u, 4 * u);
      }
      if (!bar && !item.open) {
        // a screenshot from an ordinary iPhone may carry a Dynamic Island in its status bar; the Duo has none, so it
        // is painted out in the bar's own colour (only if a black pill is really there)
        const sy = ch * fit, iy = 0.013 * sy, ih = 0.043 * sy, iw = 0.33 * c.width, ix = (c.width - iw) / 2;
        const at = (x, y) => g.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        const mid = at(c.width / 2, iy + ih / 2), side = at(c.width * 0.3, iy + ih / 2);
        if (mid[0] + mid[1] + mid[2] < 60 && side[0] + side[1] + side[2] > 150) {
          g.fillStyle = `rgb(${side[0]},${side[1]},${side[2]})`;
          g.beginPath(); g.roundRect(ix - 4, iy - 4, iw + 8, ih + 8, ih); g.fill();
        }
      }
      const corners = [[1, 1], [c.width - 2, 1], [1, c.height - 2], [c.width - 2, c.height - 2]].map(([x, y]) => g.getImageData(x, y, 1, 1).data[3]);
      g.globalCompositeOperation = "destination-over";
      g.fillStyle = corners.some((al) => al < 250) ? "#0c0d12" : "#ffffff";
      g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = "source-over";
      const px = g.getImageData(0, 0, c.width, c.height).data;
      let r = 0, gg = 0, b = 0, n = 0;
      for (let k = 0; k < px.length; k += 4 * 97) { r += px[k]; gg += px[k + 1]; b += px[k + 2]; n++; }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return { canvas: c, tex, tint: new THREE.Color().setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace).lerp(new THREE.Color(1, 1, 1), 0.4) };
    };
    const load = (src) => new Promise((ok) => { const img = new Image(); img.onload = () => ok(img); img.src = src; });
    const ready = () => { if (item.pending) { build(item, ...item.pending); if (built()) onBuilt?.(); } };
    if (item.flip) {
      // folded: the mobile render on the cover; open: the desktop render across the inner display
      Promise.all([load(sh.img.src), load(sh.img.open)]).then(([a, b]) => {
        const cover = toDisplay(a, sh.img.src, null, false, sh.img.bleed), inner = toDisplay(b, sh.img.open, null, true);
        item.cover = cover; item.inner = inner;
        item.tint.copy(cover.tint); item.canvas = cover.canvas;
        screenMat.uniforms.uMap.value = cover.tex;
        item.screenMats.push(makeScreenMat(), makeScreenMat());
        for (const m of item.screenMats.slice(1)) { m.uniforms.uMap.value = inner.tex; m.uniforms.uOpen.value = 1; m.uniforms.uCrease.value = 0; }
        item.aspect = DUO.closed;
        ready();
      });
    } else {
      load(sh.img.src).then((img) => {
        const [, , cw, ch] = sh.img.crop || [0, 0, img.naturalWidth, img.naturalHeight];
        item.open = cw >= ch;
        const d = toDisplay(img, sh.img.src, sh.img.crop, item.open, sh.img.bleed);
        item.tint.copy(d.tint); item.canvas = d.canvas;
        screenMat.uniforms.uMap.value = d.tex;
        item.aspect = d.canvas.width / d.canvas.height;
        ready();
      });
    }
    return item;
  });

  // a slab with its own corner radius on each side (left, right) and softly rounded edges, centred on the origin
  function frameGeometry(w, h, depth, rl, rr) {
    const b = Math.min(depth * 0.35, rl + 0.001), x = w / 2 - b, y = h / 2 - b; // the bevel rounds the edges outward by b
    const l = Math.max(0.001, rl - b), r = Math.max(0.001, rr - b);
    const s = new THREE.Shape();
    s.moveTo(-x + l, -y);
    s.lineTo(x - r, -y); s.absarc(x - r, -y + r, r, -Math.PI / 2, 0);
    s.lineTo(x, y - r); s.absarc(x - r, y - r, r, 0, Math.PI / 2);
    s.lineTo(-x + l, y); s.absarc(-x + l, y - l, l, Math.PI / 2, Math.PI);
    s.lineTo(-x, -y + l); s.absarc(-x + l, -y + l, l, Math.PI, Math.PI * 1.5);
    const geo = new THREE.ExtrudeGeometry(s, { depth: depth - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 5, curveSegments: 20 });
    geo.translate(0, 0, -(depth - 2 * b) / 2);
    return geo;
  }

  // an iPhone Duo that unfolds, built round its hinge (device-local x = 0, z = 0). The base half lies to the right of the
  // hinge and carries the right half of the inner display; the front half lies on top of it, folded, with the cover
  // display outside and the left half of the inner display inside, and swings open round the hinge toward you
  function buildFlip(item, h, add) {
    const bezel = 0.022 * h, half = h * DUO.open / 2, pw = half + bezel, dh = h * 0.044; // a half: 5.2 mm thick
    const wc = h * DUO.closed, rRound = R_ROUND * h, rHinge = R_HINGE * h;
    const device = add(new THREE.Group()), front = new THREE.Group();
    device.add(front);
    const panel = (parent, z) => {
      const m = new THREE.Mesh(frameGeometry(pw, h + bezel * 2, dh, rHinge, rRound + bezel), item.chrome);
      m.position.set(pw / 2, 0, z); parent.add(m); return m;
    };
    panel(device, -dh / 2); // the base half, its face at z = 0
    panel(front, dh / 2); // the front half, folded on top of it
    const screen = (parent, mat, w, x, z, back, uv, rl, rr) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, 0, z); if (back) m.rotation.y = Math.PI;
      m.renderOrder = 2; m.layers.enable(1); parent.add(m); // layer 1: the screens, kept clear of the watercolour
      mat.uniforms.uSize.value.set(w, h); mat.uniforms.uRadius.value.set(rl, rr); mat.uniforms.uUv.value.set(...uv);
      return m;
    };
    const [coverMat, leftMat, rightMat] = item.screenMats;
    // the cover display, on the front half's outside, set toward its outer edge (the hinge side keeps a wider bezel)
    const cover = screen(front, coverMat, wc, pw - bezel - wc / 2, dh + 0.01, false, [0, 0, 1, 1], rHinge, rRound);
    // the inner display: its right half on the base, its left half inside the front half (seen once it has swung round)
    const right = screen(device, rightMat, half, half / 2, 0.01, false, [0.5, 0, 0.5, 1], rHinge, rRound);
    const left = screen(front, leftMat, half, half / 2, -0.01, true, [0, 0, 0.5, 1], rRound, rHinge);
    const spine = add(new THREE.Mesh(new THREE.CapsuleGeometry(dh, h + bezel * 2 - dh * 2.4, 6, 20), item.chrome));
    device.add(spine);
    item.flipParts = { device, front, spine, half, dh };
    item.screen = right; item.screens = [cover, right, left];
    item.halo.scale.set((half * 2 + bezel * 2) * 1.6, (h + bezel * 2) * 1.45, 1);
    item.halo.position.z = -dh - 0.15;
    if (!item.halo.parent) item.craft.add(item.halo);
    setFlip(item, item.t);
  }
  // how far open (0 folded, 1 open): the front half swings round the hinge, and the device slides so the visible
  // device stays centred under the mast (folded, the centre is half a panel right of the hinge; open, at the hinge)
  function setFlip(item, t) {
    item.t = t;
    const fp = item.flipParts;
    if (!fp) return;
    const e = t * t * (3 - 2 * t);
    fp.front.rotation.y = -Math.PI * e;
    fp.device.position.x = -(fp.half / 2) * (1 - e);
    fp.spine.position.z = -fp.dh * 1.25 * e; // the hinge moves to the back as the halves come level, clear of the display
  }

  // build one craft: the screen (centred on the craft's origin, which rides the orbit) and the satellite above it
  function build(item, maxH, maxW) {
    item.pending = [maxH, maxW];
    if (!item.aspect) return;
    let h = maxH, w = h * item.aspect;
    if (w > maxW) { w = maxW; h = w / item.aspect; }
    item.parts.forEach((m) => { item.craft.remove(m); m.traverse((o) => o.geometry?.dispose()); });
    item.parts = [];
    const add = (m) => { item.craft.add(m); item.parts.push(m); return m; };

    if (item.flip) {
      // sized so it fits open: as tall as allowed, unless the open device would be too wide
      h = maxH; if (h * DUO.open > maxW) h = maxW / DUO.open;
      w = h * DUO.closed;
      buildFlip(item, h, add);
    } else {
    // the screen, in a thin titanium frame: thicker folded (two halves, 11.3 mm) than open (5.2 mm). Folded, the hinge
    // side (left) has square corners and the other side round ones; open, both outer edges are round
    const bezel = 0.022 * h, depth = h * (item.open ? 0.044 : 0.08);
    const rRight = R_ROUND * h, rLeft = item.open ? rRight : R_HINGE * h;
    add(new THREE.Mesh(frameGeometry(w + bezel * 2, h + bezel * 2, depth, rLeft + bezel, rRight + bezel), item.chrome));
    if (!item.open) {
      // the hinge: a rounded spine down the left edge, standing a little proud of the frame
      const spine = add(new THREE.Mesh(new THREE.CapsuleGeometry(depth * 0.5, h + bezel * 2 - depth * 1.2, 6, 20), item.chrome));
      spine.position.x = -(w / 2 + bezel) + depth * 0.32;
    }
    item.screen = add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), item.screenMat));
    item.screen.position.z = depth / 2 + 0.01;
    item.screen.renderOrder = 2;
    item.screen.layers.enable(1); // layer 1: the screens, kept clear of the watercolour
    item.screenMat.uniforms.uSize.value.set(w, h);
    item.screenMat.uniforms.uRadius.value.set(rLeft, rRight);
    item.screenMat.uniforms.uOpen.value = item.open ? 1 : 0;
    item.screens = [item.screen];
    item.halo.scale.set((w + bezel * 2) * 1.8, (h + bezel * 2) * 1.45, 1);
    item.halo.position.z = -depth / 2 - 0.15;
    if (!item.halo.parent) item.craft.add(item.halo);
    }
    const bezel = 0.022 * h;

    // the satellite: scaled to the screen, but never so wide that its wings reach past a wide screen's edges
    const s = Math.min(w * 0.75, h * 0.9);
    const top = h / 2 + bezel;
    const mastL = 0.1 * s, bodyW = 0.2 * s, bodyH = 0.17 * s, bodyD = 0.17 * s;
    const mast = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012 * s, 0.012 * s, mastL, 12), item.chrome));
    mast.position.y = top + mastL / 2;
    const bodyY = top + mastL + bodyH / 2;
    const body = add(new THREE.Mesh(new RoundedBoxGeometry(bodyW, bodyH, bodyD, 3, 0.02 * s), item.chrome));
    body.position.y = bodyY;
    // two solar wings on short booms, left and right
    const boomL = 0.07 * s, wingL = 0.55 * s, wingH = 0.2 * s;
    for (const side of [-1, 1]) {
      const boom = add(new THREE.Mesh(new THREE.CylinderGeometry(0.01 * s, 0.01 * s, boomL, 10), item.chrome));
      boom.rotation.z = Math.PI / 2;
      boom.position.set(side * (bodyW / 2 + boomL / 2), bodyY, 0);
      const wing = add(new THREE.Mesh(new THREE.BoxGeometry(wingL, wingH, 0.012 * s), [item.chrome, item.chrome, item.chrome, item.chrome, item.cells, item.cells]));
      wing.position.set(side * (bodyW / 2 + boomL + wingL / 2), bodyY, 0);
      wing.rotation.x = -0.35; // the wings are angled to the sun, which shows they are flat panels with depth
      const spine = add(new THREE.Mesh(new THREE.BoxGeometry(wingL, 0.012 * s, 0.02 * s), item.chrome));
      spine.position.copy(wing.position);
      spine.rotation.x = wing.rotation.x;
    }
    // a small dish on top
    const dishR = 0.07 * s;
    const dish = add(new THREE.Mesh(new THREE.SphereGeometry(dishR, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), item.chrome));
    dish.rotation.x = Math.PI; // a shallow bowl, opening upward
    dish.position.y = bodyY + bodyH / 2 + dishR * 0.9;
    const stem = add(new THREE.Mesh(new THREE.CylinderGeometry(0.008 * s, 0.008 * s, dishR * 0.6, 8), item.chrome));
    stem.position.y = bodyY + bodyH / 2 + dishR * 0.3;
  }

  // every screen with a satellite has its craft (images load at their own pace)
  const built = () => items.every((it) => it.sh.slot === "center" || it.screen);
  const axis = new THREE.Vector3(), c1 = new THREE.Vector3(), c2 = new THREE.Vector3(), roll = new THREE.Quaternion();
  // the angle of the screen's bottom edge as you see it (left to right, counter-clockwise positive, in pixels' proportions)
  const bottomEdge = (it) => {
    const { width: w, height: h } = it.screen.geometry.parameters;
    it.holder.updateMatrixWorld(true);
    c1.set(-w / 2, -h / 2, 0).applyMatrix4(it.screen.matrixWorld).project(camera);
    c2.set(w / 2, -h / 2, 0).applyMatrix4(it.screen.matrixWorld).project(camera);
    return Math.atan2(c2.y - c1.y, (c2.x - c1.x) * camera.aspect);
  };
  const corner = new THREE.Vector3();
  return {
    resize(i, maxH, maxW) { build(items[i], maxH, maxW); },
    update({ placements, night, sun }) {
      sunLight.position.copy(sun);
      sunLight.intensity = THREE.MathUtils.lerp(2.4, 0.3, night);
      const env = night > 0.5 ? ENV_NIGHT : ENV_DAY;
      items.forEach((it, i) => {
        const pl = placements[i];
        it.holder.visible = !!pl && !!it.screen;
        if (!it.holder.visible) return;
        const { theta, a, point, quat, edge, open = 0 } = pl;
        if (it.flip) setFlip(it, open);
        it.holder.position.copy(point); // the screen's centre is on the orbit line
        it.holder.quaternion.copy(quat); // upright along the planet's radial line, facing you
        // turned toward you and tipped back a little, so you see the craft's depth
        it.craft.rotation.set(0.1, -Math.sign(theta || 1) * 0.3 * Math.min(1, Math.abs(theta) * 4 + 0.35), 0);
        // that turn puts the screen's bottom edge at a slant of its own in perspective; roll the craft (about your line
        // of sight) until the edge you see runs parallel to the planet's curve below it
        if (edge !== undefined) {
          axis.copy(point).negate().normalize();
          for (let k = 0; k < 3; k++) it.holder.quaternion.premultiply(roll.setFromAxisAngle(axis, edge - bottomEdge(it)));
        }
        it.craft.scale.setScalar(0.94 + 0.06 * a);
        for (const m of [it.chrome, it.cells]) { m.opacity = a; m.envMap = env; }
        it.cells.envMapIntensity = night > 0.5 ? 1.6 : 0.9; // the wings catch what light there is at night
        it.chrome.envMapIntensity = night > 0.5 ? 0.6 + 0.6 * (night - 0.5) * 2 : 1.15 - 0.9 * night;
        for (const m of it.screenMats) { m.uniforms.uOpacity.value = a; m.uniforms.uNight.value = night; }
        it.halo.material.color.copy(it.tint);
        it.halo.material.opacity = 0.5 * night * a;
      });
    },
    built,
    holders() { return items.filter((it) => it.holder.visible).map((it) => it.holder); },
    pick(raycaster) {
      const hits = raycaster.intersectObjects(items.filter((it) => it.holder.visible && it.screen && it.screenMat.uniforms.uOpacity.value > 0.6).flatMap((it) => it.screens), false);
      return hits.length ? items.find((it) => it.screens.includes(hits[0].object)) : null;
    },
    // the top right of a screen on the page (CSS px), and how visible it is; null while it is hidden or faint
    rectOf(i, camera) {
      const it = items[i];
      if (!it || !it.holder.visible || !it.screen || it.screenMat.uniforms.uOpacity.value < 0.6) return null;
      let right = -Infinity, top = Infinity;
      for (const m of it.screens) {
        if (!m.visible || !m.geometry) continue;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        const b = m.geometry.boundingBox;
        for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) {
          const p = corner.set(x, y, 0).applyMatrix4(m.matrixWorld).project(camera);
          right = Math.max(right, (p.x + 1) / 2 * innerWidth); top = Math.min(top, (1 - p.y) / 2 * innerHeight);
        }
      }
      return right > -Infinity ? { right, top, a: it.screenMat.uniforms.uOpacity.value } : null;
    },
    isOpen(i) { return !!(items[i] && items[i].flip && items[i].t > 0.5); }, // a Duo that has unfolded
    srcOf(i) { const it = items[i], c = it.flip && it.t > 0.5 ? it.inner.canvas : it.canvas; return c ? c.toDataURL("image/jpeg", 0.92) : shots[i].img.src; },
  };
}
