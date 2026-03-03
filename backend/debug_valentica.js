import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from current directory (backend/)
dotenv.config({ path: path.join(__dirname, '.env') });

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is missing!');
    process.exit(1);
} else {
    console.log('✅ DATABASE_URL found:', process.env.DATABASE_URL.substring(0, 15) + '...');
}

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function run() {
    try {
        //Find Valentica
        console.log('Searching for user Valentica...');
        const userRes = await pool.query("SELECT id, username, email, role FROM users WHERE username ILIKE '%valen%' OR email ILIKE '%valen%'");

        if (userRes.rows.length === 0) {
            console.log('No user found matching "valen"');
            return;
        }

        const user = userRes.rows[0];
        console.log('Found user:', user);

        // Check schema of users table
        console.log('Checking users table schema...');
        const schemaRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
        console.table(schemaRes.rows);

        // Check columns that might hold settings
        const potentialColumns = ['preferences', 'location_id', 'permissions'];
        console.log(`Checking specific columns for user ${user.id}:`, potentialColumns);
        const userDetails = await pool.query(`SELECT ${potentialColumns.join(', ')} FROM users WHERE id = $1`, [user.id]);
        console.log('User details:', JSON.stringify(userDetails.rows[0], null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
