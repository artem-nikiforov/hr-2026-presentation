/* Прогон плеера без браузера: проверяем поведение показа, а не только код.
   Запуск: node tests/player.mjs   (нужен jsdom, ставится как devDependency) */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const check = (name, condition, detail = "") => {
  if (condition) return;
  failed++;
  console.error(`  ✗ ${name}${detail ? " — " + detail : ""}`);
};
const group = name => console.log(`\n${name}`);

/* ── окружение ──────────────────────────────────────────────────── */
const dom = new JSDOM(readFileSync(join(rootDir, "index.html"), "utf8"), {
  url: "http://localhost/", pretendToBeVisual: true, runScripts: "dangerously"
});
const { window } = dom;
const { document } = window;

window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.HTMLElement.prototype.animate = function () {
  return { finished: Promise.resolve(), cancel() {}, pause() {}, play() {} };
};
/* Записанная озвучка есть: файл проигрывается и сам сообщает об окончании. */
const spoken = [];
const musicTracks = [];
window.Audio = class {
  constructor(src) {
    this.src = src;
    this.listeners = {};
    this.volume = 1;
    this.paused = true;
    if (/\/vo\//.test(src)) {
      spoken.push(src.split("/").pop());
      setTimeout(() => this.onended && this.onended(), 5);
    } else if (/\/music\/bed\.mp3$/.test(src)) {
      /* в папке лежит только сквозной луп — остальных дорожек нет */
      musicTracks.push(this);
      setTimeout(() => (this.listeners.canplaythrough || []).forEach(fn => fn()), 0);
    } else {
      setTimeout(() => (this.listeners.error || []).forEach(fn => fn()), 0);
    }
  }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  cloneNode() { return new window.Audio(this.src); }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
};
window.speechSynthesis = {
  speaking: false, paused: false,
  getVoices: () => [{ lang: "ru-RU", name: "test" }],
  addEventListener() {},
  speak(u) { spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 0); },
  cancel() {}, pause() {}, resume() {}
};
window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
window.AudioContext = class {
  constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = "running"; this.destination = {}; }
  createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  createOscillator() { return { type: "", frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {}, start() {}, stop() {} }; }
  createBiquadFilter() { return { type: "", frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, Q: { value: 0 }, connect() {}, disconnect() {} }; }
  createBufferSource() { return { buffer: null, connect() {}, disconnect() {}, start() {}, stop() {} }; }
  createBuffer(ch, n) { return { getChannelData: () => new Float32Array(n) }; }
  resume() {}
};
const frames = [];
window.requestAnimationFrame = fn => { frames.push(fn); return frames.length; };
/* jsdom не умеет проигрывать медиа — подменяем, иначе шум скрывает настоящие ошибки. */
window.HTMLMediaElement.prototype.play = function () { this.playCalls = (this.playCalls || 0) + 1; return Promise.resolve(); };
window.HTMLMediaElement.prototype.pause = function () { this.pauseCalls = (this.pauseCalls || 0) + 1; };

for (const file of ["scenes.js", "durations.js", "story.js", "timeline.js", "reveal.js", "team.js", "confetti.js", "sound.js", "voice.js", "player.js"]) {
  const script = document.createElement("script");
  script.textContent = readFileSync(join(rootDir, "assets", file), "utf8");
  document.body.append(script);
}

const SCENE_HTML = window.KU_STORY.map(scene => scene.html);
const frame = document.getElementById("frame");
const scenes = [...frame.querySelectorAll(".scene")];
const wait = () => new Promise(r => setTimeout(r, 30));
const click = id => document.getElementById(id).dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

