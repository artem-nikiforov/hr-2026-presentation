/* ═══════════════════════════════════════════════════════════════════════
   Озвучка. Сначала ищем записанный файл audio/vo/<id>.mp3; если его нет —
   репетиционный синтез речи браузера. Любое воспроизведение обрывается
   одной операцией, и обещание при этом всегда завершается: иначе быстрый
   переход оставил бы висящее ожидание и чужой голос поверх новой сцены.
   ═══════════════════════════════════════════════════════════════════════ */
(function (root) {
  "use strict";

  class Voice {
    constructor() {
      this.enabled = true;
      this.element = null;
      this.settle = null;
      this.voice = null;
      if (window.speechSynthesis) {
        const pick = () => {
          const all = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
          this.voice = all.find(v => /^ru/i.test(v.lang)) || null;
        };
        pick();
        speechSynthesis.addEventListener("voiceschanged", pick);
      }
    }

    /* Оценка длительности, пока нет записи: 380 мс на слово. Это ориентир
       репетиции, а не хронометраж — реальное время даст MP3. */
    estimate(text) { return Math.max(1500, text.split(/\s+/).length * 380); }

    play(id, text) {
      this.cancel();
      if (!this.enabled) return this.wait(this.estimate(text));
      return this.file(id).then(ok => ok ? undefined : this.speak(text));
    }

    wait(ms) {
      return new Promise(resolve => {
        const timer = setTimeout(() => { this.settle = null; resolve(); }, ms);
        this.settle = () => { clearTimeout(timer); resolve(); };
      });
    }

    file(id) {
      return new Promise(resolve => {
        const audio = new Audio("audio/vo/" + id + ".mp3");
        this.element = audio;                       /* регистрируем сразу, до play() */
        let closed = false;
        const finish = ok => {
          if (closed) return;
          closed = true;
          audio.onended = audio.onerror = null;
          if (this.element === audio) this.element = null;
          this.settle = null;
          resolve(ok);
        };
        audio.onended = () => finish(true);
        audio.onerror = () => finish(false);
        this.settle = () => { try { audio.pause(); } catch (e) {} finish(true); };
        audio.play().catch(() => finish(false));
      });
    }

    speak(text) {
      return new Promise(resolve => {
        if (!window.speechSynthesis) { this.settle = null; setTimeout(resolve, this.estimate(text)); return; }
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ru-RU";
        if (this.voice) utterance.voice = this.voice;
        let closed = false;
        const finish = () => {
          if (closed) return;
          closed = true;
          clearTimeout(guard);
          this.settle = null;
          resolve();
        };
        /* Синтез в части браузеров не присылает end после cancel — страхуемся. */
        const guard = setTimeout(finish, this.estimate(text) + 4000);
        utterance.onend = finish;
        utterance.onerror = finish;
        this.settle = () => { try { speechSynthesis.cancel(); } catch (e) {} finish(); };
        speechSynthesis.speak(utterance);
      });
    }

    pause() {
      if (this.element) { try { this.element.pause(); } catch (e) {} }
      if (window.speechSynthesis && speechSynthesis.speaking) { try { speechSynthesis.pause(); } catch (e) {} }
    }
    resume() {
      if (this.element) { this.element.play().catch(() => {}); }
      if (window.speechSynthesis && speechSynthesis.paused) { try { speechSynthesis.resume(); } catch (e) {} }
    }
    cancel() {
      const settle = this.settle;
      this.settle = null;
      if (this.element) { try { this.element.pause(); } catch (e) {} this.element = null; }
      if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) {} }
      if (settle) settle();
    }
    set(on) { this.enabled = on; if (!on) this.cancel(); }
  }

  root.KUVoice = Voice;
})(typeof globalThis !== "undefined" ? globalThis : this);
