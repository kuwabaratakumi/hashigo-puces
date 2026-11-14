// data/*.csv（編集用）→ public/data/puces.json（公開用）
//   node scripts/build.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const ZONES = ['中心部', '左岸', '右岸・西', '右岸・北', '右岸・東'];
// 区 → エリア（このサイトでの分け方）
const ZONE_OF = { 1: '中心部', 2: '中心部', 3: '中心部', 4: '中心部', 5: '左岸', 6: '左岸', 7: '左岸', 13: '左岸', 14: '左岸', 15: '左岸', 8: '右岸・西', 16: '右岸・西', 17: '右岸・西', 9: '右岸・北', 10: '右岸・北', 18: '右岸・北', 19: '右岸・北', 11: '右岸・東', 12: '右岸・東', 20: '右岸・東' };
const STATUS = new Set(['確認済', '推定', '未確認', '掲載中止']);
const KINDS = new Set(['brocante', 'vide-greniers', 'trocante', 'braderie', 'braderie de livres']);
const WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']; // 0=日
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HOURS = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

/** ダブルクォート・改行入りにも対応する最小限のCSV読み込み */
export function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((v) => v !== ''));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.replace(/^﻿/, ''), (r[i] ?? '').trim()])));
}
const read = async (f) => parseCsv(await fs.readFile(path.join(root, 'data', f), 'utf8'));

async function main() {
  const errors = [];
  const [markets, events, groups] = await Promise.all([read('markets.csv'), read('events.csv'), read('hashigo.csv')]);
  const meta = JSON.parse(await fs.readFile(path.join(root, 'data', 'events-meta.json'), 'utf8').catch(() => '{}'));
  const keys = new Set(groups.map((g) => g.key)); const ids = new Set();

  const outMarkets = markets.filter((m) => m.status !== '掲載中止').map((m) => {
    const bad = (msg) => errors.push(`${m.id} ${m.name}: ${msg}`);
    if (ids.has(m.id)) bad('id が重複'); ids.add(m.id);
    if (!ZONES.includes(m.zone)) bad(`zone が不正 (${m.zone})`);
    if (!STATUS.has(m.status)) bad(`status が不正 (${m.status})`);
    if (m.hashigo && !keys.has(m.hashigo)) bad(`hashigo「${m.hashigo}」が hashigo.csv にない`);
    if (m.official_url && !/^https:\/\//.test(m.official_url)) bad('official_url は https:// から');
    const hours = WEEK.map((d) => {
      if (!m[d]) return null;
      const [t, note] = m[d].split('|');
      if (!HOURS.test(t)) { bad(`${d} は「HH:MM-HH:MM」か「HH:MM-HH:MM|メモ」`); return null; }
      const [open, close] = t.split('-');
      return { open, close, ...(note && { note }) };
    });
    if (!hours.some(Boolean)) bad('開いている曜日が1つもない');
    return { id: m.id, name: m.name, nameFr: m.name_fr, kind: m.kind, zone: m.zone, area: m.area, address: m.address, metro: m.metro, hours, status: m.status, url: m.official_url, hashigo: m.hashigo, note: m.note, source: m.source };
  });

  const outEvents = events.map((e, i) => {
    const bad = (msg) => errors.push(`events.csv ${i + 2}行目: ${msg}`);
    if (!ISO.test(e.start) || !ISO.test(e.end)) bad('日付は YYYY-MM-DD');
    if (e.end < e.start) bad('end が start より前');
    const kinds = e.kind.split('+');
    if (!kinds.every((k) => KINDS.has(k))) bad(`kind が不正 (${e.kind})`);
    const arr = e.arr.split(/\s+/).filter(Boolean).map(Number);
    if (!arr.length || !arr.every((n) => ZONE_OF[n])) bad(`arr が不正 (${e.arr})`);
    return { start: e.start, end: e.end, kinds, place: e.place, arr, zone: ZONE_OF[arr[0]], organizer: e.organizer };
  });

  const outGroups = groups.map((g) => ({ key: g.key, title: g.title, arrs: g.arrs.split(/[\s,]+/).filter(Boolean).map(Number), note: g.note }));
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

  const dir = path.join(root, 'public', 'data');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'puces.json'), JSON.stringify({ builtAt: new Date().toISOString(), zones: ZONES, markets: outMarkets, events: outEvents, groups: outGroups, eventsMeta: meta }));
  console.log(`常設 ${outMarkets.length}件・単発 ${outEvents.length}件（${outEvents[0]?.start ?? '-'} 〜 ${outEvents.at(-1)?.end ?? '-'}）・はしごエリア ${outGroups.length}件`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
