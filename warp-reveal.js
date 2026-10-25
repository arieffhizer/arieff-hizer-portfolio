// The light / dark switch: the coming look opens out of a point (the button) as an uneven, marbled blob rather than a
// clean circle. A domain-warped noise field (noise pushed around by more noise, like marbled ink) bends the edge in and
// out, and where old and new meet they mix in veins. The field is worked out once, small; each frame only compares it
// against the growing radius and hands the result to the view transition as a mask (--warp-mask).
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const noise = (x, y) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};
const fbm = (x, y) => { let v = 0, a = 0.5; for (let i = 0; i < 5; i++) { v += a * noise(x, y); x = x * 2.03 + 1.7; y = y * 2.03 + 9.2; a *= 0.5; } return v; };

export function warpReveal({ x, y, duration = 1300 }) {
  const W = 160, H = Math.max(40, Math.round((W * innerHeight) / innerWidth)), aspect = innerWidth / innerHeight;
  const cx = (x / innerWidth) * W, cy = (y / innerHeight) * H, seed = Math.random() * 50;
  // the field, once: how far each point is from the button (in screen heights), bent by marbled noise, and the veins
  const dist = new Float32Array(W * H), warp = new Float32Array(W * H), vein = new Float32Array(W * H);
  let far = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, px = (i / W) * aspect * 2.4 + seed, py = (j / H) * 2.4;
    const qx = fbm(px, py), qy = fbm(px + 5.2, py + 1.3);
    const rx = fbm(px + 4 * qx + 1.7, py + 4 * qy + 9.2), ry = fbm(px + 4 * qx + 8.3, py + 4 * qy + 2.8);
    const f = fbm(px + 4 * rx, py + 4 * ry);
    dist[k] = Math.hypot((i - cx) / H, (j - cy) / H);
    warp[k] = f - 0.5;
    vein[k] = Math.abs(Math.sin((f + rx) * 14));
    far = Math.max(far, dist[k]);
  }
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"), img = g.createImageData(W, H), px = img.data;
  // the field is small; it reaches the mask scaled up smoothly, so its edge never shows pixels. (No blur: a blurred
  // mask fades out at its own border, and the old look showed through as a rim along every edge of the screen)
  const big = document.createElement("canvas"); big.width = W * 4; big.height = H * 4;
  const bg = big.getContext("2d"); bg.imageSmoothingEnabled = true; bg.imageSmoothingQuality = "high";
  const root = document.documentElement, t0 = performance.now();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  return new Promise((done) => {
    const frame = (now) => {
      const t = Math.min(1, (now - t0) / duration), e = ease(t);
      const reach = e * (far + 0.9) - 0.3; // grows past the far corner, so the end is fully revealed
      const amp = 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 0.05; // the edge is most marbled mid-way
      for (let k = 0; k < W * H; k++) {
        const edge = reach + warp[k] * amp - dist[k]; // > 0: inside the new look
        let a = Math.min(1, Math.max(0, 0.5 + edge / 0.16));
        if (a > 0 && a < 1) a = Math.min(1, Math.max(0, a + (vein[k] - 0.5) * 0.9 * (1 - Math.abs(a * 2 - 1)))); // veins at the meeting
        px[k * 4 + 3] = a * 255;
      }
      g.putImageData(img, 0, 0);
      bg.clearRect(0, 0, big.width, big.height);
      bg.drawImage(c, 0, 0, big.width, big.height);
      root.style.setProperty("--warp-mask", `url(${big.toDataURL()})`);
      if (t < 1) requestAnimationFrame(frame);
      else { root.style.removeProperty("--warp-mask"); done(); }
    };
    root.style.setProperty("--warp-mask", "linear-gradient(transparent, transparent)");
    requestAnimationFrame(frame);
  });
}

// The mode button, shared by every page: on click the other look is applied (apply(paint)) and warps in from the
// button, slowly (2.4 s). Neither snapshot is blurred or zoomed (both pulled the screen's edges in and let a rim show):
// the marbled mask alone does the reveal. A short fade, where the browser has no view transitions.
export function themeButton(button, { isPaint, apply, reduce }) {
  const fade = document.createElement("div");
  fade.className = "theme-fade";
  document.body.append(fade);
  const label = () => button.setAttribute("aria-label", isPaint() ? "Switch to dark mode" : "Switch to light mode");
  label();
  button.addEventListener("click", () => {
    const next = !isPaint();
    const go = () => { apply(next); label(); try { localStorage.setItem("v2-theme", next ? "light" : "dark"); } catch {} };
    // phones: the marbled mask is rebuilt every frame (too slow there), and iOS may not capture the 3D scene for a
    // view transition at all. Instead the coming colour opens out of the button as a circle, the look changes under
    // it, and it clears
    const phone = matchMedia("(hover: none), (max-width: 759px)").matches;
    if (phone && !reduce) {
      const r = button.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const far = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 4;
      fade.style.setProperty("--fill", next ? "#F4EEE4" : "#050507"); // (on its ::before: Safari's bars)
      fade.style.clipPath = `circle(0px at ${x}px ${y}px)`; // (closed before it shows: no flash of the whole screen)
      fade.style.opacity = 1;
      fade.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${far}px at ${x}px ${y}px)` }],
        { duration: 650, easing: "cubic-bezier(.65, 0, .35, 1)", fill: "forwards" }).finished.then(() => {
        go();
        requestAnimationFrame(() => fade.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: 80, easing: "ease-out", fill: "forwards" })
          .finished.then(() => { fade.getAnimations().forEach((a) => a.cancel()); fade.style.opacity = ""; fade.style.removeProperty("--fill"); fade.style.clipPath = ""; }));
      });
      return;
    }
    if (document.startViewTransition && !reduce) {
      const r = button.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      document.startViewTransition(go).ready.then(() => {
        warpReveal({ x, y, duration: 2400 });
        for (const p of ["new", "old"]) document.documentElement.animate({ opacity: [1, 1] }, { duration: 2400, pseudoElement: `::view-transition-${p}(root)` });
      });
      return;
    }
    fade.style.setProperty("--fill", next ? "#F4EEE4" : "#050507"); // (on its ::before: Safari's bars)
    fade.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 1 : 220, fill: "forwards" }).finished.then(() => {
      go();
      fade.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 1 : 450, delay: 50, fill: "forwards" })
        .finished.then(() => { fade.getAnimations().forEach((a) => a.cancel()); fade.style.removeProperty("--fill"); }); // colourless once clear
    });
  });
}
