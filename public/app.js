import { parisToday, clampToPeriod, addDays, PERIOD } from './schedule.js?v=6745ade8';
import { dayStrip, parisRow, regionChips, zoneMap, franceMap, viewDay, viewHashigo, viewAll, viewSaved, setSaved, setZones, starLabel, esc } from './views.js?v=6745ade8';
// パルクリール！ フランス蚤の市 — パリの蚤の市を日付で見て、同じ日に回れる組み合わせを探す

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 保存できなくても表示は続ける */ } },
};
const VIEWS = ['all', 'day', 'hashigo', 'saved'];
const state = {
  data: null,
  view: 'all', // 開いたときはいつも全日程から
  region: store.get('hashigo-puces:region', 'パリ'),
  zone: store.get('hashigo-puces:zone', 'すべて'),
  mapOpen: store.get('hashigo-puces:map', true),
  frPanel: false,
  menu: false,
  pick: '', // 期間を選ぶ：先に押した始まりの日
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
  const data = { ...all, region: state.region, markets: all.markets.filter((m) => m.region === state.region), events: paris ? all.events : [], groups: paris ? all.groups : [] };
  if (!VIEWS.includes(state.view)) state.view = 'all';
  if (!paris || (state.zone !== 'すべて' && !all.zones.includes(state.zone))) state.zone = 'すべて';
  const clampStay = (d) => (d && d >= PERIOD.start && d <= PERIOD.end ? d : '');
  state.stay = { from: clampStay(state.stay.from), to: clampStay(state.stay.to) };
  if (state.stay.from && state.stay.to && state.stay.to < state.stay.from) state.stay = { from: state.stay.to, to: state.stay.from };
  if (!state.date || state.date < PERIOD.start || state.date > PERIOD.end) state.date = clampToPeriod(today);
  document.querySelectorAll('.view button').forEach((b) => { b.setAttribute('aria-pressed', String(b.dataset.view === state.view)) });
  $('#regions').innerHTML = regionChips(all, state.region);
  $('#days').innerHTML = dayStrip(data, today, state.date, state.zone, state.stay, state.view, state.pick);
  $('#parisrow').innerHTML = parisRow(all, state.region, state.zone);
  const fp = $('#frpanel'); fp.innerHTML = franceMap(all, state.region); fp.hidden = !state.frPanel;
  $('#menu').hidden = !state.menu; $('#menubtn').setAttribute('aria-expanded', String(state.menu));
  const body = state.view === 'hashigo' ? viewHashigo(data, state)
    : state.view === 'day' ? viewDay(data, state)
    : state.view === 'saved' ? viewSaved(all, today)
    : viewAll(data, today, state);
  // ★ メモの画面はエリアでしぼらないので、地図は出さない。地図はパリだけ
  $('#main').innerHTML = (state.view === 'saved' ? '' : paris ? zoneMap(data, state.zone, state.mapOpen, state.date) : '') + body;
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
  } else if (t.dataset.view) { state.view = t.dataset.view; state.pick = ''; }
  else if (t.dataset.menu) {
    state.menu = false;
    if (t.dataset.menu === 'map') { state.frPanel = true; render(); return; }
    state.view = 'saved'; render();
    const el = t.dataset.menu === 'memo' ? $('#sec-memo') : ($('#sec-fav') || $('#main'));
    el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    if (t.dataset.menu === 'memo') $('#tripNote')?.focus({ preventScroll: true });
    return;
  }
  else if ('stayClear' in t.dataset) { state.stay = { from: '', to: '' }; store.set('hashigo-puces:stay', state.stay); }
  else if ('stayAll' in t.dataset) { state.stay = { from: PERIOD.start, to: PERIOD.end }; store.set('hashigo-puces:stay', state.stay); }
  else if (t.dataset.date) {
    if (state.view === 'hashigo') {
      // 期間を選ぶ：1回目で始まり、2回目で終わり
      if (!state.pick) { state.pick = t.dataset.date; render(); return; }
      const [a, b] = [state.pick, t.dataset.date].sort();
      state.stay = { from: a, to: b }; state.pick = ''; store.set('hashigo-puces:stay', state.stay);
    } else { state.date = t.dataset.date; state.view = 'day'; }
  }
  else if (t.dataset.region) { state.region = t.dataset.region; store.set('hashigo-puces:region', state.region); }
  else if ('frclose' in t.dataset) state.frPanel = false;
  else if (t.dataset.zone) { state.zone = state.zone === t.dataset.zone ? 'すべて' : t.dataset.zone; store.set('hashigo-puces:zone', state.zone); }
  else return;
  render();
  if (t.dataset.date && state.view !== 'hashigo') $('#main').scrollIntoView({ block: 'start' });
}

