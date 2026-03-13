import express from 'express'
import mysql from 'mysql2/promise'
import { authenticateToken } from '../middleware/auth.js'
import fs from 'fs'
import path from 'path'

const router = express.Router()

// Config MariaDB Cyber
const CYBER_CONFIG = {
  host: process.env.CYBER_DB_HOST || '161.97.133.165',
  port: Number(process.env.CYBER_DB_PORT || 3306),
  user: process.env.CYBER_DB_USER || 'eugen',
  password: process.env.CYBER_DB_PASSWORD || '(@Ee0wRHVohZww33',
  database: process.env.CYBER_DB_NAME || 'cyberslot_dbn'
}

let cyberPool = null
const getCyberPool = async () => {
  if (cyberPool) return cyberPool
  cyberPool = mysql.createPool({
    ...CYBER_CONFIG,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  })
  console.log('✅ [OPERATIONAL] Pool MariaDB (Cyber) creat pentru data fetching')
  return cyberPool
}

// GET /api/operational/multigames
// Extrage datele mapate din machine_audit_games_g_s cu joins pe locații, machines și nomenclatorul de jocuri.
router.get('/multigames', authenticateToken, async (req, res) => {
  try {
    const pgPool = req.app.get('pool')
    if (!pgPool) return res.status(500).json({ success: false, error: 'Postgres Pool inexistent' })

    const { limit = 1000, startDate, endDate, locations } = req.query

    let sql = `
      SELECT 
        machine_id,
        sas_position,
        venue AS "Venue",
        manufacturer AS "Manufacturer",
        cabinet AS "Cabinet",
        game_slot AS "Game_Slot",
        game_name_multigame AS "Game_Name_Mutligame",
        played_games AS "Played_Games",
        bet AS "Bet",
        win AS "Win",
        last_update AS "Last_Update"
      FROM op_multigames
      WHERE played_games > 0
    `

    const queryParams = []
    let paramCount = 1

    if (startDate && endDate) {
      sql += ` AND DATE(last_update) >= $${paramCount++} AND DATE(last_update) <= $${paramCount++} `
      queryParams.push(startDate, endDate)
    }

    if (locations) {
      const locs = locations.split(',').filter(Boolean);
      if (locs.length > 0) {
        sql += ` AND venue = ANY($${paramCount++}) `
        queryParams.push(locs)
      }
    }

    sql += ` ORDER BY last_update DESC LIMIT $${paramCount}`
    queryParams.push(Number(limit))
    
    const { rows } = await pgPool.query(sql, queryParams)

    return res.json({
      success: true,
      data: rows,
      count: rows.length
    })

  } catch (error) {
    console.error('❌ Error fetching Operational Multigames data:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error reading from local Database'
    })
  }
})

// GET /api/operational/performance-mix
// Extrage date financiare pentru vizualizarea TMI, TI, GP vs Ocupare
router.get('/performance-mix', authenticateToken, async (req, res) => {
  try {
    const { date, locations } = req.query;
    if (!date) return res.status(400).json({ success: false, error: 'Data este obligatorie.' });

    const pgPool = req.app.get('pool');
    if (!pgPool) return res.status(500).json({ success: false, error: 'Postgres Pool inexistent' });

    let sql = `
      SELECT
        hour,
        venue AS "Venue",
        total_in,
        total_money_in,
        games_played,
        avg_bet,
        active_machines
      FROM op_performance_mix
      WHERE date::date = $1::date
    `;
    const params = [date];

    const { rows } = await pgPool.query(sql, params);
    
    let finalRows = rows;
    if (locations) {
       const locArray = locations.split(',').filter(Boolean);
       if (locArray.length > 0) {
           finalRows = finalRows.filter(r => locArray.includes(r.Venue));
       }
    }

    return res.json({ success: true, data: finalRows });
  } catch (error) {
    console.error('❌ Error fetching Performance Mix data:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error reading performance mix from local DB'
    })
  }
})

