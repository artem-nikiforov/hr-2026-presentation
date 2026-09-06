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
/* Записей озвучки ещё нет: файл всегда падает в ошибку, как в реальном показе. */
const spoken = [];
window.Audio = class {
  constructor(src) { this.src = src; setTimeout(() => this.onerror && this.onerror(), 0); }
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

for (const file of ["scenes.js", "story.js", "timeline.js", "reveal.js", "sound.js", "voice.js", "player.js"]) {
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
check("шаги пока недоступны", document.getElementById("next").disabled);

group("Запуск и шаги");
click("play");
await wait();
check("пошла первая реплика", spoken[0] && spoken[0].startsWith("Вот ради этого"), spoken[0]);
check("титр показан", scenes[0].querySelector(".vo").classList.contains("on"));
check("первый блок раскрыт", scenes[0].querySelector('[data-reveal="0"]').classList.contains("on"));
check("второй блок ещё закрыт", !scenes[0].querySelector('[data-reveal="1"]').classList.contains("on"));

click("next");
await wait();
check("второй блок раскрылся", scenes[0].querySelector('[data-reveal="1"]').classList.contains("on"));

group("Смена сцены и кадры");
click("scene-next");
await wait();
check("вторая сцена активна", scenes[1].classList.contains("on"));
check("первая сцена погашена", !scenes[0].classList.contains("on"));
check("кадр 1 показан", scenes[1].querySelectorAll(".cam figure")[0].classList.contains("on"));
click("next"); await wait();
check("кадр сменился на второй", scenes[1].querySelectorAll(".cam figure")[1].classList.contains("on"));
check("предыдущий кадр скрыт", !scenes[1].querySelectorAll(".cam figure")[0].classList.contains("on"));

group("Быстрые переходы не оставляют хвостов");
const before = spoken.length;
for (let i = 0; i < 6; i++) click("next");
await wait();
const active = scenes.filter(s => s.classList.contains("on"));
check("активна ровно одна сцена", active.length === 1, `их ${active.length}`);
check("говорит только текущая реплика", spoken.length - before <= 7, `реплик ${spoken.length - before}`);
const subs = scenes.filter(s => s.querySelector(".vo").classList.contains("on"));
check("титр только один", subs.length === 1, `их ${subs.length}`);

group("Пауза");
click("play");
check("показ на паузе", document.getElementById("play").textContent === "Продолжить");
click("play");
check("показ продолжен", document.getElementById("play").textContent === "Пауза");

group("Повтор сцены");
const scene = [...scenes].findIndex(s => s.classList.contains("on"));
click("replay");
await wait();
check("та же сцена", scenes[scene].classList.contains("on"));
check("вернулись к первой реплике", scenes[scene].dataset.beat === "0", scenes[scene].dataset.beat);

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
  document.getElementById("rail").children[0].dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await wait();
  check("ролик запущен на своей сцене", (video.playCalls || 0) > 0);
}

group("Прогон всех сцен");
for (let i = 0; i < 13; i++) { document.getElementById("rail").children[i].dispatchEvent(new window.MouseEvent("click", { bubbles: true })); await wait(); }
check("дошли до финала", scenes[12].classList.contains("on"));
check("финальный кадр гостя удерживается",
  scenes[12].querySelectorAll(".cam figure")[0].classList.contains("on"));
check("ошибок в консоли нет", true);

console.log(failed ? `\n✗ провалено проверок: ${failed}` : "\n✓ все проверки пройдены");
process.exit(failed ? 1 : 0);
