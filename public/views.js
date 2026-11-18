// 画面の部品（HTML文字列を作るだけ。DOM には触らない）
import { PERIOD, addDays, weekday, marketsOn, eventsOn, inPeriod, periodDays, hashigoOn } from './schedule.js?v=da773167';
import { MAP_W, MAP_H, ARR } from './paris-map.js?v=da773167';
import { FR_W, FR_H, FR_OUTLINE, FR_CITIES, FR_SUD, FR_EXTRA } from './france-map.js?v=da773167';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 月はじまりで並べる
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = (iso) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
export const mdw = (iso) => `${md(iso)}（${DOW[weekday(iso)]}）`;
const range = (s, e) => (e === s ? mdw(s) : `${mdw(s)}〜${mdw(e)}`);
const hm = (t) => t.replace(/^0/, '');
const gmaps = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const gsearch = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
const KIND = { brocante: 'ブロカント', 'vide-greniers': 'ヴィド・グルニエ', trocante: 'トロカント', braderie: 'ブラドリー', 'braderie de livres': '本のブラドリー' };
const KIND_FR = { brocante: 'brocante', 'vide-greniers': 'vide-greniers', trocante: 'trocante', braderie: 'braderie', 'braderie de livres': 'braderie de livres' };
const arrText = (arr) => arr.map((n) => `${n}区`).join('・');
const inZone = (zone, z) => zone === 'すべて' || z === zone;

/* ---------- お気に入りとメモ ---------- */
// 保存の中身（app.js が持つ）。{ fav: {key: {label}}, memo: {key: {text, label}}, note: '' }
let SAVED = { fav: {}, memo: {}, note: '' };
export const setSaved = (s) => { SAVED = s; };
let ZONE_LIST = [];
export const setZones = (z) => { ZONE_LIST = z; };
/** カードの左の帯を、エリアの色にあわせる（パリだけ） */
const zattr = (z) => (ZONE_LIST.includes(z) ? ` data-z="${ZONE_LIST.indexOf(z)}"` : '');
export const eventKey = (e) => `e:${e.start}:${e.place}`;
export const starLabel = (on) => (on ? 'お気に入りから外す' : 'お気に入りに入れる');

function star(key, label) {
  const on = Boolean(SAVED.fav[key]);
  return `<button type="button" class="star" data-fav="${esc(key)}" data-label="${esc(label)}" aria-pressed="${on}" aria-label="${starLabel(on)}">${on ? '★' : '☆'}</button>`;
}
function memoBox(key, label) {
  const text = SAVED.memo[key]?.text || '';
  return `<details class="memo" ${text ? 'open' : ''}><summary>${text ? 'メモ' : 'メモを書く'}</summary>
    <textarea data-memo="${esc(key)}" data-label="${esc(label)}" rows="3" aria-label="${esc(label)} のメモ" placeholder="さがしたい物、行く時間など">${esc(text)}</textarea></details>`;
}

/* ---------- カード ---------- */
function weekRow(m) {
  return `<div class="week" aria-label="開く曜日">${WEEK_ORDER.map((d) => `<span ${m.hours[d] ? 'data-open' : ''}>${DOW[d]}</span>`).join('')}</div>`;
}
/** 決まった日だけ開く市の、開催日（例：1/1（金）・1/2（土））*/
const datesText = (m) => m.dates.map(mdw).join('・');
function weekText(m) {
  return WEEK_ORDER.filter((d) => m.hours[d]).map((d) => `${DOW[d]} ${hm(m.hours[d].open)}〜${hm(m.hours[d].close)}${m.hours[d].note ? `（${esc(m.hours[d].note)}）` : ''}`).join('<br>');
}

/** 常設。hours を渡すと「その日の時間」を大きく出す */
export function marketCard(m, hours) {
  const official = m.url
    ? `<a class="btn" href="${esc(m.url)}" target="_blank" rel="noopener">公式サイト</a>`
    : `<a class="btn btn--ghost" href="${esc(gsearch(m.nameFr))}" target="_blank" rel="noopener">公式をさがす</a>`;
  const guess = m.status !== '確認済' ? `<span class="unverified">${esc(m.status)}</span>` : '';
  return `<article class="card" data-type="market"${zattr(m.zone)}>
    ${star(m.id, m.name)}
    <div class="card__head">
      <p class="card__when">${hours ? `${hm(hours.open)}〜${hm(hours.close)}` : m.dates ? '決まった日だけ' : '毎週'}${guess}</p>
      <h3 class="card__name">${esc(m.name)}</h3>
      <p class="card__fr" lang="fr">${esc(m.nameFr)}</p>
      <div class="card__badges"><span class="pill pill--market">常設</span><span class="pill pill--kind">${esc(m.kind)}</span></div>
    </div>
    ${m.dates ? '' : weekRow(m)}
    <dl class="card__meta">
      ${hours && hours.note ? `<div><dt>注意</dt><dd>${esc(hours.note)}</dd></div>` : ''}
      <div><dt>場所</dt><dd>${esc(m.area)} ・ <span lang="fr">${esc(m.address)}</span></dd></div>
      ${m.metro ? `<div><dt>${m.region === 'パリ' ? '駅' : '最寄り'}</dt><dd>${esc(m.metro)}</dd></div>` : ''}
      ${m.dates ? `<div><dt>開催日</dt><dd>${datesText(m)}</dd></div>` : ''}
      ${hours ? '' : `<div><dt>時間</dt><dd>${weekText(m)}</dd></div>`}
      ${m.note ? `<div><dt>補足</dt><dd>${esc(m.note)}</dd></div>` : ''}
    </dl>
    ${memoBox(m.id, m.name)}
    <div class="card__links">
      ${official}
      <a class="btn btn--ghost" href="${esc(gmaps(m.nameFr + ' ' + m.address))}" target="_blank" rel="noopener">地図</a>
      ${m.source ? `<a class="btn btn--ghost" href="${esc(m.source)}" target="_blank" rel="noopener">出典</a>` : ''}
    </div>
  </article>`;
}

