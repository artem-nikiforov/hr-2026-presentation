/* ═══════════════════════════════════════════════════════════════════════
   Секвенция портретов команды на финальной реплике.
   Кружки появляются сеткой, перемигиваются, меняются местами и застывают
   в форме сердца. Всё держится на transform, поэтому идёт плавно.
   ═══════════════════════════════════════════════════════════════════════ */
(function (root) {
  "use strict";

  const COUNT = 30;
  const FILE = i => `img/team/${String(i + 1).padStart(2, "0")}.webp`;
  const LEAD = "img/team/lead.webp";

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
      /* Руководитель стоит рядом с сеткой и появляется, когда она выстроилась */
      const lead = document.createElement("i");
      lead.className = "lead-face";
      lead.style.backgroundImage = `url("${LEAD}")`;
      fragment.append(lead);
      host.replaceChildren(fragment);
    },

    play(host, calm) {
      this.build(host);
      clear();
      const faces = Array.from(host.querySelectorAll(".face"));
      const grid = gridPoints(faces.length, 6);
      const heart = heartPoints(faces.length);

      /* offset сдвигает всю группу вбок: в финале сетка уступает место
         портрету руководителя слева. */
      const place = (points, spread, easing, offset = 0) => faces.forEach((face, i) => {
        const point = points[i];
        if (easing) face.style.transitionTimingFunction = easing;
        face.style.transform =
          `translate(-50%,-50%) translate(${(point.x * spread + offset).toFixed(2)}cqw, ${(point.y * spread * 0.44).toFixed(2)}cqw)`;
      });

      /* Спокойный режим: сразу ровная сетка, без мельтешения. */
      if (calm) {
        host.classList.add("shown", "settled");
        place(grid, 26, null, 11);
        return;
      }

      host.classList.remove("shown", "blink", "heart", "settled");
      place(grid, 30, "cubic-bezier(.2,.9,.3,1)");
      faces.forEach((face, i) => { face.style.transitionDelay = (i * 26) + "ms"; });

      later(() => host.classList.add("shown"), 40);                       /* появление сеткой */
      later(() => {
        faces.forEach(face => { face.style.transitionDelay = "0ms"; });
        host.classList.add("blink");                                       /* перемигивание */
      }, 1600);
      /* меняются местами — мягкий разгон и торможение */
      later(() => place(shuffled(grid), 30, "cubic-bezier(.65,0,.35,1)"), 2700);
      later(() => place(shuffled(grid), 30, "cubic-bezier(.65,0,.35,1)"), 3900);
      later(() => {
        host.classList.remove("blink");
        host.classList.add("heart");                                       /* сердце с лёгким перелётом */
        place(heart, 26, "cubic-bezier(.3,1.35,.4,1)");
      }, 5100);
      later(() => {
        host.classList.remove("heart");
        host.classList.add("settled");                                     /* и встают ровно */
        place(grid, 26, "cubic-bezier(.35,.9,.3,1)", 11);
      }, 7400);
    },

    stop() { clear(); }
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
