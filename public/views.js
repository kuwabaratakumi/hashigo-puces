// 画面の部品（HTML文字列を作るだけ。DOM には触らない）
import { PERIOD, addDays, weekday, marketsOn, eventsOn, inPeriod, periodDays, hashigoOn } from './schedule.js';
import { MAP_W, MAP_H, ARR } from './paris-map.js';
import { FR_W, FR_H, FR_OUTLINE, FR_CITIES, FR_SUD } from './france-map.js';

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
/** 見られる期間（1〜2月）の日付ボタン */
export function dayStrip(data, today, selected, zone, stay) {
  const inStay = (iso) => stay && stay.from && stay.to && iso >= stay.from && iso <= stay.to;
  return periodDays().map((iso, i) => {
    const w = weekday(iso);
    const n = marketsOn(data.markets, iso).filter((x) => inZone(zone, x.market.zone)).length + eventsOn(data.events, iso).filter((e) => inZone(zone, e.zone)).length;
    return `<button class="day" type="button" data-date="${iso}" ${iso === selected ? 'aria-current="date"' : ''} ${n ? '' : 'data-empty'} ${iso === today ? 'data-today' : ''} ${inStay(iso) ? 'data-stay' : ''} ${w === 0 || w === 6 ? 'data-weekend' : ''} aria-label="${mdw(iso)} ${n}件">
      <span class="day__m">${i === 0 || iso.endsWith('-01') ? `${Number(iso.slice(5, 7))}月` : ''}</span><span class="day__d">${Number(iso.slice(8))}</span><span class="day__w">${DOW[w]}</span></button>`;
  }).join('');
}

export function regionChips(data, region) {
  const count = (r) => data.markets.filter((m) => m.region === r).length;
  return data.regions.map((r) => `<button type="button" class="chip chip--region" data-region="${esc(r)}" aria-pressed="${r === region}">${esc(r)}<span class="chip__n">${count(r)}</span></button>`).join('');
}

/** 地方では、載せているものの範囲を最初に知らせる */
export function regionNote(region, view) {
  if (view === 'saved') return '';
  return `<p class="notice">${esc(region)}は、毎週や毎月、決まった日に開く市だけを載せています。単発の市（サロンなど）と、はしごの組み合わせは、パリだけです。曜日と時間は観光局や市の案内によるもので、行く前に公式の案内も見てください。</p>`;
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
  return head + stale(data, date)
    + (ms.length ? `<h2 class="section__title">常設<span class="month__n">早く開く順</span></h2>${grid(ms.map((x) => marketCard(x.market, x.hours)))}` : '')
    + (es.length ? `<h2 class="section__title">単発<span class="month__n">この日だけ、または数日だけ</span></h2>${grid(es.map((e) => eventCard(e, data.eventsMeta.source)))}` : '');
}

