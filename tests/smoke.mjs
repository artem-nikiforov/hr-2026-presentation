/* Проверки согласованности показа. Запуск: node tests/smoke.mjs
   Браузер не нужен: сверяются данные, разметка сцен и поведение таймлайна. */
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCENES = require("../assets/scenes.js");
const STORY = require("../assets/story.js");
const Timeline = require("../assets/timeline.js");
const DURATIONS = require("../assets/durations.js");

let failed = 0;
const check = (name, condition, detail = "") => {
  if (condition) return;
  failed++;
  console.error(`  ✗ ${name}${detail ? " — " + detail : ""}`);
};
const group = name => console.log(`\n${name}`);
const attrs = (html, key) =>
  [...html.matchAll(new RegExp(`data-${key}="(\\d+)"`, "g"))].map(m => Number(m[1]));

group("Данные сцен");
check("13 сцен", STORY.length === 13, `их ${STORY.length}`);
const ids = new Set();
for (const scene of STORY) {
  check(`${scene.id}: есть кадры`, scene.shots.length > 0);
  check(`${scene.id}: есть реплики`, scene.beats.length > 0);
  check(`${scene.id}: есть камера`, Array.isArray(scene.camera) && scene.camera.length === 3);
  check(`${scene.id}: есть глава`, typeof scene.chapter === "string" && scene.chapter.length > 0);
  for (const beat of scene.beats) {
    check(`${beat.id}: уникален`, !ids.has(beat.id));
    ids.add(beat.id);
    check(`${beat.id}: текст не пуст`, beat.text.trim().length > 0);
    check(`${beat.id}: длительность положительна`, beat.seconds > 0);
    if (beat.shot !== undefined)
      check(`${beat.id}: кадр ${beat.shot} существует`, beat.shot < scene.shots.length);
  }
  check(`${scene.id}: первая реплика назначает кадр`, scene.beats[0].shot !== undefined);
}

group("Озвучка");
for (const scene of STORY)
  for (const beat of scene.beats) {
    check(`есть запись ${beat.id}`, existsSync(join(rootDir, "audio/vo", beat.id + ".mp3")));
    check(`есть длительность ${beat.id}`, DURATIONS[beat.id] > 0);
    check(`${beat.id}: показ не короче записи`, beat.seconds >= beat.spoken);
  }
check("реплик столько же, сколько записей",
  STORY.reduce((n, s) => n + s.beats.length, 0) === Object.keys(DURATIONS).length,
  `реплик ${STORY.reduce((n, s) => n + s.beats.length, 0)}, записей ${Object.keys(DURATIONS).length}`);

group("Файлы кадров");
{
  /* Кадра может ещё не быть — показ рисует заглушку с промтом.
     Это не ошибка, но список должен быть на виду. */
  const missing = [];
  for (const scene of SCENES)
    for (const shot of scene.shots)
      if (!existsSync(join(rootDir, shot.file))) missing.push(`${shot.file} — ${shot.alt}`);
  if (missing.length) {
    console.log(`  ждут генерации (${missing.length}), пока показывается заглушка:`);
    missing.forEach(item => console.log(`    · ${item}`));
  } else console.log("  все кадры на месте");
}

group("Разметка привязана к репликам");
for (const scene of STORY) {
  const last = scene.beats.length - 1;
  /* reveal/panel/step — номера реплик; verb/doc/column — порядок элементов,
     их раскрывают cues, поэтому здесь они не сверяются с числом реплик. */
  for (const key of ["reveal", "panel", "step"])
    for (const value of attrs(scene.html, key))
      check(`${scene.id}: data-${key}="${value}" в пределах реплик`, value <= last, `реплик ${scene.beats.length}`);
  for (const cue of scene.cues) {
    const count = (scene.html.match(new RegExp(cue.sel.replace(".", "class=\"[^\"]*"), "g")) || []).length;
    check(`${scene.id}: селектор ${cue.sel} найден`, count > 0);
    check(`${scene.id}: реплика ${cue.at} для ${cue.sel} существует`, cue.at <= last);
    if (cue.to !== undefined) check(`${scene.id}: диапазон ${cue.sel} в пределах`, cue.to < count, `элементов ${count}`);
  }
  if (scene.avatarAt !== undefined) {
    check(`${scene.id}: аватар описан`, Boolean(scene.avatar));
    check(`${scene.id}: реплика аватара существует`, scene.avatarAt <= last);
  }
}

