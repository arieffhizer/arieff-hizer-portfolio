// Copies the Mori site from its source folder into ./mori-site and re-applies the hero-only embed lock.
//   node scripts/sync-mori.mjs [path-to-Mori-folder]   (default: ../Mori)
// Only images that Mori.html actually references are copied from the source Images folder.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(process.argv[2] || join(REPO, '..', 'Mori'));
const DEST = join(REPO, 'mori-site');
if (!existsSync(join(SRC, 'Mori.html'))) { console.error(`No Mori.html in ${SRC}`); process.exit(1); }

const LOCK = '<!--embed-lock--><script>(function(){if(window.top===window)return;var s=document.createElement(\'style\');s.textContent=\'html,body{overflow:hidden!important;overscroll-behavior:none}\';document.head.appendChild(s);function stop(e){e.preventDefault()}addEventListener(\'wheel\',stop,{passive:false});addEventListener(\'touchmove\',stop,{passive:false});addEventListener(\'keydown\',function(e){var t=(document.activeElement||{}).tagName;if(/INPUT|TEXTAREA|SELECT/.test(t))return;if([\' \',\'PageDown\',\'PageUp\',\'End\',\'Home\',\'ArrowDown\',\'ArrowUp\'].indexOf(e.key)>-1)e.preventDefault()});addEventListener(\'scroll\',function(){if(window.scrollY||window.scrollX)window.scrollTo(0,0)},{passive:true});document.addEventListener(\'click\',function(e){var a=e.target.closest&&e.target.closest(\'a[href]\');if(a){var h=a.getAttribute(\'href\')||\'\';if(h.charAt(0)===\'#\')e.preventDefault()}},true)})();</script><!--/embed-lock-->';

let html = readFileSync(join(SRC, 'Mori.html'), 'utf8');
if (!/<\/head>/i.test(html)) throw new Error('no </head>');
html = html.replace(/<\/head>/i, LOCK + '</head>');
writeFileSync(join(DEST, 'Mori.html'), html);

const flat = html.replace(/%20/g, ' ');
mkdirSync(join(DEST, 'Images'), { recursive: true });
let copied = 0;
const missing = [];
for (const name of readdirSync(join(SRC, 'Images'))) {
  if (!flat.includes('Images/' + name)) continue;
  const to = join(DEST, 'Images', name);
  copyFileSync(join(SRC, 'Images', name), to); copied++;
}
// anything Mori.html points at that is nowhere to be found
for (const m of flat.matchAll(/Images\/([^"')\\\s<>][^"')\\<>]*?\.(?:png|jpe?g|svg|gif|webp|mp4))/gi)) {
  if (!existsSync(join(DEST, 'Images', m[1]))) missing.push(m[1]);
}
console.log(`Mori.html synced, ${copied} referenced images copied`);
if (missing.length) console.log('referenced but missing:', [...new Set(missing)].join(', '));