/** 単発 */
export function eventCard(e, sourceUrl) {
  const kinds = e.kinds.map((k) => KIND[k] || k).join('・');
  const q = `${e.kinds.map((k) => KIND_FR[k]).join(' ')} ${e.place} Paris ${Number(e.start.slice(8))}/${e.start.slice(5, 7)}/${e.start.slice(0, 4)}`;
  const key = eventKey(e);
  const label = `${range(e.start, e.end)} ${e.place}`;
  return `<article class="card" data-type="event"${zattr(e.zone)}>
    ${star(key, label)}
    <div class="card__head">
      <p class="card__when">${range(e.start, e.end)}</p>
      <h3 class="card__name" lang="fr">${esc(e.place)}</h3>
      <div class="card__badges"><span class="pill pill--event">単発</span><span class="pill pill--kind">${esc(kinds)}</span></div>
    </div>
    <dl class="card__meta">
      <div><dt>場所</dt><dd>${arrText(e.arr)}</dd></div>
      <div><dt>時間</dt><dd>一覧に記載なし（下の「時間をさがす」で確認）</dd></div>
      ${e.organizer ? `<div><dt>主催</dt><dd lang="fr">${esc(e.organizer)}</dd></div>` : ''}
    </dl>
    ${memoBox(key, label)}
    <div class="card__links">
      <a class="btn" href="${esc(gmaps(`${e.place}, Paris ${e.arr[0]}e`))}" target="_blank" rel="noopener">地図</a>
      <a class="btn btn--ghost" href="${esc(gsearch(q))}" target="_blank" rel="noopener">時間をさがす</a>
      ${sourceUrl ? `<a class="btn btn--ghost" href="${esc(sourceUrl)}" target="_blank" rel="noopener">出典</a>` : ''}
    </div>
  </article>`;
}

const grid = (html) => `<div class="grid">${html.join('')}</div>`;

/* ---------- 上の帯 ---------- */
/** 見られる期間（1〜2月）の日付ボタン。1段で、横にスクロールすると2月末まで見られる */
export function dayStrip(data, today, selected, zone, stay, view, pick) {
  const inStay = (iso) => view === 'hashigo' && stay && stay.from && stay.to && iso >= stay.from && iso <= stay.to;
  return periodDays().map((iso, i) => {
    const w = weekday(iso);
    const n = marketsOn(data.markets, iso).filter((x) => inZone(zone, x.market.zone)).length + eventsOn(data.events, iso).filter((e) => inZone(zone, e.zone)).length;
    return `<button class="day" type="button" data-date="${iso}" ${view === 'day' && iso === selected ? 'aria-current="date"' : ''} ${n ? '' : 'data-empty'} ${iso === today ? 'data-today' : ''} ${inStay(iso) ? 'data-stay' : ''} ${view === 'hashigo' && iso === pick ? 'data-pick' : ''} ${w === 0 ? 'data-sun' : w === 6 ? 'data-sat' : ''} aria-label="${mdw(iso)} ${n}件">
      <span class="day__m">${i === 0 || iso.endsWith('-01') ? `${Number(iso.slice(5, 7))}月` : ''}</span><span class="day__d">${Number(iso.slice(8))}</span><span class="day__w">${DOW[w]}</span></button>`;
  }).join('');
}

const regionChip = (data, r, region) => `<button type="button" class="chip chip--region" data-region="${esc(r)}" aria-pressed="${r === region}">${esc(r)}<span class="chip__n">${data.markets.filter((m) => m.region === r).length}</span></button>`;
/** 1段目：パリのボタンと、その右にパリのエリア（パリをえらんでいるときだけ） */
export function parisRow(data, region, zone) {
  const paris = data.markets.filter((m) => m.region === 'パリ');
  const zones = region === 'パリ' ? `<span class="areas__sep" aria-hidden="true"></span>${zoneChips({ ...data, markets: paris }, zone)}` : '';
  return regionChip(data, 'パリ', region) + zones;
}
/** 2段目：パリ以外の地方 */
export function regionChips(data, region) {
  return data.regions.filter((r) => r !== 'パリ').map((r) => regionChip(data, r, region)).join('');
}

/** 地方では、載せているものの範囲を最初に知らせる */
export function regionNote(region, view) {
  if (view === 'saved') return '';
  return `<p class="notice">${esc(region)}は、毎週や毎月、決まった日に開く市だけを載せています。単発の市（サロンなど）は、パリだけです。「はしご」では、その日に開く市を並べます。曜日と時間は観光局や市の案内によるもので、行く前に公式の案内も見てください。</p>`;
}

export function zoneChips(data, zone) {
  const count = (z) => data.markets.filter((m) => m.zone === z).length;
  return ['すべて', ...data.zones].map((z) => `<button type="button" class="chip" data-zone="${esc(z)}" aria-pressed="${z === zone}">${esc(z)}${z === 'すべて' ? '' : `<span class="chip__n">${count(z)}</span>`}</button>`).join('');
}

/** 単発のデータが古い・足りないときの注意 */
function stale(data, iso) {
  const last = data.events.reduce((a, e) => (e.end > a ? e.end : a), '');
  if (!last || iso <= last) return '';
  return `<p class="notice">この日の単発の市は、まだ一覧に出ていません（いま載っているのは ${mdw(last)} まで）。常設だけを表示しています。</p>`;
}

