/* ═══════════════════════════════════════════════════════════════════════
   Появление текста по буквам — реализация контрактов Serega
   (deslop/serega/serega-gentle, deslop/serega/serega-emotional).
   Gentle — для заголовков и предложений. Emotional — только для коротких
   акцентов в 2–4 слова. Оба эффекта одноразовые, без выхода.
   ═══════════════════════════════════════════════════════════════════════ */
(function (root) {
  "use strict";

  const graphemes = value =>
    (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function")
      ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value), s => s.segment)
      : Array.from(value);

  /* Разбиение на буквы с сохранением слов: перенос строки только между слов. */
  function split(el, name) {
    const phrase = el.textContent;
    const frag = el.ownerDocument.createDocumentFragment();
    const units = [];
    let word = null, afterSpace = false;

    for (const g of graphemes(phrase)) {
      const space = /^\s+$/u.test(g);
      if (!word || (!space && afterSpace)) {
        word = el.ownerDocument.createElement("span");
        word.className = name + "__word";
        frag.append(word);
      }
      const unit = el.ownerDocument.createElement("span");
      unit.className = name + "__unit";
      unit.setAttribute("aria-hidden", "true");
      unit.textContent = g;
      word.append(unit);
      units.push(unit);
      afterSpace = space;
    }
    el.setAttribute("aria-label", phrase);   /* фраза целиком остаётся доступной */
    el.replaceChildren(frag);
    return units;
  }

  /* Пружина Serega Emotional: линейная фаза 180 мс, затем 1 Гц с затуханием 10. */
  const SPRING = (() => {
    const w = 2 * Math.PI, total = 0.68, steps = 41, frames = [];
    for (let i = 0; i < steps; i++) {
      const t = total * i / (steps - 1);
      let p;
      if (t <= 0) p = 1;
      else if (t < 0.18) p = 1 - t / 0.18;
      else p = (-1 / 0.18) * Math.sin((t - 0.18) * w) / (Math.exp(10 * (t - 0.18)) * w);
      frames.push({
        opacity: Math.min(1, Math.max(0, 1 - p)),
        transform: `translate3d(0,${(32 * p).toFixed(3)}px,0) scaleY(${(1 - 0.22 * p).toFixed(4)}) rotate(${(12 * p).toFixed(3)}deg)`,
        filter: `blur(${(10 * Math.max(p, 0)).toFixed(3)}px)`,
        offset: i / (steps - 1)
      });
    }
    return frames;
  })();

  function play(el, kind, calm) {
    if (el.dataset.revealed === "1") return [];
    el.dataset.revealed = "1";
    const name = kind === "emotional" ? "serega-emotional" : "serega-gentle";
    el.classList.add(name);
    if (calm) return [];                       /* спокойный режим: статичный текст */

    const units = split(el, name);
    return units.map((unit, i) => {
      if (kind === "emotional") {
        unit.style.opacity = "0";
        return unit.animate(SPRING, { delay: 25 * (i + 1), duration: 680, easing: "linear", fill: "forwards" });
      }
      unit.style.opacity = "0";
      unit.style.transform = "translate3d(0,15px,0)";
      return unit.animate(
        [{ opacity: 0, transform: "translate3d(0,15px,0)" }, { opacity: 1, transform: "translate3d(0,0,0)" }],
        { delay: i * 15, duration: 500, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" });
    });
  }

  /* Внутри показанного блока: крупный акцент — emotional, заголовок — gentle. */
  function revealText(scope, calm) {
    const running = [];
    scope.querySelectorAll(".huge:not([data-count])").forEach(el => running.push(...play(el, "emotional", calm)));
    scope.querySelectorAll(".title").forEach(el => running.push(...play(el, "gentle", calm)));
    return running;
  }

  root.KUReveal = { revealText, play };
  if (typeof module !== "undefined") module.exports = root.KUReveal;
})(typeof globalThis !== "undefined" ? globalThis : this);
