/* ═══════════════════════════════════════════════════════════════════════
   Конфетти на «100% ролей охвачено».
   Если в assets/lottie/confetti.json лежит анимация Lottie — играет она.
   Если нет — рисуем свои частицы на canvas: показу не нужна ни сеть,
   ни сторонняя библиотека, чтобы сработать на конференции.
   Где взять Lottie — в assets/lottie/README.md.
   ═══════════════════════════════════════════════════════════════════════ */
(function (root) {
  "use strict";

  const SOURCE = "assets/lottie/confetti.json";
  const COLORS = ["#ff8732", "#d62300", "#ffaa00", "#f9f2e7", "#ffc999"];
  let lottieData = null, lottieChecked = false;

  function checkLottie() {
    if (lottieChecked) return Promise.resolve(lottieData);
    lottieChecked = true;
    if (typeof fetch !== "function") return Promise.resolve(null);
    return fetch(SOURCE)
      .then(response => (response.ok ? response.json() : null))
      .then(data => (lottieData = data))
      .catch(() => null);
  }

  /* ── свои частицы ─────────────────────────────────────────────────── */
  function paint(host, calm) {
    const canvas = document.createElement("canvas");
    canvas.className = "confetti-canvas";
    host.replaceChildren(canvas);

    const box = host.getBoundingClientRect();
    const scale = Math.min(root.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, box.width * scale);
    canvas.height = Math.max(1, box.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => {};
    ctx.scale(scale, scale);

    const count = calm ? 40 : 130;
    const pieces = Array.from({ length: count }, () => ({
      x: box.width * (.1 + Math.random() * .8),
      y: -box.height * Math.random() * .4,
      w: 6 + Math.random() * 8,
      h: 9 + Math.random() * 12,
      vx: (Math.random() - .5) * 60,
      vy: 90 + Math.random() * 190,
      spin: (Math.random() - .5) * 7,
      angle: Math.random() * Math.PI,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    }));

    let raf = 0, last = performance.now(), life = 0;
    function frame(now) {
      const dt = Math.min(.05, (now - last) / 1000);
      last = now; life += dt;
      ctx.clearRect(0, 0, box.width, box.height);
      for (const p of pieces) {
        p.vy += 210 * dt;                       /* притяжение */
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = Math.max(0, 1 - life / 4.2);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.angle)));
        ctx.restore();
      }
      if (life < 4.2) raf = requestAnimationFrame(frame);
      else host.replaceChildren();
    }
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); host.replaceChildren(); };
  }

  let stop = null;

  root.KUConfetti = {
    burst(host, calm) {
      if (!host) return;
      this.clear();
      if (calm) { stop = paint(host, true); return; }   /* спокойный режим: коротко и мало */
      checkLottie().then(data => {
        if (data && root.lottie) {
          host.replaceChildren();
          const anim = root.lottie.loadAnimation({
            container: host, renderer: "svg", loop: false, autoplay: true, animationData: data
          });
          stop = () => { try { anim.destroy(); } catch (e) {} host.replaceChildren(); };
          return;
        }
        stop = paint(host, false);
      });
    },
    clear() { if (stop) { stop(); stop = null; } }
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
