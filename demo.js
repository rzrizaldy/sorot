// Sorot's landing page: a deck you scroll, one idea per screen.
// The notch demos replay the app: the same curtain curves as the notch shell
// (widen, then drop with a soft spring) and the same behaviour as the prompter
// (it moves while the voice is live and waits when it stops).
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeInCubic = (x) => x * x * x;
  const spring = (x) => (x >= 1 ? 1 : 1 - Math.exp(-7 * x) * Math.cos(8 * x));

  const replaceAddress = History.prototype.replaceState.bind(history);

  // ───────────────────────── Deck ─────────────────────────
  const deck = document.getElementById("deck");
  const slides = [...deck.querySelectorAll(".slide")];
  const rail = document.getElementById("rail");
  const count = document.getElementById("count");
  const next = document.getElementById("next");
  const navLinks = [...document.querySelectorAll(".nav nav a")];
  const scenes = new Map(); // slide → { enter, leave }
  let current = -1;

  const dots = slides.map((slide, i) => {
    const b = rail.appendChild(document.createElement("button"));
    b.setAttribute("aria-label", `${i + 1}. ${slide.dataset.title}`);
    b.title = slide.dataset.title;
    if (slide.classList.contains("vice")) b.classList.add("vice");
    b.addEventListener("click", () => go(i));
    return b;
  });

  function go(i) {
    const target = slides[Math.max(0, Math.min(slides.length - 1, i))];
    deck.scrollTo({ top: target.offsetTop, behavior: reduce ? "auto" : "smooth" });
  }

  function activate(i) {
    if (i === current) return;
    if (current >= 0) {
      slides[current].classList.remove("active");
      scenes.get(slides[current])?.leave();
    }
    current = i;
    const slide = slides[i];
    slide.classList.add("active");
    dots.forEach((d, k) => d.classList.toggle("on", k === i));
    if (count) count.textContent = `${i + 1} / ${slides.length}`;
    next.classList.toggle("end", i === slides.length - 1);
    next.setAttribute("aria-label", i === slides.length - 1 ? "Back to the top" : "Next slide");
    navLinks.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === `#${slide.id}`));
    // Keep ?utm_… in the address: analytics reads the campaign from it.
    if (location.hash !== `#${slide.id}`) replaceAddress(null, "", location.pathname + location.search + (i === 0 ? "" : `#${slide.id}`));
    if (i > 0) window.sorotTrack?.("slide_view", { slide: slide.id, n: i + 1 });
    scenes.get(slide)?.enter();
  }

  // The slide that fills most of the screen is the current one.
  // Measured against the screen, not the slide, so a slide taller than the
  // window (a short laptop screen) still becomes current when it fills it.
  const watcher = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const screen = e.rootBounds?.height || innerHeight;
      if (e.isIntersecting && e.intersectionRect.height >= screen * 0.5) activate(slides.indexOf(e.target));
    }
  }, { root: deck, threshold: Array.from({ length: 21 }, (_, i) => i / 20) });
  slides.forEach((s) => watcher.observe(s));

  next.addEventListener("click", () => go(current === slides.length - 1 ? 0 : current + 1));
  document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const i = slides.findIndex((s) => `#${s.id}` === a.getAttribute("href"));
    if (i >= 0) { e.preventDefault(); go(i); }
  }));
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    if (["ArrowDown", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(current + 1); }
    if (["ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); go(current - 1); }
    if (e.key === "Home") go(0);
    if (e.key === "End") go(slides.length - 1);
  });

  // ───────────────────────── Notch demo ─────────────────────────
  const NW = 186, NH = 34, CW = 540, CH = 196, EAR = 10, RADIUS = 24, BOX = 560;

  function shape(W, H) {
    const p = clamp((H - NH) / 40);
    const e = EAR * p;
    const r = Math.min((W - 2 * e) / 2, H / 2, lerp(NH * 0.3, RADIUS, p));
    const x0 = (BOX - (W + 2 * e)) / 2, x1 = x0 + W + 2 * e;
    const f = (n) => n.toFixed(2);
    return `path("M${f(x0)} 0 L${f(x1)} 0 C${f(x1 - e * 0.45)} 0 ${f(x1 - e)} ${f(e * 0.45)} ${f(x1 - e)} ${f(e)} ` +
      `L${f(x1 - e)} ${f(H - r)} Q${f(x1 - e)} ${f(H)} ${f(x1 - e - r)} ${f(H)} L${f(x0 + e + r)} ${f(H)} ` +
      `Q${f(x0 + e)} ${f(H)} ${f(x0 + e)} ${f(H - r)} L${f(x0 + e)} ${f(e)} C${f(x0 + e)} ${f(e * 0.45)} ${f(x0 + e * 0.45)} 0 ${f(x0)} 0 Z")`;
  }

  const SCRIPT = [
    "[Slide 1: Open (40s)]", "\n", "Thanks for being here. I'm going to keep this short.", "\n",
    "For years I read my talks off a second screen, and my eyes kept drifting away from the people I was talking to.", "\n",
    "So we put the script where the camera is.", "[pause]", "It moves only when you say the words.",
    "Stop to breathe, take a question, and it waits for you, exactly where you left off.",
  ];
  const BEATS = [
    { read: 10 }, { wait: 1900, label: "you stop to breathe · it waits" },
    { read: 21 }, { adlib: 2600, label: "you go off-script · it waits" },
    { read: 9 }, { wait: 1500, label: "[pause] · it waits" },
    { read: 24 },
  ];
  // Original lines, written for this demo, with their times in seconds.
  const SONG = [
    [0.0, "Headlights on the empty road"],
    [3.2, "Radio low, the city glows"],
    [6.4, "Every word I never said"],
    [9.4, "Lights up right above my head"],
    [12.6, "Turn it up, the night is ours"],
    [15.6, "Singing back to all the stars"],
    [18.8, "One more time, you know the part"],
    [21.8, "Right on time, straight from the heart"],
  ];
  const HEARD = [
    "So the short answer is yes, we can ship it this quarter.",
    "The longer answer depends on how the pilot goes in Jakarta next week.",
    "If the numbers hold, we roll it out to everyone in March.",
  ];

  function makeDemo(root) {
    const kind = root.dataset.demo;
    const wrap = root.querySelector(".notch-wrap");
    const card = root.querySelector(".card");
    const el = Object.fromEntries([...root.querySelectorAll("[data-el]")].map((n) => [n.dataset.el, n]));
    const bars = Array.from({ length: 34 }, () => el.wave.appendChild(document.createElement("i")));
    let run = 0; // bumped on every enter/leave; a stale scene sees it and stops
    let speaking = false, scrollTarget = 0, scrollY = 0, last = 0, raf = 0;

    const setShape = (W, H) => { wrap.style.clipPath = shape(W, H); };
    const alive = (id) => id === run;
    const sleep = (ms, id) => new Promise((resolve, reject) => setTimeout(() => (alive(id) ? resolve() : reject(new Error("left"))), reduce ? 0 : ms));
    const animate = (ms, id, step) => new Promise((resolve, reject) => {
      const start = performance.now();
      const frame = (now) => {
        if (!alive(id)) return reject(new Error("left"));
        const x = clamp((now - start) / (reduce ? 1 : ms));
        step(x);
        x < 1 ? requestAnimationFrame(frame) : resolve();
      };
      requestAnimationFrame(frame);
    });
    const open = (id) => animate(620, id, (x) => {
      setShape(lerp(NW, CW, easeOutCubic(clamp(x / 0.42))), Math.max(NH, lerp(NH, CH, spring(clamp((x - 0.12) / 0.88)))));
      card.style.opacity = clamp((x - 0.35) / 0.4);
    });
    const close = (id) => animate(500, id, (x) => {
      card.style.opacity = 1 - clamp(x / 0.22);
      setShape(lerp(CW, NW, easeInCubic(clamp((x - 0.45) / 0.55))), lerp(CH, NH, easeInOutCubic(clamp(x / 0.72))));
    });

    function state({ status, live, voice, label }) {
      if (status !== undefined) el.status.textContent = status;
      if (live !== undefined) { el.dot.classList.toggle("live", live); el.play.classList.toggle("on", live); }
      if (voice !== undefined) { speaking = voice; el.dot.classList.toggle("voice", voice); wrap.style.setProperty("--glow", voice ? 1 : 0.7); }
      if (label !== undefined) el.label.textContent = label;
    }

    function loop(now) {
      const dt = Math.min(0.1, (now - (last || now)) / 1000);
      last = now;
      scrollY += (scrollTarget - scrollY) * (1 - Math.exp(-dt * 9));
      el.flow.style.transform = `translateY(${-scrollY.toFixed(2)}px)`;
      const t = now / 1000;
      if (kind === "music") {
        const beat = t * 118 / 60;
        const kick = speaking ? Math.pow(Math.max(0, Math.cos(beat * 2 * Math.PI)), 6) * 0.6 + 0.35 : 0.05;
        const wave = (amp, freq, speed, off) => {
          let d = "M0 36";
          for (let x = 0; x <= 540; x += 12) {
            const u = x / 540, env = Math.pow(Math.sin(u * Math.PI), 0.8);
            const v = 0.5 + 0.5 * Math.sin(u * freq * 2 * Math.PI + t * speed + off);
            d += ` L${x} ${(36 - amp * kick * env * (0.35 + 0.65 * v)).toFixed(1)}`;
          }
          return d + " L540 36 Z";
        };
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 540 36' preserveAspectRatio='none'>` +
          `<path d='${wave(30, 1.6, 2.2, 0)}' fill='%234d6bff' fill-opacity='0.6'/>` +
          `<path d='${wave(24, 2.5, -2.9, 1.7)}' fill='%23ff4d9d' fill-opacity='0.55'/>` +
          `<path d='${wave(14, 3.7, 3.6, 3.4)}' fill='%23d7ff4f' fill-opacity='0.35'/></svg>`;
        wrap.style.setProperty("--mwave", `url("data:image/svg+xml;utf8,${svg}") bottom / 100% 100% no-repeat`);
      }
      bars.forEach((b, i) => {
        const energy = speaking ? 0.35 + 0.65 * Math.abs(Math.sin(t * 7.3 + i * 0.9) * Math.sin(t * 3.1 + i * 0.37)) : 0.02;
        b.style.height = `${4 + 32 * energy * (0.35 + 0.65 * Math.sin((i / (bars.length - 1)) * Math.PI))}px`;
        b.style.background = !speaking ? "rgba(23,34,45,0.22)" : kind === "listen" ? `hsl(${275 + 95 * (i / bars.length)} 95% 68%)` : kind === "music" ? `hsl(${330 - 100 * (i / bars.length)} 95% 66%)` : "#e0901f";
      });
      raf = requestAnimationFrame(loop);
    }

    function buildScript() {
      el.flow.textContent = "";
      const words = [];
      for (const part of SCRIPT) {
        if (part === "\n") { el.flow.appendChild(document.createElement("br")).className = "para"; continue; }
        const cue = part.startsWith("[");
        for (const word of (cue ? part.slice(1, -1) : part).split(" ")) {
          const s = document.createElement("span");
          s.textContent = word;
          if (cue) s.className = "cue";
          el.flow.append(s, " ");
          if (!cue) words.push(s);
        }
      }
      return words;
    }

    async function prompter(id) {
      for (;;) {
        state({ status: "Paused", live: false, voice: false, label: "your voice" });
        const words = buildScript();
        scrollTarget = scrollY = 0;
        el.bar.style.width = "0%";
        el.time.textContent = "0:40";
        el.time.classList.remove("warn");
        await sleep(500, id);
        await open(id);
        await sleep(600, id);
        const started = performance.now();
        const ticker = setInterval(() => {
          if (!alive(id)) return clearInterval(ticker);
          const left = Math.max(0, 40 - Math.floor((performance.now() - started) / 1000));
          el.time.textContent = `0:${String(left).padStart(2, "0")}`;
          el.time.classList.toggle("warn", left <= 8);
        }, 250);
        try {
          let at = 0;
          for (const beat of BEATS) {
            if (beat.read) {
              state({ status: "Following", live: true, voice: true, label: "you're speaking · it follows" });
              for (let i = 0; i < beat.read && at < words.length; i++, at++) {
                const w = words[at];
                w.classList.add("said");
                for (let p = w.previousElementSibling; p && (p.classList.contains("cue") || p.tagName === "BR"); p = p.previousElementSibling) p.classList.add("said");
                scrollTarget = Math.max(0, w.offsetTop - 31);
                el.bar.style.width = `${(100 * (at + 1)) / words.length}%`;
                await sleep(230 + Math.min(260, w.textContent.length * 22) + (/[.,:]$/.test(w.textContent) ? 170 : 0), id);
              }
            } else {
              state({ status: "Waiting for you", voice: beat.adlib !== undefined, label: beat.label });
              await sleep(beat.wait ?? beat.adlib, id);
            }
          }
        } finally { clearInterval(ticker); }
        state({ status: "Done", voice: false, label: "done" });
        await sleep(1500, id);
        state({ live: false });
        await close(id);
        await sleep(700, id);
      }
    }

    async function listen(id) {
      for (;;) {
        state({ status: "Listening", live: false, voice: false, label: "someone else's voice" });
        el.flow.textContent = "";
        scrollTarget = scrollY = 0;
        await sleep(500, id);
        await open(id);
        state({ live: true });
        await sleep(600, id);
        for (const sentence of HEARD) {
          state({ status: "Hearing", voice: true, label: "they're speaking · captions appear" });
          const fresh = [];
          for (const word of sentence.split(" ")) {
            const s = document.createElement("span");
            s.textContent = word;
            s.className = "guess new";
            el.flow.append(s, " ");
            fresh.push(s);
            requestAnimationFrame(() => s.classList.remove("new"));
            scrollTarget = Math.max(0, el.flow.offsetHeight - 95);
            await sleep(150 + Math.min(200, word.length * 18), id);
          }
          fresh.forEach((s) => s.classList.remove("guess")); // the recogniser commits
          state({ status: "Listening", voice: false, label: "a pause · the line settles" });
          await sleep(1100, id);
        }
        await sleep(1300, id);
        state({ live: false });
        await close(id);
        await sleep(700, id);
      }
    }

    async function music(id) {
      for (;;) {
        state({ status: "Paused", live: false, voice: false, label: "turn it up" });
        el.flow.textContent = "";
        const lines = SONG.map(([, text]) => {
          const d = document.createElement("span");
          d.className = "k-line";
          d.textContent = text;
          el.flow.appendChild(d);
          return d;
        });
        scrollTarget = scrollY = -31; // the first line starts in the middle row
        el.time.textContent = "0:00 / 3:12";
        await sleep(500, id);
        await open(id);
        await sleep(500, id);
        state({ status: "Spotify", live: true, voice: true, label: "it plays · you sing" });
        const start = performance.now();
        const end = SONG[SONG.length - 1][0] + 3.2;
        await new Promise((resolve, reject) => {
          const frame = (now) => {
            if (!alive(id)) return reject(new Error("left"));
            const t = (now - start) / 1000;
            let i = -1;
            for (let k = 0; k < SONG.length; k++) if (SONG[k][0] <= t) i = k;
            lines.forEach((d, k) => {
              d.classList.toggle("now", k === i);
              d.classList.toggle("past", k < i);
            });
            if (i >= 0) {
              const next = i + 1 < SONG.length ? SONG[i + 1][0] : SONG[i][0] + 3.2;
              const p = Math.max(0, Math.min(1, (t - SONG[i][0]) / ((next - SONG[i][0]) * 0.85)));
              lines[i].style.setProperty("--p", `${(p * 100).toFixed(1)}%`);
              scrollTarget = (i - 1) * 31;
            }
            const secs = Math.floor(t + 41);
            el.time.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")} / 3:12`;
            t < end ? requestAnimationFrame(frame) : resolve();
          };
          requestAnimationFrame(frame);
        });
        state({ status: "Paused", voice: false, live: false, label: "encore?" });
        await sleep(1400, id);
        await close(id);
        await sleep(700, id);
      }
    }

    setShape(NW, NH);
    return {
      enter() {
        const id = ++run;
        last = 0;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
        if (reduce) {
          // No motion: the open card, mid-sentence.
          setShape(CW, CH);
          card.style.opacity = 1;
          if (kind === "prompter") {
            buildScript().slice(0, 10).forEach((w) => w.classList.add("said"));
            state({ status: "Waiting for you", live: true, voice: false, label: "it waits while you're quiet" });
          } else if (kind === "music") {
            el.flow.innerHTML = SONG.slice(0, 3).map(([, t], k) => `<span class="k-line${k === 1 ? " now" : k === 0 ? " past" : ""}" style="--p:60%">${t}</span>`).join("");
            state({ status: "Spotify", live: true, voice: false, label: "every line lights up" });
          } else {
            el.flow.textContent = HEARD[0];
            state({ status: "Listening", live: true, voice: false, label: "captions, as they speak" });
          }
          return;
        }
        (kind === "prompter" ? prompter(id) : kind === "music" ? music(id) : listen(id)).catch(() => {});
      },
      leave() {
        run++;
        cancelAnimationFrame(raf);
        speaking = false;
        card.style.opacity = 0;
        setShape(NW, NH);
      },
    };
  }

  document.querySelectorAll(".demo").forEach((root) => scenes.set(root.closest(".slide"), makeDemo(root)));

  // ───────────────────────── Small scenes ─────────────────────────
  // "It follows you": three strips of words acting out the behaviour.
  (() => {
    const slide = document.getElementById("follow");
    let timer;
    scenes.set(slide, {
      enter() {
        const strips = Object.fromEntries([...slide.querySelectorAll(".strip")].map((s) => [s.dataset.strip, s]));
        const words = (s) => [...s.querySelectorAll("span")];
        let tick = 0;
        const step = () => {
          const f = words(strips.follow), fi = tick % (f.length + 2);
          f.forEach((w, i) => w.classList.toggle("said", i < fi));
          const w = words(strips.wait), wi = tick % 10;
          w.forEach((x, i) => x.classList.toggle("said", wi < 4 ? i < wi : true));
          strips.wait.classList.toggle("waiting", wi >= 4);
          const j = words(strips.jump), order = [0, 1, 3, 4, 4, 1, 2, 3, 4, 4], here = order[tick % order.length];
          j.forEach((x, i) => { x.classList.toggle("said", i < here); x.classList.toggle("here", i === here); });
          tick++;
        };
        step();
        if (!reduce) timer = setInterval(step, 620);
      },
      leave() { clearInterval(timer); },
    });
  })();

  // "Time and points": a countdown turning amber, points ticking off.
  (() => {
    const slide = document.getElementById("time");
    const num = document.getElementById("clockNum");
    const points = [...document.querySelectorAll("#points li")];
    let timer;
    scenes.set(slide, {
      enter() {
        let left = 40;
        const paint = () => {
          num.textContent = `0:${String(left).padStart(2, "0")}`;
          num.classList.toggle("warn", left <= 8);
          points.forEach((p, i) => p.classList.toggle("done", left <= [30, 18, 4][i]));
        };
        paint();
        if (reduce) { left = 12; return paint(); }
        timer = setInterval(() => { left = left <= 0 ? 40 : left - 1; paint(); }, 260);
      },
      leave() { clearInterval(timer); },
    });
  })();

  // ───────────────────────── Theme: Light, Dark, Colorful ─────────────────────────
  const themeColors = { light: "#e6edf2", dark: "#0f141a", colorful: "#dbe7e2" };
  const themeButtons = [...document.querySelectorAll(".themes button")];
  function setTheme(theme, save) {
    document.documentElement.dataset.theme = theme;
    themeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.theme === theme)));
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColors[theme]);
    if (save) try { localStorage.setItem("sorot-theme", theme); } catch {}
  }
  themeButtons.forEach((b) => b.addEventListener("click", () => setTheme(b.dataset.theme, true)));
  setTheme(document.documentElement.dataset.theme || "light", false);

  // ───────────────────────── The logo's eyes ─────────────────────────
  // The pupils follow the pointer, blink now and then, and the whole word hops
  // when you touch it: squash, stretch, land.
  const logos = [...document.querySelectorAll(".logo")];
  const pupils = [...document.querySelectorAll(".logo .pupil")];
  if (!reduce) {
    let px = innerWidth / 2, py = innerHeight * 0.2, queued = false;
    const look = () => {
      queued = false;
      for (const p of pupils) {
        const lens = p.parentElement.getBoundingClientRect();
        const cx = lens.left + lens.width / 2, cy = lens.top + lens.height / 2;
        const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1;
        const reach = lens.width * 0.2 * Math.min(1, d / 160);
        p.style.transform = `translate(${(dx / d) * reach}px, ${(dy / d) * reach}px)`;
      }
    };
    addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; if (!queued) { queued = true; requestAnimationFrame(look); } }, { passive: true });
    deck.addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(look); } }, { passive: true });
    look();
    const blink = (logo) => { logo.classList.remove("blink"); void logo.offsetWidth; logo.classList.add("blink"); };
    (function blinkLater() {
      setTimeout(() => { logos.forEach(blink); if (Math.random() < 0.3) setTimeout(() => logos.forEach(blink), 280); blinkLater(); }, 2600 + Math.random() * 3200);
    })();
    const hop = (logo) => { logo.classList.remove("hop", "enter"); void logo.offsetWidth; logo.classList.add("hop"); };
    logos.forEach((logo) => logo.addEventListener("pointerenter", () => hop(logo)));
    // The big one drops in on arrival.
    document.querySelectorAll(".logo.big").forEach((logo) => logo.classList.add("enter"));
  }

  // Fit the 560-pt card to narrow screens.
  function fit() {
    const width = Math.min(820, document.documentElement.clientWidth - 60);
    document.documentElement.style.setProperty("--scale", Math.min(1, (width - 16) / (BOX + 24)).toFixed(3));
  }
  addEventListener("resize", fit);
  fit();

  document.querySelectorAll(".copy").forEach((button) => button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Select & copy";
    }
    setTimeout(() => (button.textContent = "Copy"), 1400);
  }));

  // The latest build and its checksum, written by the publish script.
  fetch("latest.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((latest) => {
    if (!latest) return;
    const mb = (latest.bytes / 1e6).toFixed(1);
    document.getElementById("latest").textContent = `Version ${latest.version} · ${latest.file} · ${mb} MB · macOS 26+ · Apple silicon`;
    const link = document.getElementById("sumLink");
    link.href = `https://github.com/rzrizaldy/sorot/releases/tag/v${latest.version}`;
    link.title = `SHA-256 ${latest.sha256}`;
  }).catch(() => {});

  // Arrive on the slide the address asks for.
  const wanted = slides.findIndex((s) => `#${s.id}` === location.hash);
  if (wanted > 0) deck.scrollTo({ top: slides[wanted].offsetTop, behavior: "auto" });
  else activate(0);
})();
