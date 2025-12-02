import dotenv from 'dotenv'
import pg from 'pg'
import mysql from 'mysql2/promise'

dotenv.config()

const { Pool } = pg

const POSTGRES_URL = process.env.DATABASE_URL

if (!POSTGRES_URL) {
  console.error('❌ DATABASE_URL nu este setat în .env – nu pot importa încasările.')
  process.exit(1)
}

const PG_POOL = new Pool({
  connectionString: POSTGRES_URL,
  ssl:
    POSTGRES_URL && POSTGRES_URL.includes('render.com')
      ? { rejectUnauthorized: false }
      : false
})

const CYBER_CONFIG = {
  host: process.env.CYBER_DB_HOST || '161.97.133.165',
  port: Number(process.env.CYBER_DB_PORT || 3306),
  user: process.env.CYBER_DB_USER || 'eugen',
  password: process.env.CYBER_DB_PASSWORD || '(@Ee0wRHVohZww33',
  database: process.env.CYBER_DB_NAME || 'cyberslot_dbn'
}

const createTableSQL = `
  CREATE TABLE IF NOT EXISTS incasari_daily (
    id SERIAL PRIMARY KEY,
    audit_date DATE NOT NULL,
    location_id BIGINT,
    machine_id BIGINT NOT NULL,
    machine_type_id BIGINT,
    machine_reset_id BIGINT,
    audit_id_start BIGINT,
    audit_id_end BIGINT,
    in_m DOUBLE PRECISION,
    out_m DOUBLE PRECISION,
    in_amount DOUBLE PRECISION,
    out_amount DOUBLE PRECISION,
    bet DOUBLE PRECISION,
    win DOUBLE PRECISION,
    credits DOUBLE PRECISION,
    games DOUBLE PRECISION,
    jackpot DOUBLE PRECISION,
    hh DOUBLE PRECISION,
    cb_real DOUBLE PRECISION,
    cb_birthday DOUBLE PRECISION,
    cb_daily DOUBLE PRECISION,
    cb_raffle DOUBLE PRECISION,
    cb_9a_deductible DOUBLE PRECISION,
    cashback DOUBLE PRECISION,
    profit DOUBLE PRECISION,
    serial_number VARCHAR(100),
    game_mix VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS incasari_daily_unique
    ON incasari_daily (audit_date, machine_id);
`

async function ensureTable() {
  console.log('🛠  Creez / actualizez tabelul incasari_daily...')
  await PG_POOL.query(createTableSQL)
  // Asigură-te că există coloana game_mix și dacă tabela e mai veche
  await PG_POOL.query(
    "ALTER TABLE incasari_daily ADD COLUMN IF NOT EXISTS game_mix VARCHAR(255)"
  )
  console.log('✅ Tabel incasari_daily OK (cu game_mix)')
}

