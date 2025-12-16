const pg = require('pg');

// Baza locală PostgreSQL (Render)
const localPool = new pg.Pool({
  connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
});

async function checkSalaryData() {
  try {
    console.log('🔍 Verificare date salarii în expenditures_sync...\n');
    
    // Verifică totalul de salarii
    const totalResult = await localPool.query(`
      SELECT 
        COUNT(*) as total_count,
        SUM(amount) as total_amount,
        MIN(operational_date) as min_date,
        MAX(operational_date) as max_date
      FROM expenditures_sync
      WHERE department_name = 'Salarii'
        AND operational_date >= '2025-01-01'
    `);
    
    console.log('📊 Total Salarii (2025):');
    console.log('   Count:', totalResult.rows[0].total_count);
    console.log('   Total Amount:', totalResult.rows[0].total_amount);
    console.log('   Date Range:', totalResult.rows[0].min_date, 'to', totalResult.rows[0].max_date);
    console.log('');
    
    // Verifică pe locații
    const byLocationResult = await localPool.query(`
      SELECT 
        location_name,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenditures_sync
      WHERE department_name = 'Salarii'
        AND operational_date >= '2025-01-01'
      GROUP BY location_name
      ORDER BY total_amount DESC
    `);
    
    console.log('📍 Salarii pe locații (2025):');
    byLocationResult.rows.forEach(row => {
      console.log(`   ${row.location_name}: ${row.count} înregistrări, ${row.total_amount} RON`);
    });
    console.log('');
    
    // Verifică tipurile de cheltuială
    const byTypeResult = await localPool.query(`
      SELECT 
        expenditure_type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenditures_sync
      WHERE department_name = 'Salarii'
        AND operational_date >= '2025-01-01'
      GROUP BY expenditure_type
      ORDER BY total_amount DESC
    `);
    
    console.log('📋 Salarii pe tipuri de cheltuială (2025):');
    byTypeResult.rows.forEach(row => {
      console.log(`   ${row.expenditure_type}: ${row.count} înregistrări, ${row.total_amount} RON`);
    });
    console.log('');
    
    // Verifică datele recente
    const recentResult = await localPool.query(`
      SELECT 
        operational_date,
        location_name,
        expenditure_type,
        amount,
        data_source
      FROM expenditures_sync
      WHERE department_name = 'Salarii'
        AND operational_date >= '2025-12-01'
      ORDER BY operational_date DESC, location_name
      LIMIT 20
    `);
    
    console.log('📅 Ultimele 20 înregistrări de salarii (decembrie 2025):');
    recentResult.rows.forEach(row => {
      console.log(`   ${row.operational_date} | ${row.location_name} | ${row.expenditure_type} | ${row.amount} RON | ${row.data_source}`);
    });
    console.log('');
    
    // Verifică dacă există date cu location_name NULL sau empty
    const nullLocationResult = await localPool.query(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenditures_sync
      WHERE department_name = 'Salarii'
        AND operational_date >= '2025-01-01'
        AND (location_name IS NULL OR location_name = '' OR location_name = 'Unknown')
    `);
    
    console.log('⚠️ Salarii cu location_name NULL/empty/Unknown (2025):');
    console.log(`   Count: ${nullLocationResult.rows[0].count}`);
    console.log(`   Total Amount: ${nullLocationResult.rows[0].total_amount}`);
    console.log('');
    
    await localPool.end();
    
  } catch (err) {
    console.error('❌ EROARE:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

checkSalaryData();
