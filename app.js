/* ============================================================
   三鲜手作 · 前端逻辑
   双语（见 i18n.js）· 货币一律澳币 · 数据全部走后端
   ============================================================ */
'use strict';

const API = 'https://sanxian-shouzuo-api.onrender.com';

/* ---------- 菜单（从后端拉，含中英两份）---------- */
let MENU = [];          // [{ id, price, img, zh:{tag,name,descr}, en:{...} }]
let DELIVERY = 5;       // 澳币，后端下发
let FREE_OVER = 49;     // 澳币，后端下发
let CLOSED = false;
const STATUSES = ['待确认', '包制中', '配送中', '已完成'];

/** 按当前语言取菜品文案 */
const L = it => (LANG === 'en' ? it.en : it.zh) || it.zh || it.en || {};

async function loadMenu(){
  try {
    const r = await fetch(`${API}/api/menu`, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    MENU = d.items || [];
    DELIVERY  = Number(d.delivery_fee ?? 5);
    FREE_OVER = Number(d.free_over ?? 49);
    CLOSED    = !!d.closed;
    if (CLOSED) toast(t('msg.closed'));
  } catch (e) {
    console.warn('菜单拉取失败', e);
    toast(t('msg.menuFail'));
  }
  renderMenu(); syncCart(); fillSlots();
}

/** 配送时段下拉：跟语言走 */
function fillSlots(){
  const sel = document.getElementById('slotSelect');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = ['co.slot1', 'co.slot2', 'co.slot3']
    .map(k => `<option value="${t(k)}">${t(k)}</option>`).join('');
  if (cur) sel.value = cur;
}

/* ---------- 存储（只存购物车和语言偏好）---------- */
const DB = {
  get(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); },
};
let cart = DB.get('sj_cart', {});

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------- 渲染菜单 ---------- */
function renderMenu(){
  const grid = $('#menuGrid');
  if (!grid) return;
  grid.innerHTML = MENU.map(d => {
    const c = L(d);
    return `
    <article class="dish is-in">
      <div class="dish-img"><img src="${d.img}" alt="${c.name || ''}" loading="lazy"
        onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'dish-ph',style:'width:100%;height:100%',innerText:'${(c.name || '').replace(/'/g, '')}'}))"></div>
      <div class="dish-body">
        <span class="dish-tag">${c.tag || ''}</span>
        <h3>${c.name || ''}</h3>
        <p>${c.descr || ''}</p>
        <div class="dish-foot">
          <span class="price">${fmtMoney(d.price)}<small>${t('menu.per')}</small></span>
          <button class="add" data-add="${d.id}">${t('menu.add')}</button>
        </div>
      </div>
    </article>`;
  }).join('');
  observeReveals();
}

/* ---------- 购物车 ---------- */
const cartList = () => Object.entries(cart)
  .map(([id, q]) => ({ ...(MENU.find(m => m.id === id) || {}), qty: q }))
  .filter(x => x.id);

const subtotal = () => cartList().reduce((s, i) => s + i.price * i.qty, 0);
const count    = () => cartList().reduce((s, i) => s + i.qty, 0);
const delivery = () => (subtotal() === 0 || subtotal() >= FREE_OVER) ? 0 : DELIVERY;
const total    = () => subtotal() + delivery();

function addToCart(id, btn){
  cart[id] = (cart[id] || 0) + 1;
  DB.set('sj_cart', cart);
  syncCart();
  const it = MENU.find(m => m.id === id);
  if (btn){ btn.classList.add('is-added'); btn.textContent = t('menu.added');
    setTimeout(() => { btn.classList.remove('is-added'); btn.textContent = t('menu.add'); }, 900); }
  if (it) toast(`${L(it).name} ${t('msg.added')}`);
}

function setQty(id, delta){
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  DB.set('sj_cart', cart);
  syncCart();
}

function syncCart(){
  const cc = $('#cartCount'); if (cc) cc.textContent = count();
  const list = cartList();

  $('#cartBody').innerHTML = list.length ? list.map(i => {
    const c = L(i);
    return `
    <div class="line-item">
      <img src="${i.img}" alt="" onerror="this.style.background='#EFE8DC'">
      <div>
        <h4>${c.name}</h4>
        <div class="qty">
          <button data-dec="${i.id}" aria-label="${t('cart.dec')} ${c.name}">−</button>
          <span>${i.qty}</span>
          <button data-inc="${i.id}" aria-label="${t('cart.inc')} ${c.name}">+</button>
        </div>
      </div>
      <span class="line-price">${fmtMoney(i.price * i.qty)}</span>
    </div>`;
  }).join('') : `<div class="empty">${t('cart.empty')}<br>${t('cart.empty2')}</div>`;

  $('#cartFoot').innerHTML = list.length ? `
    <div class="sum-row"><span>${t('cart.subtotal')}</span><span>${fmtMoney(subtotal())}</span></div>
    <div class="sum-row"><span>${t('cart.delivery')}${delivery() === 0 ? t('cart.free') : ''}</span><span>${fmtMoney(delivery())}</span></div>
    <div class="sum-row total"><span>${t('cart.total')}</span><span>${fmtMoney(total())}</span></div>
    <button class="btn btn-primary btn-block" id="toCheckout">${t('cart.checkout')}</button>
  ` : `<button class="btn btn-ghost btn-block" disabled>${t('cart.disabled')}</button>`;
}

