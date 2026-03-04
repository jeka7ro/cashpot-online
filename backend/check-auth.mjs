import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot?sslmode=require',
});

async function run() {
    try {
        const res = await pool.query("DELETE FROM authorities WHERE id = 12");
        console.log(`Deleted ${res.rowCount} row(s)`);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
