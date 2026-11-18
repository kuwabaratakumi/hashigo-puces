// パリ市の一覧ページ → data/events.csv（単発のブロカント・ヴィド・グルニエ）
//   node scripts/import-paris.mjs            … ページを取得して events.csv を作り直す
//   node scripts/import-paris.mjs file.html  … 保存した HTML から作る
// 毎月1日に GitHub Actions（import-monthly.yml）で自動実行。手でも実行できる。くわしくは docs/terms.md
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const SOURCE_URL = 'https://www.paris.fr/pages/brocantes-et-vide-greniers-chiner-a-paris-18730';

const MONTHS = { janvier: 1, 'février': 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, 'août': 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, 'décembre': 12, decembre: 12 };
const MONTH_RE = Object.keys(MONTHS).join('|');
const DAY_RE = 'lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche';
const ONE = `(?:${DAY_RE})\\s+(\\d{1,2})(?:er)?(?:\\s+(${MONTH_RE}))?(?:\\s+(\\d{4}))?`;
const HEADING = new RegExp(`^(?:du\\s+)?${ONE}(?:\\s+(?:et|au)\\s+${ONE})?\\s*$`, 'i');
const SECTION = new RegExp(`^(${MONTH_RE})\\s+(\\d{4})$`, 'i');
const KIND = /^((?:(?:brocante|vide[- ]greniers?|trocante|braderie(?:\s+de\s+livres)?)(?:\s+et\s+|\s*,\s*|\s+)?)+)/i;
const KIND_WORDS = /brocante|vide[- ]greniers?|trocante|braderie(?:\s+de\s+livres)?/gi;
const pad = (n) => String(n).padStart(2, '0');

const ENT = { amp: '&', nbsp: ' ', quot: '"', lt: '<', gt: '>', rsquo: '’', lsquo: '‘', laquo: '«', raquo: '»', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', ocirc: 'ô', ecirc: 'ê', ucirc: 'û', icirc: 'î', oelig: 'œ' };
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&([a-z]+);/gi, (m, n) => ENT[n] ?? m);

/** HTML から本文の行だけを取り出す */
export function htmlToLines(html) {
  const body = /<main[\s\S]*?<\/main>/i.exec(html)?.[0] ?? html;
  return decode(body.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<\/?(h\d|p|li|br|div|ul|section)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ''))
    .split('\n').map((l) => l.replace(/[\s ]+/g, ' ').trim()).filter(Boolean);
}

/** 「Samedi 14 et dimanche 15 novembre」などの見出し → {start, end} */
export function parseHeading(line, sec, warnings = []) {
  const m = HEADING.exec(line);
  if (!m) return null;
  const [, d1, mo1, , d2, mo2] = m;
  const named = [mo1, mo2].filter(Boolean).map((x) => MONTHS[x.toLowerCase()]);
  let m1 = mo1 ? MONTHS[mo1.toLowerCase()] : (named[0] ?? sec.month);
  let m2 = mo2 ? MONTHS[mo2.toLowerCase()] : m1;
  const crossing = m1 === sec.month && m2 === (sec.month % 12) + 1 && d2;
  if (!crossing && (m1 !== sec.month || m2 !== sec.month)) {
    warnings.push(`「${sec.label}」の中の見出し「${line}」は月が合わないので、${sec.month}月として読みました`);
    m1 = m2 = sec.month;
  }
  const y2 = m2 < m1 ? sec.year + 1 : sec.year;
  const start = `${sec.year}-${pad(m1)}-${pad(d1)}`;
  const end = d2 ? `${y2}-${pad(m2)}-${pad(d2)}` : start;
  return { start, end };
}

/** 「Brocante, rue de Passy (16e), Société …」→ {kind, place, arr, organizer}。蚤の市でない行は null */
export function parseItem(line) {
  const k = KIND.exec(line);
  if (!k) return null;
  const kind = [...new Set(k[1].match(KIND_WORDS).map((w) => w.toLowerCase().replace(/\s+/g, ' ').replace('vide grenier', 'vide-grenier').replace(/^vide-grenier$/, 'vide-greniers')))].join('+');
  const rest = line.slice(k[1].length);
  const ARR = /\(([^()]*\d+\s*(?:er|e)\b[^()]*)\)/g;
  const all = [...rest.matchAll(ARR)];
  if (!all.length) return null;
  const last = all.at(-1);
  const arr = [...new Set(all.flatMap((a) => [...a[1].matchAll(/(\d+)\s*(?:er|e)\b/g)].map((x) => Number(x[1]))))].filter((n) => n >= 1 && n <= 20);
  if (!arr.length) return null;
  const place = rest.slice(0, last.index).replace(ARR, '').replace(/\s+/g, ' ').replace(/^[\s,]+|[\s,]+$/g, '');
  const a = last;
  const organizer = rest.slice(a.index + a[0].length).replace(/^[\s,\-–]+/, '')
    .replace(new RegExp(`^(?:(?:le|et|du|au)\\s+)*(?:${DAY_RE})\\b[^,]*\\d{4}\\s*,?\\s*`, 'i'), '')
    .replace(/\bOVHL\b/g, 'OHVL').replace(/\s+$/, '');
  return { kind, place, arr, organizer };
}

export function parseLines(lines) {
  const events = [], warnings = [], seen = new Set();
  let sec = null, cur = null;
  for (const line of lines) {
    const s = SECTION.exec(line);
    if (s) { sec = { month: MONTHS[s[1].toLowerCase()], year: Number(s[2]), label: line }; cur = null; continue; }
    if (!sec) continue;
    if (/^Les marchés les plus célèbres/i.test(line)) { sec = null; cur = null; continue; } // 目次と本文の両方に出る
    const h = parseHeading(line, sec, warnings);
    if (h) { cur = h; continue; }
    if (!cur) continue;
    const it = parseItem(line);
    if (!it) { if (KIND.test(line)) warnings.push(`読めなかった行: ${line}`); continue; }
    const key = `${cur.start}|${cur.end}|${it.place}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({ ...cur, ...it });
  }
  events.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.arr[0] - b.arr[0]);
  return { events, warnings };
}

const q = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export const toCsv = (events) => ['start,end,kind,place,arr,organizer', ...events.map((e) => [e.start, e.end, e.kind, e.place, e.arr.join(' '), e.organizer].map(q).join(','))].join('\n') + '\n';

async function main() {
  const file = process.argv[2];
  const html = file ? await fs.readFile(file, 'utf8')
    : await fetch(SOURCE_URL, { headers: { 'user-agent': 'hashigo-puces (+https://puces.hashigo-map.com; info@ocosco.com)' } }).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); });
  const { events, warnings } = parseLines(htmlToLines(html));
  if (!events.length) { console.error('1件も読めませんでした。ページの作りが変わったかもしれません。events.csv はそのままにします'); process.exit(1); }
  await fs.writeFile(path.join(root, 'data', 'events.csv'), toCsv(events));
  await fs.writeFile(path.join(root, 'data', 'events-meta.json'), JSON.stringify({ source: SOURCE_URL, importedAt: new Date().toISOString(), pageUpdated: /Mise à jour le (\d{2}\/\d{2}\/\d{4})/.exec(html)?.[1] ?? '' }, null, 2) + '\n');
  console.log(`${events.length}件を data/events.csv に書きました（${events[0].start} 〜 ${events.at(-1).end}）`);
  for (const w of warnings) console.log('注意: ' + w);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
