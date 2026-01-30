
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env
const envPath = path.resolve(__dirname, 'backend/.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Fallback to defaults if env vars are missing (based on typical local setup)
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cashpot';

console.log('Connecting to database...');

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkIndexes() {
  try {
    await client.connect();
    console.log('Connected!');

    const tables = ['incasari', 'expenditures', 'incasari_daily']; // Guessing table names, will update based on results

    // First, list all tables to be sure
    const resTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables found:', resTables.rows.map(r => r.table_name).join(', '));

    // List tables
    console.log('Tables found:', resTables.rows.map(r => r.table_name).join(', '));

    // Hardcoded check for expenditures
    const hasExpenditures = resTables.rows.some(r => r.table_name === 'expenditures');
    const hasExpendituresSync = resTables.rows.some(r => r.table_name === 'expenditures_sync');
    console.log('Has expenditures table:', hasExpenditures);
    console.log('Has expenditures_sync table:', hasExpendituresSync);

    const relevantTables = resTables.rows.map(r => r.table_name).filter(t => t.includes('expenditure'));

    for (const table of relevantTables) {
      console.log(`\nIndexes for table: ${table}`);
      const resIndexes = await client.query(`
        SELECT
            indexname,
            indexdef
        FROM
            pg_indexes
        WHERE
            tablename = $1;
      `, [table]);

      if (resIndexes.rows.length === 0) {
        console.log('  No indexes found!');
      } else {
        resIndexes.rows.forEach(idx => {
          console.log(`  - ${idx.indexname}: ${idx.indexdef}`);
        });
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkIndexes();
