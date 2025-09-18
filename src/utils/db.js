import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
  user: process.env.PGUSER || process.env.DB_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.PGDATABASE || process.env.DB_NAME || 'payroll_db',
  max: 10
});

function prepareQuery(sql, params) {
  if (params == null) return { text: sql, values: [] };

  // Array params: convert ? -> $1, $2, ...
  if (Array.isArray(params)) {
    let i = 0;
    const text = String(sql).replace(/\?/g, () => `$${++i}`);
    return { text, values: params };
  }

  // Object params: convert :name -> $1 (stable per name)
  if (typeof params === 'object') {
    const values = [];
    const nameToIndex = new Map();
    let i = 0;
    const text = String(sql).replace(/:(\w+)/g, (_, name) => {
      if (!(name in params)) {
        throw new Error(`Missing parameter: ${name}`);
      }
      if (!nameToIndex.has(name)) {
        nameToIndex.set(name, ++i);
        values.push(params[name]);
        return `$${i}`;
      }
      return `$${nameToIndex.get(name)}`;
    });
    return { text, values };
  }

  return { text: sql, values: [] };
}

async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    console.log('PostgreSQL connected');
  } finally {
    client.release();
  }
}

async function query(sql, params) {
  const { text, values } = prepareQuery(sql, params);
  const first = String(sql).trim().split(/\s+/)[0].toLowerCase();
  const res = await pool.query(text, values);

  if (first === 'select' || first === 'with') {
    return res.rows;
  }
  if (first === 'insert') {
    const insertId = res?.rows?.[0]?.id ?? null;
    return { insertId, affectedRows: res.rowCount };
  }
  if (first === 'update' || first === 'delete') {
    return { affectedRows: res.rowCount };
  }
  return res.rows;
}

export default { pool, query, testConnection };
