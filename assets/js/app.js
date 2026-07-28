/* ============================================================
   НАХОДКИ · журнал — логика выпуска №4
   ============================================================ */
(function(){
'use strict';

/* ---------- 1. Сборка данных ---------- */

// Выведены из указателя: дубли по смыслу, мёртвые или почти
// не используемые сервисы. Исходные массивы при этом не тронуты.
const RETIRED = ['Sora','PlayHT','D-ID','Zapier','Notion AI Meeting Notes',
  'Magvi','Grok Imagine','DeepSeek Coder','Leonardo','Hunyuan3D'];

const CHECKED = 'июль 2026';

const ALL_CATS  = CATS.concat(CATS_NEW);
const ALL_TOOLS = TOOLS.concat(TOOLS_NEW).filter(t => !RETIRED.includes(t.name));

const keyOf  = t => t.cat + ':' + t.name;
const metaOf = t => META[keyOf(t)] || {q:4,s:4,tasks:[]};
const urlOf  = t => URLS[t.name] || null;
const isFree = t => /бесплатн/i.test(t.access);
const noVpnOk = t => /без VPN|локально|агрегатор/i.test(t.access);
const catById = id => ALL_CATS.find(c => c.id === id);
const toolByKey = k => ALL_TOOLS.find(t => keyOf(t) === k);

/* Шесть семейств задач. Рубрика наследует краску своего семейства —
   цвет работает указателем, а не украшением. */
const FAMILY = {
  image:  {id:'image',  label:'Изображение', cats:['art','banner','edit','3d']},
  motion: {id:'motion', label:'Движение',    cats:['video','anim','avatar']},
  sound:  {id:'sound',  label:'Звук',        cats:['sound','dub']},
  word:   {id:'word',   label:'Слово',       cats:['text','research','office']},
  machine:{id:'machine',label:'Машина',      cats:['code','agent','meet']},
  trade:  {id:'trade',  label:'Дело',        cats:['mp']}
};
const CAT_FAMILY = {};
Object.values(FAMILY).forEach(f => f.cats.forEach(c => CAT_FAMILY[c] = f.id));
const famOf = catId => CAT_FAMILY[catId] || 'image';
const famLabel = catId => (FAMILY[famOf(catId)] || {}).label || '';

const ART = {art:'plate-visual',banner:'plate-banner',video:'plate-video',
  anim:'plate-anim',sound:'plate-sound',text:'plate-text',avatar:'plate-avatar',
  edit:'plate-edit',dub:'plate-dub',code:'plate-code',research:'plate-research',
  office:'plate-office',agent:'plate-agent',meet:'plate-meet','3d':'plate-3d',
  mp:'plate-seller'};

const ACC_CLASS = a =>
  /без VPN/i.test(a) ? 'acc-free' :
  /локально/i.test(a) ? 'acc-local' :
  /агрегатор/i.test(a) ? 'acc-agg' :
  /бесплатн/i.test(a) ? 'acc-free' : 'acc-vpn';

const ACC_SHORT = a =>
  /Бесплатно, без VPN/i.test(a) ? 'без VPN' :
  /локально/i.test(a) ? 'локально' :
  /агрегатор/i.test(a) ? 'агрегатор' :
  /бесплатный тариф/i.test(a) ? 'есть free' : 'VPN';

/* ── Личный статус находки ──────────────────────────────────
   Отделяет то, чем пользуюсь постоянно, от того, что просто
   проверил. Читателю это честнее любых оценок в звёздах. */
const USE = {
  daily:  {label:'в работе каждый день', short:'каждый день'},
  often:  {label:'беру регулярно',        short:'регулярно'},
  tested: {label:'проверил на задаче',    short:'проверил'},
  watch:  {label:'держу на радаре',       short:'на радаре'}
};
const USED = {
  'text:Claude':'daily', 'code:Claude Code':'daily', 'code:Cursor':'daily',
  'art:Nano Banana Pro':'daily', 'art:Midjourney':'often', 'banner:Recraft':'often',
  'text:ChatGPT':'often', 'text:DeepSeek':'often', 'sound:ElevenLabs':'often',
  'video:Kling':'often', 'video:Veo 3':'often', 'edit:Nano Banana Pro':'often',
  'research:Perplexity':'often', 'office:Gamma':'tested', 'avatar:HeyGen':'often',
  'sound:Suno':'often', 'mp:Айдентика':'often', 'research:NotebookLM':'often',
  'art:Flux':'tested', 'art:Ideogram':'often', 'banner:Ideogram':'tested',
  'video:Runway':'tested', 'anim:Kling':'often', 'anim:Hedra':'tested',
  'text:Gemini':'tested', 'agent:Manus':'tested', 'code:Lovable':'tested',
  'edit:Photoroom':'often', 'dub:ElevenLabs Dubbing':'tested', 'meet:Otter':'tested',
  '3d:Meshy':'tested', 'agent:n8n':'tested', 'agent:Make':'tested'
};
const useOf = t => USED[keyOf(t)] || 'watch';

/* Реальная стоимость: сколько уходит в месяц при рабочей нагрузке.
   Не прайс сервиса, а мой счёт. */
const COST = {
  'text:Claude':'~$20 — Pro, упираюсь в лимит пару раз в неделю',
  'code:Claude Code':'входит в подписку Claude, но съедает её быстрее всего',
  'code:Cursor':'$20 — на бесплатном хватает дня на два',
  'art:Nano Banana Pro':'~$15 через агрегатор при 200–300 картинках',
  'art:Midjourney':'$10 минимум, реально $30 за комфортный объём',
  'sound:ElevenLabs':'$5 хватает на 30 минут озвучки в месяц',
  'video:Kling':'~$10 за 60–80 клипов через агрегатор',
  'video:Veo 3':'дороже всех: $0,5–1 за клип, бюджет уходит незаметно',
  'avatar:HeyGen':'$24 — бесплатный тариф с водяным знаком не для дела',
  'mp:Айдентика':'рублями, от 500 ₽ за пакет искр',
  'text:ChatGPT':'$20 или бесплатно, если хватает средней модели',
  'research:Perplexity':'бесплатного тарифа хватает почти всегда'
};

/* ---------- 2. Утилиты ---------- */
const $  = (s,r) => (r||document).querySelector(s);
const $$ = (s,r) => Array.from((r||document).querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const strip = s => String(s).replace(/<[^>]+>/g,'');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function plural(n, one, few, many){
  const a = Math.abs(n) % 100, b = a % 10;
  if(a > 10 && a < 20) return many;
  if(b > 1 && b < 5) return few;
  if(b === 1) return one;
  return many;
}

function pic(name, alt, cls){
  return '<picture>' +
    '<source srcset="art/'+name+'.webp" type="image/webp">' +
    '<img src="art/'+name+'.jpg" alt="'+esc(alt||'')+'" loading="lazy" decoding="async"'+
    (cls?' class="'+cls+'"':'')+'></picture>';
}

const ICO = {
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  bookmark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/></svg>',
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/></svg>',
  spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.3L19 10l-5.1 1.7L12 17l-1.9-5.3L5 10l5.1-1.7z"/><path d="M18 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></svg>',
  scales:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16M7 8h10"/><path d="M4 13l3-6 3 6a3 3 0 0 1-6 0z"/><path d="M14 13l3-6 3 6a3 3 0 0 1-6 0z"/></svg>',
  cmd:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/></svg>'
};

const BR_ICO = {
  power:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12z"/></svg>',
  tricks:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a4.5 4.5 0 1 1-6 6L3 18v3h3l5.7-5.7"/><path d="M16 3l5 5"/></svg>',
  traps:ICO.warn,
  links:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7L12.5 20"/></svg>',
  prompt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11a2 2 0 0 1-2 2H9l-5 4z"/><path d="M8 9h8M8 13h5"/></svg>'
};

/* ---------- 3. Разделы журнала ---------- */
const SECTIONS = [
  {id:'index',   n:'01', title:'Указатель находок',   folio:'75 сервисов', fam:'image',
   lead:'Всё, чем пользуюсь сам, разложено по задачам. Поиск, фильтр по доступу, честные лимиты.', band:'band-index'},
  {id:'claude',  n:'02', title:'Claude: полный разбор', folio:'24 главы', fam:'word',
   lead:'От первого запроса до своей видеостудии в чате. Четыре уровня погружения.', band:'band-claude'},
  {id:'models',  n:'03', title:'Портреты моделей',     folio:'12 разборов', fam:'motion',
   lead:'За что берут, какие параметры решают и где обожжёшься. С готовым промптом.', band:'band-models'},
  {id:'craft',   n:'04', title:'Ремесло',              folio:'8 приёмов', fam:'machine',
   lead:'Навыки поверх любой модели: формула запроса, референсы, запреты, стек.', band:'band-craft'},
  {id:'recipes', n:'05', title:'Связки',               folio:'18 маршрутов', fam:'sound',
   lead:'Готовые цепочки: что за чем открыть, чтобы получить результат.', band:'band-recipes'},
  {id:'showcase',n:'06', title:'Витрина работ',        folio:'6 разборов', fam:'trade',
   lead:'Что получается на выходе — с задачей, стеком и граблями. Всё сделано для этого выпуска.', band:''},
  {id:'pay',     n:'07', title:'Практикум: оплата',    folio:'3 пути', fam:'word',
   lead:'Почему карта не проходит и что реально работает из России.', band:''},
  {id:'fails',   n:'08', title:'Что сломалось',        folio:'6 разборов', fam:'motion',
   lead:'Обещания, которые не сбылись, и мои собственные промахи. С выводом, что делать вместо.', band:''},
  {id:'chron',   n:'09', title:'Хроника выпусков',     folio:'что менялось', fam:'image',
   lead:'Что убрал, что добавил и где ошибся — с датами.', band:''}
];

/* ── Витрина: что из этого выходит ──────────────────────────
   Все работы сделаны для этого выпуска специально. Ничего не
   заимствовано: чужие результаты выдавать за свои нечестно,
   а брать их без разрешения — ещё и незаконно. */
const SHOWCASE = [
  {id:'sh-image', fam:'image', art:'show-image',
   title:'Обложка выпуска',
   task:'Нужен портрет для разворота — узнаваемый, но не фотография человека, которого не спросили.',
   stack:['art:Midjourney','edit:Nano Banana Pro'],
   how:'Собрал в два шага. Сначала общая геометрия и палитра одним запросом с жёстким ограничением по цветам. Потом правка словами: убрать лишние оттенки, усилить диагональ, добавить зерно.',
   catch:'С первого раза модель дала пять цветов вместо трёх. Помогла строка «только эти три краски, остальное — бумага» и отдельный запрет на градиенты.',
   time:'20 минут, 6 попыток'},

  {id:'sh-motion', fam:'motion', art:'show-motion',
   title:'Раскадровка ролика',
   task:'Показать движение камеры до того, как тратить генерации видео.',
   stack:['art:Nano Banana Pro','video:Kling'],
   how:'Раскадровка рисуется как единый кадр с четырьмя окнами — так модель держит один стиль во всех клетках. Дальше каждое окно уходит в видео отдельным запросом.',
   catch:'Просить четыре отдельные картинки бесполезно: стиль поплывёт. Только одним кадром с сеткой внутри.',
   time:'15 минут на раскадровку'},

  {id:'sh-sound', fam:'sound', art:'show-sound',
   title:'Обложка для трека',
   task:'Визуал под аудио: должен читаться в ленте размером с ноготь.',
   stack:['sound:Suno','art:Ideogram'],
   how:'Сначала трек, потом картинка под его настроение. Композиция строилась от миниатюры: если в 80 пикселях не читается — переделываю.',
   catch:'Модели тянет добавить ноты и скрипичный ключ. Пришлось прямо запретить — абстракция работает лучше буквальности.',
   time:'25 минут вместе с треком'},

  {id:'sh-word', fam:'word', art:'show-word',
   title:'Разворот статьи',
   task:'Показать структуру текста до вёрстки — где заголовки, где выноски.',
   stack:['text:Claude','art:Recraft'],
   how:'Claude собрал структуру и объём блоков, Recraft отрисовал сетку разворота. Это макет для обсуждения, а не финальная вёрстка.',
   catch:'Просить «страницу с текстом» — гарантированная каша из нечитаемых букв. Правильно просить полосы вместо строк.',
   time:'10 минут'},

  {id:'sh-machine', fam:'machine', art:'show-machine',
   title:'Схема автоматизации',
   task:'Объяснить связку из шести сервисов так, чтобы понял не технарь.',
   stack:['text:Claude','art:Ideogram'],
   how:'Сначала текстом описал узлы и связи, потом попросил схему строго по описанию. Ключевое — задать иерархию: что центр, что ветви.',
   catch:'Без указания «прямые углы, без пересечений» линии превращаются в спагетти.',
   time:'12 минут'},

  {id:'sh-trade', fam:'trade', art:'show-trade',
   title:'Карточка товара',
   task:'Макет для маркетплейса: товар, выгоды, цена — читаемо с телефона.',
   stack:['mp:Айдентика','edit:Photoroom'],
   how:'Специализированный сервис обгоняет универсальные модели: он знает форматы площадок и не врёт в кириллице. Фон и обтравка — отдельным шагом.',
   catch:'Больше четырёх выгод на слайд — карточку перестают читать. Проверял на себе.',
   time:'8 минут на макет'}
];

/* ── Что сломалось: честные разборы неудач ──────────────────
   Раздел, которого нет ни у кого. Обещания, которые не сбылись,
   и мои собственные промахи — с выводом, что делать вместо. */
const FAILS = [
  {id:'f-sora', tag:'[СЕРВИС ЗАКРЫЛСЯ]', date:'июль 2026', fam:'motion',
   title:'Sora: год ожидания и выключенный рубильник',
   what:'Модель, которую ждали как перелом в видео. Я держал её в каталоге как флагман по длинным сценам.',
   went:'Приложение отключили, API догорает до сентября. Люди, встроившие Sora в рабочий процесс, остались с нерабочими сценариями и оплаченными планами.',
   lesson:'Не строй процесс на одном сервисе, каким бы громким он ни был. Держи запасной вариант <b>до того</b>, как он понадобится.',
   now:'По видео беру Veo 3, Kling и Seedance. Три разных, а не один любимый.'},

  {id:'f-mine-claude', tag:'[МОЯ ОШИБКА]', date:'27 июля 2026', fam:'word',
   title:'Я написал, что Claude не умеет картинки',
   what:'В прошлом выпуске стояла строка: «не универсал, для картинок и видео нужны другие модели».',
   went:'Это оказалось неточно, и читатель указал мне на это прямо. Через коннектор Higgsfield Claude управляет тремя десятками генеративных моделей прямо из чата — и делает это неплохо.',
   lesson:'Проверять не только «что модель умеет из коробки», но и <b>что она умеет через коннекторы</b>. Граница между «не может» и «может через разъём» стирается быстрее, чем обновляются обзоры.',
   now:'Появился отдельный уровень «Студия» — пять глав про подключение, выбор модели и экономику кредитов.'},

  {id:'f-free', tag:'[ОБЕЩАНИЕ]', date:'весь год', fam:'trade',
   title:'«Бесплатно» — которое кончается на третьей картинке',
   what:'Сервисы пишут «попробуйте бесплатно» крупно, а лимит — мелко или нигде.',
   went:'Регистрируешься, тратишь двадцать минут на настройку, делаешь три генерации и упираешься в стену. Nano Banana Pro — три картинки в день. HeyGen — три видео в месяц с водяным знаком.',
   lesson:'Смотреть не на слово «бесплатно», а на <b>число в день или месяц</b>. Если числа нигде нет — считай, что тарифа нет.',
   now:'В указателе у каждой находки стоит реальный лимит. Это единственная причина, по которой я вообще завёл это поле.'},

  {id:'f-mine-vpn', tag:'[МОЯ ОШИБКА]', date:'весна 2026', fam:'machine',
   title:'Совет, который мог стоить читателю аккаунта',
   what:'Я рекомендовал зарубежные сервисы, не написав главного про доступ из России.',
   went:'Опасность не в самом обходе, а в <b>несоответствии данных</b>: регион в профиле один, карта другой страны, часовой пояс московский. Такой набор ловится и приводит к блокировке — вместе с оплаченной подпиской и историей.',
   lesson:'Если пишешь про доступ — пиши про риск целиком, а не половину. Недосказанность в таких темах дороже молчания.',
   now:'В разборе Claude отдельная глава про доступ и оплату, с прямым предупреждением.'},

  {id:'f-hype', tag:'[ХАЙП]', date:'2026', fam:'image',
   title:'Модели, которые обгоняют всех — ровно неделю',
   what:'Каждый месяц выходит генератор, который «уничтожил Midjourney». Заголовки, треды, сравнительные таблицы.',
   went:'Через две недели выясняется: тесты подобраны, лимиты жёсткие, кириллицы нет, а на реальной задаче результат хуже привычного. Я сам добавлял такие в каталог и потом убирал.',
   lesson:'Не вносить сервис, пока не закрыл им <b>настоящую задачу</b>. Не демо, не тест из обзора — свою работу.',
   now:'Правило издания: сначала работа, потом список. Из-за него каталог растёт медленно и это правильно.'},

  {id:'f-agents', tag:'[ЗАВЫШЕННОЕ ОЖИДАНИЕ]', date:'2026', fam:'machine',
   title:'Агенты, которым нельзя доверить и получаса',
   what:'Обещание года: ставишь задачу как коллеге и уходишь пить кофе.',
   went:'На практике агент уверенно делает не то. Разворачивает лишнее, тратит бюджет, а на длинной цепочке шагов теряет исходную цель. Час работы агента может сжечь недельный лимит.',
   lesson:'Агент — не сотрудник, а <b>стажёр без страха</b>. Дроби задачу, ставь запреты явно, проверяй каждый шаг.',
   now:'В разборах агентов запреты вынесены в отдельный пункт промпта: не покупать, не отправлять, не публиковать.'}
];

const VIEWS = ['home','index','claude','models','craft','recipes','showcase','fails','saved','pay','chron'];

/* ---------- 4. Состояние ---------- */
let active = 'all';
let activeFam = null;
let onlyNoVpn = false;
let onlyDaily = false;
let sortMode = 'default';
let viewMode = 'list';
let query = '';
let saved = new Set();
const expanded = new Set();
const PREVIEW = 5;

const LS_THEME = 'alx_theme', LS_SAVED = 'alx_saved';

/* ---------- 5. Тема ---------- */
const themeBtn = $('#themeBtn');
function applyTheme(mode){
  document.documentElement.setAttribute('data-theme', mode);
  themeBtn.innerHTML = mode === 'dark' ? ICO.sun : ICO.moon;
  themeBtn.setAttribute('aria-label', mode === 'dark' ? 'Светлая тема' : 'Тёмная тема');
  const meta = $('#metaTheme');
  if(meta) meta.setAttribute('content', mode === 'dark' ? '#17130F' : '#F4EFE4');
}
(function initTheme(){
  let m = null;
  try{ m = localStorage.getItem(LS_THEME); }catch(e){}
  if(!m) m = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(m);
})();
themeBtn.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try{ localStorage.setItem(LS_THEME, next); }catch(e){}
});

/* ---------- 6. Закладки ---------- */
try{
  const raw = localStorage.getItem(LS_SAVED);
  if(raw) saved = new Set(JSON.parse(raw));
}catch(e){}

function persist(){
  try{ localStorage.setItem(LS_SAVED, JSON.stringify(Array.from(saved))); }catch(e){}
}
function savedTools(){ return ALL_TOOLS.filter(t => saved.has(keyOf(t))); }

function syncSavedUI(){
  const n = saved.size;
  const dot = $('#savedDot');
  dot.textContent = n;
  dot.hidden = n === 0;
  $$('[data-save]').forEach(b => {
    const on = saved.has(b.dataset.save);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.setAttribute('aria-label', on ? 'Убрать из закладок' : 'В закладки');
  });
}

function toggleSave(k){
  if(saved.has(k)){ saved.delete(k); toast('Убрал из закладок'); }
  else { saved.add(k); toast('Сохранил в закладки'); }
  persist(); syncSavedUI();
  if(current === 'saved') renderSaved();
}

/* Фон не прокручивается, пока открыто модальное окно. */
let scrollLockY = 0, scrollLocked = false;
function lockScroll(on){
  if(on === scrollLocked) return;
  scrollLocked = on;
  const body = document.body;
  if(on){
    scrollLockY = window.scrollY;
    body.style.position = 'fixed';
    body.style.top = -scrollLockY + 'px';
    body.style.left = '0'; body.style.right = '0';
    body.style.overflow = 'hidden';
  } else {
    body.style.position = ''; body.style.top = '';
    body.style.left = ''; body.style.right = ''; body.style.overflow = '';
    window.scrollTo(0, scrollLockY);
  }
}

/* ---------- 7. Тост ---------- */
let toastT;
const toastEl = $('#toast');
function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('on'), 2200);
}

