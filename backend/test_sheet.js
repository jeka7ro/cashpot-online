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

    const { Pool } = pg;
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

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
            const values = parseCsvRow(turkKebabRows[0]);
            console.log('Parsed values:', values);
            console.log('Original Amount String:', values[2]);
            console.log('Parsed Amount Result:', parseAmount(values[2]));
        }

        // Check distinct data sources
        console.log('\n--- CHECKING DATA SOURCES ---');
        // Check schema for operational_date
        const schemaRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'expenditures_sync' AND column_name = 'operational_date'
        `);
        console.table(schemaRes.rows);

        // Check if there are any records for 2023-10-01 in ANY source with ANY time
        console.log('\n--- CHECKING 2023-10-01 RECORDS ---');
        const octRes = await pool.query(`
            SELECT id, operational_date, data_source 
            FROM expenditures_sync 
            WHERE operational_date >= '2023-10-01 00:00:00' AND operational_date < '2023-10-02 00:00:00'
        `);
        console.log(`Found ${octRes.rows.length} records for 2023-10-01 range.`);
        if (octRes.rows.length > 0) {
            console.log('Sample:', octRes.rows[0]);
        }

        // Check "Turk Kebab" presence across ALL sources
        console.log('\n--- CHECKING TURK KEBAB ACROSS ALL SOURCES ---');
        const kebabRes = await pool.query(`
            SELECT id, data_source, operational_date, amount, description 
            FROM expenditures_sync 
            WHERE description ILIKE '%Turk Kebab%'
        `);
        console.table(kebabRes.rows);

    } catch (e) {
        console.error('An error occurred:', e);
    } finally {
        await pool.end();
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

    // Detectare numere negative în paranteze: (20.500,00)
    let isNegative = false;
    if (cleanAmount.includes('(') && cleanAmount.includes(')')) {
        isNegative = true;
        cleanAmount = cleanAmount.replace(/\(/g, '').replace(/\)/g, '');
    }

    // Strategie: dacă există virgulă, folosește-o ca separator zecimal (format românesc)
    if (amountStrClean.includes(',')) {
        // Format românesc: 1234,56 sau 1.234,56
        cleanAmount = cleanAmount.replace(/\./g, '').replace(',', '.');
    } else if (amountStrClean.includes('.') && amountStrClean.split('.').length === 2) {
        // Format englez: 1234.56 (un singur punct = separator zecimal)
        const parts = cleanAmount.split('.');
        if (parts[1].length <= 3) {
            // Probabil separator zecimal
            cleanAmount = cleanAmount;
        } else {
            // Probabil separator de mii
            cleanAmount = cleanAmount.replace(/\./g, '');
        }
    } else if (amountStrClean.includes('.')) {
        // Multiple puncte = separator de mii românesc
        cleanAmount = cleanAmount.replace(/\./g, '');
    }

    let amount = parseFloat(cleanAmount);
    if (isNegative) {
        amount = -Math.abs(amount);
    }
    return amount;
}

run();
