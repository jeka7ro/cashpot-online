import pg from 'pg';
const { Pool } = pg;
const pool = new Pool();

async function run() {
  await pool.query(
    `UPDATE metrology SET cvt_date = '2025-11-19', expiry_date = '2026-11-18' WHERE id = 29`
  );
  console.log("Fixed.");
  process.exit(0);
}
run();
