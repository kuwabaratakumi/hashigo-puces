import { parisToday, addDays } from './schedule.js';
import { STRIP_DAYS, dayStrip, zoneChips, zoneMap, viewDay, viewHashigo, viewEvents, viewMarkets, viewSaved, setSaved, starLabel, esc } from './views.js';
// パルクリール！ フランス蚤の市 — パリの蚤の市を日付で見て、同じ日に回れる組み合わせを探す

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 保存できなくても表示は続ける */ } },
};
const VIEWS = ['day', 'hashigo', 'events', 'markets', 'saved'];
const state = {
  data: null,
  view: store.get('hashigo-puces:view', 'day'),
  zone: store.get('hashigo-puces:zone', 'すべて'),
  mapOpen: store.get('hashigo-puces:map', true),
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
  const { data } = state;
  if (!VIEWS.includes(state.view)) state.view = 'day';
  if (state.zone !== 'すべて' && !data.zones.includes(state.zone)) state.zone = 'すべて';
  if (!state.date || state.date < today || state.date > addDays(today, STRIP_DAYS - 1)) state.date = today;
  document.querySelectorAll('.view button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
  $('#days').innerHTML = dayStrip(data, today, state.date, state.zone);
  $('#zones').innerHTML = zoneChips(data, state.zone);
  const body = state.view === 'hashigo' ? viewHashigo(data, state)
    : state.view === 'events' ? viewEvents(data, today, state)
    : state.view === 'markets' ? viewMarkets(data, state)
    : state.view === 'saved' ? viewSaved(data, today)
    : viewDay(data, state);
  // ★ メモの画面はエリアでしぼらないので、地図は出さない
  $('#main').innerHTML = (state.view === 'saved' ? '' : zoneMap(data, state.zone, state.mapOpen)) + body;
}

function toggleFav(btn) {
  const key = btn.dataset.fav;
  if (saved.fav[key]) delete saved.fav[key]; else saved.fav[key] = { label: btn.dataset.label };
  store.set('hashigo-puces:fav', saved.fav);
  if (state.view === 'saved') return render();
  // ほかの画面では、書きかけのメモを消さないようにボタンだけ書きかえる
  const on = Boolean(saved.fav[key]);
  btn.textContent = on ? '★' : '☆';
  btn.setAttribute('aria-pressed', String(on));
  btn.setAttribute('aria-label', starLabel(on));
}

function act(t) {
  if (t.dataset.fav) return toggleFav(t);
  if (t.dataset.forget) {
    delete saved.fav[t.dataset.forget]; delete saved.memo[t.dataset.forget];
    store.set('hashigo-puces:fav', saved.fav); store.set('hashigo-puces:memo', saved.memo);
  } else if (t.dataset.view) { state.view = t.dataset.view; store.set('hashigo-puces:view', state.view); }
  else if (t.dataset.date) { state.date = t.dataset.date; if (state.view !== 'hashigo') state.view = 'day'; }
  else if (t.dataset.zone) { state.zone = state.zone === t.dataset.zone ? 'すべて' : t.dataset.zone; store.set('hashigo-puces:zone', state.zone); }
  else return;
  render();
  if (t.dataset.date) $('#main').scrollIntoView({ block: 'start' });
}

function bind() {
  const SEL = '[data-fav],[data-forget],[data-view],[data-date],[data-zone]';
  document.addEventListener('click', (e) => { const t = e.target.closest(SEL); if (t) act(t); });
  // 地図の区はボタンではないので、キーボードでも押せるようにする
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('path[data-zone]')) { e.preventDefault(); act(e.target); }
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
    if (e.target.id === 'mapbox') { state.mapOpen = e.target.open; store.set('hashigo-puces:map', state.mapOpen); }
  }, true);
}

async function main() {
  try {
    state.data = await fetch(`data/puces.json?t=${Date.now()}`).then((r) => r.json());
    $('#builtAt').textContent = `データ更新 ${new Date(state.data.builtAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}（日本時間）`;
    bind();
    render();
  } catch (err) {
    $('#main').innerHTML = `<p class="empty">データを読み込めませんでした（${esc(err.message)}）</p>`;
  }
}
main();
