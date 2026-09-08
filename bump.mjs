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
console.log(`версия ${stamp} проставлена, файлов: ${touched}`);
