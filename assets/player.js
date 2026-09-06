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

  const frame = $("frame"), rail = $("rail"), beatsBar = $("beats"), pos = $("pos");
  const bPlay = $("play"), bPrev = $("prev"), bNext = $("next"), bScene = $("scene-next"),
        bReplay = $("replay"), bAuto = $("auto"), bVoice = $("voice"), bSfx = $("sfx"),
        bSubs = $("subs"), bFull = $("full");

  const voice = new root.KUVoice();
  const sound = root.KUSound;

  /* ── сборка сцен ────────────────────────────────────────────────── */
  const views = SCENES.map((scene, index) => {
    const el = document.createElement("article");
    el.className = "scene";
    el.dataset.id = scene.id;
    el.setAttribute("aria-label", scene.name);

    const shot = document.createElement("div");
    shot.className = "shot";
    const cam = document.createElement("div");
    cam.className = "cam";
    scene.shots.forEach(item => {
      const figure = document.createElement("figure");

      /* Ролик с тем же именем заменяет фотографию. Нет ролика — остаётся
         фотография, нет и её — заглушка с названием кадра. */
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.preload = "auto";
      video.hidden = true;
      video.src = item.file.replace(/\.jpe?g$/i, "") + ".mp4";

      const img = document.createElement("img");
      img.alt = item.alt;
      img.src = item.file;
      img.onerror = () => {
        img.remove();
        figure.insertAdjacentHTML("beforeend",
          `<div class="ph"><p class="k">Стартовый кадр</p><p class="t">${item.alt}</p>
           <p class="f">${item.file} · промт в assets/scenes.js</p></div>`);
      };

      video.addEventListener("loadeddata", () => {
        figure.classList.add("has-video");
        video.hidden = false;
        img.remove();
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
    const chapter = document.createElement("p");
    chapter.className = "chapter";
    chapter.textContent = scene.chapter;
    el.append(chapter);

    el.insertAdjacentHTML("beforeend", scene.html);

    let avatar = null;
    if (scene.avatar) {
      avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = scene.avatar;
      el.append(avatar);
    }
    const subtitle = document.createElement("p");
    subtitle.className = "vo";
    el.append(subtitle);
    frame.append(el);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.title = `${index + 1}. ${scene.name}`;
    dot.setAttribute("aria-label", dot.title);
    dot.addEventListener("click", () => { sound.warm(); timeline.go(index); });
    rail.append(dot);

    return { el, cam, figures: Array.from(cam.children), avatar, subtitle, dot, shot: -1 };
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
        if (beat < cue.at) { node.classList.remove(cue.cls || "on"); return; }
        const delay = instant || calm ? 0 : (i - from) * (cue.stagger || 0);
        if (delay) later(() => node.classList.add(cue.cls || "on"), delay);
        else node.classList.add(cue.cls || "on");
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

    if (view.avatar) view.avatar.classList.toggle("on", scene.avatarAt === beat);

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

  /* ── смена сцены ────────────────────────────────────────────────── */
  function enterScene(index) {
    clearScene();
    if (current >= 0 && current !== index) {
      const past = views[current];
      past.el.classList.remove("on", "playing");
      past.figures.forEach(figure => {
        const video = figure.querySelector("video");
        if (video) { try { video.pause(); video.currentTime = 0; } catch (e) {} }
      });
      past.shot = -1;
      past.subtitle.classList.remove("on");
      if (past.avatar) past.avatar.classList.remove("on");
      past.el.querySelectorAll("[data-revealed]").forEach(node => delete node.dataset.revealed);
      past.el.querySelectorAll("[data-counted]").forEach(node => delete node.dataset.counted);
      past.el.querySelectorAll(".serega-gentle,.serega-emotional").forEach(node => {
        node.textContent = node.getAttribute("aria-label") || node.textContent;
        node.classList.remove("serega-gentle", "serega-emotional");
      });
    }
    current = index;
    const view = views[index];
    view.el.classList.add("on");
    camera(index, 0);
    /* .playing включает одноразовые эффекты сцены; перед повтором снимаем */
    view.el.classList.remove("playing");
    void view.el.offsetWidth;
    requestAnimationFrame(() => view.el.classList.add("playing"));
  }

  /* ── реакция таймлайна ──────────────────────────────────────────── */
  const timeline = new root.KUTimeline(SCENES, (type, tl) => {
    if (type === "beat") {
      const first = current !== tl.index;
      if (first) enterScene(tl.index);
      else { timers.forEach(clearTimeout); timers = []; sound.stop(); voice.cancel(); }

      const beat = tl.current;
      applyBeat(tl.index, tl.beat, false);

      if (beat.sound) later(() => sound.play(beat.sound), (beat.lead || 0) * 1000);

      const view = views[tl.index];
      view.subtitle.textContent = beat.text;
      view.subtitle.classList.add("on");

      const token = tl.token;
      voice.play(beat.id, beat.text).then(() => tl.finishVoice(token));
    }
    if (type === "pause") { voice.pause(); sound.stop(); video(tl.index, "pause"); }
    if (type === "resume") { voice.resume(); video(tl.index, "play"); }
    if (type === "complete") views[tl.index].subtitle.classList.remove("on");
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
      if (current >= 0) camera(current, timeline.elapsed / Math.max(1, SCENES[current].seconds));
    }
    requestAnimationFrame(loop);
  }

  /* ── пульт ──────────────────────────────────────────────────────── */
  function paint(tl) {
    const scene = tl.scene;
    pos.textContent =
      `${String(tl.index + 1).padStart(2, "0")} / ${SCENES.length}  ·  реплика ${tl.beat + 1} из ${scene.beats.length}`;
    views.forEach((view, i) => {
      view.dot.setAttribute("aria-current", i === tl.index ? "true" : "false");
      view.dot.dataset.state = i < tl.index ? "past" : i === tl.index ? "now" : "next";
    });
    beatsBar.replaceChildren(...scene.beats.map((_, i) => {
      const mark = document.createElement("i");
      mark.className = i < tl.beat ? "past" : i === tl.beat ? "now" : "";
      return mark;
    }));
    const ready = tl.phase === "ready";
    bPlay.textContent = ready ? "Начать показ" : tl.playing ? "Пауза" : tl.done ? "Дальше" : "Продолжить";
    bPrev.disabled = ready;
    bNext.disabled = ready;
    bReplay.disabled = ready;
    bScene.disabled = ready || tl.index === SCENES.length - 1;
  }

  bPlay.addEventListener("click", () => {
    sound.warm();
    if (timeline.phase === "ready") return timeline.go(0);
    if (timeline.done) return timeline.next();
    timeline.toggle();
  });
  bNext.addEventListener("click", () => { sound.warm(); timeline.next(); });
  bPrev.addEventListener("click", () => { sound.warm(); timeline.previous(); });
  bScene.addEventListener("click", () => { sound.warm(); timeline.go(timeline.index + 1); });
  bReplay.addEventListener("click", () => { sound.warm(); timeline.replay(); });
  bAuto.addEventListener("click", () => {
    const on = bAuto.getAttribute("aria-pressed") !== "true";
    bAuto.setAttribute("aria-pressed", String(on));
    timeline.setAuto(on);
  });
  bVoice.addEventListener("click", () => {
    const on = bVoice.getAttribute("aria-pressed") !== "true";
    bVoice.setAttribute("aria-pressed", String(on));
    voice.set(on);
  });
  bSfx.addEventListener("click", () => {
    const on = bSfx.getAttribute("aria-pressed") !== "true";
    bSfx.setAttribute("aria-pressed", String(on));
    sound.set(on);
  });
  bSubs.addEventListener("click", () => {
    const on = bSubs.getAttribute("aria-pressed") !== "true";
    bSubs.setAttribute("aria-pressed", String(on));
    document.body.classList.toggle("nosub", !on);
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
    if (key === "Space") { event.preventDefault(); bPlay.click(); }
    else if (key === "ArrowRight" || key === "PageDown") { event.preventDefault(); bNext.click(); }
    else if (key === "ArrowLeft" || key === "PageUp") { event.preventDefault(); bPrev.click(); }
    else if (key === "KeyN") bScene.click();
    else if (key === "KeyR") bReplay.click();
    else if (key === "KeyF") bFull.click();
    else if (key === "KeyS") bSubs.click();
  });

  /* Уход со вкладки останавливает показ, чтобы он не «убежал» без зрителя. */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && timeline.playing) timeline.pause();
  });

  /* ── исходное состояние: первый кадр виден, звук и таймлайн молчат ── */
  views[0].el.classList.add("on");
  views[0].figures[0].classList.add("on");
  camera(0, 0);
  paint(timeline);
  requestAnimationFrame(loop);
})(typeof globalThis !== "undefined" ? globalThis : this);