/* ---------- この日 ---------- */
export function viewDay(data, { date, zone }) {
  const ms = marketsOn(data.markets, date).filter((x) => inZone(zone, x.market.zone));
  const es = eventsOn(data.events, date).filter((e) => inZone(zone, e.zone));
  const head = `<div class="summary"><p><b class="num">${mdw(date)}</b> 　常設 <b class="num">${ms.length}</b> ・ 単発 <b class="num">${es.length}</b></p></div>`;
  if (!ms.length && !es.length) return head + stale(data, date) + '<p class="empty">この日に開く蚤の市は見つかっていません。週末（土・日・月）に多く開かれます</p>';
  const hashigo = hashigoCourses(data, date, zone, 'この日のはしご');
  return head + stale(data, date) + hashigo
    + (ms.length ? `<h2 class="section__title">常設<span class="month__n">早く開く順</span></h2>${grid(ms.map((x) => marketCard(x.market, x.hours)))}` : '')
    + (es.length ? `<h2 class="section__title">単発<span class="month__n">この日だけ、または数日だけ</span></h2>${grid(es.map((e) => eventCard(e, data.eventsMeta.source)))}` : '');
}

/* ---------- はしご ---------- */
/** 停留所の名前（ルートの検索に使う）と、画面に出す名前 */
const stopsOf = (markets, events) => [
  ...markets.map((x) => ({ q: x.market.address.replace(/\s*\/\s*/g, ' & '), name: x.market.name })),
  ...events.map((e) => ({ q: `${e.place}, Paris ${e.arr[0]}e`, name: e.place })),
];
/** 電車・バス（メトロ・RER・バス）のルート。Googleマップは経由地つきの公共交通に対応していないので、区間ごとに出す */
function transitLegs(markets, events) {
  const st = stopsOf(markets, events);
  const q = (t) => encodeURIComponent(t);
  return st.slice(1).map((b, i) => ({ from: st[i].name, to: b.name, url: `https://www.google.com/maps/dir/?api=1&origin=${q(st[i].q)}&destination=${q(b.q)}&travelmode=transit` }));
}
/** その日のおすすめのはしごコース（2か所以上）。徒歩の通しルートと、区間ごとの電車・バスのルート */
export function hashigoCourses(data, date, zone, title, collapsed = false) {
  const sets = combosOn(data, date, zone, data.region).filter(({ markets, events }) => markets.length + events.length >= 2);
  if (!sets.length) return '';
  const items = sets.map(({ group, markets, events }) => {
    const walk = routeUrl(markets, events, group.mode);
    const names = [...markets.map((x) => esc(x.market.name)), ...events.map((e) => esc(e.place))].join(' → ');
    const legs = group.mode === 'driving' ? [] : transitLegs(markets, events);
    return `<li><b>${esc(group.title)}</b><span>${names}</span>
      <div class="course__links">${walk ? `<a class="btn btn--ghost" href="${esc(walk)}" target="_blank" rel="noopener">${group.mode === 'driving' ? '車' : '徒歩'}のルート</a>` : ''}${legs.map((l, i) => `<a class="btn btn--ghost" href="${esc(l.url)}" target="_blank" rel="noopener" title="${esc(l.from)} → ${esc(l.to)}">電車・バス${legs.length > 1 ? `（${i + 1}→${i + 2}）` : ''}</a>`).join('')}</div></li>`;
  }).join('');
  const list = `<ul>${items}</ul>`;
  return collapsed
    ? `<details class="hashigo-mini hashigo-mini--fold"><summary>${esc(title)}<span class="month__n">${sets.length}コース</span></summary>${list}</details>`
    : `<section class="hashigo-mini"><h2 class="section__title">${esc(title)}<span class="month__n">近くでまとめて回れる組み合わせ</span></h2>${list}</section>`;
}

