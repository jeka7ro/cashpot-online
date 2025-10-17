#!/usr/bin/env node

/**
 * Script to export machine_audit_summaries from Cyber database
 * This table contains complete information for each slot
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cyber database configuration
const cyberConfig = {
  host: process.env.CYBER_DB_HOST || 'localhost',
  user: process.env.CYBER_DB_USER || 'root',
  password: process.env.CYBER_DB_PASSWORD || '',
  database: 'cyberslot_dbn',
  port: process.env.CYBER_DB_PORT || 3306
};

async function exportMachineAuditSummaries() {
  let connection;
  
  try {
    console.log('🔌 Connecting to Cyber database...');
    connection = await mysql.createConnection(cyberConfig);
    console.log('✅ Connected to Cyber database');

    // Query machine_audit_summaries with all necessary fields
    const query = `
      SELECT 
        id,
        serial_number,
        location,
        cabinet,
        mix as game_mix,
        producator as provider,
        address,
        status,
        created_at,
        updated_at
      FROM machine_audit_summaries
      ORDER BY serial_number
    `;

    console.log('📊 Fetching machine audit summaries...');
    const [rows] = await connection.execute(query);
    
    console.log(`✅ Found ${rows.length} machine audit summaries`);

    // Save to JSON file
    const outputPath = path.join(__dirname, '../cyber-data/machine_audit_summaries.json');
    fs.writeFileSync(outputPath, JSON.stringify(rows, null, 2));
    
    console.log(`📁 Saved to: ${outputPath}`);
    
    // Show sample data
    console.log('\n📋 Sample data (first 3 records):');
    rows.slice(0, 3).forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.serial_number}`);
      console.log(`   Location: ${row.location}`);
      console.log(`   Cabinet: ${row.cabinet}`);
      console.log(`   Game Mix: ${row.game_mix}`);
      console.log(`   Provider: ${row.provider}`);
      console.log(`   Address: ${row.address}`);
    });

    console.log('\n🎉 Export completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Cannot connect to Cyber database.');
      console.log('   Creating empty file for manual import...');
      
      const outputPath = path.join(__dirname, '../cyber-data/machine_audit_summaries.json');
      fs.writeFileSync(outputPath, JSON.stringify([], null, 2));
      console.log(`📁 Empty file created at: ${outputPath}`);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

exportMachineAuditSummaries();

