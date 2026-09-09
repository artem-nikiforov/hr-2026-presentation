/* Длительности записанной озвучки в секундах. Файл собирается командой
   node import_voice.mjs — руками не правят. Показ строит по ним хронометраж. */
(function (root) {
  "use strict";
  const DURATIONS = {
  s01_beat1: 3.16,
  s01_beat2: 2.59,
  s02_beat1: 5.41,
  s02_beat2: 3.4,
  s02_beat3: 8.2,
  s03_beat1: 2.51,
  s03_beat2: 2.43,
  s03_beat3: 4.91,
  s04_beat1: 7.31,
  s04_beat2: 3.97,
  s05_beat1: 4.83,
  s05_beat2: 4.44,
  s05_beat3: 6.77,
  s05_beat4: 5.96,
  s06_beat1: 4.52,
  s07_beat1: 6.43,
  s08_beat1: 9.33,
  s08_beat2: 6.35,
  s09_beat1: 8.05,
  s09_beat2: 5.8,
  s10_beat1: 5.07,
  s10_beat2: 3.32,
  s10_beat3: 6.69,
  s11_beat1: 8.28,
  s11_beat2: 8.36,
  s11_beat3: 6.27,
  s12_beat1: 8.99,
  s12_beat2: 15.73,
  s12_beat3: 12.83,
  s12_beat4: 9.25,
  s13_beat1: 5.41,
  s13_beat2: 7.97,
  s13_kitchen: 16.12,
  s13_qr: 3.87
};
  root.KU_DURATIONS = DURATIONS;
  if (typeof module !== "undefined") module.exports = DURATIONS;
})(typeof globalThis !== "undefined" ? globalThis : this);