/** Googleマップのルート（徒歩）。常設は住所、単発は場所の名前と区で、まわる順に並べる */
export function routeUrl(markets, events, mode = 'walking') {
  const stops = [
    ...markets.map((x) => x.market.address.replace(/\s*\/\s*/g, ' & ')),
    ...events.map((e) => `${e.place}, Paris ${e.arr[0]}e`),
  ];
  if (stops.length < 2) return '';
  const q = (t) => encodeURIComponent(t);
  const mid = stops.slice(1, -1);
  return `https://www.google.com/maps/dir/?api=1&origin=${q(stops[0])}&destination=${q(stops.at(-1))}${mid.length ? `&waypoints=${mid.map(q).join('%7C')}` : ''}&travelmode=${mode}`;
}
function combo(data, group, markets, events, single) {
  const n = markets.length + events.length;
  const route = routeUrl(markets, events, group.mode);
  const order = markets.map((x) => `${esc(x.market.name)}（${hm(x.hours.open)}〜${hm(x.hours.close)}）`).join(' → ');
  return `<section class="combo">
      <header class="combo__head">
        <h2 class="combo__name">${esc(group.title)}</h2>
        <p class="combo__sub">${esc(group.note)}</p>
        ${route ? `<p class="combo__route"><a class="btn" href="${esc(route)}" target="_blank" rel="noopener">Googleマップでルートを見る（${group.mode === 'driving' ? '車' : '徒歩'}）</a></p>` : ''}
      </header>
      ${single && n < 2 ? '<p class="combo__note">この日に開くのは1か所だけです。</p>' : ''}
      ${markets.length > 1 ? `<p class="combo__note">早く開く順：${order}</p>` : ''}
      ${grid([...markets.map((x) => marketCard(x.market, x.hours)), ...events.map((e) => eventCard(e, data.eventsMeta.source))])}
    </section>`;
}
/** その日の、条件にあうはしご（エリアでしぼる） */
function combosOn(data, date, zone, region = 'パリ') {
  // 地方は、その地方でその日に開く市を1つにまとめる（町どうしは離れていることがある）
  if (region !== 'パリ') {
    const ms = marketsOn(data.markets, date);
    return ms.length ? [{ group: { title: `${region}で、この日に開く市`, note: '町どうしは離れていることがあります。ルートで時間を確かめてください', mode: 'driving' }, markets: ms, events: [] }] : [];
  }
  return hashigoOn(data.groups, data.markets, data.events, date).filter(({ markets, events }) => {
    if (!markets.length && !events.length) return false;
    return zone === 'すべて' || [...markets.map((x) => x.market.zone), ...events.map((e) => e.zone)].includes(zone);
  });
}
/** 滞在期間（始点〜終点）をえらぶ欄。クリックでしまえる。保存した期間からもえらべる */
function stayForm(stay, open, periods = []) {
  const on = stay.from && stay.to;
  const same = (p) => p.from === stay.from && p.to === stay.to;
  const chips = periods.map((p) => `<span class="pchip${same(p) ? ' is-on' : ''}"><button type="button" class="pchip__go" data-period="${esc(p.from)}|${esc(p.to)}">${md(p.from)}〜${md(p.to)}</button><button type="button" class="pchip__del" data-period-del="${esc(p.from)}|${esc(p.to)}" aria-label="${md(p.from)}〜${md(p.to)} を消す">×</button></span>`).join('');
  return `<details class="stay" id="staybox" ${open ? 'open' : ''}>
    <summary><span class="stay__ttl">フランスにいる期間</span><span class="mapbox__now">${on ? `${md(stay.from)}〜${md(stay.to)}` : '未選択'}</span></summary>
    <div class="stay__body">
      <div class="stay__row">
        <input type="date" id="stayFrom" aria-label="着く日" min="${PERIOD.start}" max="${PERIOD.end}" value="${esc(stay.from || '')}">
        <span aria-hidden="true">〜</span>
        <input type="date" id="stayTo" aria-label="帰る日" min="${PERIOD.start}" max="${PERIOD.end}" value="${esc(stay.to || '')}">
        ${on && !periods.some(same) ? '<button type="button" class="btn btn--ghost btn--sm" data-period-save>この期間を保存</button>' : ''}
      </div>
      ${chips ? `<div class="stay__saved"><span class="stay__label">保存した期間</span>${chips}</div>` : ''}
      <p class="stay__hint">上の日付で、始まりと終わりの日をドラッグすると期間を選べます。</p>
    </div>
  </details>`;
}
/** 期間を選ぶ：期間中に開く市を、日付ごとにすべて並べる（はしごのルートは「日を選ぶ」で出す） */
export function viewHashigo(data, { zone, stay, stayOpen = true, periods = [] }) {
  const form = stayForm(stay, stayOpen, periods);
  if (!(stay.from && stay.to)) return form + '<p class="empty">期間をえらぶと、そのあいだに開く市を日付ごとに並べます</p>';
  const days = [];
  for (let d = stay.from; d <= stay.to; d = addDays(d, 1)) days.push(d);
  const rows = days.map((d) => ({ d, ms: marketsOn(data.markets, d).filter((x) => inZone(zone, x.market.zone)), es: eventsOn(data.events, d).filter((e) => inZone(zone, e.zone)) }));
  const open = rows.filter((r) => r.ms.length + r.es.length);
  const html = rows.map((r) => `<section class="stayday"><h2 class="stayday__title">${mdw(r.d)}<span class="month__n">${r.ms.length + r.es.length ? `常設 ${r.ms.length} ・ 単発 ${r.es.length}` : '開く市なし'}</span></h2>${hashigoCourses(data, r.d, zone, 'おすすめのはしごコース', true)}${r.ms.length + r.es.length ? grid([...r.ms.map((x) => marketCard(x.market, x.hours)), ...r.es.map((e) => eventCard(e, data.eventsMeta.source))]) : ''}</section>`).join('');
  return form + `<div class="summary"><p><b class="num">${mdw(stay.from)}</b> 〜 <b class="num">${mdw(stay.to)}</b>（${days.length}日間）　市が開く日 <b class="num">${open.length}</b>日</p><p class="summary__hint">はしごできる日は、日付の下の「おすすめのはしごコース」を開くとルートが見られます</p></div>` + stale(data, stay.to) + html;
}

/* ---------- 全日程（単発と常設をまとめて） ---------- */
export function viewAll(data, today, state) {
  const paris = data.region === 'パリ';
  const ev = paris ? viewEvents(data, today, state) : '';
  const mk = viewMarkets(data, state);
  return `<div class="summary"><p><b class="num">1/1</b> 〜 <b class="num">2/28</b> の全日程　${paris ? `単発 <b class="num">${inPeriod(data.events, today).filter((e) => inZone(state.zone, e.zone)).length}</b> ・ ` : ''}常設 <b class="num">${data.markets.filter((m) => inZone(state.zone, m.zone)).length}</b></p><p class="summary__hint">上の日付を押すとその日だけ、ドラッグで期間をしぼれます</p></div>`
    + (paris ? `<h2 class="section__title">単発<span class="month__n">決まった日だけ開く市</span></h2>${ev}` : '')
    + `<h2 class="section__title">常設<span class="month__n">毎週・毎月開く市</span></h2>${mk}`;
}

