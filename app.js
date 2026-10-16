/* ============================================================
   三鲜手作 · 前端逻辑
   购物车 / 下单 / 客户管理（localStorage）
   ============================================================ */
'use strict';

/* ---------- 菜单数据 ---------- */
const MENU = [
  { id:'sj01', tag:'招牌',   name:'三鲜水饺', desc:'虾仁、猪肉、韭菜。三点鲜，一张皮。',     price:38, img:'assets/dumpling-1.jpg' },
  { id:'sj02', tag:'经典',   name:'猪肉白菜', desc:'白菜杀过水，脆而不生。',                 price:32, img:'assets/dumpling-2.jpg' },
  { id:'sj03', tag:'素馅',   name:'韭菜鸡蛋', desc:'土鸡蛋炒散，韭香不冲。',                 price:30, img:'assets/dumpling-3.jpg' },
  { id:'sj04', tag:'时令',   name:'整只虾仁', desc:'一只饺子里放一整只虾。',                 price:52, img:'assets/dumpling-4.jpg' },
  { id:'sj05', tag:'重口',   name:'牛肉胡萝卜', desc:'牛霖手剁，胡萝卜回甜。',              price:44, img:'assets/dumpling-5.jpg' },
  { id:'sj06', tag:'清淡',   name:'素三鲜',   desc:'木耳、香菇、粉丝。不含肉。',             price:30, img:'assets/dumpling-6.jpg' },
];
const DELIVERY = 8;          // 配送费
const FREE_OVER = 99;        // 满额免配送
const STATUSES = ['待确认','包制中','配送中','已完成'];

/* ---------- 存储 ---------- */
const DB = {
  get(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); },
};
let cart    = DB.get('sj_cart', {});          // { id: qty }
let orders  = DB.get('sj_orders', []);
let seq     = DB.get('sj_seq', 0);

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

function nextOrderNo(){
  seq += 1; DB.set('sj_seq', seq);
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `SJ${stamp}-${String(seq).padStart(4,'0')}`;
}

function submitOrder(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const order = {
    no: nextOrderNo(),
    name: fd.get('name').trim(),
    phone: fd.get('phone').trim(),
    address: fd.get('address').trim(),
    slot: fd.get('slot'),
    items: cartList().map(i => ({ name:i.name, qty:i.qty, price:i.price })),
    amount: Number(total().toFixed(2)),
    status: '待确认',
    ts: Date.now(),
  };
  orders.unshift(order);
  DB.set('sj_orders', orders);
  cart = {}; DB.set('sj_cart', cart);
  syncCart(); closeModals(); e.target.reset();
  $('#orderNo').textContent = order.no;
  openModal($('#success'));
  renderAdmin();
}

/* ---------- 管理后台 ---------- */
function isToday(ts){ const d = new Date(ts), n = new Date();
  return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate(); }
const fmt = ts => { const d = new Date(ts);
  return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };

function customerStats(){
  const map = new Map();
  for (const o of orders){
    const k = o.phone;
    if (!map.has(k)) map.set(k, { name:o.name, phone:o.phone, n:0, sum:0, last:0 });
    const c = map.get(k);
    c.n += 1; c.sum += o.amount; c.last = Math.max(c.last, o.ts);
    c.name = o.name;                       // 取最近一次的名字
  }
  return Array.from(map.values()).sort((a,b) => b.sum - a.sum);
}

