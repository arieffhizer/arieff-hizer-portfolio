// The opening. On a first visit: a photosensitivity notice on warm white paper, then the paper brightens to white and
// a line arrives word by word, and its letters scatter outward like stars as the speed builds; a whiteout, and the
// ride begins at superspeed into the usual arrival. The notice shows once (index.html?intro shows it again); the line
// plays on every arrival at the start, so every return home (your name, top left, or the end of the ride) passes
// through it too.
// With reduced motion: the notice, the line appearing simply, then a fade.
const SEEN = "v2-intro-seen";
const LINE = "Crafting Brand Triumph Through Design";
const LINES = ["Crafting brand triumph", "Through Design"]; // two deliberate lines, no lone last word
const DISPLAY = ["brand", "triumph"]; // set in the hero name's typeface, italic, each word capitalised

export function playIntro({ reduce }) {
  let seen = false;
  try { seen = localStorage.getItem(SEEN) === "1"; } catch {}
  const notice = !seen || new URLSearchParams(location.search).has("intro");

  // every letter its own span (for the scatter), every word a unit that rises in
  const words = LINES.map((l) => `<span class="intro-row">${l.split(" ").map((w) => `<span class="intro-word${DISPLAY.includes(w) ? " display" : ""}"><span>${[...(DISPLAY.includes(w) ? w[0].toUpperCase() + w.slice(1) : w)].map((ch) => `<span class="intro-char">${ch}</span>`).join("")}</span></span>`).join(" ")}</span>`).join("");
  const el = document.createElement("div");
  el.className = "intro";
  el.innerHTML = `
    <div class="intro-paper"></div>
    <div class="intro-white"></div>
    <h2 class="intro-line" aria-label="${LINE}">${words}</h2>
    ${notice ? `<div class="intro-notice" role="dialog" aria-labelledby="intro-notice-title">
      <p class="intro-label" id="intro-notice-title">Photosensitivity notice</p>
      <p class="intro-text">This site uses bright light, fast motion and brief flashes. A very small number of people may experience discomfort, or in rare cases seizures, when exposed to certain light patterns, even with no history of epilepsy.</p>
      <p class="intro-text">If you feel dizzy, disoriented or unwell, look away and stop viewing. Your device's reduce-motion setting turns most effects off.</p>
    </div>` : ""}
    <div class="intro-flash"></div>`;
  document.body.append(el);
  document.documentElement.classList.add("intro-cover"); // the page underneath need not draw while it is hidden
  const $ = (s) => el.querySelector(s), $$ = (s) => [...el.querySelectorAll(s)];
  const inner = $$(".intro-word > span"), chars = $$(".intro-char"), line = $(".intro-line");

  return new Promise((resolve) => {
    let tl, done = false;
    const finish = () => {
      if (done) return;
      done = true;
      document.documentElement.classList.remove("intro-cover");
      try { localStorage.setItem(SEEN, "1"); } catch {}
      if (tl) tl.kill();
      gsap.to(el, { opacity: 0, duration: 0.6, ease: "power1.out", onComplete: () => el.remove() });
      resolve({ played: true });
    };

    // everything that will move is on its own GPU layer from the start and stays there (force3D: true): GSAP otherwise
    // drops a finished tween back to a flat transform, and a letter first given a transform or blur when the scatter
    // begins is re-rasterised. Either way the text snaps by a subpixel, a visible twitch just before it breaks up
    gsap.set(inner, { yPercent: reduce ? 0 : 28, opacity: 0, filter: reduce ? "none" : "blur(8px)", force3D: true }); // a short rise into focus, nothing clipping it
    gsap.set(line, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: reduce ? 1 : 0.985, force3D: true }); // centred in percent, so it stays centred while it scales
    if (!reduce) gsap.set(chars, { x: 0, y: 0, rotation: 0, scale: 1, filter: "blur(0px)", force3D: true });
    if (notice) {
      // centred by percent too: GSAP owns this transform, and a pixel offset alone would drop the CSS centring
      gsap.set($(".intro-notice"), { xPercent: -50, yPercent: -50, x: 0, y: 10, opacity: 0 });
      gsap.to($(".intro-notice"), { y: 0, opacity: 1, duration: 0.8, ease: "expo.out", delay: 0.2 });
    } else {
      // no notice: straight to white, the screen fading up over whatever was there
      gsap.set($(".intro-white"), { opacity: 1 });
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.out" });
    }

    const begin = () => {
      tl = gsap.timeline({ onComplete: () => finish() });
      if (notice) {
        gsap.killTweensOf($(".intro-notice"));
        // the notice leaves faster than it came (exits are quicker than entries), the paper brightens underneath
        tl.to($(".intro-notice"), { opacity: 0, y: -6, duration: 0.26, ease: "power2.out" })
          .to($(".intro-white"), { opacity: 1, duration: 0.5, ease: "power2.out" }, "<");
      }
      if (reduce) {
        // reduced motion: gentler, not none. The line simply fades in, holds, and the page fades up
        tl.to(inner, { opacity: 1, duration: 0.4, ease: "power1.out" }).to({}, { duration: 1.4 });
        return;
      }
      // where each letter heads as the line breaks up: outward from the line's centre, a little up or down
      const box = line.getBoundingClientRect(), cx = box.left + box.width / 2, cy = box.top + box.height / 2;
      const away = chars.map((c) => {
        const r = c.getBoundingClientRect(), dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
        return { x: dx * 0.55 + gsap.utils.random(-24, 24), y: dy * 0.8 + gsap.utils.random(-46, 46), rotation: gsap.utils.random(-25, 25), d: Math.hypot(dx, dy * 1.6) };
      });
      const far = Math.max(...away.map((a) => a.d)) || 1; // the break starts at the line's centre and spreads outward
      tl
        // the line arrives word by word, each rising a little and coming into focus
        .to(inner, { yPercent: 0, opacity: 1, filter: "blur(0px)", duration: 0.9, ease: "expo.out", stagger: 0.06, force3D: true }, notice ? "-=0.2" : 0.15)
        .to(line, { scale: 1, duration: 1.6, ease: "expo.out", force3D: true }, "<") // a slow settle, by transform only
        .to({}, { duration: 1.0 }) // long enough to read five words
        // the speed builds: the letters come loose and scatter outward like stars, shrinking and fading as they go.
        // An ease-in, because it is the ship accelerating, not the interface answering you
        .to(chars, {
          x: (i) => away[i].x, y: (i) => away[i].y, rotation: (i) => away[i].rotation, scale: 0.4, opacity: 0, filter: "blur(4px)",
          duration: 0.75, ease: "power3.in", stagger: (i) => (away[i].d / far) * 0.38, force3D: true,
        })
        // whiteout; behind it the page starts drawing again, at superspeed
        .to($(".intro-flash"), { opacity: 1, duration: 0.35, ease: "power2.in" }, "-=0.3")
        .add(() => document.documentElement.classList.remove("intro-cover"));
    };
    if (notice) setTimeout(begin, 6000); // time to read the notice, then the line
    else begin();
  });
}
