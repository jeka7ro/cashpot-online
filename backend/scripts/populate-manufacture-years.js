#!/usr/bin/env node

/**
 * Script to populate manufacture_year for slots based on serial numbers
 * Usage: node populate-manufacture-years.js <path-to-serial-years.json>
 * 
 * Expected JSON format:
 * [
 *   { "serial_number": "149616", "manufacture_year": 2020 },
 *   { "serial_number": "149597", "manufacture_year": 2019 },
 *   ...
 * ]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

// PostgreSQL configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function populateManufactureYears() {
  try {
    // Get the JSON file path from command line arguments
    const jsonFilePath = process.argv[2];
    
    if (!jsonFilePath) {
      console.log('❌ Usage: node populate-manufacture-years.js <path-to-serial-years.json>');
      console.log('\n📋 Expected JSON format:');
      console.log('[');
      console.log('  { "serial_number": "149616", "manufacture_year": 2020 },');
      console.log('  { "serial_number": "149597", "manufacture_year": 2019 }');
      console.log(']');
      process.exit(1);
    }

    // Read the JSON file
    if (!fs.existsSync(jsonFilePath)) {
      console.log(`❌ File not found: ${jsonFilePath}`);
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    console.log(`📊 Loaded ${data.length} serial number entries`);

    // Connect to database
    console.log('🔌 Connecting to PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');

    let successCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;

    console.log('\n🔄 Updating manufacture years...\n');

    for (const entry of data) {
      const { serial_number, manufacture_year } = entry;

      if (!serial_number || !manufacture_year) {
        console.log(`⚠️  Skipping invalid entry: ${JSON.stringify(entry)}`);
        errorCount++;
        continue;
      }

      try {
        const result = await client.query(
          'UPDATE slots SET manufacture_year = $1 WHERE serial_number = $2',
          [manufacture_year, serial_number]
        );

        if (result.rowCount > 0) {
          console.log(`✅ ${serial_number} → ${manufacture_year}`);
          successCount++;
        } else {
          console.log(`⚠️  ${serial_number} not found in database`);
          notFoundCount++;
        }
      } catch (error) {
        console.log(`❌ Error updating ${serial_number}: ${error.message}`);
        errorCount++;
      }
    }

    client.release();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`⚠️  Not found in database: ${notFoundCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📋 Total processed: ${data.length}`);
    console.log('='.repeat(60));

    if (successCount > 0) {
      console.log('\n🎉 Manufacture years populated successfully!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

populateManufactureYears();

