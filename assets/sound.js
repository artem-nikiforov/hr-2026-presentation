/* ═══════════════════════════════════════════════════════════════════════
   Звуковые акценты. Генерируются на лету, каждый раз чуть разные, поэтому
   повтор сцены не звучит как копия. Ни одного файла не требуется.
   Контекст создаётся только после действия ведущего — иначе браузер
   не разрешит воспроизведение.
   ═══════════════════════════════════════════════════════════════════════ */
(function (root) {
  "use strict";

  let ctx = null, enabled = true;
  const live = new Set();                       /* всё звучащее — чтобы разом оборвать */
  const rnd = (a, b) => a + Math.random() * (b - a);

  function audio() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function track(node, stopAt) {
    live.add(node);
    setTimeout(() => live.delete(node), Math.max(0, stopAt) * 1000 + 60);
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

  const library = {
    crunch() { band(.09, rnd(900, 1400), 1.2, .5); band(.13, rnd(500, 800), 1.6, .4, .10); band(.07, rnd(1600, 2400), 2, .25, .20); },
    whoosh() {
      const c = audio(), src = noise(.55), filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, c.currentTime);
      filter.frequency.exponentialRampToValueAtTime(rnd(2600, 3600), c.currentTime + .45);
      src.connect(filter);
      const at = envelope(filter, .22, .55); src.start(at); src.stop(at + .6); track(src, .6);
    },
    tick() { tone("sine", rnd(1100, 1400), null, .05, .14); },
    drop() { tone("sine", rnd(200, 240), 55, .5, .28); band(.25, 300, .8, .1); },
    chime() { tone("sine", rnd(860, 900), null, .5, .13); tone("sine", rnd(1300, 1340), null, .6, .09, .06); tone("sine", 1760, null, .5, .045, .12); },
    error() { tone("square", 320, 300, .12, .09); tone("square", 250, 180, .18, .09, .15); },
    build() { for (let i = 0; i < 3; i++) { band(.11, rnd(180, 260), 1.1, .26, i * .16); tone("sine", rnd(120, 150), 70, .2, .12, i * .16); } },
    cash() { tone("sine", 1250, null, .16, .12); tone("sine", 1720, null, .3, .1, .05); band(.06, 3000, 2, .09, .02); }
  };

  root.KUSound = {
    play(name) { if (enabled && library[name]) { try { library[name](); } catch (e) { /* звук не критичен */ } } },
    /* Обрыв: при быстром переходе и на паузе хвосты не должны доигрывать. */
    stop() {
      live.forEach(node => { try { node.disconnect(); } catch (e) {} });
      live.clear();
    },
    set(on) { enabled = on; if (!on) this.stop(); else this.warm(); },
    warm() { try { audio(); } catch (e) {} }
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