group("Состояние до запуска");
check("13 сцен собрано", scenes.length === 13, `их ${scenes.length}`);
check("первая сцена видна", scenes[0].classList.contains("on"));
check("первый кадр назначен", scenes[0].querySelector(".cam figure").classList.contains("on"));
check("камера в исходной точке", /scale\(1\.015/.test(scenes[0].querySelector(".cam").style.transform),
  scenes[0].querySelector(".cam").style.transform);
check("озвучка молчит", spoken.length === 0);
check("кнопка приглашает начать", document.getElementById("play").textContent === "Начать показ");
check("в пульте только запуск и полный экран",
  document.querySelectorAll(".deck .btn").length === 2,
  `кнопок ${document.querySelectorAll(".deck .btn").length}`);
check("титров нет", document.querySelectorAll(".vo").length === 0);
check("ручного переключения сцен нет", !document.getElementById("rail"));

group("Показ идёт сам");
click("play");
await wait();
check("пошла первая реплика", spoken[0] === "s01_beat1.mp3", spoken[0]);
check("первый блок раскрыт", scenes[0].querySelector('[data-reveal="0"]').classList.contains("on"));
check("второй блок ещё закрыт", !scenes[0].querySelector('[data-reveal="1"]').classList.contains("on"));
check("кнопка стала паузой", document.getElementById("play").textContent === "Пауза");

/* Реплика заканчивается — показ переходит дальше сам, без нажатий. */
for (let i = 0; i < 400; i++) frames.splice(0).forEach(fn => fn(i * 100));
await wait();
check("вторая реплика пошла сама", spoken.includes("s01_beat2.mp3"), spoken.join(", "));

group("Пауза");
click("play");
check("показ на паузе", document.getElementById("play").textContent === "Продолжить");
click("play");
check("показ продолжен", document.getElementById("play").textContent === "Пауза");

group("Музыкальный луп");
{
  const playing = () => musicTracks.find(t => !t.paused);
  check("луп завёлся с первой сцены", Boolean(playing()), `дорожек ${musicTracks.length}`);
  check("луп зациклен", playing() ? playing().loop === true : false);

  const track = playing();
  window.dispatchEvent(new window.KeyboardEvent("keydown", { code: "ArrowRight", bubbles: true }));
  await wait();
  check("смена сцены не перезапускает луп", playing() === track);

  /* Пауза показа должна останавливать музыку и продолжать её с того же места. */
  click("play");
  check("на паузе показа музыка молчит", !playing());
  click("play");
  await wait();
  check("после паузы играет та же дорожка", playing() === track);

  /* Сцена 7 обрывает музыку по сценарию, сцена 9 возвращает. */
  const jump = to => { while (true) {
    const at = scenes.findIndex(s => s.classList.contains("on"));
    if (at >= to) break;
    window.dispatchEvent(new window.KeyboardEvent("keydown", { code: "ArrowRight", bubbles: true }));
  } };
  jump(6); await wait();
  check("на «НО…» музыка оборвана", !playing());
  jump(8); await wait();
  check("на «что мы делаем» музыка вернулась", Boolean(playing()));
  check("вернулась та же дорожка, а не новая", playing() === track);
}

group("Громкость музыки крутится на показе");
{
  const before = window.KUSound.musicGain();
  check("по умолчанию 60%", before === 60, `${before}%`);
  const louder = window.KUSound.nudgeMusic(.2);
  check("прибавляется", louder > before, `${before}% → ${louder}%`);
  const quieter = window.KUSound.nudgeMusic(-.4);
  check("убавляется", quieter < louder, `${louder}% → ${quieter}%`);
  check("значение запоминается", window.localStorage.getItem("ku-music-gain") !== null);
  window.KUSound.nudgeMusic(.2);   /* вернуть как было */
}

group("Заголовки с переносом не слипаются");
{
  /* <br> обязан оставаться переносом после разбиения текста на буквы,
     иначе «Теряется среди<br>всего» даст «средивсего». */
  const probe = document.createElement("h2");
  probe.innerHTML = "Теряется среди<br>всего остального";
  document.body.append(probe);
  window.KUReveal.play(probe, "gentle", false);
  check("перенос сохранён в доступном имени",
    probe.getAttribute("aria-label") === "Теряется среди всего остального",
    JSON.stringify(probe.getAttribute("aria-label")));
  check("в разметке остался перенос строки", probe.querySelectorAll("br").length === 1);
  /* собираем как увидит зритель: <br> — это перенос, а не пустое место */
  const letters = [...probe.querySelectorAll(".serega-gentle__unit, br")]
    .map(node => (node.nodeName === "BR" ? " " : node.textContent)).join("");
  check("буквы не склеились", !/[а-яё][А-ЯЁ]/.test(letters) && !letters.includes("средивсего"), letters);
  probe.remove();

  /* та же проверка на настоящих заголовках всех сцен */
  const glued = [];
  for (const scene of SCENE_HTML)
    for (const [, inner] of scene.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)) {
      const el = document.createElement("h2");
      el.innerHTML = inner;
      window.KUReveal.play(el, "gentle", false);
      const label = el.getAttribute("aria-label") || "";
      if (/[а-яё][А-ЯЁ]/.test(label) || / {2}/.test(label)) glued.push(label);
    }
  check("во всех сценах заголовки читаются", glued.length === 0, glued.join(" | "));
}

group("Подложка вместо фотографии");
{
  const scene = scenes.find(s => s.querySelector(".backdrop"));
  check("подложка создана", Boolean(scene));
  const backdrop = scene.querySelector(".backdrop");
  check("это градиент", backdrop.classList.contains("gradient"));
  const at = Number(backdrop.dataset.at);
  check("выключена, пока сцена не идёт",
    !scene.classList.contains("on") ? !backdrop.classList.contains("on") : true);
  check("знает свою реплику", Number.isFinite(at));
  check("телефон стоит рядом с текстом", Boolean(scene.querySelector("section.split .phone")));
  check("дуги Wi-Fi разделены", scene.querySelectorAll(".wifi-signal .arc").length === 3);
}

