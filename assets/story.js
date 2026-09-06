(function (root) {
  'use strict';
  const source = typeof module !== 'undefined' ? require('./scenes.js') : root.KU_SCENES;
  const show = (beat, html, cls = '') => `<div class="reveal ${cls}" data-reveal="${beat}">${html}</div>`;
  const kicker = text => `<p class="kicker">${text}</p>`;
  const beat = (seconds, text, extra = {}) => ({ seconds, text, ...extra });
  const chapters = ['Ради гостя','Ради гостя','Ради гостя','Собственная система','Собственная система','Собственная система','Честно о сложном','Честно о сложном','Честно о сложном','Новый способ работать','Новый способ работать','Новый способ работать','Ради гостя'];
  const stories = [
    {
      camera: [0.4, -0.3, 1.06],
      html: `<div class="layer hero-copy">${show(0, '<p class="huge">М-м-м</p>')} ${show(1, '<p class="sub">Ради этого здесь<br>всё и вертится</p>')}</div>`,
      beats: [beat(3, 'Вот ради этого «м-м-м» здесь всё и вертится.', { sound: 'crunch', lead: .7 }), beat(6, 'А как мы создаём это «м-м-м»?')]
    },
    {
      camera: [-.6, .2, 1.05],
      html: `<div class="layer lower-copy">${kicker('Каждый день')}<div class="verbs">${['Принимаем','Организуем','Улыбаемся'].map((s,i) => `<p class="verb" data-panel="${i}">${s}</p>`).join('')}</div>${show(2, '<p class="sub">За каждым Воппером — человек,<br>который научился делать всё правильно.</p>')}</div>`,
      beats: [beat(5, 'Чтобы гость получил беззаботное удовольствие, команда БК ежедневно творит магию.', { shot: 0 }), beat(4, 'Закупает, везёт, жарит, улыбается.', { shot: 1 }), beat(6, 'Но за каждым идеально собранным Воппером стоит человек, который сначала научился делать всё правильно.', { shot: 2 })]
    },
    {
      camera: [-.7, .15, 1.065],
      html: `<div class="layer">${kicker('Масштаб')}<div class="stats">${show(0, '<div class="stat"><div class="v" data-count="886">886</div><p class="c">ресторанов</p></div>')}${show(1, '<div class="stat"><div class="v" data-count="12328">12 328</div><p class="c">сотрудников</p></div>')}</div>${show(2, '<p class="sub">Как работать<br>единым организмом?</p>')}</div>`,
      beats: [beat(3.5, 'Более восьмисот восьмидесяти ресторанов.'), beat(3.5, 'Более двенадцати тысяч сотрудников.'), beat(5, 'Как сделать так, чтобы эта огромная машина работала как единый организм?')]
    },
    {
      camera: [0, 0, 1.035],
      html: `<div class="layer">${kicker('2023 · точка отсчёта')}${show(0, '<h2 class="title">Программы<br>исчезли.</h2>')}<div class="lost-programs" aria-hidden="true"><i></i><i></i><i></i><i></i></div>${show(1, '<p class="sub">Мы начали строить<br>свою систему.</p><span class="foundation">Первый собственный трек</span>')}</div>`,
      beats: [beat(8, 'Давайте вспомним двадцать третий. Глобальный бренд ушёл, а вместе с ним — все наши учебные программы.', { sound: 'drop' }), beat(6, 'Паника? Нет. Мы начали строить самолёт прямо в полёте.')]
    },
    {
      camera: [-.3, .2, 1.045],
      html: `<div class="layer timeline-layout">${kicker('Собственная система · 2022–2026')}<div class="role-timeline"><div class="timeline-track" aria-hidden="true"><i></i></div>${[
        ['2022','Программы бренда','Исходная система',0,'past'],
        ['2023','Начинаем с нуля','ЧБР · МС',0,''],
        ['2024','Растут руководители','ЗД · ДР',1,''],
        ['2025','Растёт производство','Повара · НУ · ТУ · ОД',2,''],
        ['2026','Охвачены все роли','Кассиры · Курьеры · Операторы КЦ',3,'']
      ].map(([y,t,d,b,c]) => `<div class="milestone ${c}" data-milestone="${b}"><span class="year">${y}</span><span class="milestone-dot"></span><h3>${t}</h3><p>${d}</p></div>`).join('')}</div><div class="timeline-detail">${[
        ['4 трека','120 артефактов'],['4 трека','300 артефактов'],['5 треков','400 артефактов · 5 языков'],['5 треков','~300 артефактов · 8 языков']
      ].map(([a,b],i) => `<div data-panel="${i}"><strong>${a}</strong><span>${b}</span></div>`).join('')}</div></div>`,
      beats: [beat(5.5, 'В двадцать третьем с нуля создали треки для ЧБР и МС.'), beat(4.5, 'В двадцать четвёртом добавили ЗД и ДР.'), beat(5, 'В двадцать пятом — поваров, НУ, ТУ и ОД.'), beat(7, 'А в двадцать шестом закрыли вообще всех: от кассиров до операторов контактного центра.', { sound: 'chime' })]
    },
    {
      camera: [0, .2, 1.045],
      html: `<div class="layer center coverage"><div class="coverage-ring"><svg viewBox="0 0 240 240" aria-hidden="true"><circle class="ring-track" cx="120" cy="120" r="108"/><circle class="ring-fill" pathLength="1" cx="120" cy="120" r="108"/></svg><p class="huge" data-count="100" data-suffix="%">100%</p></div>${show(0, '<p class="sub">ролей охвачено<br>собственными треками</p>')}</div>`,
      beats: [beat(6, 'Звучит эпично. Сто процентов ролей охвачено. Тадам!', { sound: 'chime' })]
    },
    {
      camera: [0, 0, 1.025],
      html: `<div class="layer pause-copy">${show(0, '<p class="huge plain">Но…</p>')}${show(1, '<p class="sub">Миссия ещё не завершена.<br>Теперь — честно про грабли.</p>')}</div>`,
      beats: [beat(2, 'Но…', { lead: .6 }), beat(5, 'Миссия ещё не завершена. И тут мы честно расскажем, где наступили на грабли.')]
    },
    {
      camera: [0, 0, 1.025],
      html: `<div class="layer issue-layout">${kicker('Наши грабли · доступность')}<div class="issue-panels"><section data-panel="0"><h2 class="title sm">Обучение<br>теряется в СМС</h2><div class="notifications"><div>С днём рождения!</div><div class="learning-message">Пройди обучение <span>Сейчас</span></div><div>Ваша посылка уже ждёт</div></div></section><section data-panel="1"><h2 class="title sm">Связь —<br>под потолком</h2><p class="sub">Если до трека не добраться,<br>он не поможет.</p><svg class="wifi-signal" viewBox="0 0 100 70" aria-hidden="true"><path d="M12 24Q50 -8 88 24M25 38Q50 16 75 38M39 52Q50 42 61 52"/><circle cx="50" cy="63" r="3"/></svg></section></div></div>`,
      beats: [beat(12, 'Во-первых, доступность. Толку от треков немного, если до них не добраться. Уведомления теряются между поздравлением с днём рождения и сообщением из пункта выдачи.'), beat(11, 'А в некоторых ресторанах Wi-Fi ловит только на потолке, если встать на цыпочки и поднять телефон над головой.')]
    },
    {
      camera: [.5, -.15, 1.05],
      html: `<div class="layer lower-copy">${kicker('Что делаем')}<div class="solution-path" aria-hidden="true"><i></i><span></span><i></i></div><div class="solution-panels"><section data-panel="0"><h2 class="title sm">Опыт —<br>из рук в руки</h2><p class="sub">Перезапускаем наставничество</p></section><section data-panel="1"><h2 class="title sm">Довести обучение<br>до результата</h2><p class="sub">Внедряем агентов обучения</p></section></div></div>`,
      beats: [beat(7, 'Мы спускаемся на землю. Перезапускаем наставничество, чтобы опыт передавался из рук в руки, даже если интернет завис.'), beat(6, 'И внедряем агентов обучения — людей в ресторанах, которые доводят обучение до результата.')]
    },
    {
      camera: [-.4, .15, 1.05],
      html: `<div class="layer docs-layout">${kicker('Укрощение хаоса')}<h2 class="title sm">Один источник правды</h2><div class="document-machine"><div class="document-stack">${['Регламент_v1','Регламент_v2_final','Регламент_v3_точно_финал','Регламент_v3_финал(1)'].map((t,i)=>`<div class="moving-doc" data-doc="${i}"><span class="paper-icon" aria-hidden="true"></span>${t}</div>`).join('')}</div><div class="registry"><span class="registry-mark" aria-hidden="true">✓</span><h3>База знаний</h3><p>Единая версия</p><div class="registry-properties">${show(1,'<span>Реестр процессов</span>')}${show(2,'<span>Владелец · дата актуализации</span>')}</div></div></div>${show(2, '<p class="sub">Сначала фундамент — потом ракеты.</p>')}</div>`,
      cues: [{ at: 1, sel: '.moving-doc', cls: 'filed', stagger: 260 }],
      beats: [beat(5, 'А что с источником правды? Прямо сейчас мы наводим порядок в регламентах.'), beat(6, 'Формируем реестр процессов и наполняем базу знаний.', { sound: 'build' }), beat(6, 'Потому что автоматизированный хаос останется хаосом. Сначала фундамент — потом ракеты.')]
    },
    {
      camera: [.5, .1, 1.05],
      html: `<div class="layer chart-layout">${kicker('ИИ на службе методологов')}${show(0,'<h2 class="title sm">Команда работает<br><em>вдвое быстрее</em></h2>')}<p class="chart-caption">Производство учебных материалов по годам</p><div class="honest-chart" role="img" aria-label="Артефакты: 2023 — 120; 2024 — 300; 2025 — 400, 5 языков; 2026 — около 300, 8 языков.">${[120,300,400,300].map((v,i)=>`<div class="chart-column" data-column="${i}"><div class="plot"><div class="plot-bar" style="height:${v/4}%"><span data-count="${v}"${i===3?' data-prefix="~"':''}>${i===3?'~':''}${v}</span></div></div><span class="chart-year">${2023+i}</span><span class="chart-meta">${i<2?'4 трека':'5 треков'}${i<2?'':' · '+(i===2?'5':'8')+' языков'}</span></div>`).join('')}</div></div>`,
      cues: [{ at: 1, sel: '.chart-column', from: 0, to: 2, stagger: 320 },
             { at: 2, sel: '.chart-column', from: 3, to: 3 }],
      beats: [beat(7, 'Мы поставили искусственный интеллект на службу методологам. Рутину теперь делает ИИ — это ускоряет работу команды в два раза.'), beat(6, 'Собственные учебные материалы: сто двадцать артефактов в двадцать третьем, триста в двадцать четвёртом, четыреста в двадцать пятом.'), beat(6, 'В двадцать шестом — около трёхсот артефактов. А наши треки теперь говорят на восьми языках вместо пяти.')]
    },
    {
      camera: [-.4, .2, 1.045],
      html: `<div class="layer results-layout">${kicker('Было → стало')}<div class="result-panels"><section data-panel="0"><p class="result-index">01 / 04 · Индивидуальный план развития</p><h2 class="title sm">Минуты вместо часов</h2><div class="comparison"><span class="before">3 часа</span><span class="compare-arrow">→</span><strong>20 минут</strong></div><div class="time-track" aria-hidden="true"><i></i></div></section><section data-panel="1"><p class="result-index">02 / 04 · Оценка → обучение → перевод</p><h2 class="title sm">Процедуру соблюдают</h2><div class="comparison"><span class="before">36,75%</span><span class="compare-arrow">→</span><strong>90%</strong></div><div class="compliance-track" aria-hidden="true"><i></i><b></b></div><p class="result-note">+53,25 процентного пункта</p></section><section data-panel="2"><p class="result-index">03 / 04 · Обучение на родном языке</p><h2 class="title sm">Сотрудник выбирает сам</h2><div class="language-choice"><div><span class="before">20 минут</span><p>Ручной перевод<br>и назначение курса</p></div><span class="compare-arrow">→</span><div><strong>3 секунды</strong><p>Самостоятельный выбор<br>из 8 языков</p></div></div></section><section data-panel="3"><p class="result-index">04 / 04 · Производство контента</p><h2 class="title sm">Освободили ресурсы</h2><p class="savings"><span data-decimal="2.4">2,4</span> <span>млн ₽</span></p><p class="sub">Экономия на производстве контента</p></section></div><div class="result-steps" aria-label="Четыре результата">${['ИПР','Процедура','Языки','Экономия'].map((t,i)=>`<span data-step="${i}">${t}</span>`).join('')}</div></div>`,
      avatarAt: 0,
      beats: [beat(10, 'Успеваем ли мы работать? Конечно. Составить рабочий индивидуальный план развития теперь занимает двадцать минут вместо трёх часов.'), beat(10, 'Автоматизация процедуры оценка — обучение — перевод подняла соблюдение с тридцати шести целых семидесяти пяти сотых процента до девяноста. И никаких ручных отчётов.'), beat(13, 'Раньше наставник переводил курс вслух, а директор вручную назначал нужную версию. Теперь сотрудник сам выбирает язык внутри курса за три секунды. Мы заговорили на восьми языках.'), beat(7, 'Экономия на производстве контента — два миллиона четыреста тысяч рублей.', { sound: 'chime' })]
    },
    {
      camera: [.2, -.1, 1.04],
      html: `<div class="layer finale-copy"><section data-panel="0"><h2 class="title">Среда для роста<br>талантов</h2><p class="sub">Всё начинается с людей.</p></section><section data-panel="1"><p class="huge">М-м-м</p><p class="sub">Чтобы гости получали<br>беззаботное удовольствие.</p></section></div>`,
      avatarAt: 0,
      beats: [beat(6, 'Потому что мы создаём развивающую среду для роста талантов.', { shot: 0 }), beat(8, 'Чтобы гости получали своё беззаботное удовольствие, а Бургер Кинг оставался самой любимой сетью ресторанов в России.', { shot: 1, sound: 'chime' })]
    }
  ];
  const scenes = source.map((s,i) => {
    const item = { ...s, ...stories[i], chapter: chapters[i], cues: stories[i].cues || [] };
    item.beats = item.beats.map((b,j) => ({ ...b, id: `${s.id}_beat${j+1}` }));
    if (item.beats[0].shot === undefined) item.beats[0].shot = 0;
    item.vo = item.beats.map(b => ({id:b.id,text:b.text}));
    item.seconds = item.beats.reduce((n,b)=>n+b.seconds,0);
    return item;
  });
  root.KU_STORY = scenes;
  if (typeof module !== 'undefined') module.exports = scenes;
})(typeof globalThis !== 'undefined' ? globalThis : this);
