import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') })

const { Pool } = pg

async function optimizeIncasariIndexes() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    })

    try {
        console.log('🔍 Checking existing indexes on incasari_daily...\n')

        // Check existing indexes
        const indexQuery = `
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'incasari_daily'
      ORDER BY indexname;
    `

        const { rows: existingIndexes } = await pool.query(indexQuery)

        console.log('📊 Existing indexes:')
        if (existingIndexes.length === 0) {
            console.log('  ⚠️  No indexes found!')
        } else {
            existingIndexes.forEach(idx => {
                console.log(`  - ${idx.indexname}`)
                console.log(`    ${idx.indexdef}`)
            })
        }

        console.log('\n🔨 Creating optimized indexes...\n')

        // Index 1: Composite index for date + machine_id + location_id (main query pattern)
        console.log('1️⃣  Creating composite index on (audit_date, machine_id, location_id)...')
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_incasari_daily_date_machine_loc 
      ON incasari_daily(audit_date, machine_id, location_id)
    `)
        console.log('   ✅ Created idx_incasari_daily_date_machine_loc')

        // Index 2: Index on serial_number for COUNT(DISTINCT) optimization
        console.log('2️⃣  Creating index on serial_number...')
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_incasari_daily_serial 
      ON incasari_daily(serial_number)
    `)
        console.log('   ✅ Created idx_incasari_daily_serial')

        // Index 3: Covering index for the most common aggregation query
        console.log('3️⃣  Creating covering index for aggregation queries...')
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_incasari_daily_agg_covering 
      ON incasari_daily(audit_date, machine_id, location_id, serial_number)
      INCLUDE (profit, in_amount, bet, win, jackpot, hh, cb_real, cb_birthday, cb_raffle)
    `)
        console.log('   ✅ Created idx_incasari_daily_agg_covering')

        console.log('\n📈 Running ANALYZE to update statistics...')
        await pool.query('ANALYZE incasari_daily')
        console.log('   ✅ Statistics updated')

        console.log('\n✨ Index optimization complete!')

        // Show table stats
        console.log('\n📊 Table statistics:')
        const statsQuery = `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
      FROM pg_tables
      WHERE tablename = 'incasari_daily'
    `
        const { rows: stats } = await pool.query(statsQuery)
        if (stats.length > 0) {
            console.log(`  Table size: ${stats[0].table_size}`)
            console.log(`  Indexes size: ${stats[0].indexes_size}`)
            console.log(`  Total size: ${stats[0].total_size}`)
        }

    } catch (error) {
        console.error('❌ Error:', error.message)
        console.error(error.stack)
        process.exit(1)
    } finally {
        await pool.end()
    }
}

optimizeIncasariIndexes()
