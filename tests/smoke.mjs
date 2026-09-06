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

group("Файлы кадров");
for (const scene of SCENES)
  for (const shot of scene.shots)
    check(`есть ${shot.file}`, existsSync(join(rootDir, shot.file)));

group("Разметка привязана к репликам");
for (const scene of STORY) {
  const last = scene.beats.length - 1;
  for (const key of ["reveal", "panel", "milestone", "step"])
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

group("Шкала графика соответствует данным");
const heights = [...STORY[10].html.matchAll(/height:([\d.]+)%/g)].map(m => Number(m[1]));
const values = [...STORY[10].html.matchAll(/data-count="(\d+)"/g)].map(m => Number(m[1]));
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