/* ---------- 抽屉 / 弹窗 ---------- */
function openCart(){ $('#cartDrawer').classList.add('is-open'); $('#cartDrawer').setAttribute('aria-hidden','false');
  $('#scrim').hidden = false; }
function closeCart(){ $('#cartDrawer').classList.remove('is-open'); $('#cartDrawer').setAttribute('aria-hidden','true');
  if ($('#checkout').hidden) $('#scrim').hidden = true; }
function openModal(el){ el.hidden = false; $('#scrim').hidden = false; }
function closeModals(){ $$('.modal').forEach(m => m.hidden = true); if (!$('#cartDrawer').classList.contains('is-open')) $('#scrim').hidden = true; }

/* ---------- 结算 ---------- */
function openCheckout(){
  if (!count()) return toast(t('co.pick'));
  fillSlots();
  $('#formSum').innerHTML = `
    <div><span>${count()} ${LANG === 'en' ? '× dumplings' : '份水饺'}</span><span>${fmtMoney(subtotal())}</span></div>
    <div><span>${t('cart.delivery')}</span><span>${fmtMoney(delivery())}</span></div>
    <div><span>${t('cart.total')}</span><span>${fmtMoney(total())}</span></div>`;
  closeCart(); openModal($('#checkout'));
}

async function submitOrder(e){
  e.preventDefault();
  if (CLOSED) return toast(t('msg.closedShort'));

  const fd = new FormData(e.target);
  const payload = {
    name: String(fd.get('name') || '').trim(),
    phone: String(fd.get('phone') || '').trim(),
    address: String(fd.get('address') || '').trim(),
    slot: fd.get('slot'),
    items: cartList().map(i => ({ id: i.id, qty: i.qty })),   // 只报 id 和数量，价格服务端算
  };

  const btn = e.target.querySelector('button[type=submit]');
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = t('co.submitting');
  try {
    const r = await fetch(`${API}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));

    cart = {}; DB.set('sj_cart', cart);
    syncCart(); closeModals(); e.target.reset();
    $('#orderNo').textContent = d.order_no;
    openModal($('#success'));
    toast(`${t('msg.orderOk')} ${d.order_no}`);
  } catch (err) {
    toast(t('msg.orderFail') + err.message);
  } finally {
    btn.disabled = false; btn.textContent = orig;
  }
}

/* ---------- 管理后台（数据全部来自后端）---------- */
const fmt = ts => { const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };

function adminToken(){
  let tk = localStorage.getItem('sj_admin_token');
  if (!tk){
    tk = (prompt(t('adm.tokenPrompt')) || '').trim();
    if (tk) localStorage.setItem('sj_admin_token', tk);
  }
  return tk || '';
}

async function api(path, opts = {}){
  const r = await fetch(API + path, {
    ...opts,
    headers: { ...(opts.headers || {}), 'X-Admin-Token': adminToken() },
    cache: 'no-store',
  });
  if (r.status === 401){
    localStorage.removeItem('sj_admin_token');
    throw new Error(t('adm.tokenBad'));
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
  return d;
}

async function renderAdmin(){
  try {
    const [stats, ordersRes, custRes] = await Promise.all([
      api('/api/stats'), api('/api/orders?limit=100'), api('/api/customers'),
    ]);

    $('#kpis').innerHTML = `
      <div class="kpi"><span>${t('adm.todayOrders')}</span><b>${stats.today_orders}</b></div>
      <div class="kpi accent"><span>${t('adm.todayRevenue')}</span><b>${fmtMoney(stats.today_revenue)}</b></div>
      <div class="kpi"><span>${t('adm.customers')}</span><b>${stats.customers}</b></div>
      <div class="kpi"><span>${t('adm.pending')}</span><b>${stats.pending}</b></div>`;

    const os = ordersRes.orders || [];
    $('#ordersTable tbody').innerHTML = os.length ? os.map(o => `
      <tr>
        <td>${o.order_no}</td><td>${o.name}</td><td class="phone">${o.phone}</td>
        <td>${fmtMoney(o.amount)}</td>
        <td><button class="badge" data-s="${o.status}" data-adv="${o.id}" title="${t('adm.th.status')}">${tStatus(o.status)}</button></td>
        <td class="muted">${fmt(o.created_at)}</td>
      </tr>`).join('') : `<tr><td colspan="6" class="muted" style="padding:2rem;text-align:center">${t('adm.noOrders')}</td></tr>`;

    const cs = custRes.customers || [];
    $('#customersTable tbody').innerHTML = cs.length ? cs.map(c => `
      <tr><td>${c.name}</td><td class="phone">${c.phone}</td>
      <td>${c.orders_count}</td><td>${fmtMoney(c.total_amount)}</td><td class="muted">${fmt(c.last_at)}</td></tr>`).join('')
      : `<tr><td colspan="5" class="muted" style="padding:2rem;text-align:center">${t('adm.noCusts')}</td></tr>`;
  } catch (e) {
    $('#kpis').innerHTML =
      `<div class="kpi" style="grid-column:1/-1"><span>${t('adm.fail')}</span><b style="font-size:1rem">${e.message}</b></div>`;
  }
}

async function advanceStatus(id, current){
  const next = STATUSES[(STATUSES.indexOf(current) + 1) % STATUSES.length];
  try {
    await api(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    toast(`${t('adm.cycled')} ${tStatus(next)}`);
    renderAdmin();
  } catch (e) { toast(t('adm.cycleFail') + e.message); }
}

function enterAdmin(){ $('#admin').hidden = false; document.body.style.overflow = 'hidden'; renderAdmin(); }
function exitAdmin(){ $('#admin').hidden = true; document.body.style.overflow = ''; }

/* ---------- 视频章节 ---------- */
function initChapters(){
  const v = $('#heroVideo');
  const bar = $('#heroProgress span');
  $$('.chapter').forEach(btn => btn.addEventListener('click', () => {
    $$('.chapter').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const clip = btn.dataset.clip, poster = btn.dataset.poster;
    v.poster = poster;
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => { v.src = clip; v.play().catch(() => {}); };
    probe.onerror = () => { v.removeAttribute('src'); v.load(); };
    probe.src = clip;
  }));
  if (v) v.addEventListener('timeupdate', () => {
    if (!v.duration) return;
    bar.style.width = (v.currentTime / v.duration * 100) + '%';
  });
}

/* ---------- 滚动淡入 ---------- */
let io;
function observeReveals(){
  if (!('IntersectionObserver' in window)){
    $$('.reveal').forEach(el => el.classList.add('is-in')); return;
  }
  io = io || new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal:not(.is-in)').forEach(el => io.observe(el));
}

/* ---------- 提示 ---------- */
let toastTimer;
function toast(msg){
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('is-on'); setTimeout(() => el.hidden = true, 320); }, 2200);
}

/* ---------- 事件绑定 ---------- */
function init(){
  applyLang();
  fillSlots();
  syncCart();
  initChapters();
  observeReveals();
  loadMenu();

  window.addEventListener('scroll', () => {
    $('#nav').classList.toggle('is-solid', window.scrollY > 40);
  }, { passive: true });

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-add],[data-inc],[data-dec],[data-adv],[data-close-modal]');
    if (!el) return;
    if (el.dataset.add !== undefined) addToCart(el.dataset.add, el);
    if (el.dataset.inc !== undefined) setQty(el.dataset.inc, +1);
    if (el.dataset.dec !== undefined) setQty(el.dataset.dec, -1);
    if (el.dataset.adv !== undefined) advanceStatus(el.dataset.adv, el.dataset.s);
    if (el.hasAttribute('data-close-modal')) closeModals();
  });

  $('#langBtn').addEventListener('click', toggleLang);
  $('#cartBtn').addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  $('#scrim').addEventListener('click', () => { closeCart(); closeModals(); });
  $('#cartFoot').addEventListener('click', e => { if (e.target.id === 'toCheckout') openCheckout(); });
  $('#checkoutForm').addEventListener('submit', submitOrder);
  $('#adminEntry').addEventListener('click', enterAdmin);
  $('#adminExit').addEventListener('click', exitAdmin);
  $('#seedBtn').addEventListener('click', () => { renderAdmin(); toast(t('adm.refreshed')); });
  $('#clearBtn').addEventListener('click', () => {
    localStorage.removeItem('sj_admin_token');
    toast(t('adm.loggedOut'));
    exitAdmin();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape'){ closeCart(); closeModals(); } });
  if (location.hash === '#admin') enterAdmin();
}

document.addEventListener('DOMContentLoaded', init);
