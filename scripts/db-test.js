import 'dotenv/config';
import db from '../src/utils/db.js';

try {
  const rows = await db.query('SELECT 1 AS ok');
  console.log('DB connection OK:', rows);
  process.exit(0);
} catch (err) {
  console.error('DB connection failed:', err.message);
  process.exit(1);
}
