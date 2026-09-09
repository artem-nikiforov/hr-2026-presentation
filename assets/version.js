/* Метка сборки. Обновляется командой npm run bump — руками не правят.
   Показ добавляет её к путям озвучки, музыки, звуков и роликов, чтобы
   браузер не отдавал закэшированные старые файлы. */
(function (root) {
  "use strict";
  root.KU_VERSION = "1788985613";
})(typeof globalThis !== "undefined" ? globalThis : this);