/* ---------- はしご ---------- */
function combo(data, group, markets, events, single) {
  const n = markets.length + events.length;
  const order = markets.map((x) => `${esc(x.market.name)}（${hm(x.hours.open)}〜${hm(x.hours.close)}）`).join(' → ');
  return `<section class="combo">
      <header class="combo__head">
        <h2 class="combo__name">${esc(group.title)}</h2>
        <p class="combo__sub">${esc(group.note)}</p>
      </header>
      ${single && n < 2 ? '<p class="combo__note">この日に開くのは1か所だけです。</p>' : ''}
      ${markets.length > 1 ? `<p class="combo__note">早く開く順：${order}</p>` : ''}
      ${grid([...markets.map((x) => marketCard(x.market, x.hours)), ...events.map((e) => eventCard(e, data.eventsMeta.source))])}
    </section>`;
}
/** その日の、条件にあうはしご（エリアでしぼる） */
function combosOn(data, date, zone) {
  return hashigoOn(data.groups, data.markets, data.events, date).filter(({ markets, events }) => {
    if (!markets.length && !events.length) return false;
    return zone === 'すべて' || [...markets.map((x) => x.market.zone), ...events.map((e) => e.zone)].includes(zone);
  });
}
/** 滞在期間（始点〜終点）をえらぶ欄 */
function stayForm(stay) {
  const on = stay.from && stay.to;
  return `<div class="stay">
    <p class="stay__title">フランスにいる期間をえらぶ</p>
    <div class="stay__row">
      <label>着く日<input type="date" id="stayFrom" min="${PERIOD.start}" max="${PERIOD.end}" value="${esc(stay.from || '')}"></label>
      <span aria-hidden="true">〜</span>
      <label>帰る日<input type="date" id="stayTo" min="${PERIOD.start}" max="${PERIOD.end}" value="${esc(stay.to || '')}"></label>
      <button type="button" class="btn btn--ghost" data-stay-all>全期間</button>
      ${on ? '<button type="button" class="btn btn--ghost" data-stay-clear>1日ずつ見る</button>' : ''}
    </div>
    <p class="stay__hint">${on ? '期間中の、2か所以上まわれる日をまとめて出しています。' : '2つの日付をえらぶと、期間中のはしごを日ごとに出します。上の日付の帯でえらんだ1日だけを見ることもできます。'}</p>
  </div>`;
}
export function viewHashigo(data, { date, zone, stay }) {
  const form = stayForm(stay);
  if (stay.from && stay.to) {
    const days = [];
    for (let d = stay.from; d <= stay.to; d = addDays(d, 1)) days.push(d);
    const rows = days.map((d) => ({ d, sets: combosOn(data, d, zone).filter(({ markets, events }) => markets.length + events.length >= 2) }));
    const hit = rows.filter((r) => r.sets.length);
    const none = rows.filter((r) => !r.sets.length).map((r) => mdw(r.d));
    const html = hit.map((r) => `<section class="stayday"><h2 class="stayday__title">${mdw(r.d)}</h2>${r.sets.map(({ group, markets, events }) => combo(data, group, markets, events, false)).join('')}</section>`).join('');
    return form + `<div class="summary"><p><b class="num">${mdw(stay.from)}</b> 〜 <b class="num">${mdw(stay.to)}</b>（${days.length}日間）　はしごのある日 <b class="num">${hit.length}</b>日</p></div>` + stale(data, stay.from)
      + (html || '<p class="empty">この期間に、2か所以上まわれる日は見つかっていません。期間をのばすか、エリアを「すべて」にしてみてください</p>')
      + (none.length && hit.length ? `<p class="lead">ほかの日は、まわれる市が1か所以下です：${none.join('、')}</p>` : '');
  }
  const sets = combosOn(data, date, zone);
  const html = sets.map(({ group, markets, events }) => combo(data, group, markets, events, true)).join('');
  return form + `<p class="lead">${mdw(date)}に、近くでまとめて回れる蚤の市です。単発の市は、同じ区や近くの区のものを並べています。</p>` + stale(data, date)
    + (html || '<p class="empty">この日は、近くで回れる組み合わせがありません。土曜か日曜をえらんでみてください</p>');
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
  return `<p class="lead">毎週決まった曜日に開く蚤の市です（月に1〜2回だけのものは、開催日を書いています）。祝日や夏休みは、時間が変わることがあります。</p>` + grid(list.map((m) => marketCard(m, null)));
}