async function run() {
  // Dacă scriptul este apelat FĂRĂ parametri (cazul /api/incasari/sync),
  // aducem IERI + AZI (2 zile): ieri pentru corecții, azi pentru Prezentare generală.
  // Dacă se specifică parametri (ex: 2024-01-01 2025-12-31) îi respectăm și
  // folosim logica veche de optimizare pe baza ultimei zile importate.

  let start = process.argv[2] || null
  let end = process.argv[3] || null

  const hasManualRange = !!process.argv[2]

  if (!hasManualRange) {
    const now = new Date()
    // IMPORT COMPLET: Importă TOATE datele disponibile (2024-01-01 până în prezent)
    // Nu doar luna curentă, ci TOATE datele pentru a asigura import complet
    const fullStart = new Date(2024, 0, 1) // 2024-01-01
    const fullEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Ultima zi a lunii curente
    
    const startYear = fullStart.getFullYear()
    const startMonth = String(fullStart.getMonth() + 1).padStart(2, '0')
    const startDay = String(fullStart.getDate()).padStart(2, '0')
    start = `${startYear}-${startMonth}-${startDay}`

    const endYear = fullEnd.getFullYear()
    const endMonth = String(fullEnd.getMonth() + 1).padStart(2, '0')
    const endDay = String(fullEnd.getDate()).padStart(2, '0')
    end = `${endYear}-${endMonth}-${endDay}`

    console.log('🚀 Import încasări din Cyber DB → incasari_daily (mod AUTO: TOATE DATELE DISPONIBILE)')
    console.log(`📅 Interval efectiv de import (auto): ${start} → ${end}`)
    console.log(`⚠️ IMPORT COMPLET: Se vor importa TOATE datele din ${start} până în ${end}`)
  } else {
    // Mod manual (ex: import complet): păstrăm start/end primite sau valorile implicite.
    if (!start) start = '2024-01-01'
    if (!end) end = '2025-12-31'

    console.log('🚀 Import încasări din Cyber DB → incasari_daily (mod MANUAL)')

    // Dacă utilizatorul specifică explicit un interval, respectăm intervalul specificat
    if (hasManualRange) {
      console.log(
        `ℹ️ Import manual pentru intervalul specificat: ${start} → ${end} (ignorăm optimizarea)`
      )
    } else {
      // Optimizare: aflăm ultima zi importată deja în Postgres.
      // Ziua operațională este deja calculată în câmpul mas.date din Cyber (08:00–08:00),
      // deci aici lucrăm doar cu DATE, fără ore.
      try {
        const res = await PG_POOL.query('SELECT MAX(audit_date) AS last_date FROM incasari_daily')
        const lastDate = res.rows[0]?.last_date
        if (lastDate) {
          const lastStr = lastDate.toISOString().split('T')[0]

          // Pentru importurile lungi, reimportăm doar de la ultima zi în jos (buffer 7 zile).
          const lastMinusSeven = new Date(lastDate)
          lastMinusSeven.setDate(lastMinusSeven.getDate() - 7)
          const lastMinusSevenStr = lastMinusSeven.toISOString().split('T')[0]

          const effectiveStart = lastMinusSevenStr > start ? lastMinusSevenStr : start

          if (effectiveStart !== start) {
            console.log(
              `🧠 Ultima zi importată este ${lastStr} – reimport de siguranță de la ${effectiveStart} (ultimele 7 zile) în loc de ${start}`
            )
            start = effectiveStart
          } else {
            console.log(
              `ℹ️ Ultima zi importată este ${lastStr} – păstrez start=${start} (interval suficient)`
            )
          }
        } else {
          console.log('ℹ️ incasari_daily este gol – import complet de la începutul intervalului.')
        }
      } catch (e) {
        console.warn(
          '⚠️ Nu am putut determina ultima zi importată din incasari_daily. Continui cu intervalul complet.',
          e.message
        )
      }
    }

    console.log(`📅 Interval efectiv de import (manual): ${start} → ${end}`)
  }

  // NU ștergem datele existente - le păstrăm și le actualizăm doar dacă există date noi
  // ON CONFLICT va actualiza doar rândurile care există deja, iar cele noi vor fi inserate
  // Astfel, datele existente (inclusiv pentru zilele fără date noi în Cyber) rămân intacte
  console.log(`📦 Păstrăm datele existente și actualizăm/inserăm doar datele noi pentru intervalul ${start} → ${end}...`)
  console.log('🌐 Cyber DB config:', {
    host: CYBER_CONFIG.host,
    port: CYBER_CONFIG.port,
    database: CYBER_CONFIG.database,
    user: CYBER_CONFIG.user
  })

  await ensureTable()

  const cyberPool = mysql.createPool({
    ...CYBER_CONFIG,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  })
  console.log('✅ Pool MariaDB (Cyber) creat')

  const batchSize = 5000
  let offset = 0
  let totalImported = 0

  try {
    // Număr total de GRUPURI (zi + aparat) în interval
    console.log(`🔍 Verific date în Cyber DB pentru intervalul ${start} → ${end}...`)
    const [countRows] = await cyberPool.query(
      `SELECT COUNT(DISTINCT date, machine_id) AS c
       FROM cyberslot_dbn.machine_audit_summaries
       WHERE date >= ? AND date <= ?`,
      [start, end]
    )
    const total = Number(countRows[0].c || 0)
    console.log(`📊 Grupuri (date+machine_id) de importat în interval: ${total}`)
    
    if (total === 0) {
      console.warn(`⚠️ ATENȚIE: Nu s-au găsit date în Cyber DB pentru intervalul ${start} → ${end}!`)
      console.log(`🔍 Verific dacă există date în Cyber DB...`)
      
      // Verifică dacă există date în general
      const [allCountRows] = await cyberPool.query(
        `SELECT COUNT(*) AS c, MIN(date) AS min_date, MAX(date) AS max_date
         FROM cyberslot_dbn.machine_audit_summaries`
      )
      const allCount = Number(allCountRows[0].c || 0)
      const minDate = allCountRows[0].min_date
      const maxDate = allCountRows[0].max_date
      console.log(`📊 Total înregistrări în Cyber DB: ${allCount}`)
      console.log(`📅 Interval disponibil în Cyber DB: ${minDate} → ${maxDate}`)
      
      if (allCount === 0) {
        console.error(`❌ Cyber DB este GOL! Nu există date de importat.`)
      } else {
        console.warn(`⚠️ Intervalul cerut (${start} → ${end}) nu se suprapune cu datele disponibile (${minDate} → ${maxDate})`)
      }
    }

    while (true) {
      const [rows] = await cyberPool.query(
        `
        SELECT
          mas.date,
          MIN(mas.location_id) AS location_id,
          mas.machine_id,
          MIN(mas.machine_type_id) AS machine_type_id,
          MIN(mas.machine_reset_id) AS machine_reset_id,
          MIN(mas.audit_id_start) AS audit_id_start,
          MAX(mas.audit_id_end) AS audit_id_end,
          SUM(mas.in_m) AS in_m,
          SUM(mas.out_m) AS out_m,
          SUM(mas.in) AS in_amount,
          SUM(mas.out) AS out_amount,
          SUM(mas.bet) AS bet,
          SUM(mas.win) AS win,
          SUM(mas.credits) AS credits,
          SUM(mas.games) AS games,
          SUM(mas.jackpot) AS jackpot,
          SUM(mas.hh) AS hh,
          SUM(mas.cb_real) AS cb_real,
          SUM(mas.cb_birthday) AS cb_birthday,
          SUM(mas.cb_daily) AS cb_daily,
          SUM(mas.cb_raffle) AS cb_raffle,
          SUM(mas.cb_9a_deductible) AS cb_9a_deductible,
          SUM(mas.cashback) AS cashback,
          MAX(m.slot_machine_id) AS serial_number,
          MAX(gt.name) AS game_mix
        FROM cyberslot_dbn.machine_audit_summaries mas
        LEFT JOIN cyberslot_dbn.machines m ON mas.machine_id = m.id
        LEFT JOIN cyberslot_dbn.machine_game_templates gt ON m.game_template_id = gt.id
        WHERE mas.date >= ? AND mas.date <= ?
        GROUP BY
          mas.date,
          mas.machine_id
        ORDER BY mas.date, mas.machine_id
        LIMIT ? OFFSET ?
        `,
        [start, end, batchSize, offset]
      )

      if (!rows || rows.length === 0) {
        console.log(`✅ Nu mai sunt date de importat (offset ${offset})`)
        break
      }

      console.log(
        `📦 Batch ${offset / batchSize + 1}: ${rows.length} grupuri (date+machine_id) din Cyber (offset ${offset})`
      )
      console.log(`🔍 Exemplu primul rând: date=${rows[0]?.date}, machine_id=${rows[0]?.machine_id}, in_amount=${rows[0]?.in_amount}`)

      const client = await PG_POOL.connect()
      try {
        await client.query('BEGIN')

        const insertSQL = `
          INSERT INTO incasari_daily (
            audit_date, location_id, machine_id, machine_type_id, machine_reset_id,
            audit_id_start, audit_id_end,
            in_m, out_m, in_amount, out_amount,
            bet, win, credits, games, jackpot, hh,
            cb_real, cb_birthday, cb_daily, cb_raffle, cb_9a_deductible, cashback,
            profit, serial_number, game_mix, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7,
            $8, $9, $10, $11,
            $12, $13, $14, $15, $16, $17,
            $18, $19, $20, $21, $22, $23,
            $24, $25, $26, NOW(), NOW()
          )
          ON CONFLICT (audit_date, machine_id) DO UPDATE SET
            location_id = EXCLUDED.location_id,
            machine_type_id = EXCLUDED.machine_type_id,
            machine_reset_id = EXCLUDED.machine_reset_id,
            audit_id_start = EXCLUDED.audit_id_start,
            audit_id_end = EXCLUDED.audit_id_end,
            in_m = EXCLUDED.in_m,
            out_m = EXCLUDED.out_m,
            in_amount = EXCLUDED.in_amount,
            out_amount = EXCLUDED.out_amount,
            bet = EXCLUDED.bet,
            win = EXCLUDED.win,
            credits = EXCLUDED.credits,
            games = EXCLUDED.games,
            jackpot = EXCLUDED.jackpot,
            hh = EXCLUDED.hh,
            cb_real = EXCLUDED.cb_real,
            cb_birthday = EXCLUDED.cb_birthday,
            cb_daily = EXCLUDED.cb_daily,
            cb_raffle = EXCLUDED.cb_raffle,
            cb_9a_deductible = EXCLUDED.cb_9a_deductible,
            cashback = EXCLUDED.cashback,
            profit = EXCLUDED.profit,
            serial_number = EXCLUDED.serial_number,
            game_mix = EXCLUDED.game_mix,
            updated_at = NOW()
        `

        for (const r of rows) {
          const inVal = Number(r.in_amount || 0)
          const outVal = Number(r.out_amount || 0)
          const profit = inVal - outVal

          const values = [
            r.date, // audit_date
            r.location_id || null,
            r.machine_id,
            r.machine_type_id || null,
            r.machine_reset_id || null,
            r.audit_id_start || null,
            r.audit_id_end || null,
            r.in_m || 0,
            r.out_m || 0,
            r.in_amount || 0,
            r.out_amount || 0,
            r.bet || 0,
            r.win || 0,
            r.credits || 0,
            r.games || 0,
            r.jackpot || 0,
            r.hh || 0,
            r.cb_real || 0,
            r.cb_birthday || 0,
            r.cb_daily || 0,
            r.cb_raffle || 0,
            r.cb_9a_deductible || 0,
            r.cashback || 0,
            profit,
            r.serial_number || null,
            r.game_mix || null
          ]

          await client.query(insertSQL, values)
        }

        await client.query('COMMIT')
        totalImported += rows.length
        console.log(`✅ Batch ${offset / batchSize + 1} salvat: ${rows.length} rânduri (total acum: ${totalImported})`)
      } catch (e) {
        await client.query('ROLLBACK')
        console.error('❌ Eroare la inserarea batch-ului în incasari_daily:', e.message)
        console.error('❌ Detalii eroare:', e)
        throw e
      } finally {
        client.release()
      }

      offset += rows.length
    }

    console.log(`✅ Import complet: ${totalImported} rânduri procesate și salvate în incasari_daily`)
    
    // Verifică dacă s-au salvat efectiv datele
    if (totalImported > 0) {
      const checkResult = await PG_POOL.query(
        `SELECT COUNT(*) AS count, MIN(audit_date) AS min_date, MAX(audit_date) AS max_date 
         FROM incasari_daily 
         WHERE audit_date >= $1 AND audit_date <= $2`,
        [start, end]
      )
      const savedCount = Number(checkResult.rows[0].count || 0)
      console.log(`✅ Verificare finală: ${savedCount} înregistrări salvate în incasari_daily pentru intervalul ${start} → ${end}`)
      if (savedCount === 0 && totalImported > 0) {
        console.error(`❌ PROBLEMĂ: S-au procesat ${totalImported} rânduri dar nu s-au salvat în DB!`)
      }
    } else {
      console.warn(`⚠️ ATENȚIE: Nu s-au importat date! (totalImported = 0)`)
    }
  } catch (error) {
    console.error('❌ Eroare generală în import-incasari-from-cyber:', error)
    console.error('❌ Stack trace:', error.stack)
  } finally {
    await cyberPool.end()
    await PG_POOL.end()
  }
}

run().catch((e) => {
  console.error('❌ Import script failed:', e)
  process.exit(1)
})


