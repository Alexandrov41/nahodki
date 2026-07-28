/* Проверка каталога: целостность оригинала, перекрёстные ссылки,
   доступность сайтов. Запуск: node tools/check.mjs [--links]      */
import fs from 'fs';

const root = new URL('../', import.meta.url);
const dataSrc = fs.readFileSync(new URL('assets/js/data.js', root), 'utf8');
const appSrc  = fs.readFileSync(new URL('assets/js/app.js', root), 'utf8');
const origSrc = fs.readFileSync(new URL('index.original.html', root), 'utf8');

let fail = 0;
const ok  = m => console.log('  ✓', m);
const bad = m => { console.log('  ✗', m); fail++; };

/* 1. Оригинальные массивы не тронуты */
function block(src, name){
  const i = src.indexOf('const ' + name + ' = [');
  if(i < 0) return null;
  const s = src.indexOf('[', i);
  let d = 0;
  for(let j = s; j < src.length; j++){
    if(src[j] === '[') d++;
    else if(src[j] === ']'){ d--; if(!d) return src.slice(s, j+1); }
  }
  return null;
}
console.log('\nЦЕЛОСТНОСТЬ ОРИГИНАЛА');
for(const n of ['CATS','TOOLS']){
  const a = block(origSrc, n), b = block(dataSrc, n);
  a && b && a === b ? ok(`${n}: ${a.length} байт побайтово идентичны`)
                    : bad(`${n}: РАСХОЖДЕНИЕ с index.original.html`);
}

/* 2. Перекрёстные ссылки */
fs.writeFileSync('/tmp/_d.mjs', dataSrc +
  '\nexport {CATS,TOOLS,CATS_NEW,TOOLS_NEW,META,URLS,FREE_LIMITS,TOP_MODELS,RECIPES,CLAUDE_CARDS,CLAUDE_LEVELS,SKILLS,PROMPT_KITS,ACCESS_HINT};');
const d = await import('/tmp/_d.mjs');

const RETIRED = ['Sora','PlayHT','D-ID','Zapier','Notion AI Meeting Notes',
  'Magvi','Grok Imagine','DeepSeek Coder','Leonardo','Hunyuan3D'];
const all  = d.TOOLS.concat(d.TOOLS_NEW).filter(t => !RETIRED.includes(t.name));
const cats = d.CATS.concat(d.CATS_NEW);
const keys = new Set(all.map(t => t.cat + ':' + t.name));

console.log('\nПЕРЕКРЁСТНЫЕ ССЫЛКИ');
let broken = 0;
d.RECIPES.forEach(r => r.steps.forEach(s => {
  if(!keys.has(s.k)){ bad(`связка ${r.id} → ${s.k}`); broken++; }
}));
d.TOP_MODELS.forEach(m => (m.links||[]).forEach(l => {
  if(!keys.has(l)){ bad(`модель ${m.id} → ${l}`); broken++; }
}));
// ссылки из карты решений и витрины лежат в app.js
[...appSrc.matchAll(/then:'([^']+)'/g)].forEach(m => {
  if(!keys.has(m[1])){ bad(`карта решений → ${m[1]}`); broken++; }
});
[...appSrc.matchAll(/stack:\[([^\]]+)\]/g)].forEach(m => {
  m[1].split(',').map(x => x.trim().replace(/^'|'$/g,'')).forEach(k => {
    if(k && !keys.has(k)){ bad(`витрина → ${k}`); broken++; }
  });
});
if(!broken) ok('битых ссылок нет');

