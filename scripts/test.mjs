// node scripts/test.mjs
import assert from 'node:assert/strict';
import { parseHeading, parseItem, parseLines } from './import-paris.mjs';
import { parisToday, addDays, weekday, marketsOn, eventsOn, hashigoOn } from '../public/schedule.js';

const nov = { month: 11, year: 2026, label: 'Novembre 2026' };
const dec = { month: 12, year: 2026, label: 'Décembre 2026' };
assert.deepEqual(parseHeading('Mercredi 11 novembre', nov), { start: '2026-11-11', end: '2026-11-11' });
assert.deepEqual(parseHeading('Du vendredi 13 au dimanche 15 novembre', nov), { start: '2026-11-13', end: '2026-11-15' });
assert.deepEqual(parseHeading('Samedi 14 et dimanche 15 novembre', nov), { start: '2026-11-14', end: '2026-11-15' });
assert.deepEqual(parseHeading('Du vendredi 20 novembre au dimanche 22 novembre', nov), { start: '2026-11-20', end: '2026-11-22' });
assert.deepEqual(parseHeading('Du mercredi 27 janvier au samedi 30 janvier 2027', { month: 1, year: 2027, label: 'Janvier 2027' }), { start: '2027-01-27', end: '2027-01-30' });
assert.deepEqual(parseHeading('Dimanche 1er décembre', dec), { start: '2026-12-01', end: '2026-12-01' });
// 月をまたぐ
assert.deepEqual(parseHeading('Du samedi 28 novembre au mardi 1er décembre', nov), { start: '2026-11-28', end: '2026-12-01' });
assert.deepEqual(parseHeading('Du jeudi 31 décembre au vendredi 1er janvier', dec), { start: '2026-12-31', end: '2027-01-01' });
// ページ側の月のまちがい（12月の中に novembre）は、章の月で読んで注意を出す
const w = [];
assert.deepEqual(parseHeading('Samedi 5 et dimanche 6 novembre', dec, w), { start: '2026-12-05', end: '2026-12-06' });
assert.equal(w.length, 1);
assert.equal(parseHeading('Brocante, rue de Passy (16e)', nov), null);

assert.deepEqual(parseItem("Brocante, rue de Passy (16e), Société parisienne d'animation et de manifestation"),
  { kind: 'brocante', place: 'rue de Passy', arr: [16], organizer: "Société parisienne d'animation et de manifestation" });
assert.deepEqual(parseItem('Brocante,vide-greniers, avenue des Gobelins (5e) - Société Broc et Compagnie'),
  { kind: 'brocante+vide-greniers', place: 'avenue des Gobelins', arr: [5], organizer: 'Société Broc et Compagnie' });
assert.deepEqual(parseItem('Vide-greniers, avenue du Général Leclerc (14e), le samedi 14 et le dimanche 15 novembre 2026, Société OHVL Organisation'),
  { kind: 'vide-greniers', place: 'avenue du Général Leclerc', arr: [14], organizer: 'Société OHVL Organisation' });
assert.deepEqual(parseItem('Vide-greniers, place Sainte-Marthe Simard (14e) et avenue de la Porte de Vanves (14e), Société Prom Ayath'),
  { kind: 'vide-greniers', place: 'place Sainte-Marthe Simard et avenue de la Porte de Vanves', arr: [14], organizer: 'Société Prom Ayath' });
assert.deepEqual(parseItem('Brocante, vide-greniers, place de la République (3e, 11e et 10e), Société OVHL Organisation').arr, [3, 11, 10]);
assert.equal(parseItem('Brocante, place Django Reinhardt (18e), Société OVHL Organisation').organizer, 'Société OHVL Organisation');
assert.equal(parseItem('Brocante et vide-greniers, boulevard de Grenelle (15e), Société RZ Organisation').kind, 'brocante+vide-greniers');
assert.equal(parseItem('Braderie de livres, avenue de Breteuil (15e) - Bibliothèque pour tous').kind, 'braderie de livres');
assert.equal(parseItem("Dans le cadre des fêtes de fin d'année, ventes de sapins, rue du Théâtre (15e), Papillon Fleuriste"), null);

// 目次（章の名前だけが並ぶ）のあとに本文が来ても読める
const { events } = parseLines(['Novembre 2026', 'Décembre 2026', 'Les marchés les plus célèbres de Paris', 'Novembre 2026', 'Samedi 14 novembre', 'Brocante, rue Monge (5e), A', 'Brocante, rue Monge (5e), A',
  'Décembre 2026', 'Samedi 5 décembre', 'Vide-greniers, rue X (12e), B', 'Les marchés les plus célèbres de Paris', 'Samedi 6 décembre', 'Brocante, rue Y (1er), C']);
assert.equal(events.length, 2);
assert.equal(events[1].start, '2026-12-05');

// 日付
assert.equal(parisToday(new Date('2026-11-14T23:30:00Z')), '2026-11-15'); // パリは UTC+1
assert.equal(parisToday(new Date('2026-07-14T21:30:00Z')), '2026-07-14'); // 夏は UTC+2
assert.equal(addDays('2026-12-31', 1), '2027-01-01');
assert.equal(weekday('2026-11-14'), 6);

const H = (o, c) => ({ open: o, close: c });
const markets = [
  { id: 'a', hashigo: '南', hours: [H('07:30', '14:00'), null, null, null, null, null, H('07:00', '14:00')] },
  { id: 'b', hashigo: '南', hours: [H('09:00', '18:00'), null, null, null, null, null, H('09:00', '18:00')] },
  { id: 'c', hashigo: '北', hours: [H('10:00', '18:00'), H('11:00', '17:00'), null, null, null, H('08:00', '12:00'), H('10:00', '18:00')] },
];
assert.deepEqual(marketsOn(markets, '2026-11-14').map((x) => x.market.id), ['a', 'b', 'c']); // 土
assert.deepEqual(marketsOn(markets, '2026-11-16').map((x) => x.market.id), ['c']);           // 月
assert.deepEqual(marketsOn(markets, '2026-11-17'), []);                                      // 火
const evs = [{ start: '2026-11-13', end: '2026-11-15', arr: [16] }, { start: '2026-11-14', end: '2026-11-14', arr: [14] }];
assert.equal(eventsOn(evs, '2026-11-14').length, 2);
assert.equal(eventsOn(evs, '2026-11-15').length, 1);
const hs = hashigoOn([{ key: '南', arrs: [14, 15] }, { key: '北', arrs: [18] }], markets, evs, '2026-11-14');
assert.deepEqual(hs.map((x) => [x.markets.length, x.events.length]), [[2, 1], [1, 0]]);

console.log('テストOK');

// 期間(2027-01-01〜02-28)
{
  const { PERIOD, clampToPeriod, periodDays, inPeriod } = await import('../public/schedule.js');
  assert.equal(PERIOD.start, '2027-01-01'); assert.equal(PERIOD.end, '2027-02-28');
  assert.equal(clampToPeriod('2026-11-15'), '2027-01-01');
  assert.equal(clampToPeriod('2027-02-10'), '2027-02-10');
  assert.equal(clampToPeriod('2027-04-01'), '2027-02-28');
  assert.equal(periodDays().length, 59);
  const ev = [{ start: '2026-12-20', end: '2026-12-21' }, { start: '2027-01-27', end: '2027-01-30' }, { start: '2027-03-29', end: '2027-03-29' }];
  assert.deepEqual(inPeriod(ev, '2026-11-15'), [ev[1]]);
  console.log('期間テストOK');
}

// 地方（リヨン・南仏・ボルドー）
{
  const fs = await import('node:fs');
  const j = JSON.parse(fs.readFileSync(new URL('../public/data/puces.json', import.meta.url), 'utf8'));
  assert.deepEqual(j.regions, ['パリ', 'リヨン', '南仏', 'ボルドー', 'トゥールーズ']);
  for (const m of j.markets) {
    assert.ok(j.regions.includes(m.region), `${m.id} の region`);
    if (m.region !== 'パリ') assert.equal(m.zone, '', `${m.id} は地方なので zone は空`);
    assert.ok(m.hours.some(Boolean), `${m.id} に開く曜日がある`);
  }
  const by = (r) => j.markets.filter((m) => m.region === r).length;
  assert.ok(by('パリ') === 7 && by('リヨン') >= 1 && by('南仏') >= 1 && by('ボルドー') >= 1);
  // 2027-01-03（日）はボルドーとリヨンの日曜の市が開く
  const { marketsOn } = await import('../public/schedule.js');
  const open = (r) => marketsOn(j.markets.filter((m) => m.region === r), '2027-01-03').map((x) => x.market.id);
  assert.deepEqual(open('ボルドー'), ['b001']);
  assert.deepEqual(open('リヨン').sort(), ['r001', 'r002']);
  // 2027-01-04（月）はニースのブロカントとイル・オ・ブロカント、マルセイユは休み
  assert.deepEqual(marketsOn(j.markets.filter((m) => m.region === '南仏'), '2027-01-04').map((x) => x.market.id).sort(), ['s003', 's004']);
  // 決まった日だけ開く市（dates）：トゥールーズのブロカント・デ・アレとアルル
  const ids = (r, d) => marketsOn(j.markets.filter((m) => m.region === r), d).map((x) => x.market.id).sort();
  assert.deepEqual(ids('トゥールーズ', '2027-01-02'), ['t001', 't002']); // 土：第1週の3日間 + サン＝トーバン
  assert.deepEqual(ids('トゥールーズ', '2027-01-09'), ['t002']);         // 土：第2週は t001 は休み
  assert.deepEqual(ids('トゥールーズ', '2027-02-07'), ['t001']);         // 日：第1週
  assert.ok(ids('南仏', '2027-01-06').includes('s008'));                  // アルル 第1水曜
  assert.ok(!ids('南仏', '2027-01-13').includes('s008'));                 // 第2水曜は休み
  assert.ok(ids('南仏', '2027-02-17').includes('s008'));                  // 第3水曜
  console.log('地方テストOK');
}

{
  const { franceMap } = await import('../public/views.js');
  const { FR_CITIES, FR_SUD, FR_OUTLINE } = await import('../public/france-map.js');
  const regions = ['パリ', 'リヨン', '南仏', 'ボルドー', 'トゥールーズ'];
  const html = franceMap({ markets: [{ region: 'リヨン' }] }, 'リヨン', true);
  for (const r of regions) assert.ok(html.includes(`data-region="${r}"`), `${r} のマーカー`);
  assert.ok(html.includes('aria-pressed="true"') && html.startsWith('<details'));
  assert.deepEqual(Object.keys(FR_CITIES).sort(), ['パリ', 'リヨン', 'ボルドー', 'トゥールーズ'].sort());
  assert.ok(FR_SUD.length >= 3 && FR_OUTLINE.startsWith('M'));
  assert.ok(FR_CITIES['パリ'].y < FR_CITIES['リヨン'].y && FR_CITIES['リヨン'].y < FR_CITIES['トゥールーズ'].y); // 北から南
  assert.ok(FR_CITIES['ボルドー'].x < FR_CITIES['パリ'].x && FR_CITIES['パリ'].x < FR_CITIES['リヨン'].x);       // 西から東
  console.log('フランス地図テストOK');
}

{
  const { viewHashigo, zoneMap, marketCard, setZones } = await import('../public/views.js');
  const data = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../public/data/puces.json', import.meta.url), 'utf8'));
  setZones(data.zones);
  const paris = { ...data, markets: data.markets.filter((m) => m.region === 'パリ') };
  // 滞在期間: 日曜(2027-01-03)と月曜をふくむ期間で、はしごが日ごとに出る
  const r = viewHashigo(paris, { date: '2027-01-03', zone: 'すべて', stay: { from: '2027-01-01', to: '2027-01-10' } });
  assert.ok(r.includes('stayday__title') && r.includes('10日間'.replace('10', '10')) && r.includes('id="stayFrom"'));
  const one = viewHashigo(paris, { date: '2027-01-03', zone: 'すべて', stay: { from: '', to: '' } });
  assert.ok(!one.includes('stayday') && one.includes('id="stayTo"'));
  // 地図: 見出しとピン
  const map = zoneMap(paris, 'すべて', true, '2027-01-03');
  assert.ok(map.includes('パリのエリアからえらぶ') && map.includes('class="map__pin"'));
  // カードの帯の色はエリアの番号
  assert.ok(marketCard(paris.markets.find((m) => m.zone === '左岸'), null).includes(`data-z="${data.zones.indexOf('左岸')}"`));
  console.log('滞在・ピンテストOK');
}

{
  // 版番号: 参照にハッシュが付き、もう一度走らせても変わらない
  const fs = await import('node:fs/promises');
  const { stamp, version } = await import('./stamp.mjs');
  const a = await stamp();
  const b = await stamp();
  assert.match(a.version, /^[0-9a-f]{8}$/);
  assert.equal(b.version, a.version);
  assert.deepEqual(b.changed, []);
  const idx = await fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(idx.includes(`href="style.css?v=${a.version}"`) && idx.includes(`src="app.js?v=${a.version}"`));
  assert.ok(idx.includes('fonts.googleapis.com/css2?family=') && !/fonts\.googleapis\.com[^"]*\?v=/.test(idx)); // 外部のURLは触らない
  const views = await fs.readFile(new URL('../public/views.js', import.meta.url), 'utf8');
  assert.ok(views.includes(`from './schedule.js?v=${a.version}'`) && views.includes(`from './france-map.js?v=${a.version}'`));
  assert.equal(await version(), a.version);
  console.log('版番号テストOK');
}