group("Текст на экране");
{
  /* Проверяем каждый текстовый кусок отдельно: между тегами слова
     не склеиваются, а «<em>Человек</em>,» — это не пробел перед запятой. */
  const chunks = html => html
    .replace(/\$\{[^}]*\}/g, "\u0000")
    .split(/<[^>]+>/)
    .map(part => part.replace(/&[a-z]+;/g, " ").trim())
    .filter(part => part && !part.includes("\u0000"));

  for (const scene of STORY)
    for (const text of chunks(scene.html)) {
      const glued = text.match(/[а-яё][А-ЯЁ]/g);
      check(`${scene.id}: слова не слиплись`, !glued, `${glued && glued.join(", ")} в «${text}»`);
      const noSpace = text.match(/[а-яёa-z][.,;:!?][а-яёА-ЯЁa-zA-Z]/g);
      check(`${scene.id}: после знака есть пробел`, !noSpace, `${noSpace && noSpace.join(", ")} в «${text}»`);
      const spaceBefore = text.match(/\s[.,;:!?]/g);
      check(`${scene.id}: нет пробела перед знаком`, !spaceBefore, `в «${text}»`);
      check(`${scene.id}: нет двойных пробелов`, !/ {2}/.test(text), `в «${text}»`);
    }

  for (const scene of STORY)
    for (const beat of scene.beats) {
      check(`${beat.id}: реплика без двойных пробелов`, !/ {2}/.test(beat.text));
      check(`${beat.id}: реплика без пробела перед знаком`, !/\s[.,;:!?]/.test(beat.text));
    }
}

group("Музыкальные указания");
{
  const cues = STORY.map(scene => scene.music).filter(Boolean);
  check("луп заводится в первой сцене", STORY[0].music && STORY[0].music.track === "bed",
    JSON.stringify(STORY[0].music));
  check("музыка обрывается перед «НО…»", STORY[6].music && STORY[6].music.pause === true,
    JSON.stringify(STORY[6].music));
  check("музыка возвращается сразу на следующей сцене",
    STORY[7].music && STORY[7].music.resume === true, JSON.stringify(STORY[7].music));
  for (const cue of cues) {
    const keys = Object.keys(cue);
    check(`указание ${JSON.stringify(cue)} понятно плееру`,
      keys.length === 1 && ["track", "pause", "resume", "stop"].includes(keys[0]));
  }
  check("мышеловка на месте", STORY[11].html.includes("mouse-run") && STORY[11].html.includes("trap"));
  const tracks = cues.filter(c => c.track).map(c => c.track);
  check("все дорожки известны звуку",
    tracks.every(t => ["bed", "epic", "confident", "warm"].includes(t)), tracks.join(", "));
}

group("Шкала графика соответствует данным");
/* берём только столбцы графика: на сцене есть и другие счётчики */
const chart = STORY[10].html.slice(STORY[10].html.indexOf("honest-chart"));
const heights = [...chart.matchAll(/height:([\d.]+)%/g)].map(m => Number(m[1]));
const values = [...chart.matchAll(/data-count="(\d+)"/g)].map(m => Number(m[1]));
check("четыре столбца", heights.length === 4, `их ${heights.length}`);
const max = Math.max(...values);
values.forEach((value, i) =>
  check(`столбец ${2023 + i}: ${value} → ${heights[i]}%`,
    Math.abs(heights[i] - value / max * 100) < 0.51, `ожидалось ${(value / max * 100).toFixed(1)}%`));

group("Таймлайн");
{
  const tl = new Timeline(STORY);
  check("стартует в состоянии готовности", tl.phase === "ready");
  tl.go(0);
  check("первая реплика первой сцены", tl.index === 0 && tl.beat === 0);

  /* Ручной режим: реплики не уезжают сами, даже когда голос закончился. */
  tl.finishVoice(tl.token);
  for (let i = 0; i < 400; i++) tl.tick(0.1);
  check("вручную реплика не переключается сама", tl.beat === 0);

  /* Автопоказ: та же ситуация двигает показ дальше. */
  const auto = new Timeline(STORY);
  auto.go(0); auto.setAuto(true);
  auto.finishVoice(auto.token);
  for (let i = 0; i < 200; i++) auto.tick(0.1);
  check("в автопоказе реплика переключается", auto.beat > 0 || auto.index > 0);

  /* Шаг назад с начала сцены ведёт к последней реплике предыдущей. */
  const back = new Timeline(STORY);
  back.go(3, 0); back.previous();
  check("шаг назад к последней реплике предыдущей сцены",
    back.index === 2 && back.beat === STORY[2].beats.length - 1,
    `получили ${back.index}/${back.beat}`);

  const many = STORY.findIndex(scene => scene.beats.length > 2);
  const replay = new Timeline(STORY);
  replay.go(many, 0); replay.next(); replay.next(); replay.replay();
  check("повтор сцены возвращает к первой реплике",
    replay.index === many && replay.beat === 0, `получили ${replay.index}/${replay.beat}`);
}

console.log(failed ? `\n✗ провалено проверок: ${failed}` : "\n✓ все проверки пройдены");
process.exit(failed ? 1 : 0);
