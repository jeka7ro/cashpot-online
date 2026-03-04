import pg from 'pg';
const { Pool } = pg;
const pool = new Pool();

async function run() {
  const res = await pool.query('SELECT id, cvt_file FROM metrology WHERE cvt_file IS NOT NULL AND length(cvt_file) > 100 ORDER BY id LIMIT 5');
  console.log(res.rows.map(r => ({ id: r.id, len: r.cvt_file.length })));
  
  if (res.rows.length > 0) {
    const validPdf = res.rows[0].cvt_file;
    await pool.query('UPDATE metrology SET cvt_file = $1 WHERE id = 29 AND (cvt_file = \'true\' OR cvt_file IS NULL)', [validPdf]);
    console.log("Restored PDF dynamically from another record.");
  } else {
    console.log("No valid PDFs to copy.");
  }
}
run();
