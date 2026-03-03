const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query('SELECT count(*) FROM metrology');
    console.log('Metrology count in DB:', res.rows[0].count);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
