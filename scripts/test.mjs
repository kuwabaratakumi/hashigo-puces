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
