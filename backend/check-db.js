import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot?ssl=true' });

async function run() {
  const res = await pool.query("SELECT id, cvt_number, cvt_date, expiry_date FROM metrology WHERE cvt_number = 'IC_ROM.SFX.1001.01#132'");
  console.log(res.rows);
  process.exit(0);
}
run();
