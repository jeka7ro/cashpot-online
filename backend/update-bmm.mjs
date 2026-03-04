import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot?sslmode=require',
});

async function run() {
    try {
        const resAuth = await pool.query("UPDATE authorities SET name = 'BMM' WHERE name LIKE '%BMM%'");
        console.log(`Updated ${resAuth.rowCount} authorities`);

        // De asemenea facem curat si in metrologii care ar avea issuing_authority BMM Testlabs
        const resMet = await pool.query("UPDATE metrology SET issuing_authority = 'BMM' WHERE issuing_authority LIKE '%BMM%'");
        console.log(`Updated ${resMet.rowCount} metrologies`);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