/* ---------- 単発の予定 ---------- */
export function viewEvents(data, today, { zone }) {
  const list = inPeriod(data.events, today).filter((e) => inZone(zone, e.zone));
  const meta = data.eventsMeta;
  const lead = `<p class="lead">パリ市の一覧に載っている、2027年1月1日〜2月末の単発の市です${meta.pageUpdated ? `（一覧の更新日 ${esc(meta.pageUpdated)}）` : ''}。1〜2月は、もともと少ない時期です。</p>`;
  if (!list.length) return lead + '<p class="empty">これからの予定は、まだ一覧に出ていません</p>';
  const months = new Map();
  for (const e of list) { const ym = (e.start < PERIOD.start ? PERIOD.start : e.start).slice(0, 7); if (!months.has(ym)) months.set(ym, []); months.get(ym).push(e); }
  return lead + [...months].map(([ym, es]) => `<section class="month"><h2 class="month__title"><span class="month__y">${ym.slice(0, 4)}年</span>${Number(ym.slice(5))}月<span class="month__n">${es.length}件</span></h2>${grid(es.map((e) => eventCard(e, meta.source)))}</section>`).join('');
}

/* ---------- 常設 ---------- */
export function viewMarkets(data, { zone }) {
  const list = data.markets.filter((m) => inZone(zone, m.zone));
  if (!list.length) return '<p class="empty">このエリアの常設の蚤の市は、まだ登録していません</p>';
  return `<p class="lead">毎週・月決まった曜日に開く蚤の市です。祝日、長期休みでは時間が変わる場合があります。</p>` + grid(list.map((m) => marketCard(m, null)));
}

/* ---------- フランス全体の地図（右上のメニューから開く） ---------- */
/** えらんでいる地方の、かんたんな説明（載せている市にあわせて書く） */
const FR_DESC = {
  'パリ': 'サン＝トゥアン、ヴァンヴ、モントルイユなどの大きな蚤の市が、毎週末に開きます。区ごとに開く単発の市も載せています。',
  'リヨン': '東隣ヴィルールバンヌの大きな蚤の市「ピュス・デュ・カナル」と、ソーヌ川沿いの古本市。毎月最終土曜のアヌシー旧市街のブロカントも入れています。',
  '南仏': '骨董の町リル＝シュル＝ラ＝ソルグの日曜ブロカントのほか、マルセイユ、ニース、モンペリエ、アヴィニョン、アルル、ニーム、エクスの市を載せています。',
  'ボルドー': 'サン＝ミシェル地区の日曜ブロカントと古道具市、ヴィクトワール広場の古本市があります。',
  'トゥールーズ': '月1回の大型ブロカント・デ・アレと、サン＝トーバン教会まわりの市。北東のアルビのブロカントも入れています。',
  'ストラスブール': '旧市街のエタル広場まわりで開く、骨董・ブロカントの市があります。',
};
export function franceMap(data, region) {
  const count = (r) => data.markets.filter((m) => m.region === r).length;
  const pin = (r, c) => `<g class="fr__pin" data-region="${esc(r)}" role="button" tabindex="0" aria-pressed="${r === region}" aria-label="${esc(r)}（${count(r)}件）">
      <title>${esc(r)}（${count(r)}件）</title><circle class="fr__dot" cx="${c.x}" cy="${c.y}" r="${r === region ? 19 : 15}"/>${(FR_EXTRA[r] || []).map((t) => `<circle class="fr__town" cx="${t.x}" cy="${t.y}" r="4"/><text class="fr__town-name" x="${t.x}" y="${t.y + 24}">${t.n}</text>`).join('')}<text class="fr__label" x="${Math.min(c.x, FR_W - 105)}" y="${c.y - 17}">${esc(r)}</text></g>`;
  const sud = `<g class="fr__pin" data-region="南仏" role="button" tabindex="0" aria-pressed="${region === '南仏'}" aria-label="南仏（${count('南仏')}件）">
      <title>南仏（${count('南仏')}件）</title><ellipse class="fr__zone" cx="515" cy="522" rx="98" ry="30"/>
      ${FR_SUD.map((c) => `<circle class="fr__town" cx="${c.x}" cy="${c.y}" r="4"/>`).join('')}
      <text class="fr__label" x="515" y="490">南仏</text>
      <text class="fr__town-name" x="505" y="563">マルセイユ</text><text class="fr__town-name" x="596" y="505">ニース</text><text class="fr__town-name" x="433" y="545">モンペリエ</text></g>`;
  return `<div class="frpanel__head"><b>フランスのどのあたり？</b><button type="button" class="frpanel__close" data-frclose aria-label="とじる">×</button></div>
    <svg class="map map--fr" viewBox="-10 -30 ${FR_W + 20} ${FR_H + 40}" role="group" aria-label="フランス本土の地図。パリ、リヨン、南仏、ボルドー、トゥールーズ、ストラスブールの位置。押すと地方をえらべます">
      <path class="fr__land" d="${FR_OUTLINE}"/>
      ${pin('パリ', FR_CITIES['パリ'])}${pin('リヨン', FR_CITIES['リヨン'])}${pin('ボルドー', FR_CITIES['ボルドー'])}${pin('トゥールーズ', FR_CITIES['トゥールーズ'])}${pin('ストラスブール', FR_CITIES['ストラスブール'])}${sud}
    </svg>
    <p class="fr__desc"><b>${esc(region)}</b>　${esc(FR_DESC[region] || '')}</p>
    <p class="map__note">丸や楕円を押すと、その地方の市に切りかわります。</p>`;
}