// GET /api/operational/active-machines
router.get('/active-machines', authenticateToken, async (req, res) => {
  try {
    const { date, startDate, endDate, locations } = req.query;

    // Support both single date and date range
    const start = startDate || date;
    const end = endDate || date;

    if (!start) {
      return res.status(400).json({ success: false, error: 'Data este obligatorie.' });
    }

    const pgPool = req.app.get('pool');
    if (!pgPool) return res.status(500).json({ success: false, error: 'Postgres Pool inexistent' });

    // Check if multi-day range
    const isRange = start !== end;

    let sql, params;

    if (!isRange) {
      // Single day: return raw hourly rows
      sql = `
        SELECT
          (date AT TIME ZONE 'Europe/Bucharest')::date AS date,
          hour,
          venue AS "Venue",
          active_machines,
          carded_players,
          total_spins,
          capacity as total_machines
        FROM op_active_machines
        WHERE (date AT TIME ZONE 'Europe/Bucharest')::date = $1::date
        ORDER BY hour, venue
      `;
      params = [start];
    } else {
      // Multi-day: average per hour/venue across days
      // Use MAX(active_machines) per day per hour/venue, then AVG across days
      sql = `
        SELECT
          hour,
          venue AS "Venue",
          ROUND(AVG(active_machines)::numeric, 1) AS active_machines,
          ROUND(AVG(carded_players)::numeric, 1) AS carded_players,
          ROUND(AVG(total_spins)::numeric, 0) AS total_spins,
          MAX(capacity) AS total_machines,
          COUNT(DISTINCT (date AT TIME ZONE 'Europe/Bucharest')::date) AS days_count
        FROM op_active_machines
        WHERE (date AT TIME ZONE 'Europe/Bucharest')::date >= $1::date
          AND (date AT TIME ZONE 'Europe/Bucharest')::date <= $2::date
        GROUP BY hour, venue
        ORDER BY hour, venue
      `;
      params = [start, end];
    }

    const { rows } = await pgPool.query(sql, params);

    let finalRows = rows;
    if (locations) {
      const locArray = locations.split(',').filter(Boolean);
      if (locArray.length > 0) {
        finalRows = finalRows.filter(r => locArray.includes(r.Venue));
      }
    }

    // Build capacity map
    const mergedCapacity = [];
    const capMap = new Map();
    for (const r of rows) {
      if (!capMap.has(r.Venue) && r.total_machines) {
        capMap.set(r.Venue, true);
        mergedCapacity.push({ Venue: r.Venue, total_machines: r.total_machines });
      }
    }

    return res.json({
      success: true,
      data: finalRows,
      capacity: mergedCapacity,
      isRange,
      dateRange: { start, end }
    });

  } catch (error) {
    console.error('❌ Error fetching Active Machines data:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error reading active machines from local DB'
    });
  }
})

// Helper for cleaning location names
const cleanLocationName = (name) => {
  if (!name) return 'Necunoscut';
  return name.replace(/\s*E\.S\.?\s*$/i, '').trim();
};

