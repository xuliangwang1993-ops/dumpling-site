/**
 * 建表：把 schema.sql 跑进 DATABASE_URL 指向的库。
 * 幂等，可以重复跑（schema.sql 里全是 IF NOT EXISTS / ON CONFLICT）。
 *
 *   DATABASE_URL=postgres://... node migrate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlFile = path.join(__dirname, 'schema.sql');

if (!process.env.DATABASE_URL) {
  console.error('缺 DATABASE_URL');
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, 'utf8');
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});

try {
  await client.connect();
  await client.query(sql);
  const { rows } = await client.query('SELECT count(*)::int AS n FROM menu_items');
  console.log(`✅ schema 已应用，菜单 ${rows[0].n} 项`);
} catch (e) {
  console.error('❌ 失败:', e.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