/** 地図に立てるピン：その日に開く常設と単発。常設は番地に近い緯度経度、単発は区の中心 */
// 地図の範囲（パリ市域の緯度経度）。この範囲を paris-map.js の 600×321 に写している
const LL = { lon0: 2.2241, lon1: 2.4699, lat0: 48.8156, lat1: 48.9022 };
const xy = (lat, lon) => [((lon - LL.lon0) / (LL.lon1 - LL.lon0)) * MAP_W, MAP_H - ((lat - LL.lat0) / (LL.lat1 - LL.lat0)) * MAP_H];
const MARKET_LL = { p001: [48.9015, 2.3445], p002: [48.8995, 2.3438], p003: [48.8268, 2.3050], p004: [48.8322, 2.2937], p005: [48.8537, 2.4112], p006: [48.8478, 2.3790], p007: [48.8691, 2.3157] };
// 森をふくむ区は、区の中心が森のなかに入るので、市街地側に置く
const ARR_LL = { 12: [48.840, 2.395], 16: [48.862, 2.262] };
const arrXY = (n) => (ARR_LL[n] ? xy(...ARR_LL[n]) : ARR[n].c);
function pinsOn(data, date) {
  const items = [];
  for (const { market } of marketsOn(data.markets, date)) {
    const m = /(\d+)区/.exec(market.area);
    const [x, y] = MARKET_LL[market.id] ? xy(...MARKET_LL[market.id]) : arrXY(m ? Number(m[1]) : 18);
    items.push({ name: market.name, zone: market.zone, x, y });
  }
  for (const e of eventsOn(data.events, date)) { const [x, y] = arrXY(e.arr[0]); items.push({ name: e.place, zone: e.zone, x, y, event: true }); }
  // 近くのピンが重ならないように、横にずらす
  const placed = [];
  for (const it of items) {
    let k = 0;
    while (placed.some((q) => Math.abs(q.x - it.x) < 14 && Math.abs(q.y - it.y) < 12) && k < 8) { k += 1; it.x += 15; }
    placed.push(it);
  }
  return items;
}
export function zoneMap(data, zone, open, date) {
  const idx = (z) => data.zones.indexOf(z);
  const paths = Object.entries(ARR).map(([n, a]) => {
    const z = data.zoneOf[n];
    const on = zone === 'すべて' || z === zone;
    return `<path class="map__arr" d="${a.d}" data-zone="${esc(z)}" data-z="${idx(z)}" ${on ? 'data-on' : ''} role="button" tabindex="0" aria-pressed="${z === zone}" aria-label="${n}区（${esc(z)}）"><title>${n}区（${esc(z)}）</title></path>`;
  }).join('');
  const nums = Object.entries(ARR).map(([n, a]) => `<text class="map__num" x="${a.c[0]}" y="${a.c[1] + 4}">${n}</text>`).join('');
  const pins = pinsOn(data, date).map((p) => `<g class="map__pin" data-zone="${esc(p.zone)}" data-z="${idx(p.zone)}" ${zone === 'すべて' || p.zone === zone ? '' : 'data-dim'} role="button" tabindex="0" aria-label="${esc(p.name)}（${esc(p.zone)}）" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><title>${esc(p.name)}${p.event ? '（単発）' : ''}</title><path d="M0 0C-3-7-9-11-9-17a9 9 0 1 1 18 0C9-11 3-7 0 0Z"/><circle cy="-17" r="3.6"/></g>`).join('');
  const legend = ['すべて', ...data.zones].map((z) => `<button type="button" class="map__key" data-zone="${esc(z)}" data-z="${idx(z)}" aria-pressed="${z === zone}">${z === 'すべて' ? '' : '<i></i>'}${esc(z)}</button>`).join('');
  return `<details class="mapbox" id="mapbox" ${open ? 'open' : ''}>
    <summary>パリのエリアからえらぶ<span class="mapbox__now">${zone === 'すべて' ? 'すべて表示中' : `${esc(zone)}を表示中`}</span></summary>
    <div class="mapbox__body">
      <div class="map__legend">${legend}<p class="map__note">数字は区。ピンは、えらんだ日に開く市（常設と単発）です。常設は住所の近く、単発は区の中心に立てています。サン＝トゥアンは「右岸・北」に入れています。</p></div>
      <svg class="map" viewBox="-4 -30 ${MAP_W + 8} ${MAP_H + 34}" role="group" aria-label="パリ20区の地図。区やピンを押すとエリアをえらべます">${paths}${nums}${pins}</svg>
    </div>
  </details>`;
}

/* ---------- メニューの3つの機能 ---------- */
/** その日に開くもの（常設と単発）を1つの形にそろえる */
function openItems(data, iso) {
  const groupOf = (e) => (data.groups.find((g) => e.arr.some((n) => g.arrs.includes(n))) || {}).key || '';
  return [
    ...marketsOn(data.markets, iso).map((x) => ({ key: x.market.id, name: x.market.name, region: x.market.region, zone: x.market.zone || '', group: x.market.hashigo || '', open: x.hours.open, close: x.hours.close, m: x })),
    ...eventsOn(data.events, iso).map((e) => ({ key: eventKey(e), name: e.place, region: 'パリ', zone: e.zone || '', group: groupOf(e), open: '', close: '', e })),
  ];
}
/** 回る順（早く開く順。時間のわからない単発は最後）に並べて、ルートのボタンを作る */
function routeButtons(stops, region) {
  const ms = stops.filter((s) => s.m).map((s) => s.m), es = stops.filter((s) => s.e).map((s) => s.e);
  if (ms.length + es.length < 2) return '';
  const drive = region !== 'パリ';
  const walk = routeUrl(ms, es, drive ? 'driving' : 'walking');
  const legs = drive ? [] : transitLegs(ms, es);
  return `<div class="course__links"><a class="btn btn--ghost" href="${esc(walk)}" target="_blank" rel="noopener">${drive ? '車' : '徒歩'}のルート</a>${legs.map((l, i) => `<a class="btn btn--ghost" href="${esc(l.url)}" target="_blank" rel="noopener" title="${esc(l.from)} → ${esc(l.to)}">電車・バス${legs.length > 1 ? `（${i + 1}→${i + 2}）` : ''}</a>`).join('')}</div>`;
}
const byOpen = (a, b) => (a.open || '99').localeCompare(b.open || '99');
function stopList(stops) {
  return `<ol class="stops">${stops.map((s) => `<li${SAVED.fav[s.key] ? ' class="is-fav"' : ''}><span class="stops__t">${s.open ? `${hm(s.open)}〜${hm(s.close)}` : '時間は要確認'}</span><span class="stops__n">${SAVED.fav[s.key] ? '★ ' : ''}${esc(s.name)}</span></li>`).join('')}</ol>`;
}