/* ---------- 8. Проявление при прокрутке ---------- */
let io = null;
if('IntersectionObserver' in window && !reduced()){
  io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){ e.target.classList.add('seen'); io.unobserve(e.target); }
    });
  }, {rootMargin:'0px 0px -8% 0px', threshold:.05});
}
function observe(root){
  if(!io){ $$('.rise', root).forEach(n => n.classList.add('seen')); return; }
  $$('.rise', root).forEach((n,i) => {
    if(n.classList.contains('seen')) return;
    n.style.transitionDelay = Math.min(i,6) * 45 + 'ms';
    io.observe(n);
  });
}

/* ---------- 9. Прогресс чтения ---------- */
const progressEl = $('#progress');
let ticking = false;
addEventListener('scroll', () => {
  if(ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const h = document.documentElement.scrollHeight - innerHeight;
    progressEl.style.width = (h > 0 ? Math.min(100, scrollY / h * 100) : 0) + '%';
    ticking = false;
  });
}, {passive:true});

/* ---------- 10. Обложка ---------- */
const uniqNames = list => new Set(list.map(t => t.name)).size;

function renderCover(){
  const figs = [
    [uniqNames(ALL_TOOLS), 'находок'],
    [ALL_CATS.length, 'рубрик'],
    [uniqNames(ALL_TOOLS.filter(noVpnOk)), 'без VPN'],
    [RECIPES.length, 'связок'],
    [CLAUDE_CARDS.length, 'глав о Claude']
  ];
  $('#coverFigures').innerHTML = figs.map(f =>
    '<div class="fig"><b>'+f[0]+'</b><span>'+f[1]+'</span></div>').join('');

  $('#toc').innerHTML = SECTIONS.map(s =>
    '<button class="toc-row rise" type="button" data-go="'+s.id+'" data-fam="'+s.fam+'"'+
      (s.band?' data-peek="'+s.band+'"':'')+'>'+
      '<span class="num">'+s.n+'</span>'+
      '<span class="body"><h3>'+s.title+'</h3><p>'+s.lead+'</p></span>'+
      '<span class="folio">'+s.folio+' <span class="arrow">→</span></span>'+
    '</button>').join('');
  wirePeek();

  // Легенда: шесть красок издания
  $('#legend').innerHTML = Object.values(FAMILY).map(f => {
    const n = ALL_TOOLS.filter(t => f.cats.includes(t.cat)).length;
    return '<button class="legend-item" type="button" data-fam="'+f.id+'" data-legend="'+f.id+'">'+
      '<i></i>'+f.label+' <b>'+n+'</b></button>';
  }).join('');

  const order = ['art','video','mp','text','avatar','code','agent','sound'];
  const cats = order.map(catById).filter(Boolean);
  $('#plates').innerHTML = cats.map((c,i) => {
    const n = ALL_TOOLS.filter(t => t.cat === c.id).length;
    return '<button class="plate rise" type="button" data-cat="'+c.id+'" data-fam="'+famOf(c.id)+'">'+
      '<span class="plate-img">'+pic(ART[c.id]||'plate-visual','')+
        '<span class="plate-n">'+String(i+1).padStart(2,'0')+'</span></span>'+
      '<span class="plate-txt"><h3>'+c.label+'</h3>'+
        '<span class="cnt"><span class="fam-dot"></span>'+famLabel(c.id)+' · '+n+'</span></span>'+
    '</button>';
  }).join('');

  renderPulse();
  observe($('#view-home'));
}

