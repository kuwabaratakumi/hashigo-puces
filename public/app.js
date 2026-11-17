import { parisToday, clampToPeriod, addDays, PERIOD } from './schedule.js?v=28b1aaea';
import { dayStrip, regionChips, regionNote, zoneChips, zoneMap, franceMap, viewDay, viewHashigo, viewEvents, viewMarkets, viewSaved, setSaved, setZones, starLabel, esc } from './views.js?v=28b1aaea';
// パルクリール！ フランス蚤の市 — パリの蚤の市を日付で見て、同じ日に回れる組み合わせを探す

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 保存できなくても表示は続ける */ } },
};
const VIEWS = ['day', 'hashigo', 'events', 'markets', 'saved'];
const state = {
  data: null,
  view: store.get('hashigo-puces:view', 'day'),
  region: store.get('hashigo-puces:region', 'パリ'),
  zone: store.get('hashigo-puces:zone', 'すべて'),
  mapOpen: store.get('hashigo-puces:map', true),
  frOpen: store.get('hashigo-puces:fr', true),
  stay: store.get('hashigo-puces:stay', { from: '', to: '' }),
  date: '',
};
// お気に入りとメモ（このブラウザの中だけに保存）
const saved = {
  fav: store.get('hashigo-puces:fav', {}),
  memo: store.get('hashigo-puces:memo', {}),
  note: store.get('hashigo-puces:note', ''),
};
setSaved(saved);
const $ = (s, el = document) => el.querySelector(s);

function render() {
  const today = parisToday();
  const all = state.data;
  if (!all.regions.includes(state.region)) state.region = 'パリ';
  const paris = state.region === 'パリ';
  // 地方は、その地方の常設だけを見せる（単発・はしご・エリアはパリだけ）
  const data = { ...all, markets: all.markets.filter((m) => m.region === state.region), events: paris ? all.events : [], groups: paris ? all.groups : [] };
  if (!VIEWS.includes(state.view) || (!paris && state.view === 'hashigo')) state.view = 'day';
  if (!paris || (state.zone !== 'すべて' && !all.zones.includes(state.zone))) state.zone = 'すべて';
  const clampStay = (d) => (d && d >= PERIOD.start && d <= PERIOD.end ? d : '');
  state.stay = { from: clampStay(state.stay.from), to: clampStay(state.stay.to) };
  if (state.stay.from && state.stay.to && state.stay.to < state.stay.from) state.stay = { from: state.stay.to, to: state.stay.from };
  if (!state.date || state.date < PERIOD.start || state.date > PERIOD.end) state.date = clampToPeriod(today);
  document.querySelectorAll('.view button').forEach((b) => { b.setAttribute('aria-pressed', String(b.dataset.view === state.view)); if (b.dataset.view === 'hashigo') b.hidden = !paris; });
  $('#regions').innerHTML = regionChips(all, state.region);
  $('#days').innerHTML = dayStrip(data, today, state.date, state.zone, state.stay);
  $('#zones').innerHTML = paris ? zoneChips(data, state.zone) : '';
  $('#zones').hidden = !paris;
  const body = state.view === 'hashigo' ? viewHashigo(data, state)
    : state.view === 'events' ? viewEvents(data, today, state)
    : state.view === 'markets' ? viewMarkets(data, state)
    : state.view === 'saved' ? viewSaved(all, today)
    : viewDay(data, state);
  // ★ メモの画面はエリアでしぼらないので、地図は出さない。地図はパリだけ
  $('#main').innerHTML = (state.view === 'saved' ? '' : franceMap(all, state.region, state.frOpen) + (paris ? zoneMap(data, state.zone, state.mapOpen, state.date) : regionNote(state.region, state.view))) + body;
}