function bind() {
  const SEL = '[data-fav],[data-forget],[data-view],[data-menu],[data-date],[data-region],[data-zone],[data-stay-clear],[data-stay-all],[data-frclose]';
  document.addEventListener('click', (e) => {
    if (e.target.closest('#menubtn')) { state.menu = !state.menu; state.frPanel = false; return render(); }
    if (state.menu && !e.target.closest('#menu')) { state.menu = false; render(); }
    if (state.frPanel && !e.target.closest('#frpanel, .areawrap, #menu')) { state.frPanel = false; render(); }
    const t = e.target.closest(SEL); if (t) act(t);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && (state.frPanel || state.menu)) { state.frPanel = false; state.menu = false; render(); $('#menubtn').focus(); } });
  // 地図の区はボタンではないので、キーボードでも押せるようにする
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('path[data-zone],g[data-zone],[data-region][role="button"]')) { e.preventDefault(); act(e.target); }
  });
  // 日付の帯をドラッグして、滞在期間をえらぶ（マウス・ペン：そのままドラッグ／タッチ：長押ししてからドラッグ）
  const strip = $('#days');
  let drag = null, suppress = false, hold = 0;
  const dayAt = (x, y) => document.elementFromPoint(x, y)?.closest?.('.day[data-date]');
  const paint = () => {
    const [a, b] = [drag.from, drag.to].sort();
    strip.querySelectorAll('.day').forEach((d) => { d.toggleAttribute('data-drag', d.dataset.date >= a && d.dataset.date <= b); });
  };
  const move = (x, y) => { last = [x, y]; const d = dayAt(x, y); if (d && drag && d.dataset.date !== drag.to) { drag.to = d.dataset.date; drag.moved = true; paint(); } };
  // ドラッグ中に帯の左右の端へ寄せると、帯が自動で流れて先の日（2月）までえらべる
  let last = null, rolling = 0;
  const roll = () => {
    rolling = 0;
    if (!drag || !last) return;
    const r = strip.getBoundingClientRect(), edge = 48, [x, y] = last;
    const v = x > r.right - edge ? Math.min(18, (x - (r.right - edge)) / 2 + 4) : x < r.left + edge ? -Math.min(18, ((r.left + edge) - x) / 2 + 4) : 0;
    if (v) { strip.scrollLeft += v; move(Math.min(Math.max(x, r.left + 2), r.right - 2), y); }
    rolling = requestAnimationFrame(roll);
  };
  const startRoll = () => { if (!rolling) rolling = requestAnimationFrame(roll); };
  const finish = () => {
    if (!drag) return;
    const { from, to, moved } = drag; drag = null; last = null; clearTimeout(hold);
    strip.querySelectorAll('.day[data-drag]').forEach((d) => d.removeAttribute('data-drag'));
    if (!moved || from === to) return;
    suppress = true; setTimeout(() => { suppress = false; }, 0);
    const [a, b] = [from, to].sort();
    state.stay = { from: a, to: b }; state.view = 'hashigo'; state.pick = '';
    store.set('hashigo-puces:stay', state.stay);
    render(); $('#main').scrollIntoView({ block: 'start' });
  };
  strip.addEventListener('pointerdown', (e) => {
    const d = e.target.closest('.day[data-date]'); if (!d || e.pointerType === 'touch' || e.button > 0) return;
    drag = { from: d.dataset.date, to: d.dataset.date, moved: false };
  });
  document.addEventListener('pointermove', (e) => { if (drag && e.pointerType !== 'touch') { move(e.clientX, e.clientY); startRoll(); } });
  document.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') finish(); });
  document.addEventListener('click', (e) => { if (suppress) { e.stopPropagation(); e.preventDefault(); } }, true);
  strip.addEventListener('touchstart', (e) => {
    const t = e.touches[0], d = dayAt(t.clientX, t.clientY); if (!d) return;
    hold = setTimeout(() => { drag = { from: d.dataset.date, to: d.dataset.date, moved: false, touch: true }; paint(); navigator.vibrate?.(20); }, 450);
  }, { passive: true });
  strip.addEventListener('touchmove', (e) => { if (drag?.touch) { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); startRoll(); } else clearTimeout(hold); }, { passive: false });
  strip.addEventListener('touchend', () => { clearTimeout(hold); if (drag?.touch) { const moved = drag.moved; finish(); if (moved) suppress = true, setTimeout(() => { suppress = false; }, 400); } });
  strip.addEventListener('touchcancel', () => { clearTimeout(hold); drag = null; strip.querySelectorAll('.day[data-drag]').forEach((d) => d.removeAttribute('data-drag')); });
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
