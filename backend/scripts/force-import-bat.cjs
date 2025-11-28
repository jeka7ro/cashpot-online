const pg = require('pg');

// Baza locală PostgreSQL (Render)
const localPool = new pg.Pool({
  connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false },
  max: 5
});

// Baza externă BAT
const externalPool = new pg.Pool({
  host: '82.76.35.50',
  port: 26257,
  database: 'cashpot',
  user: 'cashpot',
  password: 'Jeka7Ro$',
  ssl: false
});

async function importAll() {
  try {
    console.log('🔄 Conectare la bazele de date...');
    
    // Test conexiune externă
    const testExt = await externalPool.query('SELECT COUNT(*) as cnt FROM public.casino_payments WHERE is_deleted = false');
    console.log('✅ Conexiune externă OK! Total înregistrări:', testExt.rows[0].cnt);
    
    // Fetch TOATE datele din BAT
    console.log('📥 Se preiau datele din BAT...');
    const extResult = await externalPool.query(`
      SELECT 
        l.name as location_name,
        d.name as department_name,
        et.name as expenditure_type,
        p.amount,
        p.operational_date,
        p.id as payment_id
      FROM public.casino_payments p
      LEFT JOIN public.casino_locations l ON p.location_id = l.id
      LEFT JOIN public.casino_departments d ON p.department_id = d.id
      LEFT JOIN public.casino_expenditure_types et ON p.expenditure_type_id = et.id
      WHERE p.is_deleted = false
      ORDER BY p.operational_date DESC
    `);
    
    const totalRows = extResult.rows.length;
    console.log('✅ Fetchat', totalRows, 'înregistrări din BAT');
    
    // BATCH INSERT - 500 la un INSERT
    console.log('📤 Se inserează în expenditures_sync (batch mode)...');
    
    const BATCH_SIZE = 500;
    let inserted = 0;
    let processed = 0;
    
    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
      const batch = extResult.rows.slice(i, i + BATCH_SIZE);
      
      // Construiește VALUES pentru batch
      const values = [];
      const placeholders = [];
      let paramIndex = 1;
      
      for (const row of batch) {
        placeholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, 'bat')`);
        values.push(
          row.location_name || 'Nespecificat',
          row.department_name || 'Nespecificat',
          row.expenditure_type || 'Nespecificat',
          row.amount || 0,
          row.operational_date
        );
        paramIndex += 5;
      }
      
      try {
        const result = await localPool.query(`
          INSERT INTO expenditures_sync (
            location_name, department_name, expenditure_type, amount, operational_date, data_source
          ) VALUES ${placeholders.join(', ')}
          ON CONFLICT (operational_date, amount, location_name, department_name, expenditure_type, data_source) 
          DO NOTHING
        `, values);
        
        inserted += result.rowCount || 0;
        processed += batch.length;
        
        console.log(`  Batch ${Math.ceil((i + BATCH_SIZE) / BATCH_SIZE)}: ${processed}/${totalRows} (inserări noi: ${inserted})`);
        
      } catch (e) {
        console.error('Eroare batch:', e.message);
        processed += batch.length;
      }
    }
    
    console.log('');
    console.log('========================================');
    console.log('✅ IMPORT COMPLET!');
    console.log('   Total procesat:', processed);
    console.log('   Inserări noi:', inserted);
    console.log('   Duplicate (skip):', processed - inserted);
    console.log('========================================');
    
    await localPool.end();
    await externalPool.end();
    
  } catch (err) {
    console.error('❌ EROARE:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

importAll();