/* ---------- フランス全体の地図 ---------- */
export function franceMap(data, region, open) {
  const count = (r) => data.markets.filter((m) => m.region === r).length;
  const pin = (r, c) => `<g class="fr__pin" data-region="${esc(r)}" role="button" tabindex="0" aria-pressed="${r === region}" aria-label="${esc(r)}（${count(r)}件）">
      <title>${esc(r)}（${count(r)}件）</title><circle class="fr__dot" cx="${c.x}" cy="${c.y}" r="11"/><text class="fr__label" x="${c.x}" y="${c.y - 17}">${esc(r)}</text></g>`;
  const sud = `<g class="fr__pin" data-region="南仏" role="button" tabindex="0" aria-pressed="${region === '南仏'}" aria-label="南仏（${count('南仏')}件）">
      <title>南仏（${count('南仏')}件）</title><ellipse class="fr__zone" cx="515" cy="522" rx="98" ry="30"/>
      ${FR_SUD.map((c) => `<circle class="fr__town" cx="${c.x}" cy="${c.y}" r="4"/>`).join('')}
      <text class="fr__label" x="515" y="${490}">南仏</text>
      <text class="fr__town-name" x="505" y="563">マルセイユ</text><text class="fr__town-name" x="596" y="505">ニース</text><text class="fr__town-name" x="433" y="545">モンペリエ</text></g>`;
  return `<details class="mapbox" id="francebox" ${open ? 'open' : ''}>
    <summary>フランスのどのあたり？<span class="mapbox__now">${esc(region)}を表示中</span></summary>
    <div class="mapbox__body">
      <svg class="map map--fr" viewBox="-10 -30 ${FR_W + 20} ${FR_H + 40}" role="group" aria-label="フランス本土の地図。パリ、リヨン、南仏、ボルドー、トゥールーズの位置。押すと地方をえらべます">
        <path class="fr__land" d="${FR_OUTLINE}"/>
        ${pin('パリ', FR_CITIES['パリ'])}${pin('リヨン', FR_CITIES['リヨン'])}${pin('ボルドー', FR_CITIES['ボルドー'])}${pin('トゥールーズ', FR_CITIES['トゥールーズ'])}${sud}
      </svg>
      <p class="map__note map__note--side">丸や楕円を押すと、その地方の市に切りかわります。南仏には、マルセイユ・ニース・モンペリエ・アルル・リル＝シュル＝ラ＝ソルグ・エクスを入れています。コルシカ島は載せていません。</p>
    </div>
  </details>`;
}

/* ---------- 地図でエリアをえらぶ ---------- */
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
      <svg class="map" viewBox="-4 -30 ${MAP_W + 8} ${MAP_H + 34}" role="group" aria-label="パリ20区の地図。区やピンを押すとエリアをえらべます">${paths}${nums}${pins}</svg>
      <div class="map__legend">${legend}<p class="map__note">数字は区。ピンは、えらんだ日に開く市（常設と単発）です。常設は住所の近く、単発は区の中心に立てています。サン＝トゥアンは「右岸・北」に入れています。</p></div>
    </div>
  </details>`;
}

/* ---------- ★ メモ（お気に入りとメモのまとめ） ---------- */
export function viewSaved(data, today) {
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
  const note = `<section class="note"><h2 class="section__title">旅のメモ<span class="month__n">どのカードにも付かない、自由なメモ</span></h2>
    <textarea id="tripNote" rows="5" aria-label="旅のメモ" placeholder="持っていく物、予算、行きたい順番など">${esc(SAVED.note || '')}</textarea></section>`;
  const goneHtml = gone.length ? `<h2 class="section__title">一覧から消えた市<span class="month__n">終わった市など</span></h2><ul class="gone">${gone.map((k) => {
    const label = SAVED.fav[k]?.label || SAVED.memo[k]?.label || k;
    const text = SAVED.memo[k]?.text;
    return `<li><b>${esc(label)}</b>${text ? `<p>${esc(text)}</p>` : ''}<button type="button" class="btn btn--ghost" data-forget="${esc(k)}">消す</button></li>`;
  }).join('')}</ul>` : '';
  const empty = !keys.length ? '<p class="empty">まだ何も入っていません。カードの ☆ でお気に入りに、「メモを書く」でメモを付けられます</p>' : '';
  return `<p class="lead">お気に入りとメモは、このブラウザの中だけに保存されます。</p>` + note
    + (favs.length ? `<h2 class="section__title">お気に入り<span class="month__n">${favs.length}件</span></h2>${grid(favs.map(render))}` : '')
    + (memos.length ? `<h2 class="section__title">メモを付けた市<span class="month__n">${memos.length}件</span></h2>${grid(memos.map(render))}` : '')
    + goneHtml + empty;
}
