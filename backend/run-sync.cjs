require('dotenv').config();
const mysql = require('mysql2/promise');
const { Pool } = require('pg');

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const cleanLocationName = (name) => {
  if (!name) return 'Necunoscut';
  return name.replace(/\s*E\.S\.?\s*$/i, '').trim();
};

async function syncAll() {
  let cyberDb;
  try {
    console.log('1/6 Connecting to CyberDB...');
    cyberDb = await mysql.createPool({
      host: process.env.CYBER_DB_HOST || '161.97.133.165',
      port: Number(process.env.CYBER_DB_PORT || 3306),
      user: process.env.CYBER_DB_USER || 'eugen',
      password: process.env.CYBER_DB_PASSWORD || '(@Ee0wRHVohZww33',
      database: process.env.CYBER_DB_NAME || 'cyberslot_dbn',
      connectTimeout: 10000,
      waitForConnections: true,
      connectionLimit: 5
    });
    console.log('   OK');

    const startDateStr = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];
    console.log('   Sync from:', startDateStr);

    // --- ACTIVE MACHINES ---
    console.log('2/6 Fetching Active Machines...');
    const [rowsAM] = await cyberDb.query(`
      SELECT DATE(mag.created_at) AS date, HOUR(mag.created_at) AS hour,
        loc.code AS Venue,
        COUNT(DISTINCT CASE WHEN mag.c_52_games_calc > 0 THEN mag.machine_id END) AS active_machines,
        COUNT(DISTINCT NULLIF(mag.player_id, 0)) AS carded_players,
        SUM(mag.c_52_games_calc) AS total_spins
      FROM machine_audit_games_g_s mag
      LEFT JOIN locations loc ON loc.id = mag.location_id
      WHERE mag.created_at >= ? AND mag.created_at IS NOT NULL
        AND LOWER(loc.code) NOT LIKE '%depozit%'
        AND LOWER(loc.code) NOT LIKE '% e.s%'
      GROUP BY DATE(mag.created_at), HOUR(mag.created_at), loc.code
    `, [startDateStr]);
    console.log('   Rows:', rowsAM.length);

    const [capRows] = await cyberDb.query(`
      SELECT loc.code AS Venue, COUNT(DISTINCT m.id) as total_machines
      FROM machines m JOIN locations loc ON loc.id = m.location_id
      WHERE LOWER(loc.code) NOT LIKE '%depozit%'
      AND LOWER(loc.code) NOT LIKE '% e.s%'
      GROUP BY loc.code
    `);
    // FIX: SUM capacities for same cleaned venue (main + E.S.)
    const capMap = {};
    capRows.forEach(c => {
      const cleanName = cleanLocationName(c.Venue);
      capMap[cleanName] = (capMap[cleanName] || 0) + Number(c.total_machines);
    });

    // FIX: Pre-aggregate active machines by (date,hour,cleanVenue) before inserting
    // Prevents E.S. overwriting main hall data with ON CONFLICT last-write-wins
    const mergedAM = new Map();
    for (const r of rowsAM) {
      if (!r.Venue) continue;
      const v = cleanLocationName(r.Venue);
      const rawDate = r.date instanceof Date
        ? `${r.date.getFullYear()}-${String(r.date.getMonth()+1).padStart(2,'0')}-${String(r.date.getDate()).padStart(2,'0')}`
        : String(r.date).split('T')[0];
      const k = `${rawDate}_${r.hour}_${v}`;
      if (!mergedAM.has(k)) mergedAM.set(k, { date: rawDate, hour: r.hour, venue: v, active: 0, carded: 0, spins: 0 });
      const e = mergedAM.get(k);
      e.active += Number(r.active_machines) || 0;
      e.carded += Number(r.carded_players) || 0;
      e.spins  += Number(r.total_spins) || 0;
    }

    console.log('3/6 Inserting Active Machines into Postgres...');
    let insertedAM = 0;
    for (const d of mergedAM.values()) {
      await pgPool.query(`
        INSERT INTO op_active_machines (date, hour, venue, active_machines, carded_players, total_spins, capacity, last_sync)
        VALUES ($1,$2,$3,$4,$5,$6,$7, CURRENT_TIMESTAMP)
        ON CONFLICT (date, hour, venue) DO UPDATE SET
          active_machines=EXCLUDED.active_machines, carded_players=EXCLUDED.carded_players,
          total_spins=EXCLUDED.total_spins, capacity=EXCLUDED.capacity, last_sync=CURRENT_TIMESTAMP
      `, [d.date, d.hour, d.venue, d.active, d.carded, d.spins, capMap[d.venue] || 0]);
      insertedAM++;
    }
    console.log('   Inserted:', insertedAM);

    // --- PERFORMANCE MIX ---
    console.log('4/6 Fetching Performance Mix...');
    const [rowsPM] = await cyberDb.query(`
      SELECT DATE(ash.updated_at) AS date, hh AS hour, loc.code AS Venue,
        SUM(\`in\`) AS total_in, SUM(bet) AS total_bet,
        SUM(games) AS games_played, COUNT(DISTINCT machine_id) as active_machines
      FROM machine_audit_summary_per_hours ash
      LEFT JOIN locations loc ON loc.id = ash.location_id
      WHERE ash.updated_at >= ?
        AND LOWER(loc.code) NOT LIKE '%depozit%'
        AND LOWER(loc.code) NOT LIKE '% e.s%'
      GROUP BY DATE(ash.updated_at), hh, loc.code
    `, [startDateStr]);
    console.log('   Rows:', rowsPM.length);

    console.log('5/6 Inserting Performance Mix...');
    const merged = new Map();
    for (const r of rowsPM) {
      if (!r.Venue) continue;
      const rawDate = r.date instanceof Date
        ? `${r.date.getFullYear()}-${String(r.date.getMonth()+1).padStart(2,'0')}-${String(r.date.getDate()).padStart(2,'0')}`
        : String(r.date).split('T')[0];
      const v = cleanLocationName(r.Venue);
      const k = `${rawDate}_${r.hour}_${v}`;
      if (!merged.has(k)) merged.set(k, { date:rawDate, hour:r.hour, venue:v, ti:0, tb:0, gp:0, am:0 });
      const e = merged.get(k);
      e.ti += Number(r.total_in)||0; e.tb += Number(r.total_bet)||0;
      e.gp += Number(r.games_played)||0; e.am += Number(r.active_machines)||0;
    }
    let insertedPM = 0;
    for (const d of merged.values()) {
      const ab = d.gp > 0 ? d.tb / d.gp : 0;
      await pgPool.query(`
        INSERT INTO op_performance_mix (date,hour,venue,total_in,total_money_in,games_played,avg_bet,active_machines,last_sync)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8, CURRENT_TIMESTAMP)
        ON CONFLICT (date,hour,venue) DO UPDATE SET
          total_in=EXCLUDED.total_in, total_money_in=EXCLUDED.total_money_in,
          games_played=EXCLUDED.games_played, avg_bet=EXCLUDED.avg_bet,
          active_machines=EXCLUDED.active_machines, last_sync=CURRENT_TIMESTAMP
      `, [d.date, d.hour, d.venue, d.tb, d.ti, d.gp, ab, d.am]);
      insertedPM++;
    }
    console.log('   Inserted:', insertedPM);

    // --- MULTIGAMES ---
    console.log('6/6 Fetching Multigames...');
    const [rowsMG] = await cyberDb.query(`
      SELECT mag.machine_id, mag.sas_position, loc.code AS Venue,
        mt.manufacturer AS Manufacturer, cab.name AS Cabinet,
        mt.name AS Game_Slot, mg.name AS Game_Name,
        mag.c_52_games_calc AS Played_Games, mag.c_52_bet_calc AS Bet,
        mag.c_52_win_calc AS Win, mag.updated_at AS Last_Update
      FROM machine_audit_games_g_s mag
      LEFT JOIN locations loc ON loc.id = mag.location_id
      LEFT JOIN machines m ON m.id = mag.machine_id
      LEFT JOIN machine_types mt ON mt.id = m.machine_type_id
      LEFT JOIN machine_cabinet_types cab ON cab.id = m.cabinet_type_id
      LEFT JOIN machine_games mg ON mg.id = mag.machine_game_id
      WHERE mag.updated_at >= ? AND mag.sas_position > 0
        AND LOWER(loc.code) NOT LIKE '%depozit%'
        AND LOWER(loc.code) NOT LIKE '% e.s%'
    `, [startDateStr]);
    console.log('   Rows:', rowsMG.length);

    let insertedMG = 0;
    for (const r of rowsMG) {
      if (!r.Venue) continue;
      await pgPool.query(`
        INSERT INTO op_multigames (machine_id,sas_position,venue,manufacturer,cabinet,game_slot,
          game_name_multigame,played_games,bet,win,last_update,last_sync)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_TIMESTAMP)
        ON CONFLICT (machine_id,sas_position) DO UPDATE SET
          venue=EXCLUDED.venue, manufacturer=EXCLUDED.manufacturer, cabinet=EXCLUDED.cabinet,
          game_slot=EXCLUDED.game_slot, game_name_multigame=EXCLUDED.game_name_multigame,
          played_games=EXCLUDED.played_games, bet=EXCLUDED.bet, win=EXCLUDED.win,
          last_update=EXCLUDED.last_update, last_sync=CURRENT_TIMESTAMP
      `, [r.machine_id, r.sas_position, cleanLocationName(r.Venue),
          r.Manufacturer||'', r.Cabinet||'', r.Game_Slot||'', r.Game_Name||'',
          r.Played_Games||0, r.Bet||0, r.Win||0, r.Last_Update||new Date()]);
      insertedMG++;
    }
    console.log('   Inserted:', insertedMG);

    console.log('\n✅ SYNC COMPLETE!');
    console.log(`   Active Machines: ${insertedAM}`);
    console.log(`   Performance Mix: ${insertedPM}`);
    console.log(`   Multigames: ${insertedMG}`);

  } catch (err) {
    console.error('❌ SYNC ERROR:', err.message);
  } finally {
    if (cyberDb) await cyberDb.end();
    await pgPool.end();
    process.exit(0);
  }
}

syncAll();