// POST /api/operational/sync
// Importă incremental datele din Cyber DB în Postgres local
router.post('/sync', authenticateToken, async (req, res) => {
  const pgPool = req.app.get('pool');
  if (!pgPool) return res.status(500).json({ success: false, error: 'Postgres Pool not available' });

  try {
    const cyberDb = await getCyberPool();
    const { days = 7 } = req.body;

    // Determine start date for sync
    let startDateOp = new Date();
    startDateOp.setDate(startDateOp.getDate() - days);
    
    // Attempt to get MAX date from local db to optimize
    const { rows: maxDateRows } = await pgPool.query('SELECT MAX(date) as max_date FROM op_active_machines');
    if (maxDateRows[0].max_date) {
      const maxD = new Date(maxDateRows[0].max_date);
      // Go back 1 extra day to catch late updates
      maxD.setDate(maxD.getDate() - 1);
      if (maxD > startDateOp) startDateOp = maxD;
    }
    const startDateStr = startDateOp.toISOString().split('T')[0];    // 1. Sync op_active_machines
    // Pas 1: date brute grupate pe machine_id — un rand per (loc, data, ora, aparat fizic)
    const [rawRows] = await cyberDb.query(`
      SELECT location_id, DATE(created_at) AS date, HOUR(created_at) AS hour,
        machine_id, SUM(c_52_games_calc) AS games_sum
      FROM cyberslot_dbn.machine_audit_games_g_s
      WHERE created_at >= ? AND created_at IS NOT NULL
      GROUP BY location_id, DATE(created_at), HOUR(created_at), machine_id
    `, [startDateStr]);

    // Pas 2: jucatori cu card
    const [rowsCarded] = await cyberDb.query(`
      SELECT location_id, DATE(created_at) AS date, HOUR(created_at) AS hour,
        COUNT(DISTINCT NULLIF(player_id, 0)) AS carded_players
      FROM cyberslot_dbn.machine_audit_games_g_s
      WHERE created_at >= ? AND created_at IS NOT NULL AND player_id > 0
      GROUP BY location_id, DATE(created_at), HOUR(created_at)
    `, [startDateStr]);
    const cardedMap = new Map();
    for (const r of rowsCarded) {
      const rawDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0];
      cardedMap.set(`${rawDate}_${r.hour}_${r.location_id}`, Number(r.carded_players) || 0);
    }

    // Pas 3: mapare location_id -> nume locatie curata
    const [locRows] = await cyberDb.query(
      `SELECT id, code FROM cyberslot_dbn.locations WHERE LOWER(code) NOT LIKE '%depozit%' AND LOWER(code) NOT LIKE '% e.s%'`
    );
    const locMap = new Map();
    for (const l of locRows) locMap.set(l.id, cleanLocationName(l.code));

    // Pas 4: capacitate totala per locatie
    const [totalMachines] = await cyberDb.query(`
      SELECT loc.code AS Venue, COUNT(DISTINCT m.id) as total_machines
      FROM cyberslot_dbn.machines m
      JOIN cyberslot_dbn.locations loc ON loc.id = m.location_id
      WHERE m.active = 1 AND m.deleted_at IS NULL
        AND LOWER(loc.code) NOT LIKE '%depozit%' AND LOWER(loc.code) NOT LIKE '% e.s%'
      GROUP BY loc.code
    `);
    const capMap = new Map();
    for (const c of totalMachines) {
      if (!c.Venue) continue;
      const cleanV = cleanLocationName(c.Venue);
      capMap.set(cleanV, (capMap.get(cleanV) || 0) + (Number(c.total_machines) || 0));
    }

    // Pas 5: agregate corecte — COUNT DISTINCT machine_id per (venue, data, ora)
    // Un Set<machine_id> per bucket venue+data+ora deduplicam corect aparatele fizice,
    // indiferent de cate jocuri a rulat aparatul sau de cate location_id-uri are aceeasi locatie
    const mergedActive = new Map();
    for (const r of rawRows) {
      if (!(Number(r.games_sum) > 0)) continue; // fara activitate in ora respectiva
      const cleanVenue = locMap.get(r.location_id);
      if (!cleanVenue) continue; // ignora locatii nemapate (depozit etc.)
      const rawDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0];
      const hour = Number(r.hour);
      const key = `${rawDate}_${hour}_${cleanVenue}`;
      if (!mergedActive.has(key)) {
        mergedActive.set(key, {
          date: rawDate, hour, venue: cleanVenue,
          machineIds: new Set(),   // Set de machine_id distincte — un aparat = 1, indiferent de jocuri
          carded: 0, spins: 0,
          cardedKeys: new Set(),   // pentru a nu dubla-conta jucatori daca locatia are 2 location_id-uri
          capacity: capMap.get(cleanVenue) || 0
        });
      }
      const existing = mergedActive.get(key);
      existing.machineIds.add(r.machine_id);         // deduplicare reala pe ID aparat fizic
      existing.spins += Number(r.games_sum) || 0;
      const cardedKey = `${rawDate}_${hour}_${r.location_id}`;
      if (!existing.cardedKeys.has(cardedKey)) {
        existing.cardedKeys.add(cardedKey);
        existing.carded += cardedMap.get(cardedKey) || 0;
      }
    }

    for (const data of mergedActive.values()) {
       await pgPool.query(`
         INSERT INTO op_active_machines (date, hour, venue, active_machines, carded_players, total_spins, capacity, last_sync)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         ON CONFLICT (date, hour, venue) DO UPDATE SET 
           active_machines = EXCLUDED.active_machines,
           carded_players = EXCLUDED.carded_players,
           total_spins = EXCLUDED.total_spins,
           capacity = EXCLUDED.capacity,
           last_sync = CURRENT_TIMESTAMP
       `, [data.date, data.hour, data.venue, Math.max(0, Math.round(data.machineIds.size / 3)), data.carded, data.spins, data.capacity]);
    }


    // 2. Sync op_performance_mix
    const sqlPerf = `
      SELECT
        DATE(ash.updated_at) AS date,
        hh AS hour,
        loc.code AS Venue,
        SUM(\`in\`) AS total_in,
        SUM(bet) AS total_bet,
        SUM(games) AS games_played,
        COUNT(DISTINCT machine_id) as active_machines
      FROM cyberslot_dbn.machine_audit_summary_per_hours ash
      LEFT JOIN cyberslot_dbn.locations loc ON loc.id = ash.location_id
      WHERE ash.updated_at >= ?
        AND LOWER(loc.code) NOT LIKE '%depozit%'
        AND LOWER(loc.code) NOT LIKE '% e.s%'
      GROUP BY DATE(ash.updated_at), hh, loc.code
    `;
    const [rowsPerf] = await cyberDb.query(sqlPerf, [startDateStr]);

    const mergedPerf = new Map();
    for (const r of rowsPerf) {
      if (!r.Venue) continue;
      const rawDateP = r.date instanceof Date
        ? `${r.date.getFullYear()}-${String(r.date.getMonth()+1).padStart(2,'0')}-${String(r.date.getDate()).padStart(2,'0')}`
        : String(r.date).split('T')[0];
      const cleanVenue = cleanLocationName(r.Venue);
      const key = `${rawDateP}_${r.hour}_${cleanVenue}`;
      if (!mergedPerf.has(key)) {
        mergedPerf.set(key, {
          date: rawDateP, hour: r.hour, venue: cleanVenue,
          total_in: 0, total_bet: 0, games_played: 0, active_machines: 0
        });
      }
      const existing = mergedPerf.get(key);
      existing.total_in += Number(r.total_in) || 0;
      existing.total_bet += Number(r.total_bet) || 0;
      existing.games_played += Number(r.games_played) || 0;
      existing.active_machines += Number(r.active_machines) || 0;
    }

    for (const data of mergedPerf.values()) {
        const avgBet = data.games_played > 0 ? (data.total_bet / data.games_played) : 0;
        await pgPool.query(`
          INSERT INTO op_performance_mix (date, hour, venue, total_in, total_money_in, games_played, avg_bet, active_machines, last_sync)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
          ON CONFLICT (date, hour, venue) DO UPDATE SET
            total_in = EXCLUDED.total_in,
            total_money_in = EXCLUDED.total_money_in,
            games_played = EXCLUDED.games_played,
            avg_bet = EXCLUDED.avg_bet,
            active_machines = EXCLUDED.active_machines,
            last_sync = CURRENT_TIMESTAMP
        `, [data.date, data.hour, data.venue, data.total_bet, data.total_in, data.games_played, avgBet, data.active_machines]);
    }

    // 3. Sync op_multigames
    // We update all games modified since the startDateOp
    const sqlMulti = `
      SELECT 
        mag.machine_id,
        mag.sas_position,
        loc.code AS Venue,
        mt.manufacturer AS Manufacturer,
        cab.name AS Cabinet,
        mt.name AS Game_Slot,
        mg.name AS Game_Name_Mutligame,
        mag.c_52_games_calc AS Played_Games,
        mag.c_52_bet_calc AS Bet,
        mag.c_52_win_calc AS Win,
        mag.updated_at AS Last_Update
      FROM cyberslot_dbn.machine_audit_games_g_s mag
      LEFT JOIN cyberslot_dbn.locations loc ON loc.id = mag.location_id
      LEFT JOIN cyberslot_dbn.machines m ON m.id = mag.machine_id
      LEFT JOIN cyberslot_dbn.machine_types mt ON mt.id = m.machine_type_id
      LEFT JOIN cyberslot_dbn.machine_cabinet_types cab ON cab.id = m.cabinet_type_id
      LEFT JOIN cyberslot_dbn.machine_games mg ON mg.id = mag.machine_game_id
      WHERE mag.updated_at >= ?
        AND mag.sas_position > 0 
        AND LOWER(loc.code) NOT LIKE '%depozit%'
        AND LOWER(loc.code) NOT LIKE '% e.s%'
    `;
    const [rowsMulti] = await cyberDb.query(sqlMulti, [startDateStr]);

    for (const r of rowsMulti) {
      if (!r.Venue) continue;
      const cleanVenue = cleanLocationName(r.Venue);
      await pgPool.query(`
         INSERT INTO op_multigames (
           machine_id, sas_position, venue, manufacturer, cabinet, game_slot, 
           game_name_multigame, played_games, bet, win, last_update, last_sync
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
         ON CONFLICT (machine_id, sas_position) DO UPDATE SET
           venue = EXCLUDED.venue,
           manufacturer = EXCLUDED.manufacturer,
           cabinet = EXCLUDED.cabinet,
           game_slot = EXCLUDED.game_slot,
           game_name_multigame = EXCLUDED.game_name_multigame,
           played_games = EXCLUDED.played_games,
           bet = EXCLUDED.bet,
           win = EXCLUDED.win,
           last_update = EXCLUDED.last_update,
           last_sync = CURRENT_TIMESTAMP
      `, [
         r.machine_id, r.sas_position, cleanVenue, r.Manufacturer || '', r.Cabinet || '',
         r.Game_Slot || '', r.Game_Name_Mutligame || '', r.Played_Games || 0,
         r.Bet || 0, r.Win || 0, r.Last_Update || new Date()
      ]);
    }

    res.json({ success: true, message: `Sincronizare completă din ${startDateStr}.` });
  } catch (err) {
    console.error('Eroare Sync Operațional:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router