function renderAdmin(){
  const today = orders.filter(o => isToday(o.ts));
  const revenue = today.reduce((s,o) => s + o.amount, 0);
  const pending = orders.filter(o => o.status !== '已完成').length;
  const custs = customerStats();

  $('#kpis').innerHTML = `
    <div class="kpi"><span>今日订单</span><b>${today.length}</b></div>
    <div class="kpi accent"><span>今日营收</span><b>${money(revenue)}</b></div>
    <div class="kpi"><span>客户总数</span><b>${custs.length}</b></div>
    <div class="kpi"><span>待处理</span><b>${pending}</b></div>`;

  $('#ordersTable tbody').innerHTML = orders.length ? orders.map((o,i) => `
    <tr>
      <td>${o.no}</td><td>${o.name}</td><td class="phone">${o.phone}</td>
      <td>${money(o.amount)}</td>
      <td><button class="badge" data-s="${o.status}" data-adv="${i}" title="点击流转状态">${o.status}</button></td>
      <td class="muted">${fmt(o.ts)}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="muted" style="padding:2rem;text-align:center">还没有订单</td></tr>';

  $('#customersTable tbody').innerHTML = custs.length ? custs.map(c => `
    <tr><td>${c.name}</td><td class="phone">${c.phone}</td>
    <td>${c.n}</td><td>${money(c.sum)}</td><td class="muted">${fmt(c.last)}</td></tr>`).join('')
    : '<tr><td colspan="5" class="muted" style="padding:2rem;text-align:center">还没有客户</td></tr>';
}

function advanceStatus(i){
  const o = orders[i];
  const k = STATUSES.indexOf(o.status);
  o.status = STATUSES[(k + 1) % STATUSES.length];
  DB.set('sj_orders', orders);
  renderAdmin();
  toast(`${o.no} → ${o.status}`);
}

function seedDemo(){
  const names = [['张伟','13800001111'],['李娜','13900002222'],['王强','13700003333'],
                 ['陈静','13600004444'],['刘洋','13500005555']];
  const now = Date.now();
  let n = seq;
  for (let i = 0; i < 12; i++){
    const [nm, ph] = names[i % names.length];
    const pick = MENU[Math.floor(Math.random()*MENU.length)];
    const qty = 1 + Math.floor(Math.random()*2);
    n += 1;
    orders.push({
      no: `SJ${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}-${String(n).padStart(4,'0')}`,
      name: nm, phone: ph, address: '演示地址', slot: '尽快（约 2 小时）',
      items: [{ name:pick.name, qty, price:pick.price }],
      amount: pick.price * qty + (pick.price*qty >= FREE_OVER ? 0 : DELIVERY),
      status: STATUSES[Math.floor(Math.random()*STATUSES.length)],
      ts: now - Math.floor(Math.random()*10) * 3600 * 1000,
    });
  }
  seq = n; DB.set('sj_seq', seq); DB.set('sj_orders', orders);
  renderAdmin(); toast('已灌入 12 条示例订单');
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
  renderMenu(); syncCart(); initChapters(); observeReveals();
  window.addEventListener('scroll', () => {
    $('#nav').classList.toggle('is-solid', window.scrollY > 40);
  }, { passive:true });

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-add],[data-inc],[data-dec],[data-adv],[data-close-modal]');
    if (!t) return;
    if (t.dataset.add  !== undefined) addToCart(t.dataset.add, t);
    if (t.dataset.inc  !== undefined) setQty(t.dataset.inc, +1);
    if (t.dataset.dec  !== undefined) setQty(t.dataset.dec, -1);
    if (t.dataset.adv  !== undefined) advanceStatus(+t.dataset.adv);
    if (t.hasAttribute('data-close-modal')) closeModals();
  });

  $('#cartBtn').addEventListener('click', openCart);
  $('#cartClose').addEventListener('click', closeCart);
  $('#scrim').addEventListener('click', () => { closeCart(); closeModals(); });
  $('#cartFoot').addEventListener('click', e => { if (e.target.id === 'toCheckout') openCheckout(); });
  $('#checkoutForm').addEventListener('submit', submitOrder);
  $('#adminEntry').addEventListener('click', enterAdmin);
  $('#adminExit').addEventListener('click', exitAdmin);
  $('#seedBtn').addEventListener('click', seedDemo);
  $('#clearBtn').addEventListener('click', () => {
    if (!confirm('清空所有订单与客户数据？')) return;
    orders = []; seq = 0; DB.set('sj_orders', orders); DB.set('sj_seq', 0);
    renderAdmin(); toast('数据已清空');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape'){ closeCart(); closeModals(); } });
  if (location.hash === '#admin') enterAdmin();
}

document.addEventListener('DOMContentLoaded', init);