console.log('\nПОЛНОТА ДАННЫХ');
const noUrl = all.filter(t => !d.URLS[t.name]).map(t => t.name);
noUrl.length ? bad('без ссылки: ' + [...new Set(noUrl)].join(', ')) : ok('у всех находок есть адрес');
const emptyCat = cats.filter(c => !all.some(t => t.cat === c.id));
emptyCat.length ? bad('пустые рубрики: ' + emptyCat.map(c=>c.label).join(', ')) : ok('пустых рубрик нет');
const noKit = cats.filter(c => !d.PROMPT_KITS[c.id]);
noKit.length ? bad('без шпаргалки: ' + noKit.map(c=>c.label).join(', ')) : ok('шпаргалка есть у каждой рубрики');
const badAccess = all.filter(t => !d.ACCESS_HINT[t.access]);
badAccess.length ? bad('незнакомый доступ: ' + badAccess.map(t=>t.name).join(', ')) : ok('пометки доступа корректны');

console.log('\nСЕТКИ');
const grid = (n, label, cols) => {
  const bads = cols.filter(c => n % c !== 0 && n > c);
  bads.length ? bad(`${label}: ${n} не делится на ${bads.join(', ')} — будет дыра`)
              : ok(`${label}: ${n} ложится ровно`);
};
grid(d.TOP_MODELS.length, 'модели', [2,3,4]);
grid(d.RECIPES.length, 'связки', [2,3]);

console.log('\nСТАТИСТИКА');
console.log(`  находок: ${new Set(all.map(t=>t.name)).size} уникальных / ${all.length} записей`);
console.log(`  рубрик: ${cats.length} | связок: ${d.RECIPES.length} | моделей: ${d.TOP_MODELS.length}`);
console.log(`  глав Claude: ${d.CLAUDE_CARDS.length} | приёмов: ${d.SKILLS.length}`);

/* 3. Доступность сайтов — только по флагу */
if(process.argv.includes('--links')){
  console.log('\nПРОВЕРКА АДРЕСОВ (это долго)');
  const urls = [...new Set(all.map(t => d.URLS[t.name]).filter(Boolean))];
  // Российские сервисы часто недоступны с зарубежных адресов —
  // это не мёртвая ссылка, а география. Проверять вручную.
  const GEO = ['fusionbrain.ai','ya.ru','yandex.cloud','shedevrum.ai',
    'giga.chat','aidentika.com','supa.ru','mpcard.ru','fabula-ai.com'];
  let dead = 0, guarded = 0, geo = 0;
  const UA = {'User-Agent':'Mozilla/5.0 (compatible; NahodkiLinkCheck/1.0)'};
  for(const u of urls){
    let status = 0;
    // две попытки: сеть иногда моргает, один таймаут ещё не приговор
    outer: for(let attempt = 0; attempt < 2; attempt++){
      for(const method of ['HEAD','GET']){
        try{
          const r = await fetch('https://' + u, {method, redirect:'follow',
            headers: UA, signal: AbortSignal.timeout(12000)});
          status = r.status;
          if(status < 400) break outer;
        }catch(e){ status = status || -1; }
      }
    }
    // 401/403/405/406/429 — защита от ботов, а не мёртвая ссылка
    if([401,403,405,406,429].includes(status)){ guarded++; continue; }
    if(GEO.some(g => u.includes(g))){ geo++; continue; }
    // Node иногда не может в TLS там, где curl проходит — перепроверяем
    if(status === -1){
      try{
        const { execSync } = await import('node:child_process');
        const code = execSync(
          `curl -sS -o /dev/null -w '%{http_code}' --max-time 15 -L https://${u}`,
          {encoding:'utf8'}).trim();
        if(+code > 0 && +code < 400){ guarded++; continue; }
        status = +code || -1;
      }catch(e){ /* оставляем как есть */ }
    }
    if(status === -1 || status >= 400){ bad(`${u} → ${status === -1 ? 'нет ответа' : status}`); dead++; }
  }
  const note = `${guarded} закрыты от ботов, ${geo} доступны только из России`;
  if(!dead) ok(`все ${urls.length} адресов живы (${note})`);
  else console.log(`  · ${note} — не считаем`);
}

console.log(fail ? `\nПРОБЛЕМ: ${fail}` : '\nВСЁ ЧИСТО');
process.exit(fail ? 1 : 0);
