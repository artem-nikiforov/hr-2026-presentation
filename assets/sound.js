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
                 "cash", "mosaic", "warm", "snap"];
  const VOLUME = { crunch: .9, rewind: .5, beat: .35, tick: .3, cricket: .45, liftoff: .5,
                   step: .4, tada: .7, scratch: .6, swipe: .4, nosignal: .45, handoff: .4,
                   bricks: .5, rocket: .5, sparkle: .45, cash: .6, mosaic: .5, warm: .55,
                   snap: .8 };

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
     Одна сквозная дорожка играет весь показ. Сценарий обрывает её там,
     где сказано «музыка обрывается», и возвращает потом с того же места.
     Пауза показа тоже ставит музыку на паузу. Дополнительные дорожки
     необязательны: если файла нет, продолжает играть основная.
     ───────────────────────────────────────────────────────────────── */
  const TRACKS = ["bed", "epic", "confident", "warm"];
  /* Громкость подложки. LEVEL — базовый баланс дорожек между собой,
     DUCK — во сколько раз музыка уходит вниз под закадровым голосом.
     Общий уровень в зале крутится прямо на показе клавишами [ и ],
     без правки кода: множитель хранится в браузере. */
  const LEVEL = { bed: .40, epic: .44, confident: .40, warm: .42 };
  const DUCK = .38;
  const GAIN_KEY = "ku-music-gain";
  const DEFAULT_GAIN = .6;               /* подобрано на репетиции */

  const music = {
    el: null,          /* что играет сейчас */
    name: null,
    fade: null,
    byScript: false,   /* оборвано режиссурой — само не вернётся */
    byShow: false,     /* показ на паузе */
    pending: null,     /* дорожка, которую попросили до того, как она догрузилась */
    ducked: false,
    ready: new Set()   /* какие дорожки реально лежат в папке */
  };

  TRACKS.forEach(name => {
    const probe = new Audio(`audio/music/${name}.mp3`);
    probe.preload = "auto";
    probe.addEventListener("canplaythrough", () => {
      music.ready.add(name);
      /* Показ мог начаться раньше, чем дорожка догрузилась — заводим сейчас. */
      if (music.pending === name && !music.el && !music.byScript) {
        music.pending = null;
        start(name, 1.6);
      }
    }, { once: true });
    probe.addEventListener("error", () => { if (music.pending === name) music.pending = null; }, { once: true });
  });

  function readGain() {
    try {
      const saved = parseFloat(localStorage.getItem(GAIN_KEY));
      return Number.isFinite(saved) ? Math.min(2.5, Math.max(.1, saved)) : DEFAULT_GAIN;
    } catch (e) { return DEFAULT_GAIN; }
  }
  let gain = readGain();

  function level(name) {
    return Math.min(1, (LEVEL[name] ?? .40) * gain * (music.ducked ? DUCK : 1));
  }

  function fadeTo(el, target, seconds, done) {
    clearInterval(music.fade);
    const step = 40, steps = Math.max(1, seconds * 1000 / step);
    const delta = (target - el.volume) / steps;
    music.fade = setInterval(() => {
      const next = el.volume + delta;
      const arrived = delta >= 0 ? next >= target : next <= target;
      el.volume = Math.max(0, Math.min(1, arrived ? target : next));
      if (arrived) { clearInterval(music.fade); if (done) done(); }
    }, step);
  }

  function start(name, seconds) {
    const el = new Audio(`audio/music/${name}.mp3`);
    el.loop = true;                       /* сквозной луп на весь показ */
    el.volume = 0;
    el.addEventListener("error", () => { if (music.el === el) { music.el = null; music.name = null; } }, { once: true });
    el.play().then(() => fadeTo(el, level(name), seconds)).catch(() => {});
    music.el = el;
    music.name = name;
  }

  function swap(name) {
    const old = music.el;
    if (old) fadeTo(old, 0, .8, () => { try { old.pause(); } catch (e) {} });
    clearInterval(music.fade);
    start(name, 1.2);
  }

  root.KUMusic = music;

  root.KUSound = {
    /* Указание сцены: {track}, {pause}, {resume}, {stop}. Нет поля — не трогаем. */
    music(cue) {
      if (!enabled || !cue) return;

      if (cue.pause) {                       /* «музыка обрывается» — резко, без затухания */
        music.byScript = true;
        music.pending = null;
        clearInterval(music.fade);
        if (music.el) { try { music.el.pause(); } catch (e) {} }
        return;
      }
      if (cue.stop) {                        /* финал — мягкое затухание */
        music.byScript = true;
        const el = music.el;
        if (el) fadeTo(el, 0, 2.2, () => { try { el.pause(); } catch (e) {} });
        return;
      }
      if (cue.resume) {                      /* вернуть с того же места */
        music.byScript = false;
        if (!music.el && music.pending) return;   /* дорожка ещё грузится */
        if (music.el && !music.byShow) {
          music.el.play().catch(() => {});
          fadeTo(music.el, level(music.name), 1.2);
        }
        return;
      }
      if (cue.track) {
        music.byScript = false;
        /* Дорожки нет в папке — продолжает играть та, что уже звучит.
           Если она просто ещё грузится, запомним и заведём по готовности. */
        if (!music.ready.has(cue.track)) {
          if (!music.el) music.pending = cue.track;
          if (music.el && music.el.paused && !music.byShow) {
            music.el.play().catch(() => {});
            fadeTo(music.el, level(music.name), 1.2);
          }
          return;
        }
        if (music.name === cue.track) {
          if (music.el && music.el.paused && !music.byShow) {
            music.el.play().catch(() => {});
            fadeTo(music.el, level(music.name), 1.2);
          }
          return;
        }
        if (music.el) swap(cue.track); else start(cue.track, 1.6);
      }
    },
    /* Под голосом музыка уходит вниз и возвращается, когда диктор замолчал. */
    duck(on) {
      music.ducked = on;
      if (music.el && !music.el.paused) fadeTo(music.el, level(music.name), .5);
    },
    /* Пауза показа: музыка замирает и продолжается с того же места. */
    musicPause() {
      music.byShow = true;
      clearInterval(music.fade);
      if (music.el) { try { music.el.pause(); } catch (e) {} }
    },
    musicResume() {
      music.byShow = false;
      if (music.el && !music.byScript) {
        music.el.play().catch(() => {});
        fadeTo(music.el, level(music.name), .6);
      }
    },
    /* Подстройка громкости в зале: возвращает новый уровень в процентах. */
    nudgeMusic(step) {
      gain = Math.min(2.5, Math.max(.1, Math.round((gain + step) * 20) / 20));
      try { localStorage.setItem(GAIN_KEY, String(gain)); } catch (e) {}
      if (music.el && !music.el.paused) fadeTo(music.el, level(music.name), .25);
      return Math.round(gain * 100);
    },
    musicGain() { return Math.round(gain * 100); },
    musicReset() {
      clearInterval(music.fade);
      if (music.el) { try { music.el.pause(); } catch (e) {} }
      music.el = null; music.name = null; music.pending = null;
      music.byScript = false; music.byShow = false; music.ducked = false;
    },
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
    set(on) { enabled = on; if (!on) { this.stop(); this.musicReset(); } else this.warm(); },
    warm() { try { audio(); } catch (e) {} }
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
