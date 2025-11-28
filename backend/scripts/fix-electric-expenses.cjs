const pg = require('pg');
const pool = new pg.Pool({
  connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
});

async function fixExpenses() {
  console.log('🔧 Inserez cheltuielile Electricitate cu sumele TOTALE (activă + reactivă)...');
  
  // Ia toate NLC-urile din centralizator
  const nlcs = await pool.query(`
    SELECT 
      nlc_code,
      location_name,
      suma_totala,
      consum_kwh,
      perioada_facturare,
      numar_factura
    FROM electric_invoices_nlc
    WHERE suma_totala > 0
  `);
  
  console.log(`📊 Găsite ${nlcs.rows.length} NLC-uri de procesat`);
  
  let inserted = 0;
  let skipped = 0;
  
  for (const nlc of nlcs.rows) {
    // Parsează perioada pentru a obține luna/anul
    const periodMatch = (nlc.perioada_facturare || '').match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!periodMatch) {
      console.log(`   ⚠️ Skip NLC ${nlc.nlc_code} - perioadă invalidă: ${nlc.perioada_facturare}`);
      skipped++;
      continue;
    }
    
    const month = parseInt(periodMatch[2]);
    const year = parseInt(periodMatch[3]);
    const operationalDate = `${year}-${String(month).padStart(2, '0')}-01`;
    
    // Normalizează locația (păstrează diacriticele pentru Pitești)
    let locationName = nlc.location_name || 'N/A';
    
    // Verifică dacă există deja
    const existing = await pool.query(`
      SELECT id FROM expenditures_sync
      WHERE department_name = 'Electricitate'
      AND location_name = $1
      AND operational_date = $2
      AND ABS(amount - $3) < 0.01
      LIMIT 1
    `, [locationName, operationalDate, nlc.suma_totala]);
    
    if (existing.rows.length > 0) {
      console.log(`   ⏭️ Skip NLC ${nlc.nlc_code} - există deja`);
      skipped++;
      continue;
    }
    
    // Inserează
    await pool.query(`
      INSERT INTO expenditures_sync (
        operational_date,
        amount,
        location_name,
        department_name,
        expenditure_type,
        description,
        data_source,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      operationalDate,
      nlc.suma_totala,
      locationName,
      'Electricitate',
      'Factură Reală',
      `NLC ${nlc.nlc_code} - Factură ${nlc.numar_factura || 'N/A'} - Perioadă: ${nlc.perioada_facturare} - Consum: ${nlc.consum_kwh || 0} kWh (TOTAL activă+reactivă)`,
      'electric_invoice'
    ]);
    
    console.log(`   ✅ NLC ${nlc.nlc_code}: ${locationName} - ${parseFloat(nlc.suma_totala).toFixed(2)} RON (${month}/${year})`);
    inserted++;
  }
  
  console.log(`\n========================================`);
  console.log(`✅ COMPLET: ${inserted} inserări noi, ${skipped} skip`);
  
  // Verifică totalul
  const total = await pool.query(`
    SELECT SUM(amount) as total
    FROM expenditures_sync
    WHERE department_name = 'Electricitate'
    AND operational_date >= '2024-07-01'
    AND operational_date <= '2024-07-31'
  `);
  
  console.log(`📊 Total Electricitate Iulie 2024: ${parseFloat(total.rows[0].total || 0).toFixed(2)} RON`);
  
  await pool.end();
}

fixExpenses().catch(err => {
  console.error('❌ Eroare:', err);
  pool.end();
});

