/* Проставляет версию локальным стилям и скриптам в index.html, чтобы браузер
   и кэш GitHub Pages не отдавали старую сборку после правок.
   Запуск: npm run bump                                                      */
import { readFileSync, writeFileSync, statSync } from "node:fs";

const stamp = String(Math.floor(Date.now() / 1000));
let html = readFileSync("index.html", "utf8");
let touched = 0;

html = html.replace(/(src|href)="(assets\/[^"?]+)(\?v=\d+)?"/g, (all, attr, path) => {
  try { statSync(path); } catch { return all; }      /* файла нет — не трогаем */
  touched++;
  return `${attr}="${path}?v=${stamp}"`;
});

writeFileSync("index.html", html);

/* Аудио и видео грузятся не из разметки, а из кода — им метка нужна
   отдельно, иначе браузер продолжит играть закэшированный старый файл. */
writeFileSync("assets/version.js",
`/* Метка сборки. Обновляется командой npm run bump — руками не правят.
   Показ добавляет её к путям озвучки, музыки, звуков и роликов, чтобы
   браузер не отдавал закэшированные старые файлы. */
(function (root) {
  "use strict";
  root.KU_VERSION = "${stamp}";
})(typeof globalThis !== "undefined" ? globalThis : this);
`);

console.log(`версия ${stamp} проставлена: ссылок в index.html ${touched}, метка для медиа обновлена`);
