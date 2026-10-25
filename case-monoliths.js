import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// A case study's screens as monoliths standing on the planet: each screen is set into a slab framed in the same
// silver chrome as the board, so they belong to the world instead of sitting on top of it. By day the sun lights
// the chrome and it reflects the brand-colour sky; at night the screens glow, and each throws a soft pool of light
// onto the planet below it, like a lit window on a dark hill.
export function makeMonoliths({ scene, renderer, shots, color }) {
  const group = new THREE.Group();
  scene.add(group);

  // ---------- Skies for the chrome to reflect: the brand-colour day, and the dark night
  const pmrem = new THREE.PMREMGenerator(renderer);
  function sky(top, horizon, ground, starCount) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, top); gr.addColorStop(0.44, horizon); gr.addColorStop(0.5, horizon);
    gr.addColorStop(0.53, ground); gr.addColorStop(1, "#000000"); // a hard horizon line, then the dark ground
    g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
    g.fillStyle = "rgba(255,255,255,.95)"; g.fillRect(0, 70, 512, 6); // a bright streak of sun across the sky
    g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, 30, 512, 10); // and a darker band above it, so the edges flash light and dark
    g.fillStyle = "rgba(255,255,255,.9)";
    for (let i = 0; i < starCount; i++) g.fillRect(Math.random() * 512, Math.random() * 110, 1, 1);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return pmrem.fromEquirectangular(tex).texture;
  }
  const brand = new THREE.Color(color);
  const hex = (c) => `#${c.getHexString()}`;
  const ENV_DAY = sky(hex(brand.clone().lerp(new THREE.Color("#ffffff"), 0.15)), "#fff4ea", hex(brand.clone().multiplyScalar(0.22)), 0);
  const ENV_NIGHT = sky("#06060a", "#3a3d48", "#030304", 260);

  const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
  scene.add(sunLight, sunLight.target);

  // a soft round glow, for the light behind a screen and the pool it throws on the ground
  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  const screenVertex = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const screenFragment = /* glsl */ `
    uniform sampler2D uMap; uniform float uOpacity, uNight, uRadius; uniform vec2 uSize; varying vec2 vUv;
    float roundBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
    void main() {
      vec2 p = (vUv - 0.5) * uSize;
      float inside = 1.0 - smoothstep(-0.015, 0.015, roundBox(p, uSize * 0.5, uRadius));
      vec3 c = texture2D(uMap, vUv).rgb * mix(0.93, 1.1, uNight); // a screen in daylight, a light source at night
      gl_FragColor = vec4(c, inside * uOpacity);
      #include <colorspace_fragment>
    }`;

  // ---------- One monolith per image, built when its picture has loaded
  const items = shots.map((sh) => {
    const holder = new THREE.Group(), slab = new THREE.Group();
    holder.add(slab);
    holder.visible = false;
    group.add(holder);
    const chrome = new THREE.MeshPhysicalMaterial({ color: 0xe9ecf2, metalness: 1, roughness: 0.08, clearcoat: 0.7, clearcoatRoughness: 0.1, envMap: ENV_DAY, envMapIntensity: 1.15, transparent: true });
    const screenMat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: null }, uOpacity: { value: 0 }, uNight: { value: 0 }, uRadius: { value: 0.3 }, uSize: { value: new THREE.Vector2(1, 1) } },
      vertexShader: screenVertex, fragmentShader: screenFragment, transparent: true,
    });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, opacity: 0 }));
    group.add(pool);
    const item = { sh, holder, slab, chrome, screenMat, halo, pool, aspect: 0, canvas: null, frame: null, screen: null, H: 0, tint: new THREE.Color(1, 1, 1) };

    const img = new Image();
    img.onload = () => {
      const [cx, cy, cw, ch] = sh.img.crop || [0, 0, img.naturalWidth, img.naturalHeight];
      const scale = Math.min(1, 1600 / Math.max(cw, ch));
      const c = document.createElement("canvas");
      c.width = Math.round(cw * scale); c.height = Math.round(ch * scale);
      const g = c.getContext("2d");
      // a screen is never see-through: a cut-out image (a logo, a 3D render) gets a dark backing, a screenshot white
      g.drawImage(img, cx, cy, cw, ch, 0, 0, c.width, c.height);
      const corners = [[1, 1], [c.width - 2, 1], [1, c.height - 2], [c.width - 2, c.height - 2]].map(([x, y]) => g.getImageData(x, y, 1, 1).data[3]);
      g.globalCompositeOperation = "destination-over";
      g.fillStyle = corners.some((al) => al < 250) ? "#0c0d12" : "#ffffff";
      g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = "source-over";
      // the screen's average colour tints the light it throws at night
      const px = g.getImageData(0, 0, c.width, c.height).data;
      let r = 0, gg = 0, b = 0, n = 0;
      for (let k = 0; k < px.length; k += 4 * 97) { r += px[k]; gg += px[k + 1]; b += px[k + 2]; n++; }
      item.tint.setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace).lerp(new THREE.Color(1, 1, 1), 0.4);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      screenMat.uniforms.uMap.value = tex;
      item.canvas = c;
      item.aspect = c.width / c.height;
      if (item.pending) build(item, ...item.pending);
    };
    img.src = sh.img.src;
    return item;
  });

  // size a monolith to fit maxH x maxW world units (rebuilt on resize, so the chrome's corners stay round)
  function build(item, maxH, maxW) {
    item.pending = [maxH, maxW];
    if (!item.aspect) return;
    let h = maxH, w = h * item.aspect;
    if (w > maxW) { w = maxW; h = w / item.aspect; }
    const bezel = 0.03 * Math.max(w, h) + 0.16, depth = Math.max(0.5, 0.06 * h); // a frame you can see, and a body with real thickness
    const tall = item.aspect < 0.8, rScreen = (tall ? 0.085 : 0.025) * Math.min(w, h) * (tall ? 1 : 2);
    if (item.frame) { item.frame.geometry.dispose(); item.slab.remove(item.frame, item.screen); item.screen.geometry.dispose(); }
    item.frame = new THREE.Mesh(new RoundedBoxGeometry(w + bezel * 2, h + bezel * 2, depth, 5, Math.min(rScreen + bezel, (Math.min(w, h) + bezel * 2) / 2 - 0.01)), item.chrome);
    item.screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), item.screenMat);
    item.screen.position.z = depth / 2 + 0.01;
    item.screen.renderOrder = 2;
    item.screen.layers.enable(1); // layer 1: the screens, kept clear of the watercolour
    item.screenMat.uniforms.uSize.value.set(w, h);
    item.screenMat.uniforms.uRadius.value = rScreen;
    item.halo.scale.set((w + bezel * 2) * 1.9, (h + bezel * 2) * 1.5, 1);
    item.halo.position.z = -depth / 2 - 0.2;
    item.slab.add(item.frame, item.screen, item.halo);
    item.H = h + bezel * 2;
    item.slab.position.y = item.H / 2; // its base sits on the anchor, so it stands up from there
    item.pool.scale.set((w + bezel * 2) * 3.2, (w + bezel * 2) * 1.1, 1);
  }

  const axis = new THREE.Vector3();
  return {
    resize(i, maxH, maxW) { build(items[i], maxH, maxW); },
    // place and light every monolith for this frame
    update({ placements, night, sun, planetPos, R }) {
      sunLight.position.copy(sun);
      sunLight.intensity = THREE.MathUtils.lerp(2.4, 0.25, night);
      items.forEach((it, i) => {
        const pl = placements[i];
        it.holder.visible = !!pl && !!it.frame;
        it.pool.visible = it.holder.visible;
        if (!it.holder.visible) return;
        const { theta, a, radius } = pl;
        axis.set(Math.sin(theta), Math.cos(theta), 0);
        it.holder.position.copy(planetPos).addScaledVector(axis, radius);
        it.holder.rotation.set(0, 0, -theta); // upright along the planet's radial line
        it.slab.rotation.y = -theta * 0.55; // turned toward you, so you see its chrome edge catch the light
        it.slab.scale.setScalar(0.94 + 0.06 * a);
        it.chrome.opacity = a;
        it.chrome.envMap = night > 0.5 ? ENV_NIGHT : ENV_DAY;
        it.chrome.envMapIntensity = night > 0.5 ? 0.6 + 0.6 * (night - 0.5) * 2 : 1.15 - 0.9 * night;
        it.screenMat.uniforms.uOpacity.value = a;
        it.screenMat.uniforms.uNight.value = night;
        it.halo.material.color.copy(it.tint);
        it.halo.material.opacity = 0.55 * night * a;
        // the pool of light on the ground just below it
        it.pool.position.copy(planetPos).addScaledVector(axis, R * 1.004);
        it.pool.position.z += 2;
        it.pool.rotation.set(0, 0, -theta);
        it.pool.material.color.copy(it.tint);
        it.pool.material.opacity = 0.5 * night * a;
      });
    },
    // which image (if any) is under a screen point
    pick(raycaster) {
      const hits = raycaster.intersectObjects(items.filter((it) => it.holder.visible && it.screenMat.uniforms.uOpacity.value > 0.6 && it.screen).map((it) => it.screen), false);
      return hits.length ? items.find((it) => it.screen === hits[0].object) : null;
    },
    srcOf(i) { return items[i].canvas ? items[i].canvas.toDataURL("image/jpeg", 0.92) : shots[i].img.src; },
    items,
  };
}
