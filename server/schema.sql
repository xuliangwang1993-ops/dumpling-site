-- ============================================================
-- 三鲜手作 · 数据库结构
-- 目标：Postgres 14+（Render 新库直接跑这个文件即可）
-- ============================================================

-- ---------- 菜单 ----------
-- 价格只信这里。客户端传上来的价格一律忽略，服务端按 id 重算。
CREATE TABLE IF NOT EXISTS menu_items (
  id          text PRIMARY KEY,              -- 'sj01'
  tag         text,
  name        text NOT NULL,
  descr       text,
  price       numeric(10,2) NOT NULL CHECK (price >= 0),
  img         text,
  active      boolean NOT NULL DEFAULT true,
  sort        int NOT NULL DEFAULT 0
);

INSERT INTO menu_items (id, tag, name, descr, price, img, sort) VALUES
  ('sj01','招牌','三鲜水饺','虾仁、猪肉、韭菜。三点鲜，一张皮。',      38,'assets/dumpling-1.jpg',1),
  ('sj02','经典','猪肉白菜','白菜杀过水，脆而不生。',                  32,'assets/dumpling-2.jpg',2),
  ('sj03','素馅','韭菜鸡蛋','土鸡蛋炒散，韭香不冲。',                  30,'assets/dumpling-3.jpg',3),
  ('sj04','时令','整只虾仁','一只饺子里放一整只虾。',                  52,'assets/dumpling-4.jpg',4),
  ('sj05','重口','牛肉胡萝卜','牛霖手剁，胡萝卜回甜。',                44,'assets/dumpling-5.jpg',5),
  ('sj06','清淡','素三鲜','木耳、香菇、粉丝。不含肉。',                30,'assets/dumpling-6.jpg',6)
ON CONFLICT (id) DO UPDATE SET
  tag = EXCLUDED.tag, name = EXCLUDED.name, descr = EXCLUDED.descr,
  price = EXCLUDED.price, img = EXCLUDED.img, sort = EXCLUDED.sort;

-- ---------- 配送规则 ----------
CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);
INSERT INTO settings (key, value) VALUES
  ('delivery_fee', '8'),
  ('free_over',    '99'),
  ('closed',       'false')      -- 'true' = 打烊，不接单
ON CONFLICT (key) DO NOTHING;

-- ---------- 订单 ----------
CREATE TABLE IF NOT EXISTS orders (
  id            bigserial PRIMARY KEY,
  order_no      text UNIQUE NOT NULL,
  name          text NOT NULL,
  phone         text NOT NULL,
  address       text NOT NULL,
  slot          text,
  note          text,
  subtotal      numeric(10,2) NOT NULL DEFAULT 0,
  delivery_fee  numeric(10,2) NOT NULL DEFAULT 0,
  amount        numeric(10,2) NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT '待确认'
                CHECK (status IN ('待确认','包制中','配送中','已完成','已取消')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_phone      ON orders (phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);

CREATE TABLE IF NOT EXISTS order_items (
  id        bigserial PRIMARY KEY,
  order_id  bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dish_id   text NOT NULL,
  name      text NOT NULL,
  qty       int  NOT NULL CHECK (qty > 0 AND qty <= 99),
  price     numeric(10,2) NOT NULL            -- 下单当时的价格快照
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

-- ---------- 订单号序列（按天）----------
CREATE TABLE IF NOT EXISTS order_seq (
  day   date PRIMARY KEY,
  last  int  NOT NULL DEFAULT 0
);

-- 原子取下一个订单号：SJ20261016-0001
CREATE OR REPLACE FUNCTION next_order_no() RETURNS text AS $$
DECLARE
  d date := (now() AT TIME ZONE 'Australia/Sydney')::date;
  n int;
BEGIN
  INSERT INTO order_seq (day, last) VALUES (d, 1)
  ON CONFLICT (day) DO UPDATE SET last = order_seq.last + 1
  RETURNING last INTO n;
  RETURN 'SJ' || to_char(d, 'YYYYMMDD') || '-' || lpad(n::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ---------- 客户汇总视图 ----------
-- 名字取「最近一次下单用的名字」
CREATE OR REPLACE VIEW customers AS
SELECT DISTINCT ON (phone)
       phone,
       name,
       count(*)      OVER (PARTITION BY phone) AS orders_count,
       sum(amount)   OVER (PARTITION BY phone) AS total_amount,
       max(created_at) OVER (PARTITION BY phone) AS last_at
FROM orders
ORDER BY phone, created_at DESC;

-- ---------- 打烊时禁止下单（服务端也会再查一次）----------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_touch ON orders;
CREATE TRIGGER trg_orders_touch BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
