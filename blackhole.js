import * as THREE from "three";

// A black hole in the spirit of Gargantua: a round black shadow, a thin photon ring, and an accretion disk seen
// almost edge-on. Gravity bends the light from the far side of the disk, so that half is seen draped over the top of
// the shadow like a cloth dropped on a ball (round in the middle, flaring flat into the disk at the edges), and a
// second, smaller image of it wraps under the bottom. White-gold rather than orange, so colour still belongs to the
// planets.
//
// It is drawn as one card that always faces you. For every pixel we ask where its light started before gravity
// bent it (the lens equation) and look the disk up there. Light from farther back is bent more, which is what turns
// the far half into a tall dome over the top that flattens into wings at the edges, and a thick ring underneath.
export function makeBlackHole({ radius = 18 }) {
  const group = new THREE.Group();
  const uniforms = { uTime: { value: 0 }, uFade: { value: 0 } };

  const EXTENT = 6; // the card reaches 6 shadow radii either side, past the disk's outer edge
  const card = new THREE.Mesh(new THREE.PlaneGeometry(radius * EXTENT * 2, radius * EXTENT * 2), new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uExtent: { value: EXTENT } },
    transparent: true, depthWrite: false, premultipliedAlpha: true,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, // light adds, the shadow covers the stars
    vertexShader: `varying vec2 vP; void main() { vP = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFade, uExtent; varying vec2 vP;
      // all lengths in shadow radii (about)
      const float SHADOW = 0.86;            // the black disc
      const float R_IN = 0.3, R_OUT = 4.4;  // the disk, inner and outer edge
      const float TILT = 0.06;              // seen almost exactly edge-on
      const float GROW = 0.55;              // light from farther back is bent more: that is what lifts the dome

      float hash(float n) { return fract(sin(n) * 43758.5453); }
      // how strongly light from a ring of the disk is bent (its Einstein radius, squared)
      float bend(float rho) { return 1.0 + GROW * max(rho - R_IN, 0.0); }
      // the point of the disk seen, unbent, at screen point s: (distance from the centre, angle)
      vec2 plane(vec2 s) { float z = s.y / TILT; return vec2(length(vec2(s.x, z)), atan(z, s.x)); }

      vec3 light(vec2 rp) {
        float rho = rp.x, phi = rp.y, t = (rho - R_IN) / (R_OUT - R_IN);
        if (t < 0.0 || t > 1.0) return vec3(0.0);
        float body = pow(1.0 - t, 1.3) * smoothstep(0.0, 0.04, t) * smoothstep(1.0, 0.6, t);
        float spin = phi - uTime * 0.5 / pow(max(rho, 0.4), 1.5); // inner gas turns faster
        // fine strands of gas, uneven in spacing and brightness
        float strands = 0.0;
        for (int i = 1; i <= 5; i++) {
          float f = float(i), k = 7.0 + 10.3 * f + hash(f) * 5.0;
          strands += sin(rho * k + 1.2 * sin(spin * (f + 1.0) + hash(f * 3.1) * 6.0) + hash(f * 7.7) * 6.0) * (0.5 + 0.5 * hash(f * 1.3)) / sqrt(f);
        }
        strands = clamp(0.6 + 0.32 * strands / 2.2, 0.0, 1.0);
        float doppler = 1.0 + 0.3 * cos(phi); // the side turning toward you is brighter
        vec3 col = mix(vec3(1.0, 0.98, 0.94), vec3(1.0, 0.8, 0.55), smoothstep(0.0, 0.8, t));
        return col * body * strands * doppler * 1.4;
      }

      void main() {
        vec2 p = vP * uExtent;
        float b = max(length(p), 1e-4);
        vec2 n = p / b;
        vec3 col = vec3(0.0);

        if (b > SHADOW) {
          if (n.y > 0.0) {
            // above: the far half of the disk, lifted over the top. Solve the lens equation
            // b = beta + bend(rho(beta)) / b for beta, the unbent distance (one root, found by halving)
            float lo = 0.0, hi = b;
            if (b - bend(plane(vec2(0.0)).x) / b > 0.0) {
              for (int i = 0; i < 22; i++) {
                float m = 0.5 * (lo + hi);
                if (b - m - bend(plane(n * m).x) / b > 0.0) lo = m; else hi = m;
              }
              col += light(plane(n * lo));
            }
          } else {
            // below: the far half again, flipped under the hole as a second, smaller image.
            // Its unbent point lies on the opposite side: beta = bend(rho(beta)) / b - b
            float prev = bend(0.0) / b - b, x0 = 0.0, x1 = -1.0;
            for (int i = 1; i <= 48; i++) {
              float m = float(i) * 0.06, g = bend(plane(-n * m).x) / b - b - m;
              if (x1 < 0.0 && sign(g) != sign(prev)) { x0 = m - 0.06; x1 = m; }
              prev = g;
            }
            if (x1 > 0.0) {
              float g0 = bend(plane(-n * x0).x) / b - b - x0;
              for (int i = 0; i < 10; i++) {
                float m = 0.5 * (x0 + x1), g = bend(plane(-n * m).x) / b - b - m;
                if (sign(g) == sign(g0)) x0 = m; else x1 = m;
              }
              col += light(plane(-n * x0)) * 0.8;
            }
          }
        }

        // the thin photon ring, hugging the shadow
        col += vec3(1.0, 0.95, 0.88) * exp(-pow((b - SHADOW * 1.012) * 110.0, 2.0)) * 0.7;
        float shadow = 1.0 - smoothstep(SHADOW * 0.98, SHADOW * 1.005, b);

        // the near half, straight in front of the hole: a thin bright band across the shadow
        if (p.y <= 0.0) col += light(plane(p));

        gl_FragColor = vec4(col * uFade, shadow * uFade);
      }`,
  }));
  card.renderOrder = 2;
  group.add(card);

  // a wide, soft glow
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,240,215,.55)"); gr.addColorStop(0.35, "rgba(255,230,200,.12)"); gr.addColorStop(1, "rgba(255,230,200,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  glow.scale.setScalar(radius * 11);
  glow.renderOrder = 1;
  group.add(glow);

  for (const o of [card, glow]) o.layers.set(2); // kept out of the board's reflections
  const toCam = new THREE.Vector3();
  group.userData.tick = (t, camera) => {
    uniforms.uTime.value = t;
    card.quaternion.copy(camera.quaternion); // always faces you, disk level on screen
    toCam.copy(camera.position).sub(group.position).normalize();
    card.position.copy(toCam).multiplyScalar(radius * 0.5); // just in front of the glow
  };
  group.userData.setFade = (f) => { uniforms.uFade.value = f; glow.material.opacity = 0.3 * f; group.visible = f > 0.001; };
  group.userData.setFade(0);
  group.userData.radius = radius;
  return group;
}
