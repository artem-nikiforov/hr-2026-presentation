/* ═══════════════════════════════════════════════════════════════════════
   Звук показа. У каждого акцента два источника: файл audio/sfx/<имя>.mp3
   и запасной синтез. Пока файла нет, звучит синтез — показ не молчит.
   Положили файл — он побеждает, править код не нужно.
   Что искать записями, а что оставить синтезу — в SOUND.md.
   ═══════════════════════════════════════════════════════════════════════ */
(function (root) {
  "use strict";

  const NAMES = ["crunch", "rewind", "beat", "tick", "cricket", "liftoff", "step", "tada",
                 "scratch", "swipe", "nosignal", "handoff", "bricks", "rocket", "sparkle",
                 "cash", "mosaic", "warm"];
  const VOLUME = { crunch: .9, rewind: .5, beat: .35, tick: .3, cricket: .45, liftoff: .5,
                   step: .4, tada: .7, scratch: .6, swipe: .4, nosignal: .45, handoff: .4,
                   bricks: .5, rocket: .5, sparkle: .45, cash: .6, mosaic: .5, warm: .55 };

  let ctx = null, enabled = true;
  const files = new Map();                      /* имя → готовый Audio, если запись нашлась */
  const live = new Set();                       /* всё звучащее — чтобы разом оборвать */
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ── записи ──────────────────────────────────────────────────────── */
  NAMES.forEach(name => {
    const probe = new Audio(`audio/sfx/${name}.mp3`);
    probe.preload = "auto";
    probe.addEventListener("canplaythrough", () => files.set(name, probe), { once: true });
    probe.addEventListener("error", () => {}, { once: true });
  });

  /* ── синтез ──────────────────────────────────────────────────────── */
  function audio() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function track(node, until) {
    live.add(node);
    setTimeout(() => live.delete(node), Math.max(0, until) * 1000 + 80);
  }
  function noise(seconds) {
    const c = audio(), n = Math.floor(c.sampleRate * seconds);
    const buffer = c.createBuffer(1, n, c.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buffer; return src;
  }
  function envelope(node, peak, seconds, delay) {
    const c = audio(), gain = c.createGain(), at = c.currentTime + (delay || 0);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(peak, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, at + seconds);
    node.connect(gain); gain.connect(c.destination);
    track(gain, (delay || 0) + seconds);
    return at;
  }
  function tone(type, from, to, seconds, peak, delay) {
    const osc = audio().createOscillator(); osc.type = type;
    const at = envelope(osc, peak, seconds, delay);
    osc.frequency.setValueAtTime(from, at);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, at + seconds);
    osc.start(at); osc.stop(at + seconds + 0.02);
    track(osc, (delay || 0) + seconds);
  }
  function band(seconds, freq, q, peak, delay) {
    const c = audio(), src = noise(seconds), filter = c.createBiquadFilter();
    filter.type = "bandpass"; filter.frequency.value = freq; filter.Q.value = q;
    src.connect(filter);
    const at = envelope(filter, peak, seconds, delay);
    src.start(at); src.stop(at + seconds + 0.02);
    track(src, (delay || 0) + seconds);
  }
  function sweep(seconds, from, to, peak) {
    const c = audio(), src = noise(seconds), filter = c.createBiquadFilter();
    filter.type = "bandpass"; filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(from, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(to, c.currentTime + seconds);
    src.connect(filter);
    const at = envelope(filter, peak, seconds); src.start(at); src.stop(at + seconds + 0.02);
    track(src, seconds);
  }

  const synth = {
    /* хруст булки — три сухих щелчка подряд */
    crunch() { band(.09, rnd(900, 1400), 1.2, .5); band(.13, rnd(500, 800), 1.6, .4, .10); band(.07, rnd(1600, 2400), 2, .25, .20); },
    /* перемотка плёнки — быстрый подъём вверх */
    rewind() { sweep(.45, 600, 5200, .28); tone("sawtooth", 300, 2600, .4, .06); },
    beat() { tone("sine", rnd(90, 110), 55, .18, .3); band(.05, 3200, 2, .12); },
    tick() { tone("sine", rnd(1100, 1400), null, .05, .14); },
    /* сверчок — две короткие стрекочущие трели */
    cricket() {
      for (let i = 0; i < 2; i++)
        for (let k = 0; k < 5; k++) band(.02, rnd(4200, 4800), 12, .12, i * .5 + k * .035);
    },
    liftoff() { sweep(.7, 300, 3000, .22); tone("sine", 140, 520, .7, .12); },
    step() { tone("sine", rnd(300, 340), rnd(430, 470), .16, .22); band(.05, 1800, 2, .1); },
    /* тадам — восходящее трезвучие */
    tada() { [523, 659, 784, 1047].forEach((f, i) => tone("triangle", f, null, .7 - i * .08, .16, i * .1)); },
    /* скретч пластинки */
    scratch() {
      const c = audio(), osc = c.createOscillator(); osc.type = "sawtooth";
      const at = envelope(osc, .2, .34);
      osc.frequency.setValueAtTime(rnd(700, 900), at);
      osc.frequency.linearRampToValueAtTime(120, at + .18);
      osc.frequency.linearRampToValueAtTime(420, at + .26);
      osc.frequency.linearRampToValueAtTime(90, at + .34);
      osc.start(at); osc.stop(at + .36); track(osc, .36);
    },
    swipe() { sweep(.26, 2600, 700, .2); },
    nosignal() { tone("square", 420, 300, .1, .08); tone("square", 300, 220, .14, .08, .13); },
    handoff() { tone("sine", 520, 780, .3, .13); tone("sine", 780, null, .35, .09, .12); },
    bricks() { for (let i = 0; i < 3; i++) { band(.11, rnd(180, 260), 1.1, .3, i * .17); tone("sine", rnd(120, 150), 70, .2, .13, i * .17); } },
    rocket() { sweep(.9, 200, 4200, .24); tone("sine", 110, 700, .9, .1); },
    sparkle() { for (let i = 0; i < 5; i++) tone("sine", rnd(1800, 3600), null, .18, .07, i * .07); },
    cash() { tone("sine", 1250, null, .16, .13); tone("sine", 1720, null, .3, .11, .05); band(.06, 3000, 2, .1, .02); },
    mosaic() { for (let i = 0; i < 8; i++) tone("triangle", rnd(600, 1400), null, .22, .06, i * .09); },
    warm() { [392, 494, 587, 784].forEach((f, i) => tone("sine", f, null, 1.6, .1, i * .18)); }
  };

  /* ── музыкальная подложка ────────────────────────────────────────
     Сценарий ведёт музыку через весь показ и обрывает её на «НО…».
     Файла нет — показ просто идёт без подложки. ─────────────────── */
  const music = { el: null, name: null, fade: null };
  function fadeTo(el, target, seconds, done) {
    clearInterval(music.fade);
    const step = 40, delta = (target - el.volume) / (seconds * 1000 / step);
    music.fade = setInterval(() => {
      const next = el.volume + delta;
      if ((delta > 0 && next >= target) || (delta < 0 && next <= target)) {
        el.volume = Math.max(0, Math.min(1, target));
        clearInterval(music.fade);
        if (done) done();
      } else el.volume = Math.max(0, Math.min(1, next));
    }, step);
  }
  function stopMusic(hard) {
    const el = music.el;
    if (!el) return;
    music.el = null; music.name = null;
    clearInterval(music.fade);
    if (hard) { try { el.pause(); } catch (e) {} return; }   /* обрыв по сценарию */
    fadeTo(el, 0, .9, () => { try { el.pause(); } catch (e) {} });
  }
  function playMusic(name, level) {
    if (music.name === name) return;
    stopMusic(false);
    const el = new Audio(`audio/music/${name}.mp3`);
    el.loop = true; el.volume = 0;
    el.addEventListener("error", () => { if (music.el === el) { music.el = null; music.name = null; } }, { once: true });
    el.play().then(() => fadeTo(el, level ?? .28, 1.4)).catch(() => {});
    music.el = el; music.name = name;
  }

  root.KUSound = {
    /* Музыка сцены: имя — включить, null — оборвать, undefined — не трогать. */
    music(name, level) {
      if (!enabled) return;
      if (name === null) stopMusic(true);
      else if (name) playMusic(name, level);
    },
    duck(on) { if (music.el) fadeTo(music.el, on ? .12 : .28, .5); },
    play(name) {
      if (!enabled || !name) return;
      const record = files.get(name);
      if (record) {
        const copy = record.cloneNode();
        copy.volume = VOLUME[name] ?? .6;
        copy.play().catch(() => {});
        live.add(copy);
        copy.addEventListener("ended", () => live.delete(copy), { once: true });
        return;
      }
      if (synth[name]) { try { synth[name](); } catch (e) { /* звук не критичен */ } }
    },
    /* Обрыв: на паузе и при быстром переходе хвосты не должны доигрывать. */
    stop() {
      live.forEach(node => {
        try { node.pause ? node.pause() : node.disconnect(); } catch (e) {}
      });
      live.clear();
    },
    set(on) { enabled = on; if (!on) { this.stop(); stopMusic(true); } else this.warm(); },
    warm() { try { audio(); } catch (e) {} }
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
