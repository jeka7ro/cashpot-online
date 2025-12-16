const pg = require('pg');

// Baza locală PostgreSQL (Render)
const localPool = new pg.Pool({
  connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
  ssl: { rejectUnauthorized: false }
});

// Normalizează numele de locație pentru a converti fără diacritice la cu diacritice
const normalizeLocationName = (name) => {
  if (!name) return 'Unknown'
  const upper = String(name).toUpperCase().trim()
  
  if (upper.includes('PITESTI') || upper.includes('PITEȘTI') || upper.includes('PITI')) {
    return 'Pitești'
  }
  if (upper.includes('PLOIESTI') || upper.includes('PLOIEȘTI')) {
    if (upper.includes('NORD')) return 'Ploiești (nord)'
    if (upper.includes('CENTRU') || upper.includes('CENTER')) return 'Ploiești (centru)'
    return 'Ploiești (centru)'
  }
  if (upper.includes('VALCEA') || upper.includes('VÂLCEA') || upper.includes('RAMNICU')) {
    return 'Vâlcea'
  }
  if (upper.includes('CRAIOVA') || upper.includes('CARIOVA')) {
    return 'Craiova'
  }
  if (upper.includes('BUCUREȘTI') || upper.includes('BUCHAREST') || upper.includes('BUCURESTI')) {
    return 'București'
  }
  
  return String(name).trim().replace(/\s+/g, ' ')
}

async function fixLocationNames() {
  try {
    console.log('🔧 Actualizare nume locații în expenditures_sync...\n');
    
    // Obține toate numele de locații unice
    const locationsResult = await localPool.query(`
      SELECT DISTINCT location_name
      FROM expenditures_sync
      WHERE location_name IS NOT NULL
        AND location_name != 'Unknown'
      ORDER BY location_name
    `);
    
    console.log(`📊 Găsite ${locationsResult.rows.length} nume de locații unice\n`);
    
    let updated = 0;
    let unchanged = 0;
    
    for (const row of locationsResult.rows) {
      const oldName = row.location_name;
      const newName = normalizeLocationName(oldName);
      
      if (oldName !== newName) {
        console.log(`   🔄 "${oldName}" → "${newName}"`);
        
        // Actualizează toate înregistrările cu acest nume de locație
        const updateResult = await localPool.query(`
          UPDATE expenditures_sync
          SET location_name = $1
          WHERE location_name = $2
        `, [newName, oldName]);
        
        updated += updateResult.rowCount;
        console.log(`      ✅ Actualizat ${updateResult.rowCount} înregistrări\n`);
      } else {
        unchanged++;
      }
    }
    
    console.log('');
    console.log('========================================');
    console.log('✅ ACTUALIZARE COMPLETĂ!');
    console.log(`   Total nume de locații: ${locationsResult.rows.length}`);
    console.log(`   Actualizate: ${updated} înregistrări`);
    console.log(`   Neschimbate: ${unchanged} nume`);
    console.log('========================================');
    
    // Verifică rezultatul pentru Salarii
    console.log('\n🔍 Verificare salarii după actualizare:');
    const salariiResult = await localPool.query(`
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
    
    salariiResult.rows.forEach(row => {
      console.log(`   ${row.location_name}: ${row.count} înregistrări, ${row.total_amount} RON`);
    });
    
    await localPool.end();
    
  } catch (err) {
    console.error('❌ EROARE:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

fixLocationNames();
