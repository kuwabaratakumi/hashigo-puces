import { parisToday, addDays } from './schedule.js';
import { STRIP_DAYS, dayStrip, zoneChips, viewDay, viewHashigo, viewEvents, viewMarkets, esc } from './views.js';
// パルクリール！ フランス蚤の市 — パリの蚤の市を日付で見て、同じ日に回れる組み合わせを探す

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 保存できなくても表示は続ける */ } },
};
const VIEWS = ['day', 'hashigo', 'events', 'markets'];
const state = {
  data: null,
  view: store.get('hashigo-puces:view', 'day'),
  zone: store.get('hashigo-puces:zone', 'すべて'),
  date: '',
};
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
  $('#main').innerHTML = state.view === 'hashigo' ? viewHashigo(data, state)
    : state.view === 'events' ? viewEvents(data, today, state)
    : state.view === 'markets' ? viewMarkets(data, state)
    : viewDay(data, state);
}

function bind() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.view) { state.view = t.dataset.view; store.set('hashigo-puces:view', state.view); }
    else if (t.dataset.date) { state.date = t.dataset.date; if (state.view !== 'hashigo') state.view = 'day'; }
    else if (t.dataset.zone) { state.zone = t.dataset.zone; store.set('hashigo-puces:zone', state.zone); }
    else return;
    render();
    if (t.dataset.date) $('#main').scrollIntoView({ block: 'start' });
  });
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
