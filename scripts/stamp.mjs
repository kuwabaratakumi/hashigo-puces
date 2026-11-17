// JS と CSS の参照に、中身から作った版番号（?v=ハッシュ）を付ける。
// 中身が変わると番号が変わるので、ブラウザが古いファイルを使い続けない。
// build.mjs の最後に呼ばれる。単独でも実行できる: node scripts/stamp.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const ASSETS = ['style.css', 'app.js', 'views.js', 'schedule.js', 'paris-map.js', 'france-map.js', 'site-info.js'];
const TARGETS = ['index.html', 'about.html', 'app.js', 'views.js'];
const TOKEN = /\?v=[0-9a-f]+/g;
// href="style.css" / src="app.js" / from './views.js' のような、このサイト自身のファイルへの参照だけ
const REF = new RegExp(`(?<=(?:href="|src="|from '))((?:\\./)?(?:${ASSETS.map((a) => a.replace('.', '\\.')).join('|')}))(?:\\?v=[0-9a-f]+)?(?=["'])`, 'g');

export async function version() {
  const h = crypto.createHash('sha1');
  for (const f of ASSETS) {
    try { h.update(f + '\n' + (await fs.readFile(path.join(PUBLIC, f), 'utf8')).replace(TOKEN, '')); } catch { /* ないファイルは飛ばす */ }
  }
  return h.digest('hex').slice(0, 8);
}

export async function stamp() {
  const v = await version();
  const changed = [];
  for (const f of TARGETS) {
    const p = path.join(PUBLIC, f);
    const before = await fs.readFile(p, 'utf8');
    const after = before.replace(REF, (_, ref) => `${ref}?v=${v}`);
    if (after !== before) { await fs.writeFile(p, after); changed.push(f); }
  }
  return { version: v, changed };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const r = await stamp();
  console.log(`版番号 ${r.version}（更新: ${r.changed.join(', ') || 'なし'}）`);
}
