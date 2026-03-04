import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot?ssl=true' });

async function run() {
  await pool.query("UPDATE metrology SET expiry_date = '2025-03-03' WHERE id = 29");
  console.log("Updated record: 29");
  process.exit(0);
}
run();
