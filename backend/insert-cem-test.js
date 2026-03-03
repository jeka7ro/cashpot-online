import axios from 'axios';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const authorities = await pool.query("SELECT name FROM authorities");
        const providers = await pool.query("SELECT name FROM providers");
        const cabinets = await pool.query("SELECT name FROM cabinets LIMIT 20");
        const gameMixes = await pool.query("SELECT name FROM game_mixes LIMIT 20");
        const approvals = await pool.query("SELECT name FROM approvals LIMIT 20");
        const software = await pool.query("SELECT name FROM software LIMIT 20");

        const authLabel = authorities.rows[Math.floor(Math.random() * authorities.rows.length)]?.name || 'BRML';
        const provLabel = providers.rows[Math.floor(Math.random() * providers.rows.length)]?.name || 'EGT';
        const cabLabel = cabinets.rows[Math.floor(Math.random() * cabinets.rows.length)]?.name || 'G 32-32 VIP';
        const mixLabel = gameMixes.rows[Math.floor(Math.random() * gameMixes.rows.length)]?.name || 'Premier Multi-5';
        const appLabel = approvals.rows[Math.floor(Math.random() * approvals.rows.length)]?.name || 'RO-90033';
        const softLabel = software.rows[Math.floor(Math.random() * software.rows.length)]?.name || 'V 1.0';

        const reqData = {
            cvt_series: `CVT-${Math.floor(Math.random() * 999999)}`,
            serial_number: `SN-${Math.floor(Math.random() * 1000000)}`,
            cvt_type: 'Periodică',
            cvt_date: '2025-10-15',
            expiry_date: '2026-10-14',
            issuing_authority: authLabel,
            provider: provLabel,
            cabinet: cabLabel,
            game_mix: mixLabel,
            approval_type: appLabel,
            software: softLabel,
            cvt_file: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nF3P',
            cvt_filename: 'metrology-test.pdf',
            notes: 'Generare automata cu date reale de la CEM',
            cvt_number: `N/A-${Date.now()}`
        };

        console.log('Sending data:', Object.keys(reqData).map(k => `${k}: ${reqData[k]}`));

        const result = await axios.post('http://localhost:5001/api/metrology', reqData);
        console.log('Successfully created test record:', result.data.id);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    } finally {
        pool.end();
    }
}

run();