/** お気に入りでコースを作る：お気に入りが開く日ごとに、近くで同じ日に開く市を足してコースにする */
export function viewCourse(all, { stay, resetArmed = false }) {
  const favKeys = Object.keys(SAVED.fav);
  const lead = `<h2 class="section__title">お気に入りでコースを作る<span class="month__n">☆を付けた市を中心に組みます</span></h2>`;
  if (!favKeys.length) return lead + '<p class="empty">まだお気に入りがありません。カードの ☆ を押すと、その市を入れたコースをここで作れます</p>';
  const useStay = stay && stay.from && stay.to;
  const days = periodDays().filter((d) => !useStay || (d >= stay.from && d <= stay.to));
  const plans = [];
  for (const d of days) {
    const items = openItems(all, d);
    const favs = items.filter((x) => SAVED.fav[x.key]);
    for (const region of [...new Set(favs.map((f) => f.region))]) {
      const mine = favs.filter((f) => f.region === region);
      const near = items.filter((x) => !SAVED.fav[x.key] && x.region === region && (region !== 'パリ' || mine.some((f) => (f.group && f.group === x.group) || (f.zone && f.zone === x.zone))));
      const stops = [...mine, ...near].sort(byOpen);
      plans.push({ d, region, favN: mine.length, stops, score: mine.length * 10 + near.length });
    }
  }
  if (!plans.length) return lead + favReset(resetArmed) + `<p class="empty">${useStay ? 'えらんでいる期間に' : '1〜2月に'}、お気に入りの市が開く日がありません</p>`;
  plans.sort((a, b) => b.score - a.score || a.d.localeCompare(b.d));
  const top = plans.slice(0, 12);
  return lead + favReset(resetArmed) + `<p class="lead">${useStay ? `えらんでいる期間（${md(stay.from)}〜${md(stay.to)}）で、` : '1〜2月で、'}お気に入りがたくさん入る日から並べています。★がお気に入り、ほかは同じ日に近くで開く市です。</p>`
    + `<div class="plans">${top.map((p) => `<article class="plan"><header class="plan__head"><b class="num">${mdw(p.d)}</b><span>${esc(p.region)} ・ お気に入り ${p.favN} ・ 全部で ${p.stops.length}か所</span></header>${stopList(p.stops)}${routeButtons(p.stops, p.region)}<button type="button" class="btn btn--sm plan__go" data-date="${p.d}">この日を見る</button></article>`).join('')}</div>`;
}

/** たくさん回れる日：開く市が多い日を上から */
export function viewBest(data, { zone }) {
  const rows = periodDays().map((d) => {
    const items = openItems(data, d).filter((x) => inZone(zone, x.zone || 'すべて'));
    const ms = items.filter((x) => x.m).length, es = items.length - ms;
    const sets = combosOn(data, d, zone, data.region).filter(({ markets, events }) => markets.length + events.length >= 2)
      .sort((a, b) => (b.markets.length + b.events.length) - (a.markets.length + a.events.length));
    return { d, n: items.length, ms, es, best: sets[0] };
  }).filter((r) => r.n).sort((a, b) => b.n - a.n || (b.best ? 1 : 0) - (a.best ? 1 : 0) || a.d.localeCompare(b.d));
  const head = `<h2 class="section__title">たくさん回れる日<span class="month__n">${esc(data.region)}${zone !== 'すべて' ? `・${esc(zone)}` : ''}で、1〜2月に開く市が多い順</span></h2>`;
  if (!rows.length) return head + '<p class="empty">1〜2月に開く市が見つかっていません</p>';
  return head + `<ol class="best">${rows.slice(0, 10).map((r, i) => {
    const stops = r.best ? [...r.best.markets.map((x) => ({ key: x.market.id, name: x.market.name, open: x.hours.open, close: x.hours.close, m: x })), ...r.best.events.map((e) => ({ key: eventKey(e), name: e.place, open: '', close: '', e }))].sort(byOpen) : [];
    return `<li class="plan"><header class="plan__head"><span class="best__rank num">${i + 1}</span><b class="num">${mdw(r.d)}</b><span>${r.n}件（常設 ${r.ms} ・ 単発 ${r.es}）</span></header>
      ${r.best ? `<p class="plan__sub">おすすめのはしご：${esc(r.best.group.title)}</p>${stopList(stops)}${routeButtons(stops, data.region)}` : '<p class="plan__sub">近くでまとめて回れる組み合わせはありません</p>'}
      <button type="button" class="btn btn--sm plan__go" data-date="${r.d}">この日を見る</button></li>`;
  }).join('')}</ol><p class="lead">件数は、えらんでいる地方とエリアで数えています。週末に集中するので、旅程を組むときの目安にしてください。</p>`;
}

