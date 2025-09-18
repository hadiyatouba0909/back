import 'dotenv/config';
import { readFile } from 'fs/promises';
import db from '../src/utils/db.js';

async function runFile(path) {
  const sql = await readFile(path, 'utf8');
  await db.pool.query(sql);
}

try {
  console.log('Applying PostgreSQL schema...');
  await runFile(new URL('../db/schema.pg.sql', import.meta.url));
  console.log('Schema applied');

  console.log('Seeding data...');
  await runFile(new URL('../db/seed.pg.sql', import.meta.url));
  console.log('Seed applied');

  process.exit(0);
} catch (err) {
  console.error('DB setup failed:', err.message);
  process.exit(1);
}
