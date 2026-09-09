/* Раскладывает записанную озвучку из «озвучка конфа/» в audio/vo/<id>.mp3
   и снимает реальные длительности в assets/durations.js.
   Запуск: node import_voice.mjs                                            */
import { copyFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";

const SOURCE = "озвучка конфа";

/* Соответствие записей репликам. Порядок задаёт показ, имена — как записано. */
const MAP = {
  s01_beat1: "Вот ради этого МММ.mp3",
  s01_beat2: "А как мы создаём.mp3",
  s02_beat1: "Чтобы Гость.mp3",
  s02_beat2: "Закупает.mp3",
  s02_beat3: "Но за каждым идеально собранным.mp3",
  s03_beat1: "более восьмисот.mp3",
  s03_beat2: "Более двенадцати.mp3",
  s03_beat3: "Как сделать так.mp3",
  s04_beat1: "Давайте вспомним.mp3",
  s04_beat2: "Паника?.mp3",
  s05_beat1: "В двадцать третьем с нуля.mp3",
  s05_beat2: "в двадцать четвертом.mp3",
  s05_beat3: "в двадцать пятом.mp3",
  s05_beat4: "а в двадцать шестом.mp3",
  s06_beat1: "звучит эпично.mp3",
  s07_beat1: "Но Миссия ещё не завершена.mp3",
  s08_beat1: "Во-первых доступность.mp3",
  s08_beat2: "А в некоторых ресторанах.mp3",
  s09_beat1: "Мы спускаемся на землю.mp3",
  s09_beat2: "И внедряем агентов.mp3",
  s10_beat1: "А что с источником правды.mp3",
  s10_beat2: "Формируем реестр.mp3",
  s10_beat3: "Потому что автоматизированный.mp3",
  s11_beat1: "мы поставили искуственный.mp3",
  s11_beat2: "Собственные учебные материалы.mp3",
  s11_beat3: "В двадцать шестом — около трёхсот.mp3",
  s12_beat1: "Успеваем ли.mp3",
  s12_beat2: "Автоматизация процедуры.mp3",
  s12_beat3: "Раньше курс переводил наставник.mp3",
  s12_beat4: "Теперь сотрудник сам выбирает язык.mp3",
  s13_beat1: "Потому что мы создаем.mp3",
  s13_beat2: "Чтобы гости получали.mp3"
};

const seconds = file =>
  Number(execFileSync("ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
    { encoding: "utf8" }).trim());

mkdirSync("audio/vo", { recursive: true });

/* 1. Раскладываем записи из папки студии — но только если файл в audio/vo
      старше исходника. Положенную вручную запись не затираем. */
let copied = 0, missing = 0;
for (const [id, name] of Object.entries(MAP)) {
  const from = `${SOURCE}/${name}`;
  const to = `audio/vo/${id}.mp3`;
  if (!existsSync(from)) { console.error(`нет записи студии: ${name}`); missing++; continue; }
  if (existsSync(to) && statSync(to).mtimeMs > statSync(from).mtimeMs) continue;   /* заменена вручную */
  copyFileSync(from, to);
  copied++;
}

/* 2. Длительности снимаем с того, что реально лежит в audio/vo, — иначе
      заменённая вручную запись играет дольше отведённого ей времени. */
const durations = {};
let total = 0;
for (const file of readdirSync("audio/vo").filter(name => name.endsWith(".mp3")).sort()) {
  const id = file.replace(/\.mp3$/, "");
  durations[id] = Number(seconds(`audio/vo/${file}`).toFixed(2));
  total += durations[id];
}

writeFileSync("assets/durations.js",
`/* Длительности записанной озвучки в секундах. Файл собирается командой
   node import_voice.mjs — руками не правят. Показ строит по ним хронометраж. */
(function (root) {
  "use strict";
  const DURATIONS = ${JSON.stringify(durations, null, 2).replace(/"([a-z0-9_]+)":/g, "$1:")};
  root.KU_DURATIONS = DURATIONS;
  if (typeof module !== "undefined") module.exports = DURATIONS;
})(typeof globalThis !== "undefined" ? globalThis : this);
`);

console.log(`записей в audio/vo: ${Object.keys(durations).length}, скопировано из студии: ${copied}, не найдено: ${missing}`);
console.log(`хронометраж озвучки: ${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, "0")}`);