/* ── Превью разворота: миниатюра арта следует за курсором ── */
function wirePeek(){
  const peek = $('#peek');
  if(!peek || matchMedia('(hover: none)').matches || reduced()) return;
  let raf = null, tx = 0, ty = 0;

  $$('[data-peek]').forEach(row => {
    row.addEventListener('mouseenter', () => {
      const band = row.dataset.peek;
      peek.innerHTML = '<picture><source srcset="art/'+band+'.webp" type="image/webp">'+
        '<img src="art/'+band+'.jpg" alt=""></picture>';
      peek.setAttribute('data-fam', row.dataset.fam || '');
      peek.classList.add('on');
      corridor = measure(row);
      requestAnimationFrame(place);
    });
    row.addEventListener('mouseleave', () => peek.classList.remove('on'));
  });

  // Превью встаёт в пустой коридор строки — между лидом и фолиантом,
  // поэтому никогда не перекрывает текст.
  let corridor = null;
  function measure(row){
    const body = row.querySelector('.body');
    const folio = row.querySelector('.folio');
    if(!body || !folio) return null;
    const b = body.getBoundingClientRect(), f = folio.getBoundingClientRect();
    // правый край реального текста внутри .body
    let textRight = b.left;
    body.querySelectorAll('h3,p').forEach(n => {
      const r = n.getBoundingClientRect();
      const probe = document.createRange();
      probe.selectNodeContents(n);
      const rr = probe.getBoundingClientRect();
      textRight = Math.max(textRight, (rr.width ? rr.right : r.right));
    });
    const rowBox = row.getBoundingClientRect();
    return {from:textRight + 32, to:f.left - 24, mid:rowBox.top + rowBox.height/2};
  }

  // Превью центрируется по своей строке: по вертикали не выходит за неё,
  // по горизонтали стоит в пустом коридоре до фолианта.
  function place(){
    if(!corridor) return;
    const w = peek.offsetWidth, h = peek.offsetHeight;
    const space = corridor.to - corridor.from;
    let x = space >= w ? corridor.from + (space - w)/2 : corridor.to - w;
    x = Math.max(16, Math.min(x, innerWidth - w - 16));
    let y = corridor.mid - h/2;
    y = Math.max(84, Math.min(y, innerHeight - h - 20));
    peek.style.transform = 'translate('+Math.round(x)+'px,'+Math.round(y)+'px)';
  }
  addEventListener('scroll', () => { if(peek.classList.contains('on')) place(); }, {passive:true});

  $$('[data-peek]').forEach(row => {
    row.addEventListener('mouseenter', () => { corridor = measure(row); place(); });
  });
}

/* ── Пульс каталога: живая статистика вместо голых цифр ── */
function renderPulse(){
  const box = $('#pulse');
  if(!box) return;

  const fams = Object.values(FAMILY).map(f => ({
    id:f.id, label:f.label,
    n:uniqNames(ALL_TOOLS.filter(t => f.cats.includes(t.cat)))
  })).sort((a,b) => b.n - a.n);
  const max = Math.max.apply(null, fams.map(f => f.n));

  const bars = fams.map(f =>
    '<div class="pulse-row" data-fam="'+f.id+'">'+
      '<span class="pulse-lab">'+f.label+'</span>'+
      '<span class="pulse-track"><i style="--w:'+Math.round(f.n/max*100)+'%"></i></span>'+
      '<span class="pulse-n">'+f.n+'</span>'+
    '</div>').join('');

  const free  = uniqNames(ALL_TOOLS.filter(isFree));
  const noVpn = uniqNames(ALL_TOOLS.filter(noVpnOk));
  const local = uniqNames(ALL_TOOLS.filter(t => /локально/i.test(t.access)));
  const total = uniqNames(ALL_TOOLS);
  const pct = n => Math.round(n/total*100);

  box.innerHTML =
    '<div class="pulse-bars">'+bars+'</div>'+
    '<div class="pulse-facts">'+
      '<div class="pfact"><b>'+pct(noVpn)+'%</b><span>работает из России без обходных путей</span></div>'+
      '<div class="pfact"><b>'+pct(free)+'%</b><span>можно попробовать бесплатно</span></div>'+
      '<div class="pfact"><b>'+local+'</b><span>ставятся на своё железо</span></div>'+
    '</div>';
}

