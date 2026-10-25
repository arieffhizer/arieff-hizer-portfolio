import * as THREE from "three";
import { planetMaterial, atmosphereMaterial, starMaterial } from "./shaders.js";
import { PROJECTS } from "./planets.js";
import { makeMonoliths } from "./case-monoliths.js";
import { makeSatellites } from "./case-satellites.js";
import { noOrphans } from "./typeset.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { WatercolorShader } from "./watercolor.js";
import { themeButton } from "./warp-reveal.js";

// projects whose screens stand on the planet as chrome monoliths (on trial); the rest show flat images
const MONOLITHS = new Set([]); // none for now: satellites won
// projects whose screens hang from 3D satellites on a dashed orbit around the planet (on trial)
const SATELLITES = new Set(["reta", "viberist", "mori", "shetrades", "fitcoach", "selangorfc", "tradelink"]);

// The case study as a planet's horizon: a sliver of the project's planet along the bottom of the screen, the sky
// above it. One section per screen. Between sections the planet spins like a wheel under the horizon, the copy
// fades out and in the way it does in orbit, and the sky turns from day (the brand colour) to night (dark, with
// stars) and back.
export function startPlanetCase({ name, copy, sections, index, total }) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const p = PROJECTS.find((x) => x.name === name);
  document.body.classList.add("planet-case");

  // the end of the case study is not a screen of its own: its line and the way back sit on the last section, below the
  // orbit line (user, 21 Oct)
  sections = sections.filter((s) => s.kind !== "end");
  const endBlock = `<div class="case-end"><span class="pos">End of ${name}</span>
    <a class="enter back-orbit" href="index.html#${copy.slug}">Back to orbit</a></div>`;

  // ---------- Copy: one block per section, all fixed in the sky and driven by scroll
  const wrap = document.createElement("div");
  wrap.className = "case-secs";
  const n2 = (n) => String(n).padStart(2, "0");
  wrap.innerHTML = sections.map((s, i) => {
    if (s.kind === "hero") return `<section class="case-sec hero-sec">
      <span class="pos">${n2(index + 1)} / ${n2(total)} · Case study</span>
      <h1>${name}</h1><p class="lede">${copy.line}</p>
      <dl class="meta">${Object.entries(copy.meta).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
      <span class="cue"><svg class="mouse" viewBox="0 0 14 22" aria-hidden="true"><rect x="1" y="1" width="12" height="20" rx="6"/><line class="wheel" x1="7" y1="5" x2="7" y2="8"/></svg><span>Scroll</span></span></section>`;
    return `<section class="case-sec">
      <span class="pos">${n2(i)} · ${s.label}</span>${s.title ? `<h2>${s.title}</h2><p>${s.body}</p>` : ""}${s.points ? `<ul class="case-points${s.numbered ? " numbered" : ""}">${s.points.map((p, k) => `<li>${s.numbered ? `<span>${n2(k + 1)}</span>` : ""}${p}</li>`).join("")}</ul>` : ""}${i === sections.length - 1 ? endBlock : ""}</section>`;
  }).join("");
  document.body.append(wrap);
  noOrphans(wrap);
  const secs = [...wrap.children];
  const track = document.createElement("div");
  track.className = "case-track";
  const SCREEN = 1.2; // scroll per section, in screen heights
  track.style.height = `${(sections.length - 1) * SCREEN * 100 + 100}vh`;
  document.body.append(track);
  // the section index, bottom left: every section of the case study, the current one lit (like the project list at home)
  const toc = document.createElement("ol");
  toc.className = "case-index";
  toc.setAttribute("aria-label", "Sections");
  const indexItems = sections.map((sec, j) => {
    if (sec.kind === "end") return null;
    const li = document.createElement("li");
    li.innerHTML = `<span class="n">${n2(j)}</span><span class="t">${sec.kind === "hero" ? name : sec.label}</span>`;
    if (sec.kind === "hero") li.classList.add("lead"); // not "hero": the home page's .hero rule would apply
    li.tabIndex = 0;
    const go = () => scrollTo(0, j * innerHeight * SCREEN); // the planet turns there on its own
    li.addEventListener("click", go);
    li.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    toc.append(li);
    return li;
  });
  document.body.append(toc);

  // ---------- Scene
  const canvas = document.createElement("canvas");
  canvas.className = "case-scene";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 3000);
  // light mode (the head of case.html decides): painted in watercolour, the brand skies in their own colour and the
  // night sections bright paper; dark mode: drawn straight, as before
  let paint = document.documentElement.classList.contains("paint");
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new OutputPass());
  const wash = new ShaderPass(WatercolorShader);
  wash.uniforms.uRes.value = new THREE.Vector2(innerWidth, innerHeight);
  wash.uniforms.uTrue.value = 1; // the brand colour stays the brand colour, as a wash
  composer.addPass(wash);

  const DAY = new THREE.Color(p.color), NIGHT = new THREE.Color("#050507"), PAPER = new THREE.Color("#ffffff"); // white: the wash leaves bare paper
  // ink: white on dark brand colours, near-black on light ones (FitCoach silver, SheTrades coral), always white at night
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map((k) => { const v = parseInt(h.slice(k, k + 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.04045) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const INK_DAY = lum(p.color) > 0.3 ? [12, 13, 18] : [255, 255, 255];
  // at night the ink turns white against the dark sky; painted, night is bright paper, so it turns to dark ink
  const ink = (night) => { const to = paint ? [38, 36, 44] : [255, 255, 255]; return INK_DAY.map((v, i) => Math.round(v + (to[i] - v) * night)).join(","); };
  scene.background = DAY.clone();
  // day: the sun high in front lights the whole horizon; night: it sits behind the planet and only rims its edge
  const SUN_DAY = new THREE.Vector3(18, 70, 40), SUN_NIGHT = new THREE.Vector3(0, 30, -140), sun = SUN_DAY.clone();

  // a planet much bigger than the screen, seen low over its horizon: the dome runs off both sides, so you never see
  // where it ends and it reads as vast (R 40 showed the whole dome, and with it how small the planet was)
  const R = 80, DIST = 52, LIFT = 3.6; // LIFT: how far mockups hover above the surface
  const planet = new THREE.Group();
  planet.rotation.x = Math.PI / 2; // the spin axis points at you, so it turns like a wheel under the horizon
  scene.add(planet);
  const bodyMat = p.kind === "giant"
    ? starMaterial({ color: p.color, intensity: 1.1 })
    : planetMaterial({ color: p.color, type: p.type, seed: p.seed || 1, clouds: p.clouds || 0, tilt: p.tilt || 0, light: sun });
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 192, 96), bodyMat);
  planet.add(body);
  let shell;
  if (p.atmo) {
    shell = new THREE.Mesh(new THREE.SphereGeometry(R + 2.4, 128, 64), atmosphereMaterial({ color: p.color, light: sun, strength: p.atmo * 0.9 }));
    planet.add(shell);
  }

  // stars for the night sky
  const starGeo = new THREE.BufferGeometry(), N = 1600, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const v = new THREE.Vector3().randomDirection();
    if (v.z > 0.2) v.z *= -1; // mostly in front of you
    v.multiplyScalar(900);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xe9eaee, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false }));
  scene.add(stars);

  // the dome sits low, its two ends meeting the bottom of the screen a gutter in from each side (under the start of
  // the section list), so it never runs off the sides, whatever the window's shape
  const centreFor = (horizon) => {
    // how far below you the centre sits so the dome's top (where your sight grazes it, asin(R / distance) off the
    // centre line) is at this fraction of the screen height
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), crest = Math.atan(tanH * (horizon * 2 - 1));
    let lo = crest, hi = Math.PI / 2 - 0.01;
    for (let k = 0; k < 40; k++) { const b = (lo + hi) / 2; if (b - Math.asin(Math.min(1, (R * Math.cos(b)) / DIST)) < crest) lo = b; else hi = b; }
    return -DIST * Math.tan(lo);
  };
  // the angle round the planet's outline (from the top, clockwise) where it leaves the screen at the bottom
  const tmpV = new THREE.Vector3();
  const offScreen = (phi) => { orbitAt(phi, tmpV); return tmpV.z > -1 || toScreen(tmpV)[1] > 1; };
  const exitPhi = () => { let lo = 0, hi = Math.PI; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (offScreen(m)) hi = m; else lo = m; } return lo; };
  function layout() {
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setSize(innerWidth, innerHeight); wash.uniforms.uRes.value.set(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const gutter = parseFloat(getComputedStyle(toc).left) || 40;
    let lo = 0.72, hi = 0.88; // lower in the screen brings the ends further in
    for (let k = 0; k < 24; k++) {
      const h = (lo + hi) / 2;
      setRing(restCentre.set(0, centreFor(h), -DIST), R);
      if (toScreen(orbitAt(exitPhi(), tmpV))[0] > 1 - gutter / innerWidth) lo = h; else hi = h;
    }
    planet.userData.baseY = centreFor(hi);
  }
  // ---------- Mockups: they stand on the planet beside the copy, ride its spin, and fade with the sky
  const shotsEl = document.createElement("div");
  shotsEl.className = "case-shots";
  document.body.append(shotsEl);
  const shots = [], mono = MONOLITHS.has(copy.slug), sats = !mono && SATELLITES.has(copy.slug);
  if (sats) shotsEl.classList.add("satellites");
  sections.forEach((sec, j) => (sec.images || []).forEach((img, n) => {
    // a 3D mark is only to look at: it stays a picture, not a button, and never opens in the viewer
    const mark = img.slot === "center";
    const el = document.createElement(mark ? "div" : "button");
    if (!mark) el.type = "button";
    const in3d = mono || (sats && img.slot !== "center");
    el.className = `case-shot ${img.slot === "center" ? "center" : "side"}${in3d ? " sr" : ""}`;
    // with monoliths or satellites the picture is drawn in 3D, and this button stays only so a keyboard can open it
    el.innerHTML = in3d ? "" : `<img src="${img.src}" alt="${img.alt}" loading="${j < 2 ? "eager" : "lazy"}" decoding="async">`;
    const k = shots.length;
    if (!mark) { el.setAttribute("aria-label", `Enlarge: ${img.alt}`); el.addEventListener("click", () => openShot(img, k)); }
    shotsEl.append(el);
    shots.push({ el, j, n, img, slot: img.slot, first: n === 0 });
  }));
  const monoliths = mono ? makeMonoliths({ scene, renderer, shots, color: p.color }) : null;
  const satellites = sats ? makeSatellites({ scene, renderer, camera, shots, color: p.color, onBuilt: () => queueTune() }) : null;
  const models = monoliths || satellites;
  const slotAngle = { left: 0, right: 0, center: 0, flip: 0 }; // flip: an unfolding Duo, alone in its section, centred
  // satellites: a dashed orbit over the planet. On screen it is the planet's own edge moved straight up, point for
  // point, so it has exactly the dome's curve. (Any real 3D ring, a bigger sphere's or the planet's tilted up, gets
  // bent by perspective and comes out flatter or steeper than the planet.)
  // how far in from each side a satellite's screen centre rests, as a fraction of the width: tuned per project and
  // window (tuneSlots) to sit as close to the centre as the copy allows
  let slotX = 0.18;
  const COPY_GAP = 48; // the least room, in px, between any satellite and any line of copy
  const SAT_H = 0.46, SAT_GAP = 0.095; // its screen is up to 46% of the window tall; this much sky below it, to the planet
  let lift = 0.3; // how far the orbit sits above the planet's edge, in screen heights
  const restCentre = new THREE.Vector3();
  const ring = { c: new THREE.Vector3(), u: new THREE.Vector3(), e1: new THREE.Vector3(1, 0, 0), e2: new THREE.Vector3(), r: 0 };
  // the ring of tangent points of a sphere of radius rad around centre, as seen from the camera (at the origin)
  function setRing(centre, rad) {
    const d = centre.length();
    ring.u.copy(centre).negate().normalize(); // from the planet toward you
    ring.c.copy(centre).addScaledVector(ring.u, (rad * rad) / d);
    ring.r = rad * Math.sqrt(Math.max(0, 1 - (rad / d) ** 2));
    ring.e2.crossVectors(ring.u, ring.e1).normalize(); // "up" in the ring's plane
  }
  const radialAt = (phi, out) => out.copy(ring.e1).multiplyScalar(Math.sin(phi)).addScaledVector(ring.e2, Math.cos(phi));
  const orbitAt = (phi, out) => radialAt(phi, out).multiplyScalar(ring.r).add(ring.c);
  // a point of the orbit: the planet's edge at phi (after setRing(centre, R)), lifted on screen at the same depth
  const liftedAt = (phi, out) => { orbitAt(phi, out).project(camera); out.y += lift * 2; return out.unproject(camera); };
  // the edge runs from behind you on one side to behind you on the other: the part in front of you
  const frontPhi = () => { let lo = 0, hi = Math.PI; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (orbitAt(m, orbitPoint).z < -1) lo = m; else hi = m; } return lo; };
  // the slope of the planet's edge on screen at phi (counter-clockwise positive, in pixels' proportions): the line a
  // mockup's bottom edge should run parallel to. The orbit is the same curve moved up, so its slope is the same
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const slopeAt = (phi) => {
    orbitAt(phi - 0.002, e1).project(camera); orbitAt(phi + 0.002, e2).project(camera);
    return Math.atan2(e2.y - e1.y, (e2.x - e1.x) * camera.aspect);
  };
  // the angle round the planet's edge that is at this fraction across the screen
  const phiAtX = (fx) => { const end = frontPhi(); let lo = -end, hi = end; for (let k = 0; k < 26; k++) { const m = (lo + hi) / 2; if (toScreen(orbitAt(m, e1))[0] < fx) lo = m; else hi = m; } return lo; };
  // a satellite at theta on the orbit: its screen centre on the line, facing your eye, upright across the orbit (so,
  // on screen, along the planet's radial line below it), its bottom edge to run parallel to the curve
  function satPlacement(theta, a) {
    const point = liftedAt(theta, new THREE.Vector3());
    const face = point.clone().negate().normalize();
    const along = liftedAt(theta + 0.002, new THREE.Vector3()).sub(liftedAt(theta - 0.002, new THREE.Vector3()));
    const up = new THREE.Vector3().crossVectors(face, along).normalize();
    if (up.y < 0) up.negate();
    right.crossVectors(up, face);
    const quat = new THREE.Quaternion().setFromRotationMatrix(basis.makeBasis(right, up, face));
    return { theta, a, point, quat, edge: slopeAt(theta) };
  }
  const ORBIT_N = 720, orbitPts = new Float32Array((ORBIT_N + 1) * 3);
  const orbitPoint = new THREE.Vector3(), basis = new THREE.Matrix4(), right = new THREE.Vector3();
  let orbitLine;
  if (sats) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(orbitPts, 3).setUsage(THREE.DynamicDrawUsage));
    orbitLine = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, dashSize: 0.3, gapSize: 0.26, depthWrite: false }));
    orbitLine.frustumCulled = false; // rebuilt every frame
    orbitLine.layers.enable(1); // painted, drawn again over the watercolour with the screens: the wash would smear a fine dashed line away
    scene.add(orbitLine);
  }
  // a point's screen position, as fractions of the window
  const toScreen = (v) => { orbitPoint.copy(v).project(camera); return [(orbitPoint.x + 1) / 2, (1 - orbitPoint.y) / 2]; };
  const anchor = new THREE.Vector3();
  let narrow = false;
  let narrowOrbitY = 0; // phones: where the orbit line sits on screen, at rest
  let narrowHorizon = 0; // phones: where a monogram's foot rests, so its spin offset carries onto the line
  const NARROW_H = 0.325; // phones: every mockup this tall (of the window), as FitCoach's Solution set it
  // a section with pills on phones rests first on its copy and pills alone; the next step slides the pills out and the mockup
  // in (bigger, in the room the pills left), and a pair takes one more step for its second screen
  const PILL_STOP = 0.18, PAIR2_STOP = 0.36;
  const pillJ = new Set(sections.map((s, j) => (s.points && (s.images || []).some((im) => im.slot === "left" || im.slot === "right") ? j : -1)).filter((j) => j >= 0));
  // where on the planet's rim a mockup stands: the angle (from the top, clockwise) that puts it about a sixth of
  // the screen in from each edge, whatever the window's shape
  // the angle round the orbit (from the top) where a satellite's screen centre is slotX in from the right edge
  const phiTmp = new THREE.Vector3();
  const sectionPhi = () => { let lo = 0, hi = Math.PI / 2; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (toScreen(orbitAt(m, phiTmp))[0] < 1 - slotX) lo = m; else hi = m; } return lo; };
  function placeSlots(tuned) {
    narrow = innerWidth < 760;
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * DIST * camera.aspect;
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let satPhi = 0;
    // the orbit sits high enough that a full-height screen, centred on it a fifth in from the side, has SAT_GAP of
    // sky below it down to the planet. Lifting is straight up, so the slot's angle is the same on the planet's edge.
    // (Projects without satellites keep the same line, unseen, for the end of the case study.)
    restCentre.set(0, planet.userData.baseY, -DIST);
    const tmp = new THREE.Vector3();
    setRing(restCentre, R);
    // phones: the copy runs long, so the orbit sits low, just above the planet, to leave the mockups more room
    lift = narrow ? 0.06 + 0.14 : SAT_GAP + SAT_H / 2;
    if (sats) satPhi = sectionPhi();
    // the end of the case study: below the orbit line by the same gap as the last section's copy sits above it
    const last = secs[secs.length - 1], end = last.querySelector(".case-end");
    const orbitTop = (toScreen(orbitAt(0, tmp))[1] - lift) * innerHeight; // the line at the middle of the screen
    // phones: every mockup is the same size (NARROW_H) on the same orbit line, so each section's copy is fitted
    // above it instead: it starts at the same height everywhere (CSS), and where its text would reach the mockup the
    // description steps down a size at a time, then the title. Pills don't count: they leave before the mockup comes
    const clear = orbitTop - 0.85 * NARROW_H * innerHeight - 14; // a craft's top (mast included) on the orbit line
    secs.forEach((sec, j) => {
      const p = sec.querySelector("p"), h = sec.querySelector("h2");
      if (p) p.style.fontSize = "";
      if (h) h.style.fontSize = "";
      if (!narrow || !sats || !p || !(sections[j].images || []).length) return;
      const bottom = () => sec.offsetTop + p.offsetTop + p.offsetHeight;
      for (let size = parseFloat(getComputedStyle(p).fontSize); bottom() > clear && size > 12.5; ) p.style.fontSize = (size -= 0.5) + "px";
      if (h) for (let size = parseFloat(getComputedStyle(h).fontSize); bottom() > clear && size > 22; ) h.style.fontSize = (size -= 1) + "px";
    });
    // phones: the scroll cue (00), the pills, and the end link sit just above the orbit line, wherever the copy above
    // them ends (pills share a section with a monogram, and the end link with mockups, so those stay with their text)
    narrowOrbitY = orbitTop;
    const toLine = (el, sec, ok) => {
      el.style.marginTop = "";
      if (!narrow || !ok) return;
      const top = sec.offsetTop + el.offsetTop, want = orbitTop - 24 - el.offsetHeight;
      if (want > top) el.style.marginTop = (parseFloat(getComputedStyle(el).marginTop) + want - top).toFixed(0) + "px";
    };
    secs.forEach((sec, j) => {
      const imgs = sections[j].images || [];
      const cue = sec.querySelector(".cue"), ul = sec.querySelector(".case-points");
      if (cue) toLine(cue, sec, true);
      if (ul) toLine(ul, sec, !imgs.some((im) => im.slot === "center"));
    });
    const copyEnd = last.offsetTop + last.offsetHeight, gap = orbitTop - copyEnd;
    // (phones: just under the copy, clear of the section numbers along the bottom)
    const lastBare = !(sections[sections.length - 1].images || []).length;
    end.style.top = `${((narrow ? (lastBare ? Math.max(copyEnd + 32, orbitTop - 24 - end.offsetHeight) : copyEnd + 32) : gap >= 16 ? orbitTop + gap : copyEnd + 40) - last.offsetTop).toFixed(0)}px`;
    const a = sats ? satPhi : Math.asin(Math.min(0.85, (halfW * (mono ? 0.5 : 0.56)) / R)); // a little in from the edge
    slotAngle.left = -a; slotAngle.right = a;
    // a centred mockup fills the gap between its section's copy and the planet, and never reaches into the copy
    anchor.set(0, planet.userData.baseY + R + LIFT, -DIST).project(camera); // where the planet rests, not where it is mid-rise
    const horizon = (1 - anchor.y) / 2 * innerHeight;
    narrowHorizon = horizon;
    const unit = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * DIST) / innerHeight; // world units per pixel at the planet
    shots.forEach((sh, i) => {
      const centred = sh.slot === "center" || narrow;
      const sec = secs[sh.j], copyBottom = sec === last ? last.offsetTop + end.offsetTop + end.offsetHeight : sec.offsetTop + sec.offsetHeight;
      const fit = Math.max(innerHeight * 0.14, horizon - copyBottom - innerHeight * 0.04);
      if (monoliths) {
        const maxH = narrow ? Math.min(fit, innerHeight * 0.34) : centred ? fit : innerHeight * 0.44;
        const maxW = narrow ? innerWidth * 0.7 : centred ? innerWidth * 0.42 : innerWidth * (monoliths ? 0.18 : 0.22);
        monoliths.resize(i, maxH * unit, maxW * unit);
        return;
      }
      if (satellites && sh.slot === "flip") {
        // alone in its section, centred: as tall as the others, unless it would be too wide once open
        const depth = -liftedAt(0, new THREE.Vector3()).z, unitO = (2 * tanH * depth) / innerHeight;
        satellites.resize(i, (narrow ? 0.3 : SAT_H) * innerHeight * unitO, (narrow ? 0.9 : 0.6) * innerWidth * unitO);
        return;
      }
      if (satellites && sh.slot !== "center") {
        // big: the screen fills the space beside the copy
        const depth = -liftedAt(satPhi, new THREE.Vector3()).z, unitO = (2 * tanH * depth) / innerHeight; // world units per pixel there
        // phones: centred under a column of copy, so no taller than the room between the copy and the orbit line
        // allows (its centre rides the line; the mast above it takes about a third of its height again)
        // phones: one size for every section (the copy above is fitted to it, in placeSlots)
        const hFrac = narrow ? NARROW_H : SAT_H;
        satellites.resize(i, hFrac * innerHeight * unitO, (narrow ? innerWidth * 0.62 : innerWidth * 0.22) * unitO);
        return;
      }
      if (!centred) { sh.el.firstChild.style.maxHeight = ""; return; }
      sh.el.firstChild.style.maxHeight = `${(narrow && sats ? NARROW_H * innerHeight : fit).toFixed(0)}px`;
    });
    if (!tuned) queueTune(); // the copy or the window changed: find the satellites' place again
  }

  // tuneSlots: try each section's satellites at rest, at the screen positions a bisection proposes, and keep the one
  // closest to the centre that still leaves COPY_GAP between every part of a craft (screen, frame, wings) and every
  // line of that section's copy. One position for the whole case study, so the pairs never jump between sections;
  // on a tight window they move out rather than clash
  let tuneQueued = false;
  function queueTune() {
    if (tuneQueued || !satellites || narrow || !satellites.built()) return;
    tuneQueued = true;
    requestAnimationFrame(() => { tuneQueued = false; tuneSlots(); });
  }
  function tuneSlots() {
    const bySec = new Map();
    shots.forEach((sh, i) => { if (sh.slot === "left" || sh.slot === "right") bySec.set(sh.j, [...(bySec.get(sh.j) || []), i]); });
    // each section's copy as it stands at rest
    const lines = new Map();
    for (const j of bySec.keys()) {
      const el = secs[j], was = el.style.transform, rects = [];
      el.style.transform = "translate(-50%, 0px) scale(1)";
      el.querySelectorAll(".pos, h2, p").forEach((t) => { const rg = document.createRange(); rg.selectNodeContents(t); rects.push(...rg.getClientRects()); });
      el.querySelectorAll("li").forEach((t) => rects.push(...t.getClientRects()));
      el.style.transform = was;
      lines.set(j, rects);
    }
    setRing(restCentre, R);
    const v = new THREE.Vector3(), W = innerWidth, Hh = innerHeight;
    const gapAt = (x) => {
      slotX = x;
      const phi = sectionPhi();
      let min = Infinity;
      for (const [j, idx] of bySec) {
        satellites.update({ placements: shots.map((sh, i) => (idx.includes(i) ? satPlacement(sh.slot === "left" ? -phi : phi, 1) : null)), night: 0, sun });
        for (const hd of satellites.holders()) {
          hd.updateMatrixWorld(true);
          const pts = [];
          hd.traverse((o) => {
            if (!o.isMesh || o.material.blending === THREE.AdditiveBlending) return; // not the glow
            const pos = o.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 300));
            for (let k = 0; k < pos.count; k += step) { v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld).project(camera); pts.push((v.x + 1) / 2 * W, (1 - v.y) / 2 * Hh); }
          });
          for (const q of lines.get(j)) {
            let x0 = Infinity, x1 = -Infinity;
            for (let k = 0; k < pts.length; k += 2) if (pts[k + 1] >= q.top - 6 && pts[k + 1] <= q.bottom + 6) { x0 = Math.min(x0, pts[k]); x1 = Math.max(x1, pts[k]); }
            if (x0 === Infinity) continue;
            min = Math.min(min, x1 < q.left ? q.left - x1 : q.right < x0 ? x0 - q.right : -1);
          }
        }
      }
      return min;
    };
    // twice: a satellite moved inward is rebuilt a little bigger (nearer the eye), so the second pass measures the
    // crafts at the size they will have; the extra 14px covers the slow drift while you read
    for (let pass = 0; pass < 2; pass++) {
      let lo = 0.1, hi = 0.3;
      if (gapAt(lo) < COPY_GAP + 14) hi = lo;
      else for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (gapAt(m) >= COPY_GAP + 14) lo = m; else hi = m; }
      slotX = lo;
      placeSlots(true);
    }
  }

  layout();
  placeSlots();
  addEventListener("resize", () => { layout(); placeSlots(); });
  document.fonts.ready.then(() => placeSlots()); // the copy's height is only final once the fonts are in

  // ---------- Something to open: a four-point spark with a word beside it. With a mouse it follows the pointer while
  // it is over a mockup ("View"); on a touch screen, where there is no hover, one sits on every mockup's top right
  // corner ("Tap"), riding with it
  const SPARK = `<svg class="spark" viewBox="-12 -12 24 24" aria-hidden="true"><path d="M0-11C.9-3.6 3.6-.9 11 0 3.6.9.9 3.6 0 11-.9 3.6-3.6.9-11 0-3.6-.9-.9-3.6 0-11Z"/></svg>`;
  const sparkTag = (word, cls) => { const el = document.createElement("span"); el.className = `spark-tag ${cls}`; el.setAttribute("aria-hidden", "true"); el.innerHTML = `<i>${SPARK}<b>${word}</b></i>`; document.body.append(el); return el; };
  // read live, so a window that changes size or input mode follows: pins on touch screens and phone widths
  const pinMQ = matchMedia("(hover: none), (pointer: coarse), (max-width: 759px)");
  const tag = sparkTag("View", "cursor");
  const pins = shots.map(() => sparkTag("Tap", "pin"));

  // ---------- Look closer: a mockup opens upright on a dark backdrop, as its real screen (media/<project>/full/: a
  // phone at 375 x 812, saved at 2x; a site at 1440 x 900, at 1.25x), never larger than that. The chevrons step
  // through the section's pictures only (a Duo that unfolds counts as two: folded and open)
  const box = document.createElement("div");
  box.className = "case-lightbox";
  const chev = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  box.innerHTML = `
    <button type="button" class="lb-close" aria-label="Close">${chev("M6 6l12 12M18 6L6 18")}</button>
    <button type="button" class="lb-nav prev" aria-label="Previous picture">${chev("M15 5l-7 7 7 7")}</button>
    <button type="button" class="lb-nav next" aria-label="Next picture">${chev("M9 5l7 7-7 7")}</button>
    <p class="lb-count" aria-live="polite"></p>`;
  document.body.append(box);
  const boxCount = box.querySelector(".lb-count");
  const fullOf = (src) => src.replace(/\/(screens|duo)\//, "/full/");
  let gallery = [], at = 0, boxImg = null;
  function sizeShot(img = boxImg) {
    // a full frame shows at its own size in CSS px, scaled down only to fit; anything else (a 3D mark) fits the box
    if (!img || !img.naturalWidth) return;
    const full = img.dataset.full === "1", wide = img.naturalWidth >= img.naturalHeight;
    const per = full ? (wide ? 1.25 : 2) : img.naturalWidth / Math.min(img.naturalWidth, 0.6 * innerWidth);
    const w = img.naturalWidth / per, h = img.naturalHeight / per;
    const room = innerWidth < 760 ? [innerWidth - 32, innerHeight - 150] : [innerWidth - 220, innerHeight - 150];
    const k = Math.min(1, room[0] / w, room[1] / h);
    img.style.width = `${(w * k).toFixed(0)}px`; img.style.height = `${(h * k).toFixed(0)}px`;
    // every screen takes the corner FitCoach's frames have baked in (30pt on a 390pt screen, so 29.5pt here), scaled with
    // it: one curve on every screen, and the grey those frames carry outside their corners is cut away
    img.style.borderRadius = `${(29.5 * k * (full ? 1 : w / 375)).toFixed(1)}px`;
  }
  // the picture, decoded and sized before it is shown, so it never pops in at the wrong size
  const loadShot = ({ src, alt }) => new Promise((ok) => {
    const img = new Image(), full = fullOf(src);
    img.alt = alt; img.decoding = "async";
    img.dataset.full = full !== src ? "1" : "";
    // (decoding first keeps the slide smooth, but a decode that stalls while the page is busy never holds it back)
    img.onload = () => Promise.race([img.decode().catch(() => {}), new Promise((t) => setTimeout(t, 250))]).then(() => { sizeShot(img); ok(img); });
    img.onerror = () => { img.onerror = null; img.dataset.full = ""; img.src = src; }; // no real frame: the mockup's own picture
    img.src = full;
  });
  const EASE = "cubic-bezier(.23, 1, .32, 1)", SLIDE = 56; // px each picture travels
  let turn = 0; // only the latest step lands, however fast the chevrons are pressed
  async function showShot(i, dir = 0) {
    at = (i + gallery.length) % gallery.length;
    boxCount.textContent = `${at + 1} / ${gallery.length}`;
    box.classList.toggle("single", gallery.length < 2);
    const mine = ++turn, img = await loadShot(gallery[at]);
    if (mine !== turn) return;
    const old = boxImg;
    boxImg = img;
    box.prepend(img);
    if (!old) return;
    if (reduce || !dir) { old.remove(); return; }
    // the old one drifts out the way you are going, the new one follows in from the other side, both softly blurred
    // while they pass, so the swap reads as one movement
    old.getAnimations().forEach((a) => a.cancel());
    old.classList.add("leaving");
    old.animate([{ opacity: 1, transform: "none", filter: "blur(0)" }, { opacity: 0, transform: `translateX(${-dir * SLIDE}px) scale(.97)`, filter: "blur(6px)" }],
      { duration: 280, easing: EASE, fill: "forwards" }).finished.then(() => old.remove(), () => old.remove());
    img.animate([{ opacity: 0, transform: `translateX(${dir * SLIDE}px) scale(.97)`, filter: "blur(6px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }],
      { duration: 420, easing: EASE });
  }
  function openShot(img, k) {
    const j = shots[k].j;
    gallery = (sections[j].images || []).flatMap((im) => im.open ? [{ src: im.src, alt: im.alt }, { src: im.open, alt: im.alt }] : [{ src: im.src, alt: im.alt }]);
    const first = gallery.findIndex((g) => g.src === img.src);
    box.querySelectorAll("img").forEach((el) => el.remove()); boxImg = null;
    showShot(img.open && models && models.isOpen?.(k) ? first + 1 : Math.max(0, first));
    box.classList.add("on");
    document.documentElement.style.overflow = "hidden";
    tag.classList.remove("on");
  }
  function closeShot() { box.classList.remove("on"); document.documentElement.style.overflow = ""; }
  // the backdrop closes it; the picture and the controls do not
  box.addEventListener("click", (e) => { if (e.target === box) closeShot(); });
  box.querySelector(".lb-close").addEventListener("click", closeShot);
  box.querySelector(".prev").addEventListener("click", () => showShot(at - 1, -1));
  box.querySelector(".next").addEventListener("click", () => showShot(at + 1, 1));
  addEventListener("resize", () => sizeShot());
  // phones: a sideways swipe on the picture steps through them too
  let sx = null;
  box.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", (e) => { if (sx === null || gallery.length < 2) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 40) showShot(at - Math.sign(dx), -Math.sign(dx)); });
  addEventListener("keydown", (e) => {
    if (!box.classList.contains("on")) return;
    if (e.key === "Escape") closeShot();
    else if (e.key === "ArrowLeft" && gallery.length > 1) showShot(at - 1, -1);
    else if (e.key === "ArrowRight" && gallery.length > 1) showShot(at + 1, 1);
  });
  // monoliths: click a screen to look closer; the cursor says so when you are over one
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const monolithAt = (x, y) => { ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); return models.pick(ray); };
  if (models) {
    addEventListener("pointermove", (e) => {
      const over = !box.classList.contains("on") && (monolithAt(e.clientX, e.clientY) || e.target.closest?.("button.case-shot"));
      document.body.style.cursor = over ? "pointer" : "";
      if (pinMQ.matches || e.pointerType !== "mouse") { tag.classList.remove("on"); return; }
      tag.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      tag.classList.toggle("on", !!over);
    });
    document.addEventListener("pointerleave", () => tag.classList.remove("on"));
    addEventListener("click", (e) => {
      if (box.classList.contains("on") || e.target.closest("a, button, li")) return; // (the section list is <li>s)
      const hit = monolithAt(e.clientX, e.clientY);
      if (hit) openShot(hit.sh.img, shots.indexOf(hit.sh));
    });
  }

  // ---------- Scroll: rest on each section, then turn to the next over the last part of its scroll
  const state = { x: 0, rise: reduce ? 0 : 1 };
  const SPIN = THREE.MathUtils.degToRad(32); // how far the planet turns per section
  const target = () => {
    const f = scrollY / (innerHeight * SCREEN), i = Math.floor(f), k = THREE.MathUtils.smootherstep(f - i, 0.5, 1);
    return Math.min(sections.length - 1, i + k);
  };
  // ---------- One gesture, one step: a wheel flick, a trackpad swipe, a touch swipe or an arrow key
  // moves exactly one section and the turn plays out on its own, so you are never left mid-way. The momentum after a
  // trackpad swipe is let go before the next step counts. The unfolding Duo takes three steps of its own (a third, two
  // thirds, open) before the next section.
  const flipJ = sections.findIndex((s) => (s.images || []).some((im) => im.slot === "flip"));
  // where in the flip section's own scroll the Duo is a third, two thirds and fully open (see pl.open below)
  const FLIP_STOPS = [0.04 + 0.28 * 0.38, 0.04 + 0.28 * 0.62, 0.32];
  // on phones the two mockups of a pair take turns, centred: a second rest in the section (the copy stays put) swaps
  // the first out and the second in
  const SWAP_STOP = 0.3, pairJ = new Set(sections.map((s, j) => ((s.images || []).filter((im) => im.slot === "left" || im.slot === "right").length > 1 ? j : -1)).filter((j) => j >= 0));
  let stops = [];
  const buildStops = () => { stops = []; sections.forEach((s, j) => { stops.push(j); if (j === flipJ) FLIP_STOPS.forEach((f) => stops.push(j + f)); if (narrow && pillJ.has(j)) { stops.push(j + PILL_STOP); if (pairJ.has(j)) stops.push(j + PAIR2_STOP); } else if (narrow && pairJ.has(j)) stops.push(j + SWAP_STOP); }); };
  buildStops();
  const nearestStop = () => { if (stops.narrow !== narrow) { buildStops(); stops.narrow = narrow; } const f = scrollY / (innerHeight * SCREEN); let best = 0; stops.forEach((st, i) => { if (Math.abs(st - f) < Math.abs(stops[best] - f)) best = i; }); return best; };
  const step = (dir) => { const i = Math.max(0, Math.min(stops.length - 1, nearestStop() + dir)); scrollTo(0, stops[i] * innerHeight * SCREEN); };
  {
    let used = false, acc = 0, lastStep = 0, quiet;
    const blocked = () => box.classList.contains("on");
    const go = (dir) => { const now = performance.now(); if (now - lastStep < 650) return false; lastStep = now; step(dir); return true; };
    addEventListener("wheel", (e) => {
      if (blocked()) return;
      e.preventDefault();
      clearTimeout(quiet);
      quiet = setTimeout(() => { used = false; acc = 0; }, 180); // the gesture (and its momentum) has ended
      if (used) return;
      acc += e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      if (Math.abs(acc) >= 30 && go(Math.sign(acc))) used = true;
    }, { passive: false });
    addEventListener("keydown", (e) => {
      if (blocked() || e.altKey || e.ctrlKey || e.metaKey) return;
      const dir = { ArrowDown: 1, PageDown: 1, " ": e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1 }[e.key];
      if (dir) { e.preventDefault(); go(dir); }
    });
    let y0 = null;
    addEventListener("touchstart", (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    addEventListener("touchmove", (e) => { if (!blocked()) e.preventDefault(); }, { passive: false });
    addEventListener("touchend", (e) => { if (y0 === null || blocked()) return; const dy = y0 - e.changedTouches[0].clientY; y0 = null; if (Math.abs(dy) > 40) go(Math.sign(dy)); });
  }

  // copy: fully up while resting on its section, out before the next one comes in
  function choreograph(el, d) {
    const a = 1 - THREE.MathUtils.smoothstep(Math.abs(d), 0.1, 0.42);
    el.style.opacity = a.toFixed(3);
    el.style.visibility = a < 0.002 ? "hidden" : "visible";
    el.style.pointerEvents = a > 0.6 ? "auto" : "none";
    el.style.filter = `blur(${(Math.abs(d) * 18).toFixed(2)}px)`;
    el.style.transform = `translate(-50%, ${(-d * 70).toFixed(1)}px) scale(${(1 + Math.max(0, d) * 0.25).toFixed(3)})`;
  }

  // painted: the scene through the watercolour, then the screens (layer 1) drawn again on top, straight, so the work
  // reads clearly. A depth-only pass of everything solid first, so a screen still hides behind what stands in front of it
  const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false }), hidden = [];
  function paintFrame() {
    composer.render();
    renderer.autoClear = false;
    renderer.clearDepth();
    const bg = scene.background;
    scene.background = null;
    // stars and glows, and the screens themselves: a screen depth-tested against its own depth fights itself (flicker)
    scene.traverseVisible((o) => { if (o.isPoints || o.layers.isEnabled(1) || (o.material && o.material.depthWrite === false)) hidden.push(o); });
    hidden.forEach((o) => (o.visible = false));
    scene.overrideMaterial = depthOnly;
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    hidden.forEach((o) => (o.visible = true));
    camera.layers.set(1);
    renderer.render(scene, camera);
    camera.layers.set(0);
    hidden.length = 0;
    scene.background = bg;
    renderer.autoClear = true;
  }

  let last = performance.now(), flipT = 0;
  const swapT = {}, SWAP = 0.16; // phones: how far round the orbit a mockup slides as the pair swaps (just off screen)
  // an eased follower per key, so steps between rests glide rather than jump
  let dtNow = 0;
  const ease = (key, want) => (swapT[key] = swapT[key] === undefined || reduce ? want : swapT[key] + (want - swapT[key]) * (1 - Math.exp(-dtNow * 6)));
  const pillEls = {};
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.x += (target() - state.x) * (1 - Math.exp(-dt * (reduce ? 60 : 5)));
    const x = state.x, i = Math.floor(x), k = x - i;
    // day on even sections, night on odd ones
    const night = i % 2 === 0 ? k : 1 - k;
    scene.background.copy(DAY).lerp(paint ? PAPER : NIGHT, night); // painted, the night sections are bright paper
    stars.material.opacity = night;
    stars.material.color.setHex(paint ? 0x55535f : 0xe9eaee); // painted, the night is paper: its stars are flecks of ink
    document.body.style.color = `rgb(${ink(night)})`;
    sun.copy(SUN_DAY).lerp(SUN_NIGHT, paint ? 0 : night); // painted, no night side: the planet stays lit
    if (bodyMat.uniforms.uLight) bodyMat.uniforms.uLight.value.copy(sun);
    if (shell) shell.material.uniforms.uLight.value.copy(sun);
    if (bodyMat.uniforms.uTime) bodyMat.uniforms.uTime.value = now / 1000;
    // the planet turns with the sections, plus a slow drift of its own; on arrival it rises into view
    body.rotation.y = x * SPIN + (reduce ? 0 : now / 1000 * 0.004);
    planet.position.set(0, planet.userData.baseY - state.rise * 14, -DIST);
    if (orbitLine) {
      // rebuilt from the planet's edge every frame, so it follows the planet as it rises
      setRing(planet.position, R);
      const end = frontPhi();
      for (let k = 0; k <= ORBIT_N; k++) liftedAt(-end + (2 * end * k) / ORBIT_N, orbitPoint).toArray(orbitPts, k * 3);
      orbitLine.geometry.attributes.position.needsUpdate = true;
      orbitLine.computeLineDistances();
      orbitLine.material.opacity = THREE.MathUtils.lerp(0.4, 0.26, night) * (1 - state.rise);
      orbitLine.material.color.setStyle(`rgb(${ink(night)})`); // in the page's ink, so it reads on pale skies and on paper too
    }
    secs.forEach((el, j) => choreograph(el, x - j - (j === 0 ? -state.rise * 0.6 : 0)));
    dtNow = dt;
    // phones: a section's pills slide out to the left as its mockup comes in (see the satellites below)
    pillJ.forEach((j) => {
      const ul = pillEls[j] || (pillEls[j] = secs[j].querySelector(".case-points"));
      if (!ul) return;
      if (!narrow || !satellites) { ul.style.opacity = ul.style.transform = ul.style.filter = ""; return; }
      const t = ease("pills" + j, THREE.MathUtils.smoothstep(scrollY / (innerHeight * SCREEN) - j, 0.03, PILL_STOP));
      ul.style.opacity = (1 - t).toFixed(3);
      ul.style.transform = `translateX(${(-t * 48).toFixed(1)}px)`;
      ul.style.filter = `blur(${(t * 6).toFixed(2)}px)`;
    });
    // mockups: anchored to the rim, so the spin carries them in from the right and out to the left
    if (monoliths) {
      const placements = shots.map((sh) => {
        const d = x - sh.j, a = 1 - THREE.MathUtils.smoothstep(Math.abs(d), 0.12, 0.62);
        if (a <= 0.002 || (narrow && !sh.first)) return null;
        return { theta: slotAngle[narrow ? "center" : sh.slot] - d * SPIN, a, radius: R + LIFT };
      });
      monoliths.update({ placements, night: paint ? 0 : night, sun, planetPos: planet.position, R });
    } else if (satellites) {
      setRing(planet.position, R);
      // each screen's centre rides the orbit, a little faster than the planet turns, drifting slowly while you read
      const placements = shots.map((sh) => {
        const d = x - sh.j, a = 1 - THREE.MathUtils.smoothstep(Math.abs(d), 0.12, 0.62);
        if (sh.slot === "center" || a <= 0.002) return null;
        let off = 0, k = 1;
        if (narrow) {
          const pair = pairJ.has(sh.j), pills = pillJ.has(sh.j);
          if (!pair && !sh.first) return null;
          // where this section's own scroll is: the first screen slides in from the right as the pills leave (with
          // pills), then a pair's first slides out left as its second comes in from the right, eased between rests
          const fj = scrollY / (innerHeight * SCREEN) - sh.j, ss = THREE.MathUtils.smoothstep;
          const tin = pills ? ease("in" + sh.j, ss(fj, 0.03, PILL_STOP)) : 1;
          const tsw = pair ? ease("sw" + sh.j, pills ? ss(fj, PILL_STOP + 0.02, PAIR2_STOP) : ss(fj, 0.06, SWAP_STOP)) : 0;
          if (sh.first) { off = (1 - tin) * SWAP - tsw * SWAP; k = ss(tin, 0.2, 0.8) * (1 - ss(tsw, 0.2, 0.8)); }
          else { off = (1 - tsw) * SWAP; k = ss(tsw, 0.2, 0.8); }
          if (k <= 0.002) return null;
        }
        const pl = satPlacement(slotAngle[narrow ? "center" : sh.slot] + off - d * SPIN * 1.35 - (reduce ? 0 : Math.sin(now / 1000 * 0.25 + sh.j) * 0.012), a * k);
        // an unfolding Duo opens with your scroll while its section rests: folded as it arrives, open as you settle
        if (sh.slot === "flip") {
          const want = THREE.MathUtils.smoothstep(scrollY / (innerHeight * SCREEN) - sh.j, 0.04, 0.32);
          flipT += (want - flipT) * (reduce ? 1 : 1 - Math.exp(-dt * 6)); // eases between steps rather than jumping
          pl.open = flipT;
        }
        return pl;
      });
      satellites.update({ placements, night: paint ? 0 : night, sun }); // painted, night is bright paper: no night glow
    }
    if (!monoliths && !satellites) setRing(planet.position, R);
    const tocBox = toc.getClientRects().length ? toc.getBoundingClientRect() : null; // null when the list is hidden (phones)
    if (!monoliths) shots.forEach((sh) => {
      if (satellites && sh.slot !== "center") return; // drawn in 3D
      const d = x - sh.j;
      const a = 1 - THREE.MathUtils.smoothstep(Math.abs(d), 0.12, 0.62); // a little longer than the copy, so you see them ride the spin
      const show = a > 0.002 && (!narrow || sh.first);
      sh.el.style.visibility = show ? "visible" : "hidden";
      if (!show) return;
      const slot = narrow ? "center" : sh.slot;
      const theta = slotAngle[slot] - d * SPIN; // the planet turns counter-clockwise as you scroll on
      // it floats above the surface, its upright axis on the planet's own radial line (pointing away from its centre)
      anchor.set(Math.sin(theta) * (R + LIFT), Math.cos(theta) * (R + LIFT), 0).add(planet.position).project(camera);
      const px = (anchor.x + 1) / 2 * innerWidth;
      let py = (1 - anchor.y) / 2 * innerHeight;
      // phones: a monogram rides the orbit line like the mockups, centred on it (it hangs from py, its foot)
      if (narrow && satellites && sh.slot === "center") py += narrowOrbitY + sh.el.offsetHeight / 2 - narrowHorizon;
      // its bottom edge runs parallel to the planet's curve as you see it, at the same point across the screen
      const lean = -THREE.MathUtils.radToDeg(slopeAt(phiAtX(px / innerWidth)));
      // leaning out, its lower outer corner dips; lifted just clear of the section list if it would reach into it, and
      // the mockup opposite by the same amount (measured from its own side), so the pair stays level
      const half = sh.el.offsetWidth / 2, rad = THREE.MathUtils.degToRad(Math.abs(lean));
      if (tocBox && Math.min(px, innerWidth - px) - half * Math.cos(rad) < tocBox.right + 24) py = Math.min(py, tocBox.top - 16 - half * Math.sin(rad));
      sh.el.style.left = `${px.toFixed(1)}px`;
      sh.el.style.top = `${py.toFixed(1)}px`;
      sh.el.style.opacity = a.toFixed(3);
      sh.el.style.pointerEvents = a > 0.6 ? "auto" : "none";
      sh.el.style.filter = `blur(${(Math.abs(d) * 14).toFixed(2)}px)`;
      sh.el.style.transform = `translate(-50%, -100%) rotate(${lean.toFixed(2)}deg)`;
    });
    const s = sections[Math.round(x)];
    const on = Math.round(x);
    indexItems.forEach((li, j) => li && li.classList.toggle("on", j === on));
    wash.uniforms.uTime.value = now / 1000;
    if (paint) paintFrame(); else renderer.render(scene, camera);
    shots.forEach((sh, i) => {
      // the corner of the screen as you see it: from the 3D craft, or the mark's own box
      let rect = null;
      if (satellites && sh.slot !== "center") rect = satellites.rectOf(i, camera);
      else if (sh.slot !== "center" && sh.el.style.visibility === "visible" && +sh.el.style.opacity > 0.6) { const b = (sh.el.querySelector("img") || sh.el).getBoundingClientRect(); rect = { right: b.right, top: b.top, a: +sh.el.style.opacity }; }
      const pin = pins[i];
      if (!rect || !pinMQ.matches || box.classList.contains("on")) { pin.classList.remove("on"); return; }
      pin.classList.add("on");
      pin.style.opacity = Math.min(1, (rect.a - 0.6) / 0.3).toFixed(3);
      pin.style.transform = `translate(${Math.min(innerWidth - 8, rect.right).toFixed(1)}px, ${rect.top.toFixed(1)}px)`;
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  // the mode button: the other look warps in from it (warp-reveal.js); painted planets are lit all round
  themeButton(document.querySelector(".theme"), {
    isPaint: () => paint, reduce,
    apply: (next) => {
      paint = next;
      document.documentElement.classList.toggle("paint", next);
      scene.traverse((o) => [].concat(o.material || []).forEach((m) => { if (m.uniforms && m.uniforms.uEven) m.uniforms.uEven.value = next ? 1 : 0; }));
    },
  });

  // ---------- Arrival: the brand colour from the dive clears, and the planet rises up under the copy
  const veil = document.createElement("div");
  veil.className = "case-veil";
  veil.style.background = p.color;
  document.body.append(veil);
  history.scrollRestoration = "manual"; // a case study always opens on its title
  scrollTo(0, 0);
  if (!reduce) {
    gsap.to(veil, { opacity: 0, duration: 0.8, ease: "power1.out", delay: 0.15 });
    gsap.to(state, { rise: 0, duration: 2.0, ease: "power3.out", delay: 0.1 });
  } else veil.style.opacity = 0;

  // ---------- Leaving: back to the brand colour, which the homepage dives back out of
  document.querySelectorAll(`a[href="index.html#${copy.slug}"]`).forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    gsap.to(veil, { opacity: 1, duration: reduce ? 0.01 : 0.45, ease: "power1.in", onComplete: () => (location.href = a.href) });
  }));
}
