/* Выгружает каталог из data.js в tools.json.
   Запуск: node tools/export.mjs                                    */
import fs from 'fs';

const src = fs.readFileSync(new URL('../assets/js/data.js', import.meta.url), 'utf8');
fs.writeFileSync('/tmp/_data.mjs', src +
  '\nexport {CATS,TOOLS,CATS_NEW,TOOLS_NEW,META,URLS,FREE_LIMITS};');
const d = await import('/tmp/_data.mjs');

const RETIRED = ['Sora','PlayHT','D-ID','Zapier','Notion AI Meeting Notes',
  'Magvi','Grok Imagine','DeepSeek Coder','Leonardo','Hunyuan3D'];

const cats = d.CATS.concat(d.CATS_NEW);
const all  = d.TOOLS.concat(d.TOOLS_NEW).filter(t => !RETIRED.includes(t.name));
const key  = t => t.cat + ':' + t.name;
const strip = s => String(s||'').replace(/<[^>]+>/g,'');

const out = {
  issue: 4,
  checked: 'июль 2026',
  categories: cats.map(c => ({id:c.id, label:c.label, code:c.code})),
  tools: all.map(t => {
    const m = d.META[key(t)] || {};
    return {
      id: key(t),
      name: t.name,
      category: t.cat,
      note: strip(t.note),
      access: t.access,
      url: d.URLS[t.name] || null,
      freeLimit: d.FREE_LIMITS[key(t)] || null,
      tasks: m.tasks || [],
      quality: m.q ?? null,
      speed: m.s ?? null
    };
  }),
  retired: RETIRED
};

fs.writeFileSync(new URL('../tools.json', import.meta.url),
  JSON.stringify(out, null, 2) + '\n');
console.log(`tools.json: ${out.tools.length} находок, ${out.categories.length} рубрик`);
