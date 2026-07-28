/* Пересчитывает размеры арта в app.js после замены картинок.
   Запуск: node tools/sizes.mjs                                   */
import fs from 'fs';
import path from 'path';
import { execSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const artDir = new URL('art/', root);
const files = fs.readdirSync(artDir).filter(f => f.endsWith('.jpg'));

const sizes = {};
for(const f of files){
  const out = execSync(`python3 -c "from PIL import Image;im=Image.open('${path.join(artDir.pathname,f)}');print(im.width,im.height)"`,
    {encoding:'utf8'}).trim().split(' ');
  sizes[f.slice(0,-4)] = [+out[0], +out[1]];
}

const appPath = new URL('assets/js/app.js', root);
let src = fs.readFileSync(appPath, 'utf8');
const marker = 'const ART_SIZE = ';
const start = src.indexOf(marker);
if(start < 0){ console.error('ART_SIZE не найден'); process.exit(1); }
const end = src.indexOf(';\n', start);
src = src.slice(0, start + marker.length) + JSON.stringify(sizes) + src.slice(end);
fs.writeFileSync(appPath, src);
console.log(`ART_SIZE обновлён: ${Object.keys(sizes).length} файлов`);