/** 日ごとの件数：1月・2月のカレンダー */
export function viewCalendar(data, today, { zone }) {
  const counts = new Map(periodDays().map((d) => [d, openItems(data, d).filter((x) => inZone(zone, x.zone || 'すべて')).length]));
  const max = Math.max(1, ...counts.values());
  const months = new Map();
  for (const d of counts.keys()) { const ym = d.slice(0, 7); if (!months.has(ym)) months.set(ym, []); months.get(ym).push(d); }
  const cal = [...months].map(([ym, ds]) => {
    const lead = (weekday(ds[0]) + 6) % 7; // 月はじまり
    const cells = [...Array(lead).fill('<span class="cal__blank"></span>'), ...ds.map((d) => {
      const n = counts.get(d), w = weekday(d);
      return `<button type="button" class="cal__day" data-date="${d}" style="--lv:${(n / max).toFixed(2)}" ${n ? '' : 'data-empty'} ${w === 0 ? 'data-sun' : w === 6 ? 'data-sat' : ''} ${d === today ? 'data-today' : ''} aria-label="${mdw(d)} ${n}件"><span class="cal__d">${Number(d.slice(8))}</span><span class="cal__n">${n || '–'}</span></button>`;
    })];
    return `<section class="cal"><h3 class="cal__title">${ym.slice(0, 4)}年 ${Number(ym.slice(5))}月</h3><div class="cal__grid">${['月', '火', '水', '木', '金', '土', '日'].map((w) => `<span class="cal__w">${w}</span>`).join('')}${cells.join('')}</div></section>`;
  }).join('');
  return `<h2 class="section__title">日ごとの件数<span class="month__n">${esc(data.region)}${zone !== 'すべて' ? `・${esc(zone)}` : ''}で開く市の数（常設＋単発）</span></h2><div class="cals">${cal}</div><p class="lead">色が濃い日ほど、開く市が多い日です。日付を押すと、その日の市を見られます。</p>`;
}

/* ---------- ★ メモ（お気に入りとメモのまとめ） ---------- */
/** お気に入りをすべて外すボタン。1回目で確認を出し、2回目で外す */
export function favReset(armed) {
  const n = Object.keys(SAVED.fav).length;
  if (!n) return '';
  return armed
    ? `<div class="reset is-armed"><span>お気に入り ${n}件をすべて外します。メモは残ります。</span><button type="button" class="btn btn--sm btn--danger" data-fav-reset="go">すべて外す</button><button type="button" class="btn btn--ghost btn--sm" data-fav-reset="cancel">やめる</button></div>`
    : `<div class="reset"><button type="button" class="btn btn--ghost btn--sm" data-fav-reset="arm">お気に入りをリセット</button></div>`;
}
export function viewSaved(data, today, periods = [], armed = false) {
  const byKey = new Map([...data.markets.map((m) => [m.id, { market: m }]), ...data.events.map((e) => [eventKey(e), { event: e }])]);
  const keys = [...new Set([...Object.keys(SAVED.fav), ...Object.keys(SAVED.memo)])];
  const render = (k) => { const x = byKey.get(k); return x.market ? marketCard(x.market, null) : eventCard(x.event, data.eventsMeta.source); };
  const order = (a, b) => {
    const A = byKey.get(a), B = byKey.get(b);
    return (A.event ? 1 : 0) - (B.event ? 1 : 0) || (A.event && B.event ? A.event.start.localeCompare(B.event.start) : 0);
  };
  const known = keys.filter((k) => byKey.has(k)).sort(order);
  const favs = known.filter((k) => SAVED.fav[k]);
  const memos = known.filter((k) => !SAVED.fav[k]);
  const gone = keys.filter((k) => !byKey.has(k));
  const note = `<section class="note" id="sec-memo"><h2 class="section__title">旅のメモ<span class="month__n">どのカードにも付かない、自由なメモ</span></h2>
    <textarea id="tripNote" rows="5" aria-label="旅のメモ" placeholder="持っていく物、予算、行きたい順番など">${esc(SAVED.note || '')}</textarea></section>`;
  const goneHtml = gone.length ? `<h2 class="section__title">一覧から消えた市<span class="month__n">終わった市など</span></h2><ul class="gone">${gone.map((k) => {
    const label = SAVED.fav[k]?.label || SAVED.memo[k]?.label || k;
    const text = SAVED.memo[k]?.text;
    return `<li><b>${esc(label)}</b>${text ? `<p>${esc(text)}</p>` : ''}<button type="button" class="btn btn--ghost" data-forget="${esc(k)}">消す</button></li>`;
  }).join('')}</ul>` : '';
  const empty = !keys.length && !periods.length ? '<p class="empty">まだ何も入っていません。カードの ☆ でお気に入りに、「メモを書く」でメモを付けられます</p>' : '';
  const per = periods.length ? `<h2 class="section__title">保存した期間<span class="month__n">押すと「期間を選ぶ」で開きます</span></h2><div class="stay__saved">${periods.map((p) => `<span class="pchip"><button type="button" class="pchip__go" data-period="${esc(p.from)}|${esc(p.to)}">${mdw(p.from)}〜${mdw(p.to)}</button><button type="button" class="pchip__del" data-period-del="${esc(p.from)}|${esc(p.to)}" aria-label="消す">×</button></span>`).join('')}</div>` : '';
  return `<p class="lead">お気に入りとメモは、このブラウザの中だけに保存されます。</p>` + per + note
    + (favs.length ? `<h2 class="section__title" id="sec-fav">お気に入り<span class="month__n">${favs.length}件</span></h2>${favReset(armed)}${grid(favs.map(render))}` : '')
    + (memos.length ? `<h2 class="section__title">メモを付けた市<span class="month__n">${memos.length}件</span></h2>${grid(memos.map(render))}` : '')
    + goneHtml + empty;
}
