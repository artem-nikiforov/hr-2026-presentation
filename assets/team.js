/* ═══════════════════════════════════════════════════════════════════════
   Секвенция портретов команды на финальной реплике.
   Кружки появляются сеткой, перемигиваются, меняются местами и застывают
   в форме сердца. Всё держится на transform, поэтому идёт плавно.
   ═══════════════════════════════════════════════════════════════════════ */
(function (root) {
  "use strict";

  const COUNT = 30;
  const FILE = i => `img/team/${String(i + 1).padStart(2, "0")}.webp`;

  /* Классическая параметрическая кривая сердца, приведённая к долям контейнера. */
  function heartPoints(count) {
    const points = [];
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      points.push({ x: x / 17, y: -y / 17 });      /* −1…1 по каждой оси */
    }
    /* по кривой точки идут неравномерно — расставляем от верхней впадины */
    return points.sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
  }

  function gridPoints(count, columns) {
    const rows = Math.ceil(count / columns);
    return Array.from({ length: count }, (_, i) => ({
      x: ((i % columns) - (columns - 1) / 2) / ((columns - 1) / 2),
      y: (Math.floor(i / columns) - (rows - 1) / 2) / ((rows - 1) / 2)
    }));
  }

  function shuffled(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  let timers = [];
  function clear() { timers.forEach(clearTimeout); timers = []; }
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  root.KUTeam = {
    build(host) {
      if (host.dataset.built === "1") return;
      host.dataset.built = "1";
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < COUNT; i++) {
        const face = document.createElement("i");
        face.className = "face";
        face.style.backgroundImage = `url("${FILE(i)}")`;
        fragment.append(face);
      }
      host.replaceChildren(fragment);
    },

    play(host, calm) {
      this.build(host);
      clear();
      const faces = Array.from(host.children);
      const grid = gridPoints(faces.length, 6);
      const heart = heartPoints(faces.length);
      const place = (points, spread) => faces.forEach((face, i) => {
        const point = points[i];
        face.style.transform =
          `translate(-50%,-50%) translate(${(point.x * spread).toFixed(2)}cqw, ${(point.y * spread * 0.52).toFixed(2)}cqw)`;
      });

      /* Спокойный режим: сразу сердце, без мельтешения. */
      if (calm) {
        host.classList.add("shown", "heart");
        place(heart, 22);
        return;
      }

      host.classList.remove("shown", "blink", "heart");
      place(grid, 26);
      faces.forEach((face, i) => { face.style.transitionDelay = (i * 22) + "ms"; });
      later(() => host.classList.add("shown"), 40);                    /* появление сеткой */
      later(() => {
        faces.forEach(face => { face.style.transitionDelay = "0ms"; });
        host.classList.add("blink");                                    /* перемигивание */
      }, 1500);
      later(() => place(shuffled(grid), 26), 2600);                     /* меняются местами */
      later(() => place(shuffled(grid), 26), 3400);
      later(() => {
        host.classList.remove("blink");
        host.classList.add("heart");                                    /* застывают сердцем */
        place(heart, 22);
      }, 4300);
    },

    stop() { clear(); }
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