group("Портреты команды");
{
  const host = frame.querySelector("[data-team]");
  check("контейнер портретов есть", Boolean(host));
  window.KUTeam.build(host);
  check("собрано 30 кружков", host.querySelectorAll(".face").length === 30,
    `их ${host.querySelectorAll(".face").length}`);
  check("руководитель отдельным крупным кружком", Boolean(host.querySelector(".lead-face")));
  check("портреты берутся из img/team", /img\/team\/01\.webp/.test(host.querySelector(".face").style.backgroundImage));
  check("фото руководителя подключено", /lead\.webp/.test(host.querySelector(".lead-face").style.backgroundImage));
  window.KUTeam.play(host, false);
  check("кружки расставлены", Boolean(host.querySelector(".face").style.transform));
  check("движению задан easing", Boolean(host.children[0].style.transitionTimingFunction));
  const finale = window.KU_STORY[12];
  check("под портретами белый фон",
    [].concat(finale.backdrop).some(b => b.kind === "white" && b.at === 1));
  check("портреты держатся на экране не меньше пяти секунд",
    finale.beats[1].seconds - finale.beats[1].spoken >= 5,
    `запас ${(finale.beats[1].seconds - finale.beats[1].spoken).toFixed(1)} с`);
  check("QR на месте", Boolean(frame.querySelector(".qr")));
}

group("Конфетти на «100% ролей»");
{
  const party = scenes[5].querySelector("[data-confetti]");
  check("в сцене есть место под конфетти", Boolean(party));
  check("конфетти умеет запускаться", typeof window.KUConfetti.burst === "function");
}

group("Заглушки видеоаватаров сняты");
{
  check("кружков «видео-аватар» нет", document.querySelectorAll(".avatar").length === 0);
}

group("Ролик заменяет фотографию");
{
  /* вернуться к первой сцене: кнопок навигации нет, идём стрелками */
  for (let i = 0; i < 14; i++)
    window.dispatchEvent(new window.KeyboardEvent("keydown", { code: "ArrowLeft", bubbles: true }));
  await wait();
  const figure = scenes[0].querySelector(".cam figure");
  const video = figure.querySelector("video");
  check("ищется ролик рядом с фотографией", video.src.endsWith("/img/s01_bite.mp4"), video.src);
  check("пока ролика нет — видно фотографию", Boolean(figure.querySelector("img")));
  video.dispatchEvent(new window.Event("loadeddata"));
  check("после загрузки ролика фотография убирается", !figure.querySelector("img"));
  check("кадр помечен как видео", figure.classList.contains("has-video"));
  window.dispatchEvent(new window.KeyboardEvent("keydown", { code: "KeyR", bubbles: true }));
  await wait();
  check("ролик запущен на своей сцене", (video.playCalls || 0) > 0);
}

group("Перескоки стрелками ничего не ломают");
{
  const arrow = code => window.dispatchEvent(new window.KeyboardEvent("keydown", { code, bubbles: true }));

  for (let i = 0; i < 8; i++) arrow("ArrowRight");
  await wait();
  for (let i = 0; i < 5; i++) arrow("ArrowLeft");
  await wait();
  arrow("ArrowRight"); arrow("ArrowRight"); arrow("ArrowLeft");
  await wait();

  const live = scenes.filter(scene => scene.classList.contains("on"));
  check("активна ровно одна сцена", live.length === 1, `их ${live.length}`);

  /* На покинутых сценах не должно остаться следов показа: разбитого на
     буквы текста, набранных счётчиков и включённых состояний графики. */
  const traces = [];
  for (const scene of scenes) {
    if (scene.classList.contains("on")) continue;
    const marks = [
      [".serega-gentle,.serega-emotional", "разобранный текст"],
      ["[data-counted]", "счётчики"],
      [".reveal.on", "показанные блоки"],
      [".moving-doc.filed", "уехавшие документы"],
      [".chart-column.on", "столбцы графика"],
      [".verb.on", "глаголы"],
      [".team-heart.shown", "портреты"],
      [".huge.flash", "вспышка «М-м-м»"]
    ];
    for (const [selector, what] of marks)
      if (scene.querySelector(selector)) traces.push(`${scene.dataset.id}: ${what}`);
    if (scene.classList.contains("playing")) traces.push(`${scene.dataset.id}: осталась играющей`);
  }
  check("покинутые сцены очищены", traces.length === 0, traces.join(", "));

  arrow("Home"); await wait();
  check("Home возвращает в начало", scenes[0].classList.contains("on"));
  arrow("End"); await wait();
  check("End уводит в финал", scenes[scenes.length - 1].classList.contains("on"));
  arrow("Home"); await wait();
}

group("Прогон всех сцен");
for (let i = 0; i < 13; i++) {
  document.dispatchEvent(new window.KeyboardEvent("keydown", { code: "ArrowRight", bubbles: true }));
  window.dispatchEvent(new window.KeyboardEvent("keydown", { code: "ArrowRight", bubbles: true }));
  await wait();
}
const shown = scenes.filter(s => s.classList.contains("on"));
check("активна ровно одна сцена", shown.length === 1, `их ${shown.length}`);
check("дошли до финала", scenes[12].classList.contains("on"));
check("финальный кадр удерживается",
  [...scenes[12].querySelectorAll(".cam figure")].some(f => f.classList.contains("on")));

console.log(failed ? `\n✗ провалено проверок: ${failed}` : "\n✓ все проверки пройдены");
process.exit(failed ? 1 : 0);
