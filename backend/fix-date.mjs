import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot?ssl=true' });

async function run() {
  const res = await pool.query("SELECT id, cvt_number, cvt_series, expiry_date FROM metrology WHERE cvt_series = 'IC_ROM.SFX.1001.01#132' OR cvt_number = 'IC_ROM.SFX.1001.01#132'");
  console.log("Found rows:", res.rows);

  if (res.rows.length > 0) {
    await pool.query("UPDATE metrology SET cvt_date = '2025-11-19', expiry_date = '2026-11-18' WHERE cvt_series = 'IC_ROM.SFX.1001.01#132' OR cvt_number = 'IC_ROM.SFX.1001.01#132'");
    console.log("Updated all rows for this CVT.")
  }
  process.exit(0);
}
run();
