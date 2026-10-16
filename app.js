/* ============================================================
   三鲜手作 · 前端逻辑
   购物车 / 下单 / 客户管理（localStorage）
   ============================================================ */
'use strict';

/* ---------- 后端 ---------- */
const API = 'https://sanxian-shouzuo-api.onrender.com';

/* ---------- 菜单（从后端拉，不再写死在前端）---------- */
let MENU = [];
let DELIVERY = 8;      // 配送费，后端下发
let FREE_OVER = 99;    // 免运费门槛，后端下发
let CLOSED = false;    // 打烊开关，后端下发
const STATUSES = ['待确认','包制中','配送中','已完成'];

async function loadMenu(){
  try {
    const r = await fetch(`${API}/api/menu`, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    MENU = d.items || [];
    DELIVERY = Number(d.delivery_fee ?? 8);
    FREE_OVER = Number(d.free_over ?? 99);
    CLOSED = !!d.closed;
    if (CLOSED) toast('今日已打烊，明天再来');
  } catch (e) {
    console.warn('菜单拉取失败', e);
    toast('菜单加载失败，请刷新');
  }
  renderMenu(); syncCart();
}

/* ---------- 存储 ---------- */
const DB = {
  get(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); },
};
let cart    = DB.get('sj_cart', {});          // { id: qty }

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const money = n => '¥' + n.toFixed(2);

/* ---------- 渲染菜单 ---------- */
function renderMenu(){
  $('#menuGrid').innerHTML = MENU.map(d => `
    <article class="dish is-in">
      <div class="dish-img"><img src="${d.img}" alt="${d.name}" loading="lazy"
        onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'dish-ph',style:'width:100%;height:100%',innerText:'${d.name}'}))"></div>
      <div class="dish-body">
        <span class="dish-tag">${d.tag}</span>
        <h3>${d.name}</h3>
        <p>${d.desc}</p>
        <div class="dish-foot">
          <span class="price">${money(d.price)}<small>/12只</small></span>
          <button class="add" data-add="${d.id}">加入</button>
        </div>
      </div>
    </article>`).join('');
  observeReveals();
}

/* ---------- 购物车 ---------- */
const cartList = () => Object.entries(cart)
  .map(([id,q]) => ({ ...MENU.find(m => m.id === id), qty:q }))
  .filter(x => x.name);

const subtotal = () => cartList().reduce((s,i) => s + i.price * i.qty, 0);
const count    = () => cartList().reduce((s,i) => s + i.qty, 0);
const delivery = () => (subtotal() === 0 || subtotal() >= FREE_OVER) ? 0 : DELIVERY;
const total    = () => subtotal() + delivery();

function addToCart(id, btn){
  cart[id] = (cart[id] || 0) + 1;
  DB.set('sj_cart', cart);
  syncCart();
  if (btn){ btn.classList.add('is-added'); btn.textContent = '已加';
    setTimeout(()=>{ btn.classList.remove('is-added'); btn.textContent = '加入'; }, 900); }
  toast(`${MENU.find(m=>m.id===id).name} 已加入`);
}

function setQty(id, delta){
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  DB.set('sj_cart', cart);
  syncCart();
}

function syncCart(){
  $('#cartCount').textContent = count();

  const list = cartList();
  $('#cartBody').innerHTML = list.length ? list.map(i => `
    <div class="line-item">
      <img src="${i.img}" alt="" onerror="this.style.background='#EFE8DC'">
      <div>
        <h4>${i.name}</h4>
        <div class="qty">
          <button data-dec="${i.id}" aria-label="减少 ${i.name}">−</button>
          <span>${i.qty}</span>
          <button data-inc="${i.id}" aria-label="增加 ${i.name}">+</button>
        </div>
      </div>
      <span class="line-price">${money(i.price * i.qty)}</span>
    </div>`).join('') : '<div class="empty">购物车还空着<br>去菜单挑两样？</div>';

  $('#cartFoot').innerHTML = list.length ? `
    <div class="sum-row"><span>小计</span><span>${money(subtotal())}</span></div>
    <div class="sum-row"><span>配送费${delivery()===0?'（已免）':''}</span><span>${money(delivery())}</span></div>
    <div class="sum-row total"><span>合计</span><span>${money(total())}</span></div>
    <button class="btn btn-primary btn-block" id="toCheckout">去结算</button>
  ` : '<button class="btn btn-ghost btn-block" disabled>购物车是空的</button>';
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
  if (!count()) return toast('先挑几样');
  $('#formSum').innerHTML = `
    <div><span>${count()} 份水饺</span><span>${money(subtotal())}</span></div>
    <div><span>配送费</span><span>${money(delivery())}</span></div>
    <div><span>合计</span><span>${money(total())}</span></div>`;
  closeCart(); openModal($('#checkout'));
}

async function submitOrder(e){
  e.preventDefault();
  if (CLOSED) return toast('今日已打烊');

  const fd = new FormData(e.target);
  const payload = {
    name: fd.get('name').trim(),
    phone: fd.get('phone').trim(),
    address: fd.get('address').trim(),
    slot: fd.get('slot'),
    items: cartList().map(i => ({ id: i.id, qty: i.qty })),   // 只报 id 和数量，价格服务端算
  };

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = '提交中…';
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
    toast(`下单成功 ${d.order_no}`);
  } catch (err) {
    toast('下单失败：' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = '确认下单';
  }
}

/* ---------- 管理后台（数据全部来自后端）---------- */
const fmt = ts => { const d = new Date(ts);
  return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };

