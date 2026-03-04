import pg from 'pg';
const { Pool } = pg;
const pool = new Pool();

async function run() {
  const query = `UPDATE metrology SET 
      cvt_series = COALESCE($1, cvt_series), 
      cvt_number = COALESCE($2, cvt_number), 
      serial_number = COALESCE($3, serial_number), 
      cvt_type = COALESCE($4, cvt_type), 
      cvt_date = $5, 
      expiry_date = $6, 
      issuing_authority = COALESCE($7, issuing_authority), 
      provider = COALESCE($8, provider), 
      cabinet = COALESCE($9, cabinet), 
      game_mix = COALESCE($10, game_mix), 
      approval_type = COALESCE($11, approval_type), 
      software = COALESCE($12, software), 
      cvt_file = $13, 
      cvt_filename = $14,
      notes = COALESCE($15, notes), 
      additional_files = COALESCE($16::jsonb, additional_files),
      raw_cvt_data = COALESCE($17::jsonb, raw_cvt_data),
      updated_at = CURRENT_TIMESTAMP 
      WHERE id = $18 
      RETURNING *, cvt_file as "cvtFile"`;
      
  const params = ['IC_ROM.SFX.1001.01#132', null, '190269', 'Periodică', '2024-03-04', '2025-03-03', 'BMM', 'EGT', 'EGT-VS24', 'BELL LINK BOOST', null, 'BELL LINK BOOST', 'true', null, null, null, "{}", 29];
  
  try {
    const res = await pool.query(query, params);
    console.log("Success with implicit null");
  } catch (err) {
    console.error("Error with explicit null:", err.message);
  }
}
run();
