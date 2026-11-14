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
/** 0=日 〜 6=土 */
export const weekday = (iso) => new Date(iso + 'T12:00:00Z').getUTCDay();

/** その日の常設の営業時間。休みなら null */
export const hoursOn = (market, iso) => market.hours[weekday(iso)] || null;
/** その日に開く常設（早く開く順） */
export function marketsOn(markets, iso) {
  return markets.map((market) => ({ market, hours: hoursOn(market, iso) })).filter((x) => x.hours)
    .sort((a, b) => a.hours.open.localeCompare(b.hours.open) || a.hours.close.localeCompare(b.hours.close));
}
/** その日にかかる単発の市 */
export const eventsOn = (events, iso) => events.filter((e) => e.start <= iso && iso <= e.end);
/** 今日以降の単発の市 */
export const upcoming = (events, today) => events.filter((e) => e.end >= today);

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
