import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot?ssl=true' });

async function run() {
  await pool.query("UPDATE metrology SET cvt_date = '2025-11-19', expiry_date = '2026-11-18' WHERE id = 29");
  console.log("Updated DB");
  process.exit(0);
}
run();
