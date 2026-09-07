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
window.Audio = class {
  constructor(src) {
    this.src = src;
    this.listeners = {};
    if (/\/vo\//.test(src)) { spoken.push(src.split("/").pop()); setTimeout(() => this.onended && this.onended(), 5); }
    else setTimeout(() => (this.listeners.error || []).forEach(fn => fn()), 0);
  }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  cloneNode() { return new window.Audio(this.src); }
  play() { return Promise.resolve(); }
  pause() {}
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

for (const file of ["scenes.js", "durations.js", "story.js", "timeline.js", "reveal.js", "sound.js", "voice.js", "player.js"]) {
  const script = document.createElement("script");
  script.textContent = readFileSync(join(rootDir, "assets", file), "utf8");
  document.body.append(script);
}

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

group("Кадры сцен с аватаром");
const avatarScene = scenes.find(s => s.querySelector(".avatar"));
check("аватар скрыт вне своей реплики",
  avatarScene && !avatarScene.querySelector(".avatar").classList.contains("on"));

group("Ролик заменяет фотографию");
{
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