/* ---------- 11. Указатель ---------- */
function buildChips(){
  const box = $('#chips');
  const mk = (id,label,code,fam) =>
    '<button class="chip" type="button" data-chip="'+id+'"'+
    (fam?' data-fam="'+fam+'"':'')+' aria-pressed="'+
    (active===id?'true':'false')+'">'+label+(code?' <span class="c">'+code+'</span>':'')+'</button>';
  box.innerHTML = mk('all','Все находки','','') +
    ALL_CATS.map(c => mk(c.id, c.label, c.code, famOf(c.id))).join('');
}

/* Раздел окрашивается в краску активного семейства. */
function paintView(el, catId){
  if(!el) return;
  if(catId) el.setAttribute('data-fam', famOf(catId));
  else el.removeAttribute('data-fam');
}

function matches(t, q){
  if(!q) return true;
  const m = metaOf(t);
  const hay = (t.name+' '+strip(t.note)+' '+t.catLabel+' '+t.access+' '+(m.tasks||[]).join(' ')).toLowerCase();
  return q.split(/\s+/).filter(Boolean).every(w => hay.includes(w));
}

function detailHTML(t, uid){
  const m = metaOf(t), k = keyOf(t), u = urlOf(t);
  return '<div class="detail" id="'+uid+'"><div class="detail-clip"><div class="detail-in">'+
    (m.tasks && m.tasks.length ?
      '<p class="dl">Подходит для задач</p><ul class="tasks">'+
      m.tasks.map(x => '<li>'+esc(x)+'</li>').join('')+'</ul>' : '')+
    '<p class="dl">Мой статус</p>'+
    '<p class="dtext"><span class="use-badge use-'+useOf(t)+'">'+USE[useOf(t)].label+'</span></p>'+
    '<p class="dl">Как получить доступ</p>'+
    '<p class="dtext"><b>'+esc(t.access)+'.</b> '+(ACCESS_HINT[t.access]||'')+'</p>'+
    (COST[k] ? '<p class="dl">Сколько уходит у меня</p><p class="dtext cost">'+esc(COST[k])+'</p>' : '')+
    (FREE_LIMITS[k] ? '<div class="limit">'+ICO.info+'<span>'+FREE_LIMITS[k]+'</span></div>' : '')+
    '<span class="detail-acts">'+
      (u ? '<a class="go" href="https://'+u+'" target="_blank" rel="noopener noreferrer">Открыть сайт '+ICO.arrow+'</a>' : '')+
      '<button class="ghost-act" type="button" data-cmp="'+esc(k)+'" aria-pressed="false" aria-label="Сравнить">'+ICO.scales+' Сравнить</button>'+
      '<button class="ghost-act" type="button" data-save="'+esc(k)+'" aria-pressed="false" aria-label="В закладки">'+ICO.bookmark+' В закладки</button>'+
    '</span>'+
    '<p class="checked">Сверено: '+CHECKED+'. Сервисы меняют лимиты — проверь перед оплатой.</p>'+
  '</div></div></div>';
}

function idxRow(t, i){
  const k = keyOf(t), uid = 'd-'+k.replace(/[^a-zA-Zа-яА-Я0-9]/g,'-')+'-'+i;
  return '<li class="idx-item" data-fam="'+famOf(t.cat)+'">'+
    '<button class="idx-btn" type="button" data-open="'+esc(k)+'" aria-expanded="false" aria-controls="'+uid+'">'+
      '<span class="mark">'+String(i+1).padStart(2,'0')+'</span>'+
      '<span><span class="idx-name">'+esc(t.name)+
        (useOf(t)==='daily'?'<i class="use-mark" title="В работе каждый день">●</i>':'')+
        '</span><p class="idx-note">'+t.note+'</p></span>'+
      '<span class="idx-side"><i class="acc-dot '+ACC_CLASS(t.access)+'"></i>'+ACC_SHORT(t.access)+'</span>'+
    '</button>'+ detailHTML(t, uid) +'</li>';
}

function toolCard(t, i){
  const k = keyOf(t), uid = 'c-'+k.replace(/[^a-zA-Zа-яА-Я0-9]/g,'-')+'-'+i;
  return '<div class="tcard-wrap" data-fam="'+famOf(t.cat)+'">'+
    '<div class="tcard rise" role="button" tabindex="0" data-open="'+esc(k)+'" aria-expanded="false" aria-controls="'+uid+'">'+
      '<span class="card-tools">'+
        '<button class="save-btn" type="button" data-save="'+esc(k)+'" aria-pressed="false" aria-label="В закладки">'+ICO.bookmark+'</button>'+
        '<button class="save-btn cmp-btn" type="button" data-cmp="'+esc(k)+'" aria-pressed="false" aria-label="Сравнить">'+ICO.scales+'</button>'+
      '</span>'+
      '<span class="tag">'+esc(t.catLabel)+'</span>'+
      '<h4>'+esc(t.name)+'</h4>'+
      '<p>'+t.note+'</p>'+
    '</div>'+ detailHTML(t, uid) +'</div>';
}

