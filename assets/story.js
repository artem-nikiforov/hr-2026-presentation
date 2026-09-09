(function (root) {
  'use strict';
  /* ═══════════════════════════════════════════════════════════════════════
     Режиссура показа. Тексты реплик — ровно те, что записаны в audio/vo/:
     менять их нельзя, не переписав озвучку. Надписи на экране взяты из
     колонок «Что в кадре» и «Озвучка» исходного сценария, вместе с шутками.
     Длительность каждой реплики — из assets/durations.js, hold — пауза
     после неё, чтобы зритель успел дочитать.
     ═══════════════════════════════════════════════════════════════════════ */
  const source = typeof module !== 'undefined' ? require('./scenes.js') : root.KU_SCENES;
  const durations = typeof module !== 'undefined' ? require('./durations.js') : root.KU_DURATIONS;

  const show = (beat, html, cls = '') => `<div class="reveal ${cls}" data-reveal="${beat}">${html}</div>`;
  const kicker = text => `<p class="kicker">${text}</p>`;
  const beat = (text, extra = {}) => ({ text, hold: 0.6, ...extra });

  const chapters = [
    'Ради гостя', 'Ради гостя', 'Ради гостя',
    'Своя система', 'Своя система', 'Своя система',
    'Честно о граблях', 'Честно о граблях', 'Честно о граблях',
    'Что уже работает', 'Что уже работает', 'Что уже работает',
    'Ради гостя'
  ];

  const stories = [
    /* ── s01 · «М-м-м» ────────────────────────────────────────────── */
    {
      camera: [0.4, -0.3, 1.06],
      music: { track: 'bed' },      /* луп заводится с первой сцены */
      html: `<div class="layer hero-copy">
        ${show(0, '<p class="huge steps">М-м-м</p>')}
        ${show(1, '<p class="stamp">Беззаботное удовольствие</p>')}
      </div>`,
      beats: [
        beat('Вот ради этого «м-м-м» здесь всё и вертится.', { sound: 'crunch', lead: 1.1 }),
        beat('А как мы создаём это «м-м-м»?', { sound: 'rewind', hold: 0.3 })
      ]
    },

    /* ── s02 · Команда творит магию ───────────────────────────────── */
    {
      camera: [-.6, .2, 1.05],
      html: `<div class="layer lower-copy">
        <div class="verbs">${['Закупает', 'Везёт', 'Жарит', 'Улыбается']
          .map((word, i) => `<p class="verb" data-verb="${i}">${word}</p>`).join('')}</div>
        ${show(2, '<p class="thesis">За каждым Воппером стоит <em>Человек</em>,<br>который сначала научился делать всё правильно</p>')}
      </div>`,
      cues: [{ at: 1, sel: '.verb', stagger: 820, spotlight: true }],
      beats: [
        beat('Чтобы гость получил беззаботное удовольствие, команда БК ежедневно творит магию.', { shot: 0 }),
        beat('Закупает, везёт, жарит, улыбается.', { shot: 1, sound: 'beat' }),
        beat('Но за каждым идеально собранным Воппером стоит человек, который сначала научился делать всё правильно.', { shot: 2 })
      ]
    },

    /* ── s03 · Муравейник ─────────────────────────────────────────── */
    {
      camera: [-1.6, .5, 1.14],   /* усиленный проход по залу */
      html: `<div class="layer">
        <div class="stats">
          ${show(0, '<div class="stat"><span class="pre">более</span><div class="v" data-count="900">900</div><p class="c">ресторанов</p></div>')}
          ${show(1, '<div class="stat"><span class="pre">более</span><div class="v" data-count="24000">24 000</div><p class="c">человек</p></div>')}
        </div>
        ${show(2, '<p class="question">Как сделать так, чтобы эта огромная машина<br>работала как единый организм?</p>')}
      </div>`,
      beats: [
        beat('Более восьмисот восьмидесяти ресторанов.', { sound: 'tick' }),
        beat('Более двенадцати тысяч сотрудников.', { sound: 'tick' }),
        beat('Как сделать так, чтобы эта огромная машина работала как единый организм?', { hold: 1 })
      ]
    },

    /* ── s04 · 2023: бренд ушёл ───────────────────────────────────── */
    {
      camera: [1.5, .9, 1.24],   /* заметный наезд: кадр «съезжает» на зрителя */
      music: { track: 'epic' },     /* «резкий переход на эпичную музыку», если дорожка есть */
      html: `<div class="layer">
        <div class="ladder-2022">
          <span class="rung-label">2022 · BK Link</span>
          <div class="lost-programs" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        </div>
        ${show(0, '<h2 class="title gone">Бренд ушёл</h2>')}
        ${show(1, '<p class="thesis">Паника? Нет.<br>Мы начали строить самолёт <em>прямо в полёте</em></p>')}
      </div>`,
      beats: [
        beat('Давайте вспомним двадцать третий. Глобальный бренд ушёл, а вместе с ним — все наши учебные программы.', { sound: 'cricket', lead: 0.2 }),
        beat('Паника? Нет. Мы просто начали строить самолёт прямо в полёте.', { sound: 'liftoff', hold: 0.8 })
      ]
    },

    /* ── s05 · Лесенка должностей загорается ──────────────────────── */
    {
      camera: [-.3, .2, 1.045],
      html: `<div class="layer stairs-layout">
        ${kicker('Лесенка должностей')}
        <div class="stairs">${[
          ['2023', 'ЧБР · МС', '4 трека · 120 артефактов'],
          ['2024', 'ЗД · ДР', '4 трека · 300 артефактов'],
          ['2025', 'Повара · НУ · ТУ · ОД', '5 треков · 400 артефактов · 5 языков'],
          ['2026', 'Кассиры · Курьеры · Операторы КЦ', 'Охватили всех']
        ].map(([year, roles, meta], i) => `
          <div class="step" data-step="${i}" style="--h:${(i + 1) * 22}%">
            <span class="step-year">${year}</span>
            <span class="step-roles">${roles}</span>
            <span class="step-meta${i === 3 ? ' all' : ''}">${meta}</span>
          </div>`).join('')}</div>
      </div>`,
      beats: [
        beat('В двадцать третьем с нуля создали треки для ЧБР и МС.', { sound: 'step' }),
        beat('В двадцать четвёртом добавили ЗД и ДР.', { sound: 'step' }),
        beat('В двадцать пятом — поваров, НУ, ТУ и ОД.', { sound: 'step' }),
        beat('А в двадцать шестом закрыли вообще всех: от кассиров до операторов контактного центра.', { sound: 'step', hold: 1.2 })
      ]
    },

    /* ── s06 · 100% ролей. Тадам! ─────────────────────────────────── */
    {
      camera: [0, .2, 1.045],
      html: `<div class="layer center coverage">
        <div class="coverage-ring">
          <svg viewBox="0 0 240 240" aria-hidden="true">
            <circle class="ring-track" cx="120" cy="120" r="108"/>
            <circle class="ring-fill" pathLength="1" cx="120" cy="120" r="108"/>
          </svg>
          <p class="huge" data-count="100" data-suffix="%">100%</p>
        </div>
        ${show(0, '<p class="stamp">100% ролей охвачено</p>')}
        <div class="confetti" data-confetti aria-hidden="true"></div>
      </div>`,
      beats: [beat('Звучит эпично. Сто процентов ролей охвачено. Тадам!', { sound: 'tada', hold: 1.4 })]
    },

    /* ── s07 · НО… ────────────────────────────────────────────────── */
    {
      camera: [0, 0, 1.02],
      music: { pause: true },       /* «Музыка обрывается» — резко, перед «НО…» */
      html: `<div class="layer pause-copy">
        ${show(0, '<p class="huge plain">НО…</p>')}
      </div>`,
      beats: [beat('Но… миссия ещё не завершена. И тут мы честно расскажем, где мы наступили на грабли.', { sound: 'scratch', hold: 0.5 })]
    },

    /* ── s08 · Наши грабли ────────────────────────────────────────── */
    {
      camera: [0, 0, 1.025],
      music: { resume: true },                 /* после обрыва на «НО…» музыка возвращается здесь */
      backdrop: { kind: 'gradient', at: 0 },   /* на реплике про СМС фотографию сменяет градиент */
      html: `<div class="layer issue-layout">
        ${kicker('Наши грабли · доступность LMS')}
        <div class="issue-panels">
          <section class="split" data-panel="0">
            <div class="split-copy">
              <h2 class="title sm">Теряется среди<br>всего остального</h2>
              <p class="thesis">Мы создали крутые треки, но поняли:<br>толку от них немного,<br>если до них не добраться</p>
            </div>
            <div class="phone" aria-label="Экран сообщений в телефоне сотрудника">
              <div class="phone-top"><span class="phone-time">9:41</span><span class="phone-icons">●●●</span></div>
              <p class="phone-title">Сообщения</p>
              <div class="chats">
                <div class="chat"><span class="ava" data-a="1">М</span><div><b>Мама</b><p>ты покушал?</p></div><time>9:38</time></div>
                <div class="chat"><span class="ava" data-a="2">SM</span><div><b>SuperMarket</b><p>−40% на всё до конца недели!</p></div><time>9:21</time></div>
                <div class="chat target"><span class="ava" data-a="3">БК</span><div><b>Обучение</b><p>Пройди курс «Сборка Воппера» до пятницы</p></div><time>9:07</time></div>
                <div class="chat"><span class="ava" data-a="4">HR</span><div><b>HR-бот</b><p>Поздравляем с днём рождения! 🎉</p></div><time>8:55</time></div>
                <div class="chat"><span class="ava" data-a="5">PV</span><div><b>Пункт выдачи</b><p>Ваша посылка уже ждёт вас</p></div><time>8:40</time></div>
                <div class="chat"><span class="ava" data-a="6">Б</span><div><b>Банк</b><p>Списание 349 ₽. Баланс 2 140 ₽</p></div><time>8:12</time></div>
              </div>
            </div>
          </section>
          <section data-panel="1">
            <h2 class="title sm">Wi-Fi ловит<br>только на потолке</h2>
            <p class="thesis">Если встать на цыпочки</p>
            <svg class="wifi-signal" viewBox="0 0 100 74" aria-hidden="true">
              <path class="arc" style="--i:2" d="M12 24Q50 -8 88 24"/>
              <path class="arc" style="--i:1" d="M25 38Q50 16 75 38"/>
              <path class="arc" style="--i:0" d="M39 52Q50 42 61 52"/>
              <circle cx="50" cy="64" r="3.4"/>
            </svg>
          </section>
        </div>
      </div>`,
      beats: [
        beat('Во-первых, доступность. Мы создали крутые треки, но поняли: толку от них немного, если до них не добраться.', { sound: 'swipe' }),
        beat('А в некоторых ресторанах Wi-Fi ловит только на потолке, если встать на цыпочки.', { sound: 'nosignal' })
      ]
    },

    /* ── s09 · Опыт из рук в руки ─────────────────────────────────── */
    {
      camera: [.5, -.15, 1.05],
      music: { track: 'confident' }, /* «Возвращается бодрая, уверенная музыка» */
      html: `<div class="layer lower-copy">
        ${kicker('Что мы делаем')}
        <div class="hands" aria-hidden="true"><i></i><span></span><i></i></div>
        <div class="solution-panels">
          <section data-panel="0">
            <h2 class="title sm">Наставничество</h2>
            <p class="thesis">Опыт передаётся из рук в руки,<br>даже если интернет завис</p>
          </section>
          <section data-panel="1">
            <h2 class="title sm">Агенты обучения</h2>
            <p class="thesis">Профи из ресторанов. Знают, как сделать<br>правдивое и практичное обучение,<br>и передают опыт из рук в руки</p>
          </section>
        </div>
      </div>`,
      beats: [
        beat('Мы спускаемся на землю. Перезапускаем наставничество, чтобы опыт передавался из рук в руки, даже если интернет завис.', { shot: 0, sound: 'handoff' }),
        beat('И внедряем агентов обучения — людей в ресторанах, которые доводят обучение до результата.', { shot: 1, sound: 'handoff' })
      ]
    },

    /* ── s10 · Укрощение хаоса ────────────────────────────────────── */
    {
      camera: [-.4, .15, 1.05],
      html: `<div class="layer docs-layout">
        ${kicker('Укрощение хаоса · реестр и база знаний')}
        <div class="document-machine">
          <div class="document-stack">${[
            'Регламент_v1', 'Регламент_v2_final', 'Регламент_v3_точно_финал', 'Регламент_v3_финал(1)'
          ].map((name, i) => `<div class="moving-doc" data-doc="${i}"><span class="paper-icon" aria-hidden="true"></span>${name}</div>`).join('')}</div>
          <div class="registry">
            <span class="registry-mark" aria-hidden="true">✓</span>
            <h3>База знаний</h3>
            <p>Одна версия правды</p>
            <div class="registry-properties">
              ${show(1, '<span>Реестр процессов</span>')}
              ${show(1, '<span>Владелец · дата актуализации</span>')}
            </div>
          </div>
        </div>
        ${show(2, '<p class="thesis">Автоматизированный хаос останется хаосом.<br>Сначала фундамент — <em>потом ракеты</em></p>')}
      </div>`,
      cues: [{ at: 1, sel: '.moving-doc', cls: 'filed', stagger: 700 }],
      beats: [
        beat('А что с источником правды? Прямо сейчас мы наводим порядок в регламентах.'),
        beat('Формируем реестр процессов и наполняем базу знаний.', { sound: 'bricks' }),
        beat('Потому что автоматизированный хаос останется хаосом. Сначала фундамент — потом ракеты.', { sound: 'rocket', hold: 0.9 })
      ]
    },

    /* ── s11 · ИИ и автоматизация ─────────────────────────────────── */
    {
      camera: [.5, .1, 1.05],
      html: `<div class="layer chart-layout">
        ${kicker('ИИ и автоматизация · что уже работает')}
        ${show(0, `<div class="ai-gain">
          <p class="gain-main">Методологи работают <em>вдвое быстрее</em></p>
          <p class="gain-side">и сэкономили более <strong data-count="10">10</strong> млн ₽ на производстве контента</p>
        </div>`)}
        <div class="honest-chart" role="img" aria-label="Артефакты по годам: 2023 — 4 трека, 120 артефактов; 2024 — 4 трека, 300 артефактов; 2025 — 5 треков, 400 артефактов, треки ЧБР на 5 языках; 2026 — 5 треков, около 300 артефактов, треки ЧБР на 8 языках.">
          ${[120, 300, 400, 300].map((value, i) => `
          <div class="chart-column" data-column="${i}">
            <div class="plot"><div class="plot-bar" style="height:${value / 4}%">
              <span data-count="${value}"${i === 3 ? ' data-prefix="~"' : ''}>${i === 3 ? '~' : ''}${value}</span>
            </div></div>
            <span class="chart-year">${2023 + i}</span>
            <span class="chart-meta">${i < 2 ? '4 трека' : '5 треков'}${i === 2 ? ' · ЧБР на 5 языках' : i === 3 ? ' · ЧБР на 8 языках' : ''}</span>
          </div>`).join('')}
        </div>
      </div>`,
      cues: [
        { at: 1, sel: '.chart-column', from: 0, to: 2, stagger: 900 },
        { at: 2, sel: '.chart-column', from: 3, to: 3 }
      ],
      beats: [
        beat('Мы поставили искусственный интеллект на службу методологам. Рутину теперь делает ИИ — это ускоряет работу команды в два раза.', { sound: 'sparkle' }),
        beat('Собственные учебные материалы: сто двадцать артефактов в двадцать третьем, триста в двадцать четвёртом, четыреста в двадцать пятом.'),
        beat('В двадцать шестом — около трёхсот артефактов. А наши треки теперь говорят на восьми языках вместо пяти.', { hold: 1 })
      ]
    },

    /* ── s12 · Было → стало ───────────────────────────────────────── */
    {
      camera: [-.4, .2, 1.045],
      avatarAt: 0,
      html: `<div class="layer results-layout">
        <div class="result-panels">
          <section data-panel="0">
            <p class="result-index">ИПР · индивидуальный план развития</p>
            <div class="comparison">
              <span class="before">3 часа</span><span class="compare-arrow">→</span><strong>20 минут</strong>
            </div>
            <div class="time-track" aria-hidden="true"><i></i></div>
            <p class="punch big">Экономия 2,5 часа!</p>
          </section>
          <section data-panel="1">
            <p class="result-index">Перевод на новую должность · оценка → обучение → перевод</p>
            <div class="comparison">
              <span class="before">36,75%</span><span class="compare-arrow">→</span><strong>90%</strong>
            </div>
            <div class="compliance-track" aria-hidden="true"><i></i><b></b></div>
            <p class="punch">Ни одна необученная мышь не проскочит</p>
            <div class="mouse-run" aria-hidden="true">
              <svg class="mouse" viewBox="0 0 82 44">
                <path class="tail" d="M14 30 C2 30 2 18 9 13 C13 10 18 12 18 16"/>
                <ellipse class="body" cx="40" cy="28" rx="23" ry="13"/>
                <circle class="ear" cx="52" cy="12" r="8.5"/>
                <circle class="ear-in" cx="52" cy="12" r="4.6"/>
                <circle class="head" cx="61" cy="22" r="11.5"/>
                <circle class="eye" cx="66" cy="19" r="1.9"/>
                <circle class="nose" cx="72.4" cy="24.4" r="2.1"/>
                <path class="whisker" d="M71 27 L79 30 M71.5 24 L80 23 M70.5 21.5 L78 18"/>
                <path class="paw" d="M31 40 v3.2 M44 40 v3.2"/>
              </svg>
              <svg class="trap" viewBox="0 0 96 58">
                <rect class="base" x="3" y="38" width="90" height="16" rx="3"/>
                <path class="grain" d="M12 43h72M12 48h56"/>
                <path class="spring" d="M14 38 a4.5 4.5 0 1 1 0 -9 a4.5 4.5 0 1 1 0 -9"/>
                <path class="bar" d="M14 34 L14 6 L80 6 L80 34"/>
                <g class="cheese">
                  <path d="M58 38 L58 27 L79 27 Z"/>
                  <circle class="hole" cx="66" cy="33" r="1.8"/>
                  <circle class="hole" cx="72" cy="31" r="1.3"/>
                </g>
              </svg>
              <span class="snap-flash"></span>
            </div>
          </section>
          <section data-panel="2">
            <p class="result-index">Курс на родном языке · как было</p>
            <div class="chain">
              <div><strong class="old">20 минут</strong><p>наставник переводил курс вслух<br>и смотрел его вместе с сотрудником</p></div>
              <span class="compare-arrow">+</span>
              <div><strong class="old">5 минут</strong><p>директор тратил драгоценные минуты<br>на назначение нужного курса</p></div>
            </div>
          </section>
          <section data-panel="3">
            <p class="result-index">Курс на родном языке · как стало</p>
            <div class="chain final">
              <div><strong class="old">20 минут</strong><p>перевод</p></div>
              <span class="compare-arrow">→</span>
              <div><strong class="old">5 минут</strong><p>директор</p></div>
              <span class="compare-arrow">→</span>
              <div><strong class="huge-now">3 секунды</strong><p>сотрудник выбирает сам</p></div>
            </div>
            <p class="thesis">Мы заговорили на <em>8 языках</em></p>
            <p class="punch">Потому что Воппер вкусный на любом языке</p>
          </section>
        </div>
      </div>`,
      beats: [
        beat('Успеваем ли мы работать? Конечно. Составить рабочий индивидуальный план развития теперь занимает двадцать минут вместо трёх часов.', { shot: 0, sound: 'cash' }),
        beat('Автоматизация процедуры оценка — обучение — перевод подняла соблюдение с тридцати шести целых семидесяти пяти сотых процента до девяноста. И никаких ручных отчётов.',
          { sound: 'cash', also: [{ sound: 'snap', at: 4.35 }] }),
        beat('Раньше курс переводил наставник, смотрел его вместе с сотрудником и рассказывал, о чём речь. Потом директор тратил драгоценные минуты на назначение нужного курса.', { shot: 1 }),
        beat('Теперь сотрудник сам выбирает язык внутри курса за три секунды. Мы заговорили на восьми языках. Потому что Воппер вкусный на любом языке.', { shot: 2, sound: 'cash', hold: 1.4 })
      ]
    },

    /* ── s13 · Кухня, команда, гости и прототип ───────────────────── */
    {
      camera: [.2, -.1, 1.04],
      music: { track: 'warm' },         /* «более тёплая, вдохновляющая, но с драйвом» */
      backdrop: { kind: 'gradient', at: 3 },
      html: `<div class="layer finale-copy">
        <section data-panel="0">
          <p class="kicker">Наша кухня</p>
          <h2 class="title sm">Платформа для пилотов</h2>
          <p class="thesis">С помощью ИИ, без миллионных бюджетов<br>проверяем механики обучения:<br><em>тренажёры, игры, чат-боты</em></p>
        </section>
        <section data-panel="1">
          <div class="team-heart" data-team></div>
        </section>
        <section data-panel="2">
          <p class="huge">М-м-м</p>
          <p class="thesis">Чтобы гости получали<br>своё беззаботное удовольствие</p>
        </section>
        <section data-panel="3">
          <h2 class="title sm">Попробуйте наш прототип</h2>
          <img class="qr" src="img/qr.png" alt="QR-код на прототип">
          <p class="thesis">Наведите камеру телефона</p>
        </section>
      </div>`,
      beats: [
        beat('А теперь идёмте, покажу вам, как работает наша кухня! Мы создали платформу для тестирования и пилотирования новых идей. С помощью ИИ, без миллионных бюджетов мы запускаем и проверяем разные механики обучения — тренажёры, игры, чат-боты.',
          { id: 's13_kitchen', plan: 7, shot: 0, sound: 'sparkle', hold: 0 }),
        beat('Как-то так… Потому что мы создаём развивающую среду для роста талантов.',
          { id: 's13_beat1', shot: 1, sound: 'mosaic', hold: 1.6 }),
        beat('Чтобы наши гости получали своё беззаботное удовольствие, а Бургер Кинг оставался самой любимой сетью ресторанов в России.',
          { id: 's13_beat2', shot: 2, sound: 'warm', hold: 1.4 }),
        beat('Попробовать один из наших прототипов вы можете по QR-коду.',
          { id: 's13_qr', plan: 5, sound: 'tada', hold: 4 })
      ]
    }
  ];

  const scenes = source.map((s, i) => {
    const item = { ...s, ...stories[i], chapter: chapters[i], cues: stories[i].cues || [] };
    item.beats = item.beats.map((b, j) => {
      const id = b.id || `${s.id}_beat${j + 1}`;
      /* Реплика идёт столько, сколько звучит запись; пока записи нет —
         столько, сколько заложено в plan, плюс пауза на чтение. */
      const spoken = durations[id] || b.plan || 3;
      return { ...b, id, spoken, seconds: spoken + (b.hold || 0) };
    });
    if (item.beats[0].shot === undefined) item.beats[0].shot = 0;
    item.seconds = item.beats.reduce((n, b) => n + b.seconds, 0);
    return item;
  });

  root.KU_STORY = scenes;
  if (typeof module !== 'undefined') module.exports = scenes;
})(typeof globalThis !== 'undefined' ? globalThis : this);
