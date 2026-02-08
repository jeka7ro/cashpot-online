import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const sheetUrl = 'https://docs.google.com/spreadsheets/d/1Z9kCL17y4RrI_tjuG8AipY1Hn7RdF4rbWD0bz0oKwQE/edit?gid=1033202595#gid=1033202595';

async function run() {
    console.log('Testing Google Sheet Import...');
    console.log('URL:', sheetUrl);

    let csvUrl = sheetUrl;
    if (sheetUrl.includes('/edit')) {
        const sheetId = sheetUrl.match(/\/d\/(.*?)\//)?.[1];
        const gid = sheetUrl.match(/gid=(\d+)/)?.[1] || '0';
        csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    }
    console.log('CSV URL:', csvUrl);

    try {
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        console.log(`Total rows: ${lines.length}`);

        const rows = lines.slice(1);

        // Check for Turk Kebab
        const turkKebabRows = rows.filter(row => row.toLowerCase().includes('turk') || row.toLowerCase().includes('kebab'));
        console.log(`Found ${turkKebabRows.length} potential Turk Kebab rows in CSV.`);

        if (turkKebabRows.length > 0) {
            console.log('Sample row:', turkKebabRows[0]);
            // parse it
            const values = parseCsvRow(turkKebabRows[0]);
            console.log('Parsed values:', values);
            console.log('Original Amount String:', values[2]);
            console.log('Parsed Amount Result:', parseAmount(values[2]));
        }

        // Check DB connection
        const { Pool } = pg;
        console.log('Connecting to DB:', process.env.DATABASE_URL ? 'URL defined' : 'URL MISSING');
        if (!process.env.DATABASE_URL) {
            console.error("DATABASE_URL is missing from .env");
            return;
        }

        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        try {
            const res = await pool.query("SELECT to_regclass('public.expenditures_sync') as exists");
            if (!res.rows[0].exists) {
                console.log('Table expenditures_sync DOES NOT EXIST in this DB.');
                // List tables
                const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
                console.log('Tables in DB:', tables.rows.map(r => r.table_name).join(', '));
            } else {
                const countRes = await pool.query('SELECT count(*) FROM expenditures_sync');
                console.log('DB Connection OK. Total records in expenditures_sync:', countRes.rows[0].count);

                // Check for specific records in DB
                const dbRes = await pool.query("SELECT * FROM expenditures_sync WHERE description ILIKE '%Turk Kebab%'");
                console.log(`Found ${dbRes.rows.length} records in DB matching 'Turk Kebab'`);
                if (dbRes.rows.length > 0) {
                    console.log('Sample DB record:', dbRes.rows[0]);
                }
            }
        } catch (e) {
            console.error('DB Error:', e.message);
        } finally {
            await pool.end();
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

function parseCsvRow(row) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    return values;
}

function parseAmount(amountStr) {
    if (!amountStr) return 0;

    const amountStrClean = String(amountStr).trim();
    // Elimină spații și separatori de mii
    let cleanAmount = amountStrClean.replace(/\s/g, '');

    // Strategie: dacă există virgulă, folosește-o ca separator zecimal (format românesc)
    if (amountStrClean.includes(',')) {
        // Format românesc: 1234,56 sau 1.234,56
        cleanAmount = amountStrClean.replace(/\./g, '').replace(',', '.');
    } else if (amountStrClean.includes('.') && amountStrClean.split('.').length === 2) {
        // Format englez: 1234.56 (un singur punct = separator zecimal)
        const parts = amountStrClean.split('.');
        if (parts[1].length <= 3) {
            // Probabil separator zecimal
            cleanAmount = amountStrClean;
        } else {
            // Probabil separator de mii
            cleanAmount = amountStrClean.replace(/\./g, '');
        }
    } else if (amountStrClean.includes('.')) {
        // Multiple puncte = separator de mii românesc
        cleanAmount = amountStrClean.replace(/\./g, '');
    }

    const amount = parseFloat(cleanAmount);
    return amount;
}

// Add this to run():
// ...
// console.log('Parsed values:', values);
// console.log('Parsed Amount:', parseAmount(values[2]));


run();
