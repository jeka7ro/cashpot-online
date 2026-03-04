import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot?ssl=true' });

async function run() {
  const res = await pool.query("SELECT id, cvt_file FROM metrology WHERE id = 29");
  console.log("cvt_file prefix:", res.rows[0]?.cvt_file?.substring(0, 100));
  process.exit(0);
}
run();
