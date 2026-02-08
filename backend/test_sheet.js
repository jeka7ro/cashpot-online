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

        // Check batches of rows to find why 1800+ are new
        console.log('\n--- Batch Duplicate Check (First 50 rows) ---');
        const { Pool } = pg;
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        let duplicatesFound = 0;
        let newFound = 0;

        try {
            for (const row of rows.slice(0, 50)) {
                const values = parseCsvRow(row);
                if (values.length < 5) continue;

                const [dateStr, explanation, amountStr, location, department, expenditureType] = values;

                const amount = parseAmount(amountStr);
                let operationalDate;
                if (dateStr && (dateStr.includes('.') || dateStr.includes('/') || dateStr.includes('-'))) {
                    if (dateStr.includes('.')) {
                        const dateParts = dateStr.split('.');
                        if (dateParts.length === 3) operationalDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
                    } else if (dateStr.includes('/')) {
                        const dateParts = dateStr.split('/');
                        if (dateParts.length === 3) operationalDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
                    } else {
                        operationalDate = dateStr;
                    }
                }

                const normalizedLocation = (location || 'Unknown').trim();
                const normalizedDepartment = (department || 'Unknown').trim();
                const normalizedType = (expenditureType || 'Unknown').trim();

                if (!operationalDate) continue;

                const query = `
                    SELECT id, data_source
                    FROM expenditures_sync
                    WHERE operational_date = $1
                        AND amount = $2
                        AND location_name = $3
                        AND department_name = $4
                        AND expenditure_type = $5
                    LIMIT 1
                `;

                const res = await pool.query(query, [operationalDate, amount, normalizedLocation, normalizedDepartment, normalizedType]);

                if (res.rows.length > 0) {
                    duplicatesFound++;
                    const src = res.rows[0].data_source;
                    if (src !== 'google_sheets') {
                        console.log(`[EXISTING DIFF SOURCE] Found duplicate with source '${src}' for ${amount} / ${normalizedDepartment}`);
                    }
                } else {
                    newFound++;
                    console.log(`[TRULY NEW?] Date: ${operationalDate}, Amount: ${amount}, Loc: "${normalizedLocation}", Dep: "${normalizedDepartment}", Type: "${normalizedType}"`);

                    // Deep debug for the first mismatch
                    if (newFound === 1) {
                        console.log('--- DEEP DEBUG FIRST MISMATCH ---');
                        const debugRes = await pool.query(`
                            FROM expenditures_sync 
                            WHERE operational_date = $1 AND data_source = 'google_sheets'
                        `, [operationalDate]);

                        console.log(`Found ${debugRes.rows.length} records for date ${operationalDate} in DB.`);

                        // Specific check for amount
                        const amountMatches = debugRes.rows.filter(r => Math.abs(Number(r.amount) - amount) < 0.01);
                        console.log(`Records matching amount ${amount}: ${amountMatches.length}`);

                        console.log('--- ALL DB AMOUNTS FOR THIS DATE ---');
                        debugRes.rows.forEach(r => {
                            console.log(`ID: ${r.id}, Amount: ${r.amount}, Loc: ${r.location_name}, Dep: ${r.department_name}`);
                        });
                        console.log('------------------------------------');

                        if (amountMatches.length > 0) {
                            amountMatches.forEach(r => {
                                console.log('Potential Match:', {
                                    id: r.id,
                                    dbLoc: r.location_name,
                                    csvLoc: normalizedLocation,
                                    locMatch: r.location_name === normalizedLocation,
                                    dbDep: r.department_name,
                                    csvDep: normalizedDepartment,
                                    depMatch: r.department_name === normalizedDepartment,
                                    dbType: r.expenditure_type,
                                    csvType: normalizedType,
                                    typeMatch: r.expenditure_type === normalizedType,
                                    typeHex: Buffer.from(r.expenditure_type).toString('hex'),
                                    csvTypeHex: Buffer.from(normalizedType).toString('hex')
                                });
                            });
                        }
                    }
                }
            }
            console.log(`Summary: ${duplicatesFound} duplicates, ${newFound} potential NEW records checked.`);

            // Check total count in DB
            const total = await pool.query("SELECT count(*) FROM expenditures_sync WHERE data_source='google_sheets'");
            console.log(`Total Google Sheets records in DB: ${total.rows[0].count}`);

        } catch (e) {
            console.error('DB Error:', e);
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
