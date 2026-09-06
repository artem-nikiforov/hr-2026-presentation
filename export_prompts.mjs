/* Выгружает промты и реплики озвучки из index.html — единственного источника
   правды — в prompts.json, PROMPTS.md и audio/vo/manifest.json.
   Запуск:  node export_prompts.mjs                                          */
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const block = html.split("<script>")[1].split("</script>")[0];
const SCENES = new Function(block + "\nreturn SCENES;")();

const shots = [];
SCENES.forEach((s, i) =>
  s.shots.forEach((sh, j) =>
    shots.push({
      scene: s.id, scene_name: s.name, order: `${i + 1}.${j + 1}`,
      file: sh.file, alt: sh.alt, aspect: "16:9",
      prompt: sh.prompt, negative_prompt: sh.neg
    })));

const vo = SCENES.flatMap(s =>
  s.vo.map(v => ({ scene: s.id, id: v.id, file: `audio/vo/${v.id}.mp3`, text: v.text })));

const avatars = SCENES.filter(s => s.avatar).map(s => ({ scene: s.id, note: s.avatar }));

writeFileSync("prompts.json", JSON.stringify({ shots, avatars }, null, 2) + "\n");
writeFileSync("audio/vo/manifest.json", JSON.stringify(vo, null, 2) + "\n");

const md = [
  "# Стартовые кадры — задание на генерацию",
  "",
  "Источник правды — `SCENES` в `index.html`. Этот файл собирается командой",
  "`node export_prompts.mjs`, руками его не правят.",
  "",
  "## Правила",
  "",
  "1. Формат — 16:9, готовим как стартовый кадр под будущее видео.",
  "2. Складывать точно по имени файла из заголовка — страница подхватит их сама.",
  "3. **В кадре не должно быть читаемого текста.** Весь текст, цифры и инфографика",
  "   рисуются на странице через SVG/CSS поверх фотографии.",
  "4. Промты собраны по `VISUAL_REF/burger_king_visual_bible.ru.json`:",
  "   база стиля → помещение → роль и полное описание формы → действие →",
  "   оборудование → свет → камера → контроль ошибок → negative prompt.",
  "5. Форму ЧБР и АУП нельзя сокращать до «в форме»: цветная зона поло и",
  "   полосатая нашивка на рубашке должны читаться в кадре.",
  "",
  `## Аватары (${avatars.length}) — не генерировать`,
  "",
  ...avatars.map(a => `- **${a.scene}** — ${a.note}`),
  "",
  `## Кадры (${shots.length})`,
  ""
];
for (const s of shots) {
  md.push(`### ${s.order} · \`${s.file}\``, "",
    `**Сцена:** ${s.scene_name} (${s.scene}) · **Что в кадре:** ${s.alt} · **Формат:** ${s.aspect}`, "",
    "**Промт**", "", "```", s.prompt, "```", "",
    "**Negative prompt**", "", "```", s.negative_prompt, "```", "");
}
writeFileSync("PROMPTS.md", md.join("\n"));
console.log(`ok · кадров: ${shots.length} · реплик: ${vo.length} · аватаров: ${avatars.length}`);
