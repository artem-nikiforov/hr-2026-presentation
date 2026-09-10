/* ═══════════════════════════════════════════════════════════════════════
   Плеер показа. Один контроллер владеет всем, что происходит на экране:
   графикой, камерой, счётчиками, звуком и голосом. Любой переход сначала
   гасит предыдущую сцену целиком, поэтому быстрые нажатия не оставляют
   чужую речь и отложенные эффекты.
   ═══════════════════════════════════════════════════════════════════════ */
(function (root) {
  "use strict";

  const SCENES = root.KU_STORY;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const startVideo = node => { const started = node.play(); if (started && started.catch) started.catch(() => {}); };

  const frame = $("frame"), pos = $("pos"), deck = $("deck");
  const progress = $("progress").firstElementChild;
  const bPlay = $("play"), bFull = $("full"), toast = $("toast");
  const startScreen = $("start"), startBtn = $("start-btn");

  let toastTimer = null;
  function say(text) {
    toast.textContent = text;
    toast.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("on"), 1600);
  }

  const voice = new root.KUVoice();
  const sound = root.KUSound;

  /* ── сборка сцен ────────────────────────────────────────────────── */
  /* Сколько секунд кадр держится на экране: по нему решаем, зацикливать
     короткий ролик или замереть на последнем кадре. */
  function shotSeconds(scene, index) {
    let current = 0, total = 0;
    for (const beat of scene.beats) {
      if (beat.shot !== undefined) current = beat.shot;
      if (current === index) total += beat.seconds;
    }
    return total;
  }

  const views = SCENES.map(scene => {
    const el = document.createElement("article");
    el.className = "scene";
    el.dataset.id = scene.id;
    el.setAttribute("aria-label", scene.name);

    const shot = document.createElement("div");
    shot.className = "shot";
    const cam = document.createElement("div");
    cam.className = "cam";
    scene.shots.forEach((item, index) => {
      const figure = document.createElement("figure");

      /* Ролик с тем же именем заменяет фотографию. Нет ролика — остаётся
         фотография, нет и её — заглушка с названием кадра. */
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.preload = "auto";
      video.hidden = true;
      video.src = item.file.replace(/\.jpe?g$/i, "") + ".mp4" +
        (root.KU_VERSION ? "?v=" + root.KU_VERSION : "");

      const img = document.createElement("img");
      img.alt = item.alt;
      img.src = item.file + (root.KU_VERSION ? "?v=" + root.KU_VERSION : "");
      img.onerror = () => {
        img.remove();
        figure.insertAdjacentHTML("beforeend",
          `<div class="ph"><p class="k">Стартовый кадр</p><p class="t">${item.alt}</p>
           <p class="f">${item.file} · промт в assets/scenes.js</p></div>`);
      };

      video.addEventListener("loadedmetadata", () => {
        /* Ролик заметно короче своего места в показе — пускаем по кругу,
           иначе он один раз проигрывается и замирает на последнем кадре. */
        const shown = shotSeconds(scene, index);
        video.loop = video.duration > 0 && shown > 0 && video.duration < shown * 0.6;
      }, { once: true });
      video.addEventListener("loadeddata", () => {
        figure.classList.add("has-video");
        video.hidden = false;
        img.remove();
        /* Картинки могло не быть — тогда на её месте стоит заглушка,
           и она перекрыла бы ролик. */
        const stub = figure.querySelector(".ph");
        if (stub) stub.remove();
      }, { once: true });
      video.addEventListener("error", () => video.remove(), { once: true });

      figure.append(video, img);
      cam.append(figure);
    });
    shot.append(cam);
    el.append(shot);

    if (scene.veil) {
      const veil = document.createElement("div");
      veil.className = "veil " + scene.veil;
      el.append(veil);
    }
    for (const item of [].concat(scene.backdrop || [])) {
      const backdrop = document.createElement("div");
      backdrop.className = "backdrop " + item.kind;
      backdrop.dataset.at = String(item.at);
      el.append(backdrop);
    }
    const chapter = document.createElement("p");
    chapter.className = "chapter";
    chapter.textContent = scene.chapter;
    el.append(chapter);

    el.insertAdjacentHTML("beforeend", scene.html);

    const avatar = null;   /* заглушки видеоаватаров сняты с показа */
    frame.append(el);
    return {
      el, cam, figures: Array.from(cam.children), avatar, shot: -1,
      layerHTML: el.querySelector(".layer").outerHTML   /* эталон для отката */
    };
  });

  /* ── то, что нужно уметь останавливать ──────────────────────────── */
  let timers = [], counters = [], current = -1;

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearScene() {
    timers.forEach(clearTimeout); timers = [];
    counters = [];
    sound.stop();
    voice.cancel();
  }

  /* ── счётчики: идут от такта плеера, поэтому пауза их останавливает ─ */
  function addCounter(el) {
    if (el.dataset.counted === "1") return;
    el.dataset.counted = "1";
    const decimal = el.dataset.decimal !== undefined;
    const target = parseFloat(decimal ? el.dataset.decimal : el.dataset.count);
    const prefix = el.dataset.prefix || "", suffix = el.dataset.suffix || "";
    const render = value => {
      const text = decimal
        ? value.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : Math.round(value).toLocaleString("ru-RU");
      el.textContent = prefix + text + suffix;
    };
    if (calm) { render(target); return; }
    render(0);
    counters.push({ t: 0, span: 1.1, render, target });
  }

  /* ── видно ли сейчас содержимое: нужно, чтобы не запускать эффекты
        внутри ещё не показанных блоков ────────────────────────────── */
  function shown(el, sceneEl) {
    for (let node = el; node && node !== sceneEl; node = node.parentElement) {
      const data = node.dataset || {};
      if (node.classList.contains("reveal") && !node.classList.contains("on")) return false;
      if (node.classList.contains("chart-column") && !node.classList.contains("on")) return false;
      if (data.panel !== undefined && data.state !== "now") return false;
      if (data.milestone !== undefined && data.state === "next") return false;
    }
    return true;
  }

  function stateOf(value, beat) { return value < beat ? "past" : value === beat ? "now" : "next"; }

  /* ── состояние графики на конкретной реплике ─────────────────────── */
  function applyBeat(index, beat, instant) {
    const scene = SCENES[index], view = views[index], el = view.el;
    el.dataset.beat = String(beat);

    el.querySelectorAll("[data-reveal]").forEach(node =>
      node.classList.toggle("on", beat >= Number(node.dataset.reveal)));
    el.querySelectorAll(".backdrop,[data-at]").forEach(node =>
      node.classList.toggle("on", beat === Number(node.dataset.at)));
    ["panel", "milestone", "step"].forEach(key =>
      el.querySelectorAll(`[data-${key}]`).forEach(node =>
        node.dataset.state = stateOf(Number(node.dataset[key]), beat)));

    /* привязки, которые нельзя вывести из разметки: документы, столбцы */
    scene.cues.forEach(cue => {
      const nodes = Array.from(el.querySelectorAll(cue.sel));
      const from = cue.from || 0, to = cue.to === undefined ? nodes.length - 1 : cue.to;
      nodes.forEach((node, i) => {
        const inRange = i >= from && i <= to;
        if (!inRange) return;
        if (beat < cue.at) { node.classList.remove(cue.cls || "on", "now"); return; }
        const delay = instant || calm ? 0 : (i - from) * (cue.stagger || 0);
        const light = () => {
          node.classList.add(cue.cls || "on");
          if (!cue.spotlight) return;
          nodes.forEach(other => other.classList.remove("now"));
          node.classList.add("now");
        };
        if (delay) later(light, delay); else light();
      });
    });

    /* фотография: берём последнюю назначенную на этой или ранней реплике */
    let target = 0;
    for (let i = 0; i <= beat; i++) if (scene.beats[i].shot !== undefined) target = scene.beats[i].shot;
    const changed = view.shot !== target;
    view.shot = target;
    view.figures.forEach((figure, i) => {
      const active = i === target;
      figure.classList.toggle("on", active);
      if (!figure.classList.contains("has-video")) return;
      const video = figure.querySelector("video");
      if (!active) { try { video.pause(); } catch (e) {} return; }
      if (calm) return;                       /* спокойный режим: первый кадр без движения */
      if (changed) video.currentTime = 0;
      startVideo(video);                      /* автозапуск без звука браузеры разрешают */
    });

    const teamHost = el.querySelector("[data-team]");
    if (teamHost && root.KUTeam) {
      const active = shown(teamHost, el);
      if (active && teamHost.dataset.playing !== "1") {
        teamHost.dataset.playing = "1";
        later(() => root.KUTeam.play(teamHost, calm), instant ? 0 : 260);
      }
      if (!active) { teamHost.dataset.playing = "0"; root.KUTeam.stop(); }
    }

    /* текст и счётчики — только внутри того, что уже показано */
    const wait = instant || calm ? 0 : 140;
    later(() => {
      root.KUReveal.revealText(el, calm);
      el.querySelectorAll("[data-count],[data-decimal]").forEach(node => {
        if (shown(node, el)) addCounter(node);
      });
    }, wait);
  }

  /* ── камера: масштаб и снос считаются от прогресса сцены ─────────── */
  function camera(index, progress) {
    const [x, y, scale] = SCENES[index].camera;
    const view = views[index];
    if (calm) { view.cam.style.transform = "scale(1.02)"; return; }
    const moving = view.figures[Math.max(0, view.shot)]?.classList.contains("has-video");
    const p = clamp(progress, 0, 1) * (moving ? 0.35 : 1);
    view.cam.style.transform =
      `translate3d(${lerp(0, x, p).toFixed(3)}%, ${lerp(0, y, p).toFixed(3)}%, 0) scale(${lerp(1.015, scale, p).toFixed(4)})`;
  }

  /* ── откат сцены в исходный вид ─────────────────────────────────── */
  function reset(view) {
    view.el.classList.remove("on", "playing", "prologue");
    view.figures.forEach(figure => {
      const video = figure.querySelector("video");
      if (video) { try { video.pause(); video.currentTime = 0; } catch (e) {} }
      figure.classList.remove("on");
    });
    view.shot = -1;
    if (root.KUTeam) root.KUTeam.stop();
    if (root.KUConfetti) root.KUConfetti.clear();
    /* Разбитый на буквы текст, набранные счётчики и классы подсказок
       восстановить поштучно нельзя — возвращаем слой целиком. */
    const layer = view.el.querySelector(".layer");
    if (layer) layer.outerHTML = view.layerHTML;
    view.el.querySelectorAll(".backdrop").forEach(node => node.classList.remove("on"));
  }

  /* ── смена сцены ────────────────────────────────────────────────── */
  function enterScene(index) {
    clearScene();
    if (current >= 0 && current !== index) reset(views[current]);
    current = index;
    const view = views[index];
    /* Музыка меняется только там, где это указано в сценарии. */
    if (SCENES[index].music !== undefined) sound.music(SCENES[index].music);
    view.el.classList.add("on");
    camera(index, 0);
    /* .playing включает одноразовые эффекты сцены; перед повтором снимаем */
    view.el.classList.remove("playing");
    void view.el.offsetWidth;
    requestAnimationFrame(() => view.el.classList.add("playing"));

    /* Портреты команды: секвенция стартует, когда доходит до своей реплики. */
    const team = view.el.querySelector("[data-team]");
    if (team && root.KUTeam) root.KUTeam.build(team);

    const confetti = root.KUConfetti;
    if (confetti) {
      confetti.clear();
      const party = view.el.querySelector("[data-confetti]");
      if (party) later(() => confetti.burst(party, calm), 700);
    }
  }

  /* ── реакция таймлайна ──────────────────────────────────────────── */
  const timeline = new root.KUTimeline(SCENES, (type, tl) => {
    if (type === "beat") {
      const first = current !== tl.index;
      if (first) enterScene(tl.index);
      else if (tl.beat === 0) { reset(views[tl.index]); enterScene(tl.index); }
      else { timers.forEach(clearTimeout); timers = []; sound.stop(); voice.cancel(); }

      const beat = tl.current;
      applyBeat(tl.index, tl.beat, false);

      if (beat.sound) later(() => sound.play(beat.sound), (beat.lead || 0) * 1000);
      /* Звуки, попадающие в середину реплики: щелчок мышеловки и подобное. */
      if (beat.also) beat.also.forEach(cue => later(() => sound.play(cue.sound), cue.at * 1000));

      const token = tl.token;
      sound.duck(true);
      voice.play(beat.id, beat.text, beat.gain).then(() => {
        sound.duck(false);
        tl.finishVoice(token);
      });
    }
    if (type === "pause") { voice.pause(); sound.stop(); sound.musicPause(); video(tl.index, "pause"); }
    if (type === "resume") { voice.resume(); sound.musicResume(); video(tl.index, "play"); }
    /* Показ кончился — музыка уходит мягко, а не обрывается на полуслове. */
    if (type === "complete" && tl.index === SCENES.length - 1) sound.music({ stop: true });
    paint(tl);
  });

  function video(index, action) {
    const view = views[index];
    const figure = view.figures[Math.max(0, view.shot)];
    if (!figure || !figure.classList.contains("has-video")) return;
    const node = figure.querySelector("video");
    if (action === "play" && !calm) startVideo(node);
    if (action === "pause") { try { node.pause(); } catch (e) {} }
  }

  /* ── такт ───────────────────────────────────────────────────────── */
  let last = performance.now();
  function loop(now) {
    /* при возврате из фоновой вкладки не догоняем накопленное время */
    const dt = clamp((now - last) / 1000, 0, 0.1);
    last = now;
    if (timeline.playing) {
      timeline.tick(dt);
      counters.forEach(c => {
        if (c.t >= c.span) return;
        c.t = Math.min(c.span, c.t + dt);
        const p = c.t / c.span;
        c.render(c.target * (1 - Math.pow(1 - p, 3)));
      });
      if (current >= 0) {
        camera(current, timeline.elapsed / Math.max(1, SCENES[current].seconds));
        progress.style.width = clamp((BEFORE[current] + timeline.elapsed) / TOTAL, 0, 1) * 100 + "%";
      }
    }
    requestAnimationFrame(loop);
  }

  /* ── пульт ──────────────────────────────────────────────────────── */
  const TOTAL = SCENES.reduce((n, scene) => n + scene.seconds, 0);
  const BEFORE = SCENES.map((_, i) => SCENES.slice(0, i).reduce((n, scene) => n + scene.seconds, 0));

  function paint(tl) {
    const ready = tl.phase === "ready";
    pos.textContent = ready
      ? `${SCENES.length} сцен · ${Math.floor(TOTAL / 60)}:${String(Math.round(TOTAL % 60)).padStart(2, "0")}`
      : `${String(tl.index + 1).padStart(2, "0")} / ${SCENES.length} · ${tl.scene.name}`;
    bPlay.textContent = ready ? "Начать показ" : tl.playing ? "Пауза" : tl.done ? "Заново" : "Продолжить";
  }

  /* Первая сцена начинается с ролика: он проигрывается целиком и замирает,
     и только потом появляется «М-м-м» и включается озвучка. */
  function prologue() {
    const view = views[0];
    const figure = view.figures[0];
    const video = figure.querySelector("video");
    const start = () => { timeline.setAuto(true); timeline.go(0); };

    /* Музыка заводится вместе с роликом, не дожидаясь первой реплики. */
    if (SCENES[0].music) sound.music(SCENES[0].music);
    if (!figure.classList.contains("has-video") || calm) return start();

    view.shot = 0;                       /* чтобы старт не перемотал ролик */
    figure.classList.add("on");
    /* Пока идёт ролик — без затемнения и без надписей: только кадр. */
    view.el.classList.add("prologue");
    video.currentTime = 0;
    startVideo(video);

    let done = false;
    const flash = () => {
      if (done) return;
      done = true;
      view.el.classList.remove("prologue");
      /* «М-м-м» несколько раз вспыхивает и остаётся — потом идёт речь. */
      const title = view.el.querySelector('[data-reveal="0"]');
      if (title) title.classList.add("on");
      const huge = view.el.querySelector(".huge.steps");
      if (huge) huge.classList.add("flash");
      later(start, 1500);
    };
    video.addEventListener("ended", flash, { once: true });
    later(flash, Math.max(600, ((video.duration || 1.4) - 0.12) * 1000));
  }

  /* Заставка уходит с первым запуском и больше не возвращается. */
  function begin() {
    startScreen.classList.add("gone");
    document.body.classList.add("started");
    sound.warm();
    prologue();
  }
  startBtn.addEventListener("click", begin);

  bPlay.addEventListener("click", () => {
    sound.warm();
    if (timeline.phase === "ready") return begin();
    if (timeline.done) { sound.musicReset(); return timeline.go(0); }
    timeline.toggle();
  });
  bFull.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  });
  document.addEventListener("fullscreenchange", () =>
    document.body.classList.toggle("full", !!document.fullscreenElement));

  addEventListener("keydown", event => {
    if (event.target.tagName === "BUTTON" && (event.code === "Space" || event.code === "Enter")) return;
    const key = event.code;
    /* Показ идёт сам. Клавиши нужны только на репетиции — кнопок для них нет. */
    /* Перескок по сценам: показ продолжает идти сам с новой точки. */
    const jump = to => {
      sound.warm();
      timeline.setAuto(true);
      timeline.go(Math.max(0, Math.min(SCENES.length - 1, to)));
    };
    if (key === "Space") { event.preventDefault(); bPlay.click(); }
    else if (key === "ArrowRight") { event.preventDefault(); jump(timeline.index + 1); }
    else if (key === "ArrowLeft") { event.preventDefault(); jump(timeline.index - 1); }
    else if (key === "Home") { event.preventDefault(); jump(0); }
    else if (key === "End") { event.preventDefault(); jump(SCENES.length - 1); }
    else if (key === "KeyM") {
      const playing = root.KUMusic.el && !root.KUMusic.el.paused;
      sound.music(playing ? { pause: true } : { resume: true });
      say(playing ? "Музыка выключена" : "Музыка включена");
    }
    /* Громкость музыки подбирается прямо в зале и запоминается браузером. */
    else if (key === "BracketRight" || key === "Equal") { sound.warm(); say("Музыка " + sound.nudgeMusic(.1) + "%"); }
    else if (key === "BracketLeft" || key === "Minus") { sound.warm(); say("Музыка " + sound.nudgeMusic(-.1) + "%"); }
    else if (key === "KeyR") { sound.warm(); timeline.replay(); }
    else if (key === "KeyF") bFull.click();
  });

  /* Уход со вкладки останавливает показ, чтобы он не «убежал» без зрителя. */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && timeline.playing) timeline.pause();
  });

  /* Во время показа пульт уходит; возвращается от движения мыши. */
  let idleTimer = null;
  function wake() {
    document.body.classList.remove("idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (timeline.playing) document.body.classList.add("idle");
    }, 2500);
  }
  addEventListener("mousemove", wake);
  addEventListener("keydown", wake);
  deck.addEventListener("mouseenter", () => { clearTimeout(idleTimer); document.body.classList.remove("idle"); });

  /* ── исходное состояние: первый кадр виден, звук и таймлайн молчат ── */
  views[0].el.classList.add("on");
  views[0].figures[0].classList.add("on");
  camera(0, 0);
  paint(timeline);
  wake();
  requestAnimationFrame(loop);
})(typeof globalThis !== "undefined" ? globalThis : this);
