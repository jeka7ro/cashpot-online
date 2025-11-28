import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  console.log('=== ELECTRIC_INVOICES_NLC (ACUM CORECT!) ===');
  const nlc = await pool.query('SELECT nlc_code, location_name, suma_totala, consum_kwh, pret_per_kwh, perioada_facturare FROM electric_invoices_nlc ORDER BY extracted_at DESC LIMIT 8');
  console.table(nlc.rows);
  
  console.log('\n=== EXPENDITURES_SYNC (last 10 with electric) ===');
  const exp = await pool.query(`SELECT id, operational_date, amount, location_name, department_name, expenditure_type, description FROM expenditures_sync WHERE description ILIKE '%electric%' OR description ILIKE '%nlc%' OR description ILIKE '%kwh%' ORDER BY created_at DESC LIMIT 10`);
  console.table(exp.rows);
  
  console.log('\n=== EXPENDITURES_SYNC (last 10) ===');
  const exp2 = await pool.query(`SELECT id, operational_date, amount, location_name, department_name, description FROM expenditures_sync ORDER BY created_at DESC LIMIT 10`);
  console.table(exp2.rows);
  
  pool.end();
}
check();