function toggleFav(btn) {
  const key = btn.dataset.fav;
  if (saved.fav[key]) delete saved.fav[key]; else saved.fav[key] = { label: btn.dataset.label };
  store.set('hashigo-puces:fav', saved.fav);
  if (state.view === 'saved') return render();
  // ほかの画面では、書きかけのメモを消さないようにボタンだけ書きかえる
  const on = Boolean(saved.fav[key]);
  document.querySelectorAll('[data-fav]').forEach((b) => {
    if (b.dataset.fav !== key) return;
    b.textContent = on ? '★' : '☆';
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', starLabel(on));
  });
}

function act(t) {
  if (t.dataset.fav) return toggleFav(t);
  if (t.dataset.forget) {
    delete saved.fav[t.dataset.forget]; delete saved.memo[t.dataset.forget];
    store.set('hashigo-puces:fav', saved.fav); store.set('hashigo-puces:memo', saved.memo);
  } else if (t.dataset.view) { state.view = t.dataset.view; store.set('hashigo-puces:view', state.view); }
  else if ('stayClear' in t.dataset) { state.stay = { from: '', to: '' }; store.set('hashigo-puces:stay', state.stay); }
  else if ('stayAll' in t.dataset) { state.stay = { from: PERIOD.start, to: PERIOD.end }; store.set('hashigo-puces:stay', state.stay); }
  else if (t.dataset.date) { state.date = t.dataset.date; if (state.view !== 'hashigo') state.view = 'day'; }
  else if (t.dataset.region) { state.region = t.dataset.region; store.set('hashigo-puces:region', state.region); }
  else if (t.dataset.zone) { state.zone = state.zone === t.dataset.zone ? 'すべて' : t.dataset.zone; store.set('hashigo-puces:zone', state.zone); }
  else return;
  render();
  if (t.dataset.date) $('#main').scrollIntoView({ block: 'start' });
}

function bind() {
  const SEL = '[data-fav],[data-forget],[data-view],[data-date],[data-region],[data-zone],[data-stay-clear],[data-stay-all]';
  document.addEventListener('click', (e) => { const t = e.target.closest(SEL); if (t) act(t); });
  // 地図の区はボタンではないので、キーボードでも押せるようにする
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('path[data-zone],g[data-zone],[data-region][role="button"]')) { e.preventDefault(); act(e.target); }
  });
  // 滞在期間の始点・終点。片方だけえらんだときは、もう片方を同じ日にする
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id !== 'stayFrom' && t.id !== 'stayTo') return;
    const from = $('#stayFrom').value, to = $('#stayTo').value;
    state.stay = t.id === 'stayFrom' ? { from, to: to && to >= from ? to : from } : { from: from && from <= to ? from : to, to };
    store.set('hashigo-puces:stay', state.stay);
    render();
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset?.memo) {
      const text = t.value.trim();
      if (text) saved.memo[t.dataset.memo] = { text: t.value, label: t.dataset.label }; else delete saved.memo[t.dataset.memo];
      store.set('hashigo-puces:memo', saved.memo);
    } else if (t.id === 'tripNote') { saved.note = t.value; store.set('hashigo-puces:note', saved.note); }
  });
  // 地図を開いているかどうかを覚える（toggle は親に伝わらないので capture で受ける）
  document.addEventListener('toggle', (e) => {
    if (e.target.id === 'francebox') { state.frOpen = e.target.open; store.set('hashigo-puces:fr', state.frOpen); }
    if (e.target.id === 'mapbox') { state.mapOpen = e.target.open; store.set('hashigo-puces:map', state.mapOpen); }
  }, true);
}

async function main() {
  try {
    state.data = await fetch(`data/puces.json?t=${Date.now()}`).then((r) => r.json());
    setZones(state.data.zones);
    $('#builtAt').textContent = `データ更新 ${new Date(state.data.builtAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}（日本時間）`;
    bind();
    render();
  } catch (err) {
    $('#main').innerHTML = `<p class="empty">データを読み込めませんでした（${esc(err.message)}）</p>`;
  }
}
main();
