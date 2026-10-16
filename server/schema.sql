-- ============================================================
-- 三鲜手作 · 数据库结构（v2：双语 + 澳币）
-- 幂等：可以反复执行
-- ============================================================

-- ---------- 菜单 ----------
CREATE TABLE IF NOT EXISTS menu_items (
  id          text PRIMARY KEY,              -- 'sj01'
  tag         text,                          -- 中文标签
  name        text NOT NULL,                 -- 中文名
  descr       text,
  tag_en      text,                          -- 英文标签
  name_en     text,
  descr_en    text,
  price       numeric(10,2) NOT NULL CHECK (price >= 0),   -- 澳币
  img         text,
  active      boolean NOT NULL DEFAULT true,
  sort        int NOT NULL DEFAULT 0
);

-- 老库补列
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS tag_en   text;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS name_en  text;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS descr_en text;

-- 价格全部为澳币（AUD）
INSERT INTO menu_items (id, tag, name, descr, tag_en, name_en, descr_en, price, img, sort) VALUES
  ('sj01','招牌','三鲜水饺','虾仁、猪肉、韭菜。三点鲜，一张皮。',
          'Signature','Three-Fresh','Prawn, pork and chive. Three kinds of fresh, one wrapper.',13.90,'assets/dumpling-1.jpg',1),
  ('sj02','经典','猪肉白菜','白菜杀过水，脆而不生。',
          'Classic','Pork & Cabbage','Cabbage salted and drained — crisp, never raw.',11.90,'assets/dumpling-2.jpg',2),
  ('sj03','素馅','韭菜鸡蛋','土鸡蛋炒散，韭香不冲。',
          'Veg','Chive & Egg','Free-range eggs scrambled soft; chive that doesn''t bite back.',10.90,'assets/dumpling-3.jpg',3),
  ('sj04','时令','整只虾仁','一只饺子里放一整只虾。',
          'Seasonal','Whole Prawn','One whole prawn in every dumpling.',18.90,'assets/dumpling-4.jpg',4),
  ('sj05','重口','牛肉胡萝卜','牛霖手剁，胡萝卜回甜。',
          'Hearty','Beef & Carrot','Hand-chopped beef knuckle, carrot for sweetness.',15.90,'assets/dumpling-5.jpg',5),
  ('sj06','清淡','素三鲜','木耳、香菇、粉丝。不含肉。',
          'Light','Vegetarian','Wood ear, shiitake and glass noodles. No meat.',10.90,'assets/dumpling-6.jpg',6)
ON CONFLICT (id) DO UPDATE SET
  tag = EXCLUDED.tag, name = EXCLUDED.name, descr = EXCLUDED.descr,
  tag_en = EXCLUDED.tag_en, name_en = EXCLUDED.name_en, descr_en = EXCLUDED.descr_en,
  price = EXCLUDED.price, img = EXCLUDED.img, sort = EXCLUDED.sort;

-- ---------- 设置 ----------
CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);
INSERT INTO settings (key, value) VALUES
  ('delivery_fee', '5'),      -- 澳币
  ('free_over',    '49'),     -- 满 49 澳币免配送
  ('currency',     'AUD'),
  ('closed',       'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  WHERE settings.key IN ('delivery_fee','free_over','currency');

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
  currency      text NOT NULL DEFAULT 'AUD',
  status        text NOT NULL DEFAULT '待确认'
                CHECK (status IN ('待确认','包制中','配送中','已完成','已取消')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'AUD';

CREATE INDEX IF NOT EXISTS idx_orders_phone      ON orders (phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);

CREATE TABLE IF NOT EXISTS order_items (
  id        bigserial PRIMARY KEY,
  order_id  bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dish_id   text NOT NULL,
  name      text NOT NULL,
  qty       int  NOT NULL CHECK (qty > 0 AND qty <= 99),
  price     numeric(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

-- ---------- 订单号（按悉尼日期）----------
CREATE TABLE IF NOT EXISTS order_seq (
  day   date PRIMARY KEY,
  last  int  NOT NULL DEFAULT 0
);

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

-- ---------- 客户视图 ----------
CREATE OR REPLACE VIEW customers AS
SELECT DISTINCT ON (phone)
       phone,
       name,
       count(*)        OVER (PARTITION BY phone) AS orders_count,
       sum(amount)     OVER (PARTITION BY phone) AS total_amount,
       max(created_at) OVER (PARTITION BY phone) AS last_at
FROM orders
ORDER BY phone, created_at DESC;

-- ---------- updated_at ----------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_touch ON orders;
CREATE TRIGGER trg_orders_touch BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
