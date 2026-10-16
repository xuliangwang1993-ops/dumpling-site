/**
 * 三鲜手作 · 订单与客户管理 API
 * 零框架：只用 node:http + pg。部署到 Render Web Service。
 *
 * 环境变量：
 *   DATABASE_URL      Render Postgres 内部连接串（自动注入）
 *   ADMIN_TOKEN       管理接口令牌，自己设一个长随机串
 *   ALLOWED_ORIGINS   允许的前端来源，逗号分隔
 *   PORT              Render 自动注入
 */
import http from 'node:http';
import crypto from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;

const PORT = process.env.PORT || 10000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://sanxian-shouzuo.onrender.com')
  .split(',').map(s => s.trim()).filter(Boolean);

if (!process.env.DATABASE_URL) {
  console.error('缺 DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  max: 5,
});

/* ---------------- 工具 ---------------- */

const json = (res, code, data, extra = {}) => {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extra,
  });
  res.end(body);
};

function cors(req, res) {
  const origin = req.headers.origin || '';
  if (ORIGINS.includes(origin) || ORIGINS.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Token');
  res.setHeader('Access-Control-Max-Age', '86400');
}

async function readBody(req, limit = 32 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error('body too large');
    chunks.push(c);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** 定长比较，避免时序侧信道 */
function tokenOk(req) {
  if (!ADMIN_TOKEN) return false;
  const got = String(req.headers['x-admin-token'] || '');
  const a = Buffer.from(got), b = Buffer.from(ADMIN_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** 下单频率限制：每个 IP 每分钟最多 6 单 */
const hits = new Map();
function rateLimit(ip, max = 6, windowMs = 60_000) {
  const now = Date.now();
  const rec = hits.get(ip) || { n: 0, t: now };
  if (now - rec.t > windowMs) { rec.n = 0; rec.t = now; }
  rec.n += 1;
  hits.set(ip, rec);
  if (hits.size > 5000) hits.clear();
  return rec.n <= max;
}

const PHONE = /^[0-9+\- ]{6,20}$/;

/* ---------------- 业务 ---------------- */

async function getSettings(client) {
  const { rows } = await client.query('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

async function createOrder(input, ip) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const st = await getSettings(client);
    if (st.closed === 'true') {
      await client.query('ROLLBACK');
      return { error: '今日已打烊', code: 409 };
    }

    const name = String(input.name || '').trim().slice(0, 40);
    const phone = String(input.phone || '').trim().slice(0, 20);
    const address = String(input.address || '').trim().slice(0, 200);
    const slot = String(input.slot || '尽快（约 2 小时）').slice(0, 40);
    const note = String(input.note || '').slice(0, 200);

    if (!name || !phone || !address) { await client.query('ROLLBACK'); return { error: '姓名/电话/地址必填', code: 400 }; }
    if (!PHONE.test(phone)) { await client.query('ROLLBACK'); return { error: '电话格式不对', code: 400 }; }

    const items = Array.isArray(input.items) ? input.items : [];
    if (!items.length) { await client.query('ROLLBACK'); return { error: '购物车是空的', code: 400 }; }

    // 价格一律以库里的为准，不听客户端的
    const ids = [...new Set(items.map(i => String(i.id || '')))].filter(Boolean);
    if (!ids.length) { await client.query('ROLLBACK'); return { error: '没有有效的菜品', code: 400 }; }
    const { rows: menu } = await client.query(
      'SELECT id, name, price FROM menu_items WHERE active AND id = ANY($1)', [ids]
    );
    const byId = new Map(menu.map(m => [m.id, m]));

    let subtotal = 0;
    const lines = [];
    for (const it of items) {
      const m = byId.get(String(it.id || ''));
      if (!m) continue;
      const qty = Math.max(1, Math.min(99, parseInt(it.qty, 10) || 1));
      const price = Number(m.price);
      subtotal += price * qty;
      lines.push({ id: m.id, name: m.name, qty, price });
    }
    if (!lines.length) { await client.query('ROLLBACK'); return { error: '没有有效的菜品', code: 400 }; }

    const fee = subtotal >= Number(st.free_over) ? 0 : Number(st.delivery_fee);
    const amount = subtotal + fee;

    const { rows: [{ next_order_no: orderNo }] } = await client.query('SELECT next_order_no()');

    const cur = st.currency || 'AUD';
    const { rows: [o] } = await client.query(
      `INSERT INTO orders (order_no,name,phone,address,slot,note,subtotal,delivery_fee,amount,currency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, order_no, amount, currency, created_at`,
      [orderNo, name, phone, address, slot, note, subtotal, fee, amount, cur]
    );
    for (const l of lines) {
      await client.query(
        'INSERT INTO order_items (order_id,dish_id,name,qty,price) VALUES ($1,$2,$3,$4,$5)',
        [o.id, l.id, l.name, l.qty, l.price]
      );
    }
    await client.query('COMMIT');
    return { order: { ...o, items: lines, subtotal, delivery_fee: fee, status: '待确认' } };
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/* ---------------- 路由 ---------------- */

const server = http.createServer(async (req, res) => {
  cors(req, res);
  const url = new URL(req.url, 'http://x');
  const p = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
          || req.socket.remoteAddress || '?';

  try {
    /* ---- 公开 ---- */
    if (p === '/api/health') {
      const { rows } = await pool.query('SELECT now() AS t');
      return json(res, 200, { ok: true, db: rows[0].t });
    }

    if (p === '/api/menu' && req.method === 'GET') {
      const { rows } = await pool.query(
        `SELECT id, tag, name, descr, tag_en, name_en, descr_en, price, img
           FROM menu_items WHERE active ORDER BY sort, id`
      );
      const st = await getSettings(pool);
      return json(res, 200, {
        items: rows.map(r => ({
          id: r.id,
          price: Number(r.price),
          img: r.img,
          // 两种语言都给，前端按当前语言挑
          zh: { tag: r.tag, name: r.name, descr: r.descr },
          en: { tag: r.tag_en, name: r.name_en, descr: r.descr_en },
        })),
        delivery_fee: Number(st.delivery_fee),
        free_over: Number(st.free_over),
        currency: st.currency || 'AUD',
        closed: st.closed === 'true',
      });
    }

    if (p === '/api/orders' && req.method === 'POST') {
      if (!rateLimit(ip)) return json(res, 429, { error: '下单太频繁，稍后再试' });
      let body;
      try { body = await readBody(req); } catch { return json(res, 400, { error: '请求体不合法' }); }
      const out = await createOrder(body, ip);
      if (out.error) return json(res, out.code, { error: out.error });
      return json(res, 201, out.order);
    }

    /* ---- 管理（需要 X-Admin-Token）---- */
    if (p.startsWith('/api/orders') || p === '/api/customers' || p === '/api/stats' || p === '/api/settings') {
      if (!tokenOk(req)) return json(res, 401, { error: '未授权' });

      if (p === '/api/orders' && req.method === 'GET') {
        const limit = Math.min(200, parseInt(url.searchParams.get('limit'), 10) || 50);
        const status = url.searchParams.get('status');
        const q = (url.searchParams.get('q') || '').trim();
        const args = [];
        const where = [];
        if (status) { args.push(status); where.push(`o.status = $${args.length}`); }
        if (q) { args.push(`%${q}%`); where.push(`(o.name ILIKE $${args.length} OR o.phone ILIKE $${args.length} OR o.order_no ILIKE $${args.length})`); }
        args.push(limit);
        const { rows } = await pool.query(
          `SELECT o.id,o.order_no,o.name,o.phone,o.address,o.slot,o.note,o.amount,o.status,o.created_at,
                  COALESCE(json_agg(json_build_object('name',i.name,'qty',i.qty,'price',i.price))
                           FILTER (WHERE i.id IS NOT NULL), '[]') AS items
           FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
           ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
           GROUP BY o.id ORDER BY o.created_at DESC LIMIT $${args.length}`,
          args
        );
        return json(res, 200, { orders: rows });
      }

      const m = p.match(/^\/api\/orders\/(\d+)$/);
      if (m && req.method === 'PATCH') {
        let body;
        try { body = await readBody(req); } catch { return json(res, 400, { error: '请求体不合法' }); }
        const ALLOWED = ['待确认', '包制中', '配送中', '已完成', '已取消'];
        if (!ALLOWED.includes(body.status)) return json(res, 400, { error: '状态不合法' });
        const { rows } = await pool.query(
          'UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, order_no, status',
          [body.status, m[1]]
        );
        if (!rows.length) return json(res, 404, { error: '订单不存在' });
        return json(res, 200, rows[0]);
      }

      if (p === '/api/customers') {
        const { rows } = await pool.query(
          'SELECT phone, name, orders_count, total_amount, last_at FROM customers ORDER BY total_amount DESC LIMIT 500'
        );
        return json(res, 200, { customers: rows });
      }

      if (p === '/api/stats') {
        // 注意：created_at 是 timestamptz，直接 ::date 会按服务器时区(UTC)算，
        // 跟悉尼的「今天」对不上。两边都先转到悉尼时区再比。
        const { rows: [s] } = await pool.query(`
          SELECT
            (SELECT count(*) FROM orders
              WHERE (created_at AT TIME ZONE 'Australia/Sydney')::date = (now() AT TIME ZONE 'Australia/Sydney')::date) AS today_orders,
            (SELECT COALESCE(sum(amount),0) FROM orders
              WHERE (created_at AT TIME ZONE 'Australia/Sydney')::date = (now() AT TIME ZONE 'Australia/Sydney')::date) AS today_revenue,
            (SELECT count(DISTINCT phone) FROM orders) AS customers,
            (SELECT count(*) FROM orders WHERE status NOT IN ('已完成','已取消')) AS pending,
            (SELECT COALESCE(sum(amount),0) FROM orders) AS total_revenue,
            (SELECT COALESCE((SELECT value FROM settings WHERE key='currency'),'AUD')) AS currency
        `);
        return json(res, 200, s);
      }

      if (p === '/api/settings') {
        if (req.method === 'GET') {
          const st = await getSettings(pool);
          return json(res, 200, st);
        }
        if (req.method === 'PATCH') {
          let body;
          try { body = await readBody(req); } catch { return json(res, 400, { error: '请求体不合法' }); }
          for (const k of ['delivery_fee', 'free_over', 'closed']) {
            if (body[k] !== undefined) {
              await pool.query(
                'INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
                [k, String(body[k])]
              );
            }
          }
          return json(res, 200, await getSettings(pool));
        }
      }
    }

    json(res, 404, { error: 'not found' });
  } catch (e) {
    console.error('[error]', e.message);
    json(res, 500, { error: '服务器错误' });
  }
});

/* Render 会在 SIGTERM 时给你 30 秒 */
const stop = async () => { try { await pool.end(); } catch {}; server.close(() => process.exit(0)); };
process.on('SIGTERM', stop);
process.on('SIGINT', stop);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`listen ${PORT}  origins=${ORIGINS.join('|')}  adminToken=${ADMIN_TOKEN ? 'set' : 'NOT SET'}`);
});
