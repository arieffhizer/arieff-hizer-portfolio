// Adds a content hash to the tailwind.css and theme.css links in every page, so a browser
// that cached an older stylesheet always fetches the new one after a deploy.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = file => createHash('md5').update(readFileSync(file)).digest('hex').slice(0, 8);
const versions = { 'tailwind.css': hash('tailwind.css'), 'theme.css': hash('theme.css') };

let changed = 0;
for (const page of readdirSync('.').filter(f => f.endsWith('.html'))) {
  let html = readFileSync(page, 'utf8');
  const before = html;
  for (const [file, v] of Object.entries(versions)) {
    const name = file.replace('.', '\\.');
    const re = new RegExp('(href="/?' + name + ')(\\?v=[a-f0-9]+)?"', 'g');
    html = html.replace(re, '$1?v=' + v + '"');
  }
  if (html !== before) { writeFileSync(page, html); changed++; }
}
console.log('stamped ' + changed + ' pages', versions);
