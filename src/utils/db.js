import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payroll_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true
});

async function testConnection() {
    const conn = await pool.getConnection();
    try {
        await conn.ping();
        console.log('MySQL connected');
    } finally {
        conn.release();
    }
}

async function query(sql, params) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

export default { pool, query, testConnection };