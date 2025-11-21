u m
    let inserted = 0
    let skipped = 0
    let errors = 0

    // Inserăm direct în expenditures_sync cu ON CONFLICT (fără duplicate)
    for (const record of records) {
      try {
        const result = await localPool.query(`
          INSERT INTO expenditures_sync (
            location_name, department_name, expenditure_type, amount,
            operational_date, synced_at, mapped_location_id, data_source
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7)
          ON CONFLICT (operational_date, amount, location_name, department_name, expenditure_type)
          DO NOTHING
        `, [
          record.location_name || 'Unknown',
          record.department_name || 'Unknown',
          record.expenditure_type || 'Unknown',
          record.amount || 0,
          record.operational_date,
          null,                // mapped_location_id - putem mappa ulterior
          record.data_source || 'bat_sync'
        ])

        if (result.rowCount > 0) inserted++
        else skipped++
      } catch (insertError) {
        errors++
        console.error('❌ Local insert error:', insertError.message)
      }
    }

    console.log(`\n✅ SYNC COMPLET LOCAL!`)
    console.log(`   - ${inserted} înregistrări NOI inserate`)
    console.log(`   - ${skipped} înregistrări duplicate (skip datorită UNIQUE INDEX)`)
    console.log(`   - ${errors} erori la insert`)

    // Close pools
    await externalPool.end()
    await localPool.end()
    console.log('\n👋 Closing connections...')
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ SYNC FAILED:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔍 DB-ul extern refuză conexiunea!')
      console.error('🔍 Verifică dacă PostgreSQL rulează pe 192.168.1.39:26257')
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⏱️ Timeout! Verifică firewall-ul și network-ul.')
    } else if (error.response) {
      console.error('📋 Render response:', error.response.status, error.response.data)
    }
    
    await externalPool.end()
    process.exit(1)
  }
}

syncExpenditures()

