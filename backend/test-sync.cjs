require('dotenv').config();
const mysql = require('mysql2/promise');
const { Pool } = require('pg');

const CYBER_CONFIG = {
  host: process.env.CYBER_DB_HOST || '161.97.133.165',
  port: Number(process.env.CYBER_DB_PORT || 3306),
  user: process.env.CYBER_DB_USER || 'eugen',
  password: process.env.CYBER_DB_PASSWORD || '(@Ee0wRHVohZww33',
  database: process.env.CYBER_DB_NAME || 'cyberslot_dbn'
};

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const cleanLocationName = (name) => {
  if (!name) return 'Necunoscut';
  return name.replace(/\s*E\.S\.?\s*/gi, '').replace(/\s*ES\s*/gi, '').trim();
};

async function runSync() {
  try {
    console.log('Connecting to Cyber...');
    const cyberDb = await mysql.createPool(CYBER_CONFIG);
    console.log('Connected to Cyber.');

    const days = 7;
    let startDateOp = new Date();
    startDateOp.setDate(startDateOp.getDate() - days);

    console.log('Checking local max date...');
    const { rows: maxDateRows } = await pgPool.query('SELECT MAX(date) as max_date FROM op_active_machines');
    if (maxDateRows[0].max_date) {
      const maxD = new Date(maxDateRows[0].max_date);
      maxD.setDate(maxD.getDate() - 1);
      if (maxD > startDateOp) startDateOp = maxD;
    }
    const startDateStr = startDateOp.toISOString().split('T')[0];
    console.log('Starting sync from:', startDateStr);

    console.log('Querying Cyber Active Machines...');
    const sqlActive = `
      SELECT
        DATE(mag.updated_at) AS date,
        HOUR(mag.updated_at) AS hour,
        loc.code AS Venue,
        COUNT(DISTINCT mag.machine_id) AS active_machines,
        COUNT(DISTINCT NULLIF(mag.player_id, 0)) AS carded_players,
        SUM(mag.c_52_games_calc) AS total_spins
      FROM cyberslot_dbn.machine_audit_games_g_s mag
      LEFT JOIN cyberslot_dbn.locations loc ON loc.id = mag.location_id
      WHERE mag.updated_at >= ? 
        AND mag.c_52_games_calc > 0
        AND LOWER(loc.code) NOT LIKE '%depozit%'
      GROUP BY DATE(mag.updated_at), HOUR(mag.updated_at), loc.code
    `;
    const [rowsActive] = await cyberDb.query(sqlActive, [startDateStr]);
    console.log('Cyber Active Machines found:', rowsActive.length);

    console.log('Querying Cyber Capacity...');
    const [totalMachines] = await cyberDb.query(`
      SELECT loc.code AS Venue, COUNT(DISTINCT m.id) as total_machines
      FROM cyberslot_dbn.machines m
      JOIN cyberslot_dbn.locations loc ON loc.id = m.location_id
      WHERE LOWER(loc.code) NOT LIKE '%depozit%'
      GROUP BY loc.code
    `);
    console.log('Cyber Capacity found:', totalMachines.length);
    
    // Test a bit of the insert logic
    // ... we don't need to inserts everything here, just knowing the SELECT works is huge
    
    console.log('Querying Cyber Performance Mix...');
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
      GROUP BY DATE(ash.updated_at), hh, loc.code
    `;
    const [rowsPerf] = await cyberDb.query(sqlPerf, [startDateStr]);
    console.log('Cyber Performance Mix found:', rowsPerf.length);

    console.log('Sync Test Complete.');
    process.exit(0);

  } catch (err) {
    console.error('SYNC ERROR:', err);
    process.exit(1);
  }
}

runSync();
