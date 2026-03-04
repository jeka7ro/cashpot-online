const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'cashpot_online',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT) || 5432,
});

async function run() {
    try {
        await pool.query("UPDATE authorities SET name = 'BMM' WHERE name LIKE '%BMM%'");
        console.log("Updated BMM Testlabs to BMM");
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
