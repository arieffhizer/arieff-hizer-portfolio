// Rebuilds the Viberist site from its source project and installs it into ./viberist-site.
//   node scripts/sync-viberist.mjs [path-to-viberist-source]   (default: ../web-viber)
// Builds with base /viberist-site, prefixes the hand-written root-absolute links and the 3D asset path,
// marks pages noindex, and adds the embed lock (the home page is shown hero-only, unscrollable, inside viberist.html).
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const SRC = resolve(process.argv[2] || join(REPO, '..', 'web-viber'));
const BASE = '/viberist-site';
const DEST = join(REPO, 'viberist-site');
const TMP = join(tmpdir(), `viberist-build-${Date.now()}`);

if (!existsSync(join(SRC, 'astro.config.mjs'))) { console.error(`No Astro project at ${SRC}`); process.exit(1); }

const build = spawnSync('npx', ['astro', 'build', '--base', BASE, '--outDir', TMP], { cwd: SRC, stdio: 'inherit', shell: true, env: { ...process.env, MSYS_NO_PATHCONV: '1', MSYS2_ARG_CONV_EXCL: '*' } });
if (build.status !== 0) { console.error('astro build failed'); process.exit(build.status || 1); }

// ---- post-process ----
const walk = d => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const prefix = u => (u.startsWith('/') && !u.startsWith('//') && !u.startsWith(BASE + '/') && u !== BASE) ? BASE + u : u;
const LOCK = '<!--embed-lock--><script>(function(){if(window.top===window)return;var s=document.createElement(\'style\');s.textContent=\'html,body{overflow:hidden!important;overscroll-behavior:none}\';document.head.appendChild(s);function stop(e){e.preventDefault()}addEventListener(\'wheel\',stop,{passive:false});addEventListener(\'touchmove\',stop,{passive:false});addEventListener(\'keydown\',function(e){var t=(document.activeElement||{}).tagName;if(/INPUT|TEXTAREA|SELECT/.test(t))return;if([\' \',\'PageDown\',\'PageUp\',\'End\',\'Home\',\'ArrowDown\',\'ArrowUp\'].indexOf(e.key)>-1)e.preventDefault()});addEventListener(\'scroll\',function(){if(window.scrollY||window.scrollX)window.scrollTo(0,0)},{passive:true});document.addEventListener(\'click\',function(e){var a=e.target.closest&&e.target.closest(\'a[href]\');if(a){var h=a.getAttribute(\'href\')||\'\';if(h.charAt(0)===\'#\')e.preventDefault()}},true)})();</script><!--/embed-lock-->';
let nHtml = 0, nJs = 0;
for (const f of walk(TMP)) {
  if (f.endsWith('.html')) {
    let h = readFileSync(f, 'utf8');
    h = h.replace(/\b(href|src|action)="(\/[^"]*)"/g, (m, a, u) => `${a}="${prefix(u)}"`);
    if (!h.includes('name="robots"')) h = h.replace(/(<meta charset="[^"]*"\s*\/?>)/i, '$1\n<meta name="robots" content="noindex" />');
    if (f === join(TMP, 'index.html')) h = h.replace(/<\/head>/i, LOCK + '</head>');
    writeFileSync(f, h); nHtml++;
  } else if (f.endsWith('.js')) {
    let j = readFileSync(f, 'utf8');
    const k = j.replace(/([`'"])\/(viberist-monogram\.svg|viberist\.svg)\1/g, (m, q, file) => `${q}${BASE}/${file}${q}`);
    if (k !== j) { writeFileSync(f, k); nJs++; }
  }
}

// ---- install ----
rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });
cpSync(TMP, DEST, { recursive: true });
rmSync(TMP, { recursive: true, force: true });

// ---- verify ----
const bad = [];
for (const f of walk(DEST)) {
  if (!f.endsWith('.html')) continue;
  const h = readFileSync(f, 'utf8');
  for (const m of h.matchAll(/\b(?:href|src)="(\/[^"]*)"/g)) if (!m[1].startsWith(BASE) && !m[1].startsWith('//')) bad.push(`${f.replace(DEST, '')}: ${m[1]}`);
}
console.log(`processed ${nHtml} html, patched ${nJs} js; leftover root-absolute refs: ${bad.length}`);
bad.slice(0, 10).forEach(b => console.log('  ' + b));