function adminToken(){
  let t = localStorage.getItem('sj_admin_token');
  if (!t){
    t = (prompt('输入管理令牌（X-Admin-Token）') || '').trim();
    if (t) localStorage.setItem('sj_admin_token', t);
  }
  return t || '';
}

/** 带令牌调后端；401 就清掉令牌并提示重输 */
async function api(path, opts = {}){
  const r = await fetch(API + path, {
    ...opts,
    headers: { ...(opts.headers || {}), 'X-Admin-Token': adminToken() },
    cache: 'no-store',
  });
  if (r.status === 401){
    localStorage.removeItem('sj_admin_token');
    throw new Error('令牌无效，已清除。关掉后台再点一次重新输入');
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
  return d;
}

async function renderAdmin(){
  const money = n => '¥' + Number(n || 0).toFixed(2);
  try {
    const [stats, ordersRes, custRes] = await Promise.all([
      api('/api/stats'), api('/api/orders?limit=100'), api('/api/customers'),
    ]);

    $('#kpis').innerHTML = `
      <div class="kpi"><span>今日订单</span><b>${stats.today_orders}</b></div>
      <div class="kpi accent"><span>今日营收</span><b>${money(stats.today_revenue)}</b></div>
      <div class="kpi"><span>客户总数</span><b>${stats.customers}</b></div>
      <div class="kpi"><span>待处理</span><b>${stats.pending}</b></div>`;

    const os = ordersRes.orders || [];
    $('#ordersTable tbody').innerHTML = os.length ? os.map(o => `
      <tr>
        <td>${o.order_no}</td><td>${o.name}</td><td class="phone">${o.phone}</td>
        <td>${money(o.amount)}</td>
        <td><button class="badge" data-s="${o.status}" data-adv="${o.id}" title="点击流转状态">${o.status}</button></td>
        <td class="muted">${fmt(o.created_at)}</td>
      </tr>`).join('') : '<tr><td colspan="6" class="muted" style="padding:2rem;text-align:center">还没有订单</td></tr>';

    const cs = custRes.customers || [];
    $('#customersTable tbody').innerHTML = cs.length ? cs.map(c => `
      <tr><td>${c.name}</td><td class="phone">${c.phone}</td>
      <td>${c.orders_count}</td><td>${money(c.total_amount)}</td><td class="muted">${fmt(c.last_at)}</td></tr>`).join('')
      : '<tr><td colspan="5" class="muted" style="padding:2rem;text-align:center">还没有客户</td></tr>';
  } catch (e) {
    $('#kpis').innerHTML =
      `<div class="kpi" style="grid-column:1/-1"><span>读取失败</span><b style="font-size:1rem">${e.message}</b></div>`;
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
    toast(`订单 → ${next}`);
    renderAdmin();
  } catch (e) { toast('改状态失败：' + e.message); }
}

function enterAdmin(){ $('#admin').hidden = false; document.body.style.overflow='hidden'; renderAdmin(); }
function exitAdmin(){ $('#admin').hidden = true; document.body.style.overflow=''; }

/* ---------- 视频章节 ---------- */
function initChapters(){
  const v = $('#heroVideo');
  const bar = $('#heroProgress span');
  $$('.chapter').forEach(btn => btn.addEventListener('click', () => {
    $$('.chapter').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const clip = btn.dataset.clip, poster = btn.dataset.poster;
    // 视频不存在时优雅降级：只换封面图，不出现破图
    v.poster = poster;
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => { v.src = clip; v.play().catch(()=>{}); };
    probe.onerror = () => { v.removeAttribute('src'); v.load(); };
    probe.src = clip;
  }));
  v.addEventListener('timeupdate', () => {
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
  }, { threshold:.12, rootMargin:'0px 0px -8% 0px' });
  $$('.reveal:not(.is-in)').forEach(el => io.observe(el));
}

/* ---------- 提示 ---------- */
let toastTimer;
function toast(msg){
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  requestAnimationFrame(() => t.classList.add('is-on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('is-on'); setTimeout(()=>t.hidden = true, 320); }, 2000);
}

/* ---------- 事件绑定 ---------- */
function init(){
  syncCart(); initChapters(); observeReveals(); loadMenu();
  window.addEventListener('scroll', () => {
    $('#nav').classList.toggle('is-solid', window.scrollY > 40);
  }, { passive:true });

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-add],[data-inc],[data-dec],[data-adv],[data-close-modal]');
    if (!t) return;
    if (t.dataset.add  !== undefined) addToCart(t.dataset.add, t);
    if (t.dataset.inc  !== undefined) setQty(t.dataset.inc, +1);
    if (t.dataset.dec  !== undefined) setQty(t.dataset.dec, -1);
    if (t.dataset.adv  !== undefined) advanceStatus(t.dataset.adv, t.dataset.s);
    if (t.hasAttribute('data-close-modal')) closeModals();
  });

  $('#cartBtn').addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  $('#scrim').addEventListener('click', () => { closeCart(); closeModals(); });
  $('#cartFoot').addEventListener('click', e => { if (e.target.id === 'toCheckout') openCheckout(); });
  $('#checkoutForm').addEventListener('submit', submitOrder);
  $('#adminEntry').addEventListener('click', enterAdmin);
  $('#adminExit').addEventListener('click', exitAdmin);
  $('#seedBtn').addEventListener('click', () => { renderAdmin(); toast('已刷新'); });
  $('#clearBtn').addEventListener('click', () => {
    localStorage.removeItem('sj_admin_token');
    toast('已退出管理，下次进入需重新输入令牌');
    exitAdmin();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape'){ closeCart(); closeModals(); } });
  if (location.hash === '#admin') enterAdmin();
}

document.addEventListener('DOMContentLoaded', init);