function renderIndex(){
  const q = query.trim().toLowerCase();
  let list = (q || active === 'all') ? ALL_TOOLS : ALL_TOOLS.filter(t => t.cat === active);
  if(activeFam && active === 'all' && !q) list = list.filter(t => famOf(t.cat) === activeFam);
  list = list.filter(t => matches(t,q));
  if(onlyNoVpn) list = list.filter(noVpnOk);
  if(onlyDaily) list = list.filter(t => useOf(t)==='daily' || useOf(t)==='often');

  if(sortMode === 'free')  list = list.slice().sort((a,b) => (isFree(b)?1:0)-(isFree(a)?1:0));
  if(sortMode === 'vpn')   list = list.slice().sort((a,b) => (noVpnOk(b)?1:0)-(noVpnOk(a)?1:0));
  if(sortMode === 'alpha') list = list.slice().sort((a,b) => a.name.localeCompare(b.name,'ru'));

  const head = $('#idxHead'), body = $('#idxBody'), empty = $('#idxEmpty');
  const n = list.length;
  const cat = active === 'all' ? null : catById(active);
  const famTitle = (activeFam && FAMILY[activeFam]) ? FAMILY[activeFam].label : null;
  head.querySelector('h3').textContent = q ? 'Результаты поиска'
    : (cat ? cat.label : (famTitle || 'Все находки'));
  // Считаем сервисы, а не записи: один инструмент может стоять в двух рубриках.
  const uniq = uniqNames(list);
  head.querySelector('.n').textContent = uniq + ' ' + plural(uniq,'находка','находки','находок');

  if(!n){
    body.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  const grouped = (sortMode === 'default' && !q);
  let html = '';

  if(viewMode === 'cards'){
    html = '<div class="cards">' + list.map((t,i) => toolCard(t,i)).join('') + '</div>';
  } else if(grouped && active === 'all'){
    ALL_CATS.forEach(c => {
      const group = list.filter(t => t.cat === c.id);
      if(!group.length) return;
      const open = expanded.has(c.id);
      const shown = open ? group : group.slice(0, PREVIEW);
      html += '<div class="rise cat-group" data-fam="'+famOf(c.id)+'" style="margin-top:26px">'+
        '<div class="res-head" style="margin-top:0">'+
        '<h3><span class="fam-dot"></span>'+c.label+'</h3>'+
        '<span class="n">'+famLabel(c.id)+' · '+group.length+' '+plural(group.length,'находка','находки','находок')+'</span></div>'+
        '<ul class="idx">'+ shown.map((t,i) => idxRow(t,i)).join('') +'</ul>'+
        (group.length > PREVIEW ?
          '<button class="more-btn" type="button" data-expand="'+c.id+'">'+
          (open ? 'Свернуть' : 'Показать ещё '+(group.length-PREVIEW))+'</button>' : '')+
      '</div>';
    });
  } else {
    html = '<ul class="idx">' + list.map((t,i) => idxRow(t,i)).join('') + '</ul>';
  }

  body.innerHTML = html;
  syncSavedUI(); syncCompareUI();
  observe(body);
}

/* открытие детали */
function wireOpen(root){
  root.addEventListener('click', e => {
    const save = e.target.closest('[data-save]');
    if(save){ e.stopPropagation(); toggleSave(save.dataset.save); return; }

    const cmpb = e.target.closest('[data-cmp]');
    if(cmpb){ e.stopPropagation(); toggleCompare(cmpb.dataset.cmp); return; }

    const exp = e.target.closest('[data-expand]');
    if(exp){
      const id = exp.dataset.expand;
      expanded.has(id) ? expanded.delete(id) : expanded.add(id);
      renderIndex();
      return;
    }

    const btn = e.target.closest('[data-open]');
    if(!btn) return;
    const det = document.getElementById(btn.getAttribute('aria-controls'));
    if(!det) return;
    const open = det.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  root.addEventListener('keydown', e => {
    if(e.key !== 'Enter' && e.key !== ' ') return;
    const c = e.target.closest('.tcard[data-open]');
    if(!c) return;
    e.preventDefault(); c.click();
  });
}

/* ============================================================
   СРАВНЕНИЕ: две находки бок о бок
   Закрывает вопрос «а чем этот отличается от того».
   ============================================================ */
let compare = [];
let cmpDismissed = false;

function toggleCompare(k){
  const i = compare.indexOf(k);
  if(i > -1) compare.splice(i,1);
  else {
    if(compare.length >= 2) compare.shift();
    compare.push(k);
  }
  syncCompareUI();
  // Окно само раскрывается, когда пара собрана впервые. Если его закрыли —
  // больше не навязываемся: остаётся плашка с кнопкой «Показать».
  if(compare.length === 2 && !cmpDismissed) openCompare();
}

function syncCompareUI(){
  $$('[data-cmp]').forEach(b => {
    const on = compare.indexOf(b.dataset.cmp) > -1;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.setAttribute('aria-label', on ? 'Убрать из сравнения' : 'Сравнить');
  });
  const bar = $('#cmpBar');
  if(!bar) return;
  if(!compare.length){ bar.classList.remove('on'); bar.innerHTML=''; return; }
  const names = compare.map(k => { const t = toolByKey(k); return t ? t.name : k; });
  bar.classList.add('on');
  bar.innerHTML =
    '<span class="cmp-lab">Сравнение</span>'+
    '<span class="cmp-names">'+names.map(esc).join(' <i>·</i> ')+'</span>'+
    (compare.length === 2
      ? '<button class="cmp-go" type="button" data-cmp-open>Показать →</button>'
      : '<span class="cmp-hint">выбери ещё одну</span>')+
    '<button class="cmp-clear" type="button" data-cmp-clear aria-label="Очистить сравнение">'+ICO.close+'</button>';
}

function cmpRow(label, a, b, mono){
  return '<tr><th scope="row">'+esc(label)+'</th>'+
    '<td'+(mono?' class="m"':'')+'>'+a+'</td>'+
    '<td'+(mono?' class="m"':'')+'>'+b+'</td></tr>';
}

function openCompare(){
  if(compare.length !== 2) return;
  const [a,b] = compare.map(toolByKey);
  if(!a || !b) return;
  const ma = metaOf(a), mb = metaOf(b);
  const dlg = $('#cmp');
  const stars = n => '●'.repeat(n) + '<span class="dim">' + '●'.repeat(5-n) + '</span>';

  $('#cmpBody').innerHTML =
    '<div class="cmp-head">'+
      '<div class="cmp-side" data-fam="'+famOf(a.cat)+'"><span class="cmp-cat">'+esc(a.catLabel)+'</span><h3>'+esc(a.name)+'</h3></div>'+
      '<span class="cmp-vs">против</span>'+
      '<div class="cmp-side" data-fam="'+famOf(b.cat)+'"><span class="cmp-cat">'+esc(b.catLabel)+'</span><h3>'+esc(b.name)+'</h3></div>'+
    '</div>'+
    '<div class="cmp-scroll"><table class="cmp-table">'+
      cmpRow('Чем берёт', '<p>'+a.note+'</p>', '<p>'+b.note+'</p>')+
      cmpRow('Качество результата', stars(ma.q||4), stars(mb.q||4), true)+
      cmpRow('Скорость и простота', stars(ma.s||4), stars(mb.s||4), true)+
      cmpRow('Доступ', esc(a.access), esc(b.access))+
      cmpRow('Бесплатный тариф',
        FREE_LIMITS[keyOf(a)] || '<span class="dim">нет данных</span>',
        FREE_LIMITS[keyOf(b)] || '<span class="dim">нет данных</span>')+
      cmpRow('Задачи',
        (ma.tasks||[]).slice(0,4).map(x=>'<span class="tk">'+esc(x)+'</span>').join('') || '<span class="dim">—</span>',
        (mb.tasks||[]).slice(0,4).map(x=>'<span class="tk">'+esc(x)+'</span>').join('') || '<span class="dim">—</span>')+
      cmpRow('Сайт',
        urlOf(a)?'<a class="go" href="https://'+urlOf(a)+'" target="_blank" rel="noopener noreferrer">'+urlOf(a)+'</a>':'<span class="dim">—</span>',
        urlOf(b)?'<a class="go" href="https://'+urlOf(b)+'" target="_blank" rel="noopener noreferrer">'+urlOf(b)+'</a>':'<span class="dim">—</span>')+
    '</table></div>'+
    '<p class="cmp-note">Оценки — мои рабочие впечатления, не замеры. Сверено: '+CHECKED+'.</p>';

  dlg.hidden = false;
  lockScroll(true);
  cmpLastFocus = document.activeElement;
  requestAnimationFrame(() => { const c = $('#cmpClose'); if(c) c.focus(); });
}
let cmpLastFocus = null;
function closeCompare(){
  cmpDismissed = true;
  lockScroll(false);
  $('#cmp').hidden = true;
  if(cmpLastFocus && cmpLastFocus.focus) cmpLastFocus.focus();
}

/* ---------- 12. Закладки ---------- */
function renderSaved(){
  const list = savedTools();
  const box = $('#savedBody');
  $('#savedCount').textContent = list.length + ' ' + plural(list.length,'находка','находки','находок');
  if(!list.length){
    box.innerHTML = '<div class="empty"><b>Пока пусто</b>'+
      '<p>Открой указатель и жми на флажок у находки — она появится здесь.</p>'+
      '<button class="btn btn-ghost" type="button" data-go="index" style="margin-top:16px">К указателю</button></div>';
    return;
  }
  box.innerHTML = '<div class="cards">' + list.map((t,i) => toolCard(t,i)).join('') + '</div>';
  syncSavedUI();
  observe(box);
}

/* ---------- 13. Claude ---------- */
function renderClaude(){
  const box = $('#claudeBody');
  box.innerHTML = CLAUDE_LEVELS.map(l => {
    const cards = CLAUDE_CARDS.filter(c => c.lvl === l.id);
    return '<div class="lvl rise">'+
      '<div class="lvl-head"><span class="n">'+l.num+'</span><h3>'+l.title+'</h3></div>'+
      '<p class="lvl-lead">'+l.lead+'</p>'+
      '<div class="chapters">'+ cards.map(c => chapterHTML(c,'cl')).join('') +'</div>'+
    '</div>';
  }).join('') +
  '<div class="rise" style="margin-top:10px">'+
    '<div class="lvl-head"><span class="n">05</span><h3>Что где хранить</h3></div>'+
    '<p class="lvl-lead">Три механизма легко перепутать. Разница — в вопросе, на который они отвечают.</p>'+
    '<div class="cmp-scroll"><table class="cmp"><thead><tr>'+
      '<th>Механизм</th><th>Отвечает на</th><th>Когда брать</th><th>Пример</th><th>Цена контекста</th>'+
    '</tr></thead><tbody>'+
    CLAUDE_TABLE.map(r => '<tr><td>'+r.k+'</td><td>'+r.q+'</td><td>'+r.when+'</td><td>'+r.ex+'</td><td>'+r.cost+'</td></tr>').join('')+
    '</tbody></table></div></div>';
  observe(box);
}

function chapterHTML(c, ns){
  const uid = ns+'-'+c.id;
  return '<div class="chapter">'+
    '<button class="ch-btn" type="button" aria-expanded="false" aria-controls="'+uid+'" data-ch="'+uid+'">'+
      '<span><span class="ch-tag">'+esc(c.tag)+'</span><h4>'+esc(c.title)+'</h4><p>'+esc(c.lead)+'</p></span>'+
      '<span class="ch-plus">'+ICO.plus+'</span>'+
    '</button>'+
    '<div class="detail" id="'+uid+'"><div class="detail-clip"><div class="ch-body">'+
      '<p>'+c.body+'</p>'+
      (c.steps && c.steps.length ? '<ol class="steps">'+c.steps.map(s => '<li>'+s+'</li>').join('')+'</ol>' : '')+
      (c.warn ? '<div class="warn">'+ICO.warn+'<span>'+c.warn+'</span></div>' : '')+
    '</div></div></div>'+
  '</div>';
}

/* ---------- 14. Приёмы ---------- */
function renderCraft(){
  const box = $('#craftBody');
  box.innerHTML = '<div class="chapters">'+
    SKILLS.map(s => chapterHTML({
      id:s.id, tag:s.tag, title:s.title, lead:s.lead,
      body:s.body, steps:s.steps, warn:''
    },'sk')).join('') + '</div>';
  observe(box);
}

/* ---------- 15. Портреты моделей ---------- */
/* Портрет модели — наборная карточка, а не картинка.
   Монограмма, номер и рубрика набраны шрифтом издания: каждая
   карточка уникальна, ничего не грузится и не дублируется. */
function monogram(name){
  const clean = name.replace(/[^A-Za-zА-Яа-я0-9 ]/g,'').trim();
  const parts = clean.split(/\s+/);
  if(parts.length > 1 && parts[1]) return (parts[0][0]+parts[1][0]).toUpperCase();
  return clean.slice(0,2).toUpperCase();
}

function renderModels(){
  const box = $('#modelsGrid');
  box.innerHTML = TOP_MODELS.map((m,i) => {
    const cat = catById(m.cat);
    return '<button class="mcard rise" type="button" data-model="'+m.id+'" data-fam="'+famOf(m.cat)+'">'+
      '<span class="mplate">'+
        '<span class="mplate-n">'+String(i+1).padStart(2,'0')+'</span>'+
        '<span class="mplate-mono" aria-hidden="true">'+esc(monogram(m.name))+'</span>'+
        '<span class="mplate-cat">'+esc(cat ? cat.label : '')+'</span>'+
      '</span>'+
      '<span class="mcard-txt">'+
        '<span class="mcard-top"><span class="tier'+(m.tier==='A'?' a':'')+'">'+m.tier+'</span>'+
        '<h4>'+esc(m.name)+'</h4></span>'+
        '<p>'+esc(m.lead)+'</p>'+
      '</span>'+
    '</button>';
  }).join('');
  observe(box);
}

const branchHead = (t,k) => '<div class="branch-h">'+BR_ICO[k]+'<span>'+t+'</span></div>';

function openModel(id){
  const m = TOP_MODELS.find(x => x.id === id);
  if(!m) return;
  $('#modelsList').hidden = true;
  const box = $('#modelArticle');
  box.hidden = false;
  box.setAttribute('data-fam', famOf(m.cat));
  const cat = catById(m.cat);
  box.innerHTML =
    '<button class="back-btn" type="button" data-models-back>'+ICO.back+' Все модели</button>'+
    '<div class="opener" style="padding-top:18px">'+
      '<div class="opener-art">'+pic(m.art,'')+'</div>'+
      '<div class="opener-kicker"><span class="sep"></span>'+famLabel(m.cat)+' · '+esc(cat?cat.label:'')+' · уровень '+m.tier+'</div>'+
      '<h2>'+esc(m.name)+'</h2>'+
      '<p class="lead">'+esc(m.lead)+'</p>'+
    '</div>'+
    '<div class="article">'+
      '<div class="branch">'+branchHead('За что берут','power')+'<p style="font-size:15px;color:var(--ink-soft);margin:0">'+m.power+'</p></div>'+
      '<div class="branch">'+branchHead('Приёмы','tricks')+'<ul>'+m.tricks.map(x=>'<li>'+x+'</li>').join('')+'</ul></div>'+
      '<div class="branch">'+branchHead('Грабли','traps')+'<ul>'+m.traps.map(x=>'<li>'+x+'</li>').join('')+'</ul></div>'+
      '<div class="branch">'+branchHead('С чем связать','links')+'<div class="linkrow">'+
        m.links.map(k => { const t = toolByKey(k); return t ?
          '<button class="linkchip" type="button" data-jump="'+esc(k)+'">'+esc(t.name)+'</button>' : ''; }).join('')+
      '</div></div>'+
      '<div class="branch">'+branchHead('Готовый промпт','prompt')+
        snippet(m.prompt, 'шаблон')+
      '</div>'+
    '</div>';
  scrollTop();
}

function snippet(text, label){
  return '<div class="snippet">'+
    '<div class="snip-head"><span>'+esc(label)+'</span>'+
      '<button class="copy" type="button" data-copy="'+esc(text)+'">'+ICO.copy+' Копировать</button></div>'+
    '<pre>'+esc(text)+'</pre></div>';
}

function closeModel(){
  $('#modelArticle').hidden = true;
  $('#modelArticle').innerHTML = '';
  $('#modelsList').hidden = false;
  scrollTop();
}

/* ---------- 16. Связки ---------- */
function renderRecipes(){
  const box = $('#recipesGrid');
  box.innerHTML = RECIPES.map(r =>
    '<article class="recipe rise">'+
      '<span class="tag">'+esc(r.tag)+'</span>'+
      '<h3>'+esc(r.title)+'</h3>'+
      '<p class="lead">'+esc(r.lead)+'</p>'+
      '<ol class="chain">'+ r.steps.map(s => {
        const t = toolByKey(s.k);
        const f = t ? famOf(t.cat) : '';
        return '<li'+(f?' data-fam="'+f+'"':'')+'><span class="who">'+esc(t?t.name:s.k)+'</span>'+
          '<span class="what">'+esc(s.do)+'</span></li>';
      }).join('') +'</ol>'+
    '</article>').join('');
  observe(box);
}

/* ── Витрина работ ── */
function renderShowcase(){
  const box = $('#showcaseGrid');
  if(!box) return;
  box.innerHTML = SHOWCASE.map((w,i) => {
    const chips = w.stack.map(k => {
      const t = toolByKey(k);
      return t ? '<button class="linkchip" type="button" data-jump="'+esc(k)+'">'+esc(t.name)+'</button>' : '';
    }).join('');
    return '<article class="work rise" data-fam="'+w.fam+'">'+
      '<figure class="work-art">'+
        '<picture><source srcset="art/'+w.art+'.webp" type="image/webp">'+
        '<img src="art/'+w.art+'.jpg" alt="Пример работы: '+esc(w.title)+'" width="900" height="675" loading="lazy" decoding="async"></picture>'+
        '<figcaption class="work-n">'+String(i+1).padStart(2,'0')+'</figcaption>'+
      '</figure>'+
      '<div class="work-body">'+
        '<h3>'+esc(w.title)+'</h3>'+
        '<p class="work-task">'+esc(w.task)+'</p>'+
        '<p class="wl">Чем сделано</p>'+
        '<div class="linkrow">'+chips+'</div>'+
        '<p class="wl">Как</p><p class="work-txt">'+esc(w.how)+'</p>'+
        '<div class="work-catch"><span class="wl">Грабли</span><p>'+esc(w.catch)+'</p></div>'+
        '<p class="work-time">'+esc(w.time)+'</p>'+
      '</div>'+
    '</article>';
  }).join('');
  observe(box);
}

/* ── Что сломалось ── */
function renderFails(){
  const box = $('#failsList');
  if(!box) return;
  box.innerHTML = FAILS.map((f,i) =>
    '<article class="fail rise" data-fam="'+f.fam+'">'+
      '<div class="fail-side">'+
        '<span class="fail-n">'+String(i+1).padStart(2,'0')+'</span>'+
        '<span class="fail-tag">'+esc(f.tag)+'</span>'+
        '<span class="fail-date">'+esc(f.date)+'</span>'+
      '</div>'+
      '<div class="fail-body">'+
        '<h3>'+esc(f.title)+'</h3>'+
        '<p class="fl">Что было</p><p class="fail-txt">'+esc(f.what)+'</p>'+
        '<p class="fl">Что пошло не так</p><p class="fail-txt">'+esc(f.went)+'</p>'+
        '<div class="fail-lesson"><span class="fl">Вывод</span><p>'+f.lesson+'</p></div>'+
        '<p class="fail-now"><span class="fl">Как теперь</span>'+esc(f.now)+'</p>'+
      '</div>'+
    '</article>').join('');
  observe(box);
}

/* ---------- 17. Хроника ---------- */
function renderChron(){
  const box = $('#chronBody');
  box.innerHTML = '<div class="chron">'+ CHANGELOG.map(c =>
    '<div class="chron-row rise"><div class="chron-date">'+esc(c.date)+'</div>'+
    '<div><span class="chron-tag">'+esc(c.tag)+'</span><h4>'+esc(c.title)+'</h4><p>'+c.text+'</p></div></div>'
  ).join('') +'</div>';
  observe(box);
}

/* ---------- 18. Шпаргалки промптов ---------- */
function renderKit(catId){
  const kit = PROMPT_KITS[catId];
  const box = $('#kitBox');
  if(!kit){ box.hidden = true; box.innerHTML=''; return; }
  box.hidden = false;
  box.innerHTML = '<div class="lvl-head" style="border-bottom-width:1px"><span class="n">✎</span><h3>'+esc(kit.title)+'</h3></div>'+
    snippet(kit.text, 'скелет запроса')+
    '<ul class="branch" style="margin-top:6px;list-style:none;padding:0">'+
      kit.tips.map(t => '<li style="position:relative;padding:0 0 10px 18px;font-size:15px;color:var(--ink-soft)">'+
      '<span style="position:absolute;left:0;top:9px;width:5px;height:5px;border-radius:50%;background:var(--ochre);display:block"></span>'+t+'</li>').join('')+
    '</ul>';
}

/* ── Кода раздела: куда идти дальше ── */
function renderNext(){
  const order = SECTIONS.map(s => s.id);
  order.forEach((id,i) => {
    const host = document.getElementById('next-'+id);
    if(!host) return;
    const nx = SECTIONS[(i+1) % SECTIONS.length];
    host.innerHTML =
      '<button class="nextup" type="button" data-go="'+nx.id+'" data-fam="'+nx.fam+'">'+
        '<span class="nextup-lab">Дальше в номере</span>'+
        '<span class="nextup-t">'+esc(nx.title)+'</span>'+
        '<span class="nextup-lead">'+esc(nx.lead)+'</span>'+
        '<span class="nextup-go">'+nx.folio+' <i>→</i></span>'+
      '</button>';
  });
}

/* ---------- 19. Навигация ---------- */
let current = 'home';

function scrollTop(){
  scrollTo({top:0, behavior: reduced() ? 'auto' : 'smooth'});
}

function showView(name, push){
  if(VIEWS.indexOf(name) === -1) name = 'home';
  current = name;
  VIEWS.forEach(v => {
    const el = document.getElementById('view-'+v);
    if(el) el.classList.toggle('on', v === name);
  });
  $$('.rlink').forEach(b => b.setAttribute('aria-current', b.dataset.go === name ? 'true' : 'false'));

  const sec = SECTIONS.find(x => x.id === name);
  if(sec && sec.fam && name !== 'index'){
    const el = document.getElementById('view-'+name);
    if(el) el.setAttribute('data-fam', sec.fam);
  }
  if(name === 'index'){
    const el = $('#view-index');
    if(activeFam) el.setAttribute('data-fam', activeFam);
    else if(active !== 'all') el.setAttribute('data-fam', famOf(active));
    else el.setAttribute('data-fam','image');
  }
  if(name === 'index')   renderIndex();
  if(name === 'saved')   renderSaved();
  if(name === 'models'){ if($('#modelArticle').hidden) renderModels(); }
  if(name === 'chron')   renderChron();
  if(name === 'showcase') renderShowcase();
  if(name === 'fails')   renderFails();

  if(push !== false){
    const h = name === 'home' ? ' ' : '#/'+name;
    if(location.hash !== h) history.pushState({v:name}, '', h);
  }
  const t = name === 'home' ? 'Находки Alexandrov Studio — журнал о нейросетях'
    : (SECTIONS.find(s => s.id === name) || {title:'Закладки'}).title + ' — Находки';
  document.title = t;
  scrollTop();
  const h2 = document.querySelector('#view-'+name+' h1, #view-'+name+' h2');
  if(h2){ h2.setAttribute('tabindex','-1'); h2.focus({preventScroll:true}); }
}

function routeFromHash(){
  const raw = (location.hash || '').replace(/^#\/?/,'');
  const parts = raw.split('/').filter(Boolean);
  if(!parts.length){ showView('home', false); return; }
  const v = parts[0];
  if(v === 'models' && parts[1]){ showView('models', false); openModel(parts[1]); return; }
  if(VIEWS.indexOf(v) !== -1){
    if(v === 'models') closeModelSilent();
    showView(v, false);
  } else showView('home', false);
}
function closeModelSilent(){
  const a = $('#modelArticle');
  if(a && !a.hidden){ a.hidden = true; a.innerHTML=''; $('#modelsList').hidden = false; }
}

addEventListener('popstate', routeFromHash);

/* делегирование переходов */
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if(go){ showView(go.dataset.go, true); return; }

  const cat = e.target.closest('[data-cat]');
  if(cat){
    active = cat.dataset.cat; activeFam = null; query = ''; $('#search').value = '';
    $('#searchClear').classList.remove('on');
    buildChips(); paintView($('#view-index'), active);
    showView('index', true); renderKit(active);
    return;
  }

  const leg = e.target.closest('[data-legend]');
  if(leg){
    activeFam = leg.dataset.legend;
    active = 'all'; query = ''; $('#search').value = '';
    $('#searchClear').classList.remove('on');
    buildChips();
    $('#view-index').setAttribute('data-fam', activeFam);
    showView('index', true);
    renderKit(null);
    return;
  }

  const chip = e.target.closest('[data-chip]');
  if(chip){
    active = chip.dataset.chip;
    activeFam = null;
    $$('[data-chip]').forEach(c => c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'));
    paintView($('#view-index'), active === 'all' ? null : active);
    renderIndex(); renderKit(active === 'all' ? null : active);
    return;
  }

  const m = e.target.closest('[data-model]');
  if(m){
    openModel(m.dataset.model);
    history.pushState({v:'models'}, '', '#/models/'+m.dataset.model);
    return;
  }
  if(e.target.closest('[data-models-back]')){
    closeModel(); history.pushState({v:'models'}, '', '#/models');
    return;
  }

  const jump = e.target.closest('[data-jump]');
  if(jump){
    const t = toolByKey(jump.dataset.jump);
    if(t){
      active = t.cat; query = t.name; $('#search').value = t.name;
      $('#searchClear').classList.add('on');
      buildChips(); closeModelSilent(); showView('index', true);
    }
    return;
  }

  const ch = e.target.closest('[data-ch]');
  if(ch){
    const det = document.getElementById(ch.dataset.ch);
    if(det){
      const open = det.classList.toggle('open');
      ch.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    return;
  }

  if(e.target.closest('[data-cmp-open]')){ openCompare(); return; }
  if(e.target.closest('[data-cmp-clear]')){ compare = []; cmpDismissed = false; syncCompareUI(); return; }
  if(e.target.closest('[data-cmp-close]')){ closeCompare(); return; }

  const cp = e.target.closest('[data-copy]');
  if(cp){
    const txt = cp.dataset.copy;
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
      .then(() => toast('Промпт скопирован'))
      .catch(() => {
        const ta = document.createElement('textarea');
        ta.value = txt; document.body.appendChild(ta); ta.select();
        try{ document.execCommand('copy'); toast('Промпт скопирован'); }catch(err){ toast('Не вышло скопировать'); }
        ta.remove();
      });
  }
});

/* ---------- 20. Поиск и фильтры ---------- */
const searchEl = $('#search'), clearEl = $('#searchClear');
let searchT;
searchEl.addEventListener('input', () => {
  query = searchEl.value;
  clearEl.classList.toggle('on', !!query);
  clearTimeout(searchT);
  searchT = setTimeout(renderIndex, 110);
});
clearEl.addEventListener('click', () => {
  query = ''; searchEl.value = ''; clearEl.classList.remove('on');
  searchEl.focus(); renderIndex();
});
$('#vpnToggle').addEventListener('change', e => { onlyNoVpn = e.target.checked; renderIndex(); });
$('#dailyToggle').addEventListener('change', e => { onlyDaily = e.target.checked; renderIndex(); });
$('#sortSeg').addEventListener('click', e => {
  const b = e.target.closest('button[data-sort]'); if(!b) return;
  sortMode = b.dataset.sort;
  $$('#sortSeg button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  renderIndex();
});
$('#modeSeg').addEventListener('click', e => {
  const b = e.target.closest('button[data-mode]'); if(!b) return;
  viewMode = b.dataset.mode;
  $$('#modeSeg button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  renderIndex();
});

/* ---------- 21. Палитра команд ---------- */
const pal = $('#pal'), palInput = $('#palInput'), palList = $('#palList');
let palItems = [], palSel = 0, palLastFocus = null;

function buildPalIndex(){
  const items = [];
  SECTIONS.forEach(s => items.push({t:s.title, k:'раздел', run:() => showView(s.id,true)}));
  items.push({t:'Закладки', k:'раздел', run:() => showView('saved',true)});
  items.push({t:'Подобрать под задачу', k:'мастер', run:openWiz});
  items.push({t:'Сменить тему', k:'вид', run:() => themeBtn.click()});
  ALL_CATS.forEach(c => items.push({t:c.label, k:'рубрика', run:() => {
    active = c.id; query=''; searchEl.value=''; clearEl.classList.remove('on');
    buildChips(); showView('index',true); renderKit(c.id);
  }}));
  TOP_MODELS.forEach(m => items.push({t:m.name+' — разбор', k:'модель', run:() => {
    showView('models',true); openModel(m.id);
  }}));
  const seen = new Set();
  ALL_TOOLS.forEach(t => {
    if(seen.has(t.name)) return; seen.add(t.name);
    items.push({t:t.name, k:t.catLabel.toLowerCase(), run:() => {
      active = t.cat; query = t.name; searchEl.value = t.name; clearEl.classList.add('on');
      buildChips(); showView('index',true);
    }});
  });
  CLAUDE_CARDS.forEach(c => items.push({t:c.title, k:'claude', run:() => {
    showView('claude',true);
    setTimeout(() => {
      const b = document.querySelector('[data-ch="cl-'+c.id+'"]');
      if(b){ if(b.getAttribute('aria-expanded')==='false') b.click();
        b.scrollIntoView({block:'center',behavior:reduced()?'auto':'smooth'}); b.focus({preventScroll:true}); }
    }, 260);
  }}));
  SKILLS.forEach(s => items.push({t:s.title, k:'приём', run:() => {
    showView('craft',true);
    setTimeout(() => {
      const b = document.querySelector('[data-ch="sk-'+s.id+'"]');
      if(b){ if(b.getAttribute('aria-expanded')==='false') b.click();
        b.scrollIntoView({block:'center',behavior:reduced()?'auto':'smooth'}); b.focus({preventScroll:true}); }
    }, 260);
  }}));
  RECIPES.forEach(r => items.push({t:r.title, k:'связка', run:() => showView('recipes',true)}));
  return items;
}
const PAL_ALL = buildPalIndex();

function palRender(q){
  const s = q.trim().toLowerCase();
  palItems = (!s ? PAL_ALL.slice(0,9)
    : PAL_ALL.filter(i => (i.t+' '+i.k).toLowerCase().includes(s)).slice(0,40));
  palSel = 0;
  if(!palItems.length){
    palList.innerHTML = '<li class="pal-empty">Ничего не нашлось. Попробуй другое слово.</li>';
    return;
  }
  palList.innerHTML = palItems.map((i,n) =>
    '<li class="pal-item'+(n===0?' sel':'')+'" role="option" data-n="'+n+'" aria-selected="'+(n===0)+'">'+
    '<span>'+esc(i.t)+'</span><span class="kind">'+esc(i.k)+'</span></li>').join('');
}
function palMove(d){
  if(!palItems.length) return;
  palSel = (palSel + d + palItems.length) % palItems.length;
  $$('.pal-item', palList).forEach((el,n) => {
    const on = n === palSel;
    el.classList.toggle('sel', on);
    el.setAttribute('aria-selected', on);
    if(on) el.scrollIntoView({block:'nearest'});
  });
}
function palRun(){
  const it = palItems[palSel];
  if(!it) return;
  closePal(); it.run();
}
function openPal(){
  palLastFocus = document.activeElement;
  lockScroll(true);
  pal.hidden = false;
  palInput.value = '';
  palRender('');
  requestAnimationFrame(() => palInput.focus());
}
function closePal(){
  lockScroll(false);
  pal.hidden = true;
  if(palLastFocus && palLastFocus.focus) palLastFocus.focus();
}
palInput.addEventListener('input', () => palRender(palInput.value));
palInput.addEventListener('keydown', e => {
  if(e.key === 'ArrowDown'){ e.preventDefault(); palMove(1); }
  else if(e.key === 'ArrowUp'){ e.preventDefault(); palMove(-1); }
  else if(e.key === 'Enter'){ e.preventDefault(); palRun(); }
});
palList.addEventListener('click', e => {
  const li = e.target.closest('.pal-item'); if(!li) return;
  palSel = +li.dataset.n; palRun();
});
pal.addEventListener('click', e => { if(e.target === pal) closePal(); });
$('#palBtn').addEventListener('click', openPal);
$('#cmp').addEventListener('click', e => { if(e.target.id === 'cmp') closeCompare(); });

/* ---------- 22. Мастер подбора ---------- */
const wiz = $('#wiz'), wizBody = $('#wizBody'), wizProg = $('#wizProg'),
      wizStep = $('#wizStep'), wizBack = $('#wizBack');
let step = 0, answers = {cat:null,budget:null,priority:null}, wizLastFocus = null;

const BUDGETS = [
  {id:'free', k:'A', t:'Только бесплатное', s:'Без карты и подписок'},
  {id:'novpn',k:'B', t:'Без VPN и зарубежной карты', s:'Работает из России как есть'},
  {id:'any',  k:'C', t:'Готов платить', s:'Беру лучшее под задачу'}
];
const PRIORITIES = [
  {id:'quality', k:'A', t:'Качество результата', s:'Пусть дольше, но красиво'},
  {id:'speed',   k:'B', t:'Скорость и простота', s:'Нужно здесь и сейчас'}
];

function openWiz(){
  wizLastFocus = document.activeElement;
  lockScroll(true);
  step = 0; answers = {cat:null,budget:null,priority:null};
  wiz.hidden = false;
  drawWiz();
}
function closeWiz(){
  lockScroll(false);
  wiz.hidden = true;
  if(wizLastFocus && wizLastFocus.focus) wizLastFocus.focus();
}
function drawWiz(){
  const total = 3;
  wizProg.style.width = Math.round((step)/total*100 + 33) + '%';
  wizStep.textContent = 'Шаг ' + Math.min(step+1,total) + ' из ' + total;
  wizBack.hidden = step === 0;

  if(step === 0){
    wizBody.innerHTML = '<h3 id="wizH">Что нужно сделать?</h3><div class="opts">'+
      ALL_CATS.map((c,i) => '<button class="opt" type="button" data-w="cat" data-v="'+c.id+'">'+
        '<span class="k">'+String(i+1).padStart(2,'0')+'</span>'+
        '<span class="t">'+c.label+'</span></button>').join('')+'</div>';
  } else if(step === 1){
    wizBody.innerHTML = '<h3 id="wizH">Какой доступ подходит?</h3><div class="opts">'+
      BUDGETS.map(b => '<button class="opt" type="button" data-w="budget" data-v="'+b.id+'">'+
        '<span class="k">'+b.k+'</span><span><span class="t">'+b.t+'</span>'+
        '<span class="s">'+b.s+'</span></span></button>').join('')+'</div>';
  } else if(step === 2){
    wizBody.innerHTML = '<h3 id="wizH">Что важнее?</h3><div class="opts">'+
      PRIORITIES.map(p => '<button class="opt" type="button" data-w="priority" data-v="'+p.id+'">'+
        '<span class="k">'+p.k+'</span><span><span class="t">'+p.t+'</span>'+
        '<span class="s">'+p.s+'</span></span></button>').join('')+'</div>';
  } else {
    drawResult();
  }
  const first = wizBody.querySelector('.opt');
  if(first){
    requestAnimationFrame(() => requestAnimationFrame(() => first.focus()));
    setTimeout(() => { if(document.activeElement === document.body) first.focus(); }, 120);
  }
}
function drawResult(){
  wizStep.textContent = 'Готово';
  wizProg.style.width = '100%';
  let list = ALL_TOOLS.filter(t => t.cat === answers.cat);
  if(answers.budget === 'free')  list = list.filter(isFree);
  if(answers.budget === 'novpn') list = list.filter(noVpnOk);
  const rank = t => answers.priority === 'speed' ? metaOf(t).s : metaOf(t).q;
  list = list.slice().sort((a,b) => rank(b) - rank(a)).slice(0,3);
  const cat = catById(answers.cat);

  if(!list.length){
    wizBody.innerHTML = '<h3 id="wizH">Под такой набор ничего нет</h3>'+
      '<p style="color:var(--ink-soft);font-size:15px">В рубрике «'+esc(cat.label)+'» с этим уровнем доступа пусто. Попробуй смягчить требования к оплате.</p>'+
      '<div class="cta-row" style="margin-top:18px">'+
      '<button class="btn btn-solid" type="button" data-wiz-restart>Пройти заново</button></div>';
    return;
  }
  wizBody.innerHTML = '<h3 id="wizH">Твой стек: '+esc(cat.label.toLowerCase())+'</h3>'+
    list.map((t,i) => {
      const m = metaOf(t);
      const why = answers.priority === 'speed' ? m.whyS : m.whyQ;
      return '<div style="border-top:1px solid var(--line);padding:16px 0">'+
        '<div style="display:flex;align-items:baseline;gap:10px">'+
        '<span style="font-family:var(--mono);font-size:10.5px;color:var(--ochre)">'+String(i+1).padStart(2,'0')+'</span>'+
        '<b style="font-family:var(--serif);font-weight:400;font-size:20px">'+esc(t.name)+'</b></div>'+
        (why ? '<p class="res-why">'+esc(why)+'</p>' : '')+
        '<p style="font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin:10px 0 0">'+esc(t.access)+'</p>'+
      '</div>';
    }).join('')+
    '<div class="cta-row" style="margin-top:20px">'+
      '<button class="btn btn-solid" type="button" data-wiz-open="'+esc(answers.cat)+'">Открыть рубрику</button>'+
      '<button class="btn btn-ghost" type="button" data-wiz-restart>Заново</button>'+
    '</div>';
}
wizBody.addEventListener('click', e => {
  const o = e.target.closest('[data-w]');
  if(o){ answers[o.dataset.w] = o.dataset.v; step++; drawWiz(); return; }
  if(e.target.closest('[data-wiz-restart]')){ step = 0; answers={cat:null,budget:null,priority:null}; drawWiz(); return; }
  const op = e.target.closest('[data-wiz-open]');
  if(op){
    active = op.dataset.wizOpen; query=''; searchEl.value=''; clearEl.classList.remove('on');
    buildChips(); closeWiz(); showView('index',true); renderKit(active);
  }
});
wizBack.addEventListener('click', () => { if(step>0){ step--; drawWiz(); } });
$('#wizClose').addEventListener('click', closeWiz);
wiz.addEventListener('click', e => { if(e.target === wiz) closeWiz(); });
$$('[data-open-wiz]').forEach(b => b.addEventListener('click', openWiz));

/* фокус-ловушка для модальных */
function trap(e, box){
  if(e.key !== 'Tab') return;
  const f = $$('button, a[href], input, [tabindex]:not([tabindex="-1"])', box)
    .filter(el => el.offsetParent !== null);
  if(!f.length) return;
  const first = f[0], last = f[f.length-1];
  if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
}

/* ---------- 23. Клавиатура ---------- */
addEventListener('keydown', e => {
  const cmpDlg = $('#cmp');
  if(cmpDlg && !cmpDlg.hidden){
    if(e.key === 'Escape'){ e.preventDefault(); closeCompare(); return; }
    trap(e, $('.cmp-in'));
    return;
  }
  if(!pal.hidden){
    if(e.key === 'Escape'){ e.preventDefault(); closePal(); return; }
    trap(e, $('.pal-in'));
    return;
  }
  if(!wiz.hidden){
    if(e.key === 'Escape'){ e.preventDefault(); closeWiz(); return; }
    trap(e, $('.wiz-in'));
    return;
  }
  const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
  if((e.key === 'k' || e.key === 'л') && (e.metaKey || e.ctrlKey)){ e.preventDefault(); openPal(); return; }
  if(e.key === '/' && !typing){ e.preventDefault();
    if(current !== 'index') showView('index', true);
    setTimeout(() => searchEl.focus(), 260); return; }
  if(e.key === 'Escape' && current !== 'home'){ showView('home', true); }
});

/* ---------- 24. Старт ---------- */
renderCover();
buildChips();
renderClaude();
renderCraft();
renderRecipes();
renderNext();
wireOpen($('#idxBody'));
wireOpen($('#savedBody'));
syncSavedUI();
routeFromHash();
observe(document);

})();
