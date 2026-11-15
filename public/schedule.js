// 日付の計算（ブラウザとテストの両方で使う。DOM には触らない）
// 日付はすべてパリの日付（YYYY-MM-DD）で扱う

/** パリの今日 */
export function parisToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** このサイトで見られる期間（パリ旅行の予定にあわせる） */
export const PERIOD = { start: '2027-01-01', end: '2027-02-28' };
/** 期間のなかにおさめる。今日が期間より前なら期間の初日、後なら最終日 */
export const clampToPeriod = (iso) => (iso < PERIOD.start ? PERIOD.start : iso > PERIOD.end ? PERIOD.end : iso);
/** 期間のすべての日付 */
export function periodDays() {
  const out = [];
  for (let d = PERIOD.start; d <= PERIOD.end; d = addDays(d, 1)) out.push(d);
  return out;
}
/** 0=日 〜 6=土 */
export const weekday = (iso) => new Date(iso + 'T12:00:00Z').getUTCDay();

/** その日の常設の営業時間。休みなら null */
export const hoursOn = (market, iso) => (market.dates && !market.dates.includes(iso) ? null : market.hours[weekday(iso)] || null);
/** その日に開く常設（早く開く順） */
export function marketsOn(markets, iso) {
  return markets.map((market) => ({ market, hours: hoursOn(market, iso) })).filter((x) => x.hours)
    .sort((a, b) => a.hours.open.localeCompare(b.hours.open) || a.hours.close.localeCompare(b.hours.close));
}
/** その日にかかる単発の市 */
export const eventsOn = (events, iso) => events.filter((e) => e.start <= iso && iso <= e.end);
/** 今日以降の単発の市 */
export const upcoming = (events, today) => events.filter((e) => e.end >= today);
/** 期間にかかる単発の市（今日より前に終わったものは除く） */
export const inPeriod = (events, today) => events.filter((e) => e.end >= today && e.end >= PERIOD.start && e.start <= PERIOD.end);

/** はしごエリアごとに、その日に回れる常設と単発をまとめる */
export function hashigoOn(groups, markets, events, iso) {
  const open = marketsOn(markets, iso);
  const todays = eventsOn(events, iso);
  return groups.map((group) => ({
    group,
    markets: open.filter((x) => x.market.hashigo === group.key),
    events: todays.filter((e) => e.arr.some((n) => group.arrs.includes(n))),
  }));
}
