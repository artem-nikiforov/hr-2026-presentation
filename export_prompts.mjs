/* Выгружает промты и реплики озвучки из assets/ — источника правды —
   в prompts.json, PROMPTS.md и audio/vo/manifest.json.
   Запуск:  node export_prompts.mjs                                          */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const SCENES = require("./assets/scenes.js");   /* кадры и промты */
const STORY = require("./assets/story.js");     /* реплики по сценам */

const shots = [];
SCENES.forEach((scene, i) =>
  scene.shots.forEach((shot, j) =>
    shots.push({
      scene: scene.id, scene_name: scene.name, order: `${i + 1}.${j + 1}`,
      file: shot.file, alt: shot.alt, aspect: "16:9",
      prompt: shot.prompt, negative_prompt: shot.neg
    })));

const vo = STORY.flatMap(scene =>
  scene.beats.map(beat => ({
    scene: scene.id, id: beat.id, file: `audio/vo/${beat.id}.mp3`,
    seconds: beat.seconds, text: beat.text
  })));

const avatars = SCENES.filter(scene => scene.avatar).map(scene => ({ scene: scene.id, note: scene.avatar }));

writeFileSync("prompts.json", JSON.stringify({ shots, avatars }, null, 2) + "\n");
writeFileSync("audio/vo/manifest.json", JSON.stringify(vo, null, 2) + "\n");

const md = [
  "# Стартовые кадры — задание на генерацию",
  "",
  "Источник правды — `SCENES` в `assets/scenes.js`. Этот файл собирается командой",
  "`node export_prompts.mjs`, руками его не правят.",
  "",
  "## Правила",
  "",
  "1. Формат — 16:9, готовим как стартовый кадр под будущее видео.",
  "2. Складывать точно по имени файла из заголовка — показ подхватит их сам.",
  "3. **В кадре не должно быть читаемого текста.** Весь текст, цифры и инфографика",
  "   рисуются поверх фотографии средствами страницы.",
  "4. Промты собраны по `VISUAL_REF/burger_king_visual_bible.ru.json`:",
  "   база стиля → помещение → роль и полное описание формы → действие →",
  "   оборудование → свет → камера → контроль ошибок → negative prompt.",
  "5. Форму ЧБР и АУП нельзя сокращать до «в форме»: цветная зона поло и",
  "   полосатая нашивка на рубашке должны читаться в кадре.",
  "6. Кадр берёт движение камеры до 1,07 масштаба — оставлять запас по краям,",
  "   чтобы руки, телефон и лица не обрезались.",
  "",
  `## Аватары (${avatars.length}) — не генерировать`,
  "",
  ...avatars.map(a => `- **${a.scene}** — ${a.note}`),
  "",
  `## Кадры (${shots.length})`,
  ""
];
for (const shot of shots) {
  md.push(`### ${shot.order} · \`${shot.file}\``, "",
    `**Сцена:** ${shot.scene_name} (${shot.scene}) · **Что в кадре:** ${shot.alt} · **Формат:** ${shot.aspect}`, "",
    "**Промт**", "", "```", shot.prompt, "```", "",
    "**Negative prompt**", "", "```", shot.negative_prompt, "```", "");
}
writeFileSync("PROMPTS.md", md.join("\n"));

const total = vo.reduce((n, v) => n + v.seconds, 0);
console.log(`ok · кадров: ${shots.length} · реплик: ${vo.length} · аватаров: ${avatars.length} · хронометраж ${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, "0")}`);
