// 画面の部品（HTML文字列を作るだけ。DOM には触らない）
import { addDays, weekday, marketsOn, eventsOn, upcoming, hashigoOn } from './schedule.js';
import { MAP_W, MAP_H, ARR } from './paris-map.js';

const DOW = ['日', '月', '火', '水', '木', '金', '土'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 月はじまりで並べる
export const STRIP_DAYS = 14;
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
function weekText(m) {
  return WEEK_ORDER.filter((d) => m.hours[d]).map((d) => `${DOW[d]} ${hm(m.hours[d].open)}〜${hm(m.hours[d].close)}${m.hours[d].note ? `（${esc(m.hours[d].note)}）` : ''}`).join('<br>');
}

/** 常設。hours を渡すと「その日の時間」を大きく出す */
export function marketCard(m, hours) {
  const official = m.url
    ? `<a class="btn" href="${esc(m.url)}" target="_blank" rel="noopener">公式サイト</a>`
    : `<a class="btn btn--ghost" href="${esc(gsearch(m.nameFr))}" target="_blank" rel="noopener">公式をさがす</a>`;
  const guess = m.status !== '確認済' ? `<span class="unverified">${esc(m.status)}</span>` : '';
  return `<article class="card" data-type="market">
    ${star(m.id, m.name)}
    <div class="card__head">
      <p class="card__when">${hours ? `${hm(hours.open)}〜${hm(hours.close)}` : '毎週'}${guess}</p>
      <h3 class="card__name">${esc(m.name)}</h3>
      <p class="card__fr" lang="fr">${esc(m.nameFr)}</p>
      <div class="card__badges"><span class="pill pill--market">常設</span><span class="pill pill--kind">${esc(m.kind)}</span></div>
    </div>
    ${weekRow(m)}
    <dl class="card__meta">
      ${hours && hours.note ? `<div><dt>注意</dt><dd>${esc(hours.note)}</dd></div>` : ''}
      <div><dt>場所</dt><dd>${esc(m.area)} ・ <span lang="fr">${esc(m.address)}</span></dd></div>
      <div><dt>駅</dt><dd>${esc(m.metro)}</dd></div>
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
  return `<article class="card" data-type="event">
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
/** 今日から14日ぶんの日付ボタン */
export function dayStrip(data, today, selected, zone) {
  const out = [];
  for (let i = 0; i < STRIP_DAYS; i++) {
    const iso = addDays(today, i);
    const w = weekday(iso);
    const n = marketsOn(data.markets, iso).filter((x) => inZone(zone, x.market.zone)).length + eventsOn(data.events, iso).filter((e) => inZone(zone, e.zone)).length;
    out.push(`<button class="day" type="button" data-date="${iso}" ${iso === selected ? 'aria-current="date"' : ''} ${n ? '' : 'data-empty'} ${i === 0 ? 'data-today' : ''} ${w === 0 || w === 6 ? 'data-weekend' : ''} aria-label="${mdw(iso)} ${n}件">
      <span class="day__m">${i === 0 || iso.endsWith('-01') ? `${Number(iso.slice(5, 7))}月` : ''}</span><span class="day__d">${Number(iso.slice(8))}</span><span class="day__w">${DOW[w]}</span></button>`);
  }
  return out.join('');
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
export function viewHashigo(data, { date, zone }) {
  const sets = hashigoOn(data.groups, data.markets, data.events, date);
  const html = sets.map(({ group, markets, events }) => {
    if (zone !== 'すべて' && ![...markets.map((x) => x.market.zone), ...events.map((e) => e.zone)].includes(zone)) return '';
    const n = markets.length + events.length;
    if (!n) return '';
    const order = markets.map((x) => `${esc(x.market.name)}（${hm(x.hours.open)}〜${hm(x.hours.close)}）`).join(' → ');
    return `<section class="combo">
      <header class="combo__head">
        <h2 class="combo__name">${esc(group.title)}</h2>
        <p class="combo__sub">${esc(group.note)}</p>
      </header>
      ${n < 2 ? '<p class="combo__note">この日に開くのは1か所だけです。</p>' : ''}
      ${markets.length > 1 ? `<p class="combo__note">早く開く順：${order}</p>` : ''}
      ${grid([...markets.map((x) => marketCard(x.market, x.hours)), ...events.map((e) => eventCard(e, data.eventsMeta.source))])}
    </section>`;
  }).join('');
  return `<p class="lead">${mdw(date)}に、近くでまとめて回れる蚤の市です。単発の市は、同じ区や近くの区のものを並べています。</p>` + stale(data, date)
    + (html || '<p class="empty">この日は、近くで回れる組み合わせがありません。土曜か日曜をえらんでみてください</p>');
}

/* ---------- 単発の予定 ---------- */
export function viewEvents(data, today, { zone }) {
  const list = upcoming(data.events, today).filter((e) => inZone(zone, e.zone));
  const meta = data.eventsMeta;
  const lead = `<p class="lead">パリ市の一覧に載っている、これからの単発の市です${meta.pageUpdated ? `（一覧の更新日 ${esc(meta.pageUpdated)}）` : ''}。1〜2月はほとんど開かれません。</p>`;
  if (!list.length) return lead + '<p class="empty">これからの予定は、まだ一覧に出ていません</p>';
  const months = new Map();
  for (const e of list) { const ym = (e.start < today ? today : e.start).slice(0, 7); if (!months.has(ym)) months.set(ym, []); months.get(ym).push(e); }
  return lead + [...months].map(([ym, es]) => `<section class="month"><h2 class="month__title"><span class="month__y">${ym.slice(0, 4)}年</span>${Number(ym.slice(5))}月<span class="month__n">${es.length}件</span></h2>${grid(es.map((e) => eventCard(e, meta.source)))}</section>`).join('');
}

/* ---------- 常設 ---------- */
export function viewMarkets(data, { zone }) {
  const list = data.markets.filter((m) => inZone(zone, m.zone));
  if (!list.length) return '<p class="empty">このエリアの常設の蚤の市は、まだ登録していません</p>';
  return `<p class="lead">毎週決まった曜日に開く蚤の市です。祝日や夏休みは、時間が変わることがあります。</p>` + grid(list.map((m) => marketCard(m, null)));
}

/* ---------- 地図でエリアをえらぶ ---------- */
export function zoneMap(data, zone, open) {
  const idx = (z) => data.zones.indexOf(z);
  const paths = Object.entries(ARR).map(([n, a]) => {
    const z = data.zoneOf[n];
    const on = zone === 'すべて' || z === zone;
    return `<path class="map__arr" d="${a.d}" data-zone="${esc(z)}" data-z="${idx(z)}" ${on ? 'data-on' : ''} role="button" tabindex="0" aria-pressed="${z === zone}" aria-label="${n}区（${esc(z)}）"><title>${n}区（${esc(z)}）</title></path>`;
  }).join('');
  const nums = Object.entries(ARR).map(([n, a]) => `<text class="map__num" x="${a.c[0]}" y="${a.c[1] + 4}">${n}</text>`).join('');
  const legend = ['すべて', ...data.zones].map((z) => `<button type="button" class="map__key" data-zone="${esc(z)}" data-z="${idx(z)}" aria-pressed="${z === zone}">${z === 'すべて' ? '' : '<i></i>'}${esc(z)}</button>`).join('');
  return `<details class="mapbox" id="mapbox" ${open ? 'open' : ''}>
    <summary>地図でエリアをえらぶ<span class="mapbox__now">${zone === 'すべて' ? 'すべて表示中' : `${esc(zone)}を表示中`}</span></summary>
    <div class="mapbox__body">
      <svg class="map" viewBox="-4 -4 ${MAP_W + 8} ${MAP_H + 8}" role="group" aria-label="パリ20区の地図。区を押すとエリアをえらべます">${paths}${nums}</svg>
      <div class="map__legend">${legend}<p class="map__note">数字は区。サン＝トゥアンは「右岸・北」に入れています。</p></div>
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
