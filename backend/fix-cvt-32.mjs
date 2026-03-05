import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fix() {
    // Fix record 32 (serial 190269) with CORRECT data from the actual PDF annexe
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
    WHERE id = $13 RETURNING id, cvt_series, serial_number, software, cabinet, expiry_date`,
        [
            'IC_ROM.SFX.1001.01#132',                // cvt_series
            'ROM.SFX.1001.01#132',                    // cvt_number
            '190269',                                  // serial_number
            'Periodică',                               // cvt_type
            '2025-11-19',                              // cvt_date (19.11.2025)
            '2026-11-18',                              // expiry_date (18.11.2026)
            'Metron Serv S.R.L.',                      // issuing_authority
            'EGT',                                     // provider
            'EGT-VS17 (P-27/2x42H St Curved)',        // cabinet - CORECT din PDF
            'VIDEO MULTIGAME - GOLD COLLECTION HD',    // game_mix - CORECT din PDF
            'MS 0030/25',                              // approval_type
            'VIDEO MULTIGAME - GOLD COLLECTION HD',    // software - CORECT din PDF
            32                                          // id
        ]
    );
    console.log('Fixed record 32:', JSON.stringify(result.rows[0]));
    await pool.end();
}
fix();
