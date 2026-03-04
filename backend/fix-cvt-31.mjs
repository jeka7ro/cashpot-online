import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fix() {
    // Fix record ID 31 with correct data from the actual PDF
    const result = await pool.query(
        `UPDATE metrology SET 
      cvt_series = $1,
      cvt_number = $2,
      serial_number = $3,
      cvt_type = $4,
      cvt_date = $5,
      expiry_date = $6,
      issuing_authority = $7,
      provider = $8,
      cabinet = $9,
      game_mix = $10,
      approval_type = $11,
      software = $12
    WHERE id = $13 RETURNING *`,
        [
            'IC_ROM.SFX.1001.01#114',    // cvt_series
            'ROM.SFX.1001.01#114',        // cvt_number
            '299724',                      // serial_number
            'Periodică',                   // cvt_type
            '2025-08-01',                  // cvt_date (01.08.2025)
            '2026-07-31',                  // expiry_date (31.07.2026)
            'Regio Metro Cert S.R.L.',     // issuing_authority
            'EGT',                         // provider
            'EGT-VS26(G 55 C VIP)',       // cabinet
            'MEGA Supreme Fruits Selection', // game_mix
            'RMC 0028/25',                 // approval_type
            'MEGA Supreme Fruits Selection', // software
            31                              // id
        ]
    );
    console.log('Fixed:', JSON.stringify(result.rows[0], null, 2));
    await pool.end();
}
fix();
