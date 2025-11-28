const pg = require('pg');

// Baza locală PostgreSQL (Render)
const localPool = new pg.Pool({
  connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
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
    
    console.log('✅ Fetchat', extResult.rows.length, 'înregistrări din BAT');
    
    // Insert în expenditures_sync (skip duplicates)
    console.log('📤 Se inserează în expenditures_sync...');
    
    let inserted = 0;
    let duplicates = 0;
    let errors = 0;
    
    for (const row of extResult.rows) {
      try {
        const result = await localPool.query(`
          INSERT INTO expenditures_sync (
            location_name, department_name, expenditure_type, amount, operational_date, data_source
          ) VALUES ($1, $2, $3, $4, $5, 'bat')
          ON CONFLICT (location_name, department_name, expenditure_type, amount, operational_date) 
          DO NOTHING
          RETURNING id
        `, [
          row.location_name || 'Nespecificat',
          row.department_name || 'Nespecificat', 
          row.expenditure_type || 'Nespecificat',
          row.amount || 0,
          row.operational_date
        ]);
        
        if (result.rowCount > 0) {
          inserted++;
        } else {
          duplicates++;
        }
        
        if ((inserted + duplicates) % 5000 === 0) {
          console.log('  Progres:', inserted + duplicates, '/', extResult.rows.length, '(noi:', inserted, ', dup:', duplicates, ')');
        }
      } catch (e) {
        errors++;
        if (errors < 5) console.error('Eroare:', e.message);
      }
    }
    
    console.log('');
    console.log('========================================');
    console.log('✅ IMPORT COMPLET!');
    console.log('   Total procesat:', inserted + duplicates + errors);
    console.log('   Noi:', inserted);
    console.log('   Duplicate:', duplicates);
    console.log('   Erori:', errors);
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

