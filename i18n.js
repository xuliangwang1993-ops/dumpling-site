/* ============================================================
   三鲜手作 · 中英双语
   任何页面/区块都靠这个文件切换。货币一律澳币（AUD）。
   ============================================================ */
'use strict';

const I18N = {
  zh: {
    'lang.switch': 'English',
    'nav.aria.lang': '切换到英文',

    'nav.story': '手作', 'nav.menu': '菜单', 'nav.how': '下单', 'nav.kit': '物料',
    'nav.aria.cart': '打开购物车',

    'hero.eyebrow': '从一团面，到一只饺子',
    'hero.title1': '看得见的手',
    'hero.title2': '尝得到的鲜',
    'hero.lead': '不冻、不预制。每单现包，两小时内送到。',
    'hero.cta1': '看菜单下单', 'hero.cta2': '看我们怎么包',

    'chap.1': '揉面', 'chap.2': '擀皮', 'chap.3': '捏合', 'chap.4': '下锅',
    'chap.aria': '制作过程章节',

    'story.kicker': '01 — 手作',
    'story.h': '三点鲜，一张皮',
    'story.p1': '虾仁、猪肉、韭菜，三样都得当天早上到。皮要擀到能透光，褶子恰好十二道——多了厚，少了漏。',
    'story.p2': '我们的厨房是敞开的，摄像头就在案板上方。你下单之后看到的那只饺子，就是下锅的那只。',
    'story.f1': '出锅到送达', 'story.f2': '道褶', 'story.f3': '预制品',
    'story.cap': '案板上的第 12 道褶',

    'menu.kicker': '02 — 菜单',
    'menu.h': '今天能包出来的',
    'menu.lead': '一份 12 只，澳币计价。可以混搭，结算时备注。',
    'menu.add': '加入', 'menu.added': '已加', 'menu.per': '/12只',

    'how.kicker': '03 — 下单',
    'how.h': '四步到嘴',
    'how.1': '选', 'how.1d': '挑馅料，加进购物车。',
    'how.2': '填', 'how.2d': '姓名、电话、地址、配送时段。',
    'how.3': '包', 'how.3d': '接单后现包，厨房直播可看。',
    'how.4': '送', 'how.4d': '两小时内送达，凉了包退。',

    'kit.kicker': '04 — 物料',
    'kit.h': '品牌物料下载',
    'kit.p': '菜单与规格书由 Craft 引擎排版导出，可直接送印。',
    'kit.c1': '菜单 · 印刷版', 'kit.c1s': 'PDF · CMYK',
    'kit.c2': '规格书 · 加盟用', 'kit.c2s': 'PDF',
    'kit.c3': '品牌标志 · 矢量', 'kit.c3s': 'SVG',

    'foot.copy': '© 2026 三鲜手作 · 手工现包',
    'foot.admin': '管理后台',

    'cart.title': '购物车', 'cart.close': '关闭购物车',
    'cart.empty': '购物车还空着', 'cart.empty2': '去菜单挑两样？',
    'cart.subtotal': '小计', 'cart.delivery': '配送费', 'cart.free': '（已免）',
    'cart.total': '合计', 'cart.checkout': '去结算', 'cart.disabled': '购物车是空的',
    'cart.inc': '增加', 'cart.dec': '减少',

    'co.title': '填写配送信息',
    'co.name': '姓名', 'co.phone': '电话', 'co.address': '地址', 'co.slot': '配送时段',
    'co.ph.name': '张伟', 'co.ph.phone': '0400 000 000', 'co.ph.address': '悉尼 NSW 2000 乔治街 100 号 3 室',
    'co.slot1': '尽快（约 2 小时）', 'co.slot2': '今天 17:00–19:00', 'co.slot3': '明天 11:00–13:00',
    'co.submit': '确认下单', 'co.submitting': '提交中…',
    'co.pick': '先挑几样',

    'ok.h': '下单成功', 'ok.p': '厨房已收到，现包大约 40 分钟。配送前会电话确认。', 'ok.btn': '好',

    'adm.title': '三鲜手作 · 管理后台',
    'adm.refresh': '刷新', 'adm.logout': '退出管理', 'adm.back': '返回前台',
    'adm.todayOrders': '今日订单', 'adm.todayRevenue': '今日营收',
    'adm.customers': '客户总数', 'adm.pending': '待处理',
    'adm.orders': '订单', 'adm.custs': '客户',
    'adm.th.no': '订单号', 'adm.th.cust': '客户', 'adm.th.phone': '电话',
    'adm.th.amount': '金额', 'adm.th.status': '状态', 'adm.th.time': '时间',
    'adm.th.orders': '下单', 'adm.th.total': '累计', 'adm.th.last': '最近',
    'adm.noOrders': '还没有订单', 'adm.noCusts': '还没有客户',
    'adm.fail': '读取失败',
    'adm.tokenPrompt': '输入管理令牌（X-Admin-Token）',
    'adm.tokenBad': '令牌无效，已清除。关掉后台再点一次重新输入',
    'adm.refreshed': '已刷新', 'adm.loggedOut': '已退出管理，下次进入需重新输入令牌',
    'adm.cycled': '订单 →',
    'adm.cycleFail': '改状态失败：',
    'adm.enterToken': '进入管理后台',

    'st.待确认': '待确认', 'st.包制中': '包制中', 'st.配送中': '配送中',
    'st.已完成': '已完成', 'st.已取消': '已取消',

    'msg.added': '已加入',
    'msg.closed': '今日已打烊，明天再来',
    'msg.menuFail': '菜单加载失败，请刷新',
    'msg.orderOk': '下单成功',
    'msg.orderFail': '下单失败：',
    'msg.closedShort': '今日已打烊',
  },

  en: {
    'lang.switch': '中文',
    'nav.aria.lang': 'Switch to Chinese',

    'nav.story': 'Craft', 'nav.menu': 'Menu', 'nav.how': 'Order', 'nav.kit': 'Press kit',
    'nav.aria.cart': 'Open cart',

    'hero.eyebrow': 'FROM A BALL OF DOUGH TO ONE DUMPLING',
    'hero.title1': 'Hands you can see',
    'hero.title2': 'Freshness you can taste',
    'hero.lead': 'Never frozen, never pre-made. Wrapped to order, delivered within two hours.',
    'hero.cta1': 'See the menu', 'hero.cta2': 'How we wrap them',

    'chap.1': 'Knead', 'chap.2': 'Roll', 'chap.3': 'Pleat', 'chap.4': 'Boil',
    'chap.aria': 'Making-of chapters',

    'story.kicker': '01 — CRAFT',
    'story.h': 'Three kinds of fresh, one wrapper',
    'story.p1': 'Prawn, pork and chive — all three arrive the same morning. The wrapper is rolled thin enough to see light through. Exactly twelve pleats: more is doughy, fewer leaks.',
    'story.p2': 'Our kitchen is open, and the camera sits right above the bench. The dumpling you see after ordering is the one that goes in the pot.',
    'story.f1': 'pot to door', 'story.f2': 'pleats', 'story.f3': 'pre-made',
    'story.cap': 'The twelfth pleat, on the bench',

    'menu.kicker': '02 — MENU',
    'menu.h': 'What we can wrap today',
    'menu.lead': 'Twelve to a serve, priced in AUD. Mix and match — just leave a note at checkout.',
    'menu.add': 'Add', 'menu.added': 'Added', 'menu.per': '/12 pcs',

    'how.kicker': '03 — ORDER',
    'how.h': 'Four steps to the table',
    'how.1': 'Pick', 'how.1d': 'Choose your fillings and add them to the cart.',
    'how.2': 'Fill', 'how.2d': 'Name, phone, address and a delivery window.',
    'how.3': 'Wrap', 'how.3d': 'We wrap to order — the kitchen cam is open.',
    'how.4': 'Deliver', 'how.4d': 'At your door within two hours. Cold, and it\'s on us.',

    'kit.kicker': '04 — PRESS KIT',
    'kit.h': 'Brand assets',
    'kit.p': 'The menu and spec sheet are typeset by the Craft engines and print-ready.',
    'kit.c1': 'Menu · print', 'kit.c1s': 'PDF · CMYK',
    'kit.c2': 'Spec sheet · franchise', 'kit.c2s': 'PDF',
    'kit.c3': 'Logo · vector', 'kit.c3s': 'SVG',

    'foot.copy': '© 2026 Sanxian Shouzuo · Handmade to order',
    'foot.admin': 'Admin',

    'cart.title': 'Your cart', 'cart.close': 'Close cart',
    'cart.empty': 'Your cart is empty', 'cart.empty2': 'Have a look at the menu?',
    'cart.subtotal': 'Subtotal', 'cart.delivery': 'Delivery', 'cart.free': ' (free)',
    'cart.total': 'Total', 'cart.checkout': 'Checkout', 'cart.disabled': 'Your cart is empty',
    'cart.inc': 'Increase', 'cart.dec': 'Decrease',

    'co.title': 'Delivery details',
    'co.name': 'Name', 'co.phone': 'Phone', 'co.address': 'Address', 'co.slot': 'Delivery window',
    'co.ph.name': 'Alex Chen', 'co.ph.phone': '0400 000 000', 'co.ph.address': 'Unit 3 / 100 George St, Sydney NSW 2000',
    'co.slot1': 'ASAP (about 2 hours)', 'co.slot2': 'Today 5–7 pm', 'co.slot3': 'Tomorrow 11 am–1 pm',
    'co.submit': 'Place order', 'co.submitting': 'Placing…',
    'co.pick': 'Pick something first',

    'ok.h': 'Order placed', 'ok.p': 'The kitchen has it. About 40 minutes to wrap and boil. We\'ll call before delivery.', 'ok.btn': 'Done',

    'adm.title': 'Sanxian Shouzuo · Admin',
    'adm.refresh': 'Refresh', 'adm.logout': 'Sign out', 'adm.back': 'Back to site',
    'adm.todayOrders': 'Orders today', 'adm.todayRevenue': 'Revenue today',
    'adm.customers': 'Customers', 'adm.pending': 'Open orders',
    'adm.orders': 'Orders', 'adm.custs': 'Customers',
    'adm.th.no': 'Order no.', 'adm.th.cust': 'Customer', 'adm.th.phone': 'Phone',
    'adm.th.amount': 'Amount', 'adm.th.status': 'Status', 'adm.th.time': 'Time',
    'adm.th.orders': 'Orders', 'adm.th.total': 'Spent', 'adm.th.last': 'Last order',
    'adm.noOrders': 'No orders yet', 'adm.noCusts': 'No customers yet',
    'adm.fail': 'Could not load',
    'adm.tokenPrompt': 'Enter the admin token (X-Admin-Token)',
    'adm.tokenBad': 'Token rejected and cleared. Close the admin panel and open it again.',
    'adm.refreshed': 'Refreshed', 'adm.loggedOut': 'Signed out — you\'ll need the token again',
    'adm.cycled': 'Order →',
    'adm.cycleFail': 'Could not change status: ',
    'adm.enterToken': 'Open admin',

    'st.待确认': 'New', 'st.包制中': 'Wrapping', 'st.配送中': 'Out for delivery',
    'st.已完成': 'Completed', 'st.已取消': 'Cancelled',

    'msg.added': 'added',
    'msg.closed': 'We\'re closed today — see you tomorrow',
    'msg.menuFail': 'Could not load the menu. Please refresh.',
    'msg.orderOk': 'Order placed',
    'msg.orderFail': 'Order failed: ',
    'msg.closedShort': 'Closed today',
  },
};

let LANG = localStorage.getItem('sj_lang') || 'zh';

/** 取词 */
function t(key){
  return (I18N[LANG] && I18N[LANG][key]) ?? I18N.zh[key] ?? key;
}

/** 币种：一律澳币 */
const CURRENCY = 'AUD';
function fmtMoney(n){
  return 'A$' + Number(n || 0).toFixed(2);
}

/** 状态码 -> 当前语言 */
function tStatus(s){ return t('st.' + s); }

/** 把带 data-i18n 的元素刷一遍 */
function applyLang(root = document){
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'en';
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const v = t(el.dataset.i18n);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = v;
    else el.textContent = v;
  });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  const btn = document.getElementById('langBtn');
  if (btn) btn.textContent = t('lang.switch');
}

/** 切换语言：全站刷新一次可见文本 */
function setLang(lang){
  LANG = (lang === 'en') ? 'en' : 'zh';
  localStorage.setItem('sj_lang', LANG);
  applyLang();
  if (typeof renderMenu === 'function') renderMenu();
  if (typeof syncCart === 'function') syncCart();
  if (typeof renderAdmin === 'function' && !document.getElementById('admin').hidden) renderAdmin();
}

function toggleLang(){ setLang(LANG === 'zh' ? 'en' : 'zh'); }
