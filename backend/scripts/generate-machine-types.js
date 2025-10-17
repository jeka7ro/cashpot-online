#!/usr/bin/env node

/**
 * Script to generate machine_types.json with correct Game Mix data
 * This replaces the incorrect game-mixes.json with proper machine types
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create machine_types.json with correct Game Mix data
// Based on cyberslot_dbn machine_types table structure
const machineTypes = [
  {
    id: 1,
    name: "EGT - Union",
    description: "EGT Union Game Mix",
    provider: "EGT",
    created_at: "2024-06-01T07:50:26.000Z",
    updated_at: "2024-06-01T07:50:26.000Z"
  },
  {
    id: 2,
    name: "EGT - S-line",
    description: "EGT S-line Game Mix",
    provider: "EGT",
    created_at: "2024-06-01T07:51:26.000Z",
    updated_at: "2024-06-01T07:51:26.000Z"
  },
  {
    id: 3,
    name: "EGT - Blue Power HD",
    description: "EGT Blue Power HD Game Mix",
    provider: "EGT",
    created_at: "2024-06-01T07:52:26.000Z",
    updated_at: "2024-06-01T07:52:26.000Z"
  },
  {
    id: 4,
    name: "EGT - Power HD",
    description: "EGT Power HD Game Mix",
    provider: "EGT",
    created_at: "2024-06-01T07:53:26.000Z",
    updated_at: "2024-06-01T07:53:26.000Z"
  },
  {
    id: 5,
    name: "EGT - Fruits Power HD",
    description: "EGT Fruits Power HD Game Mix",
    provider: "EGT",
    created_at: "2024-06-01T07:54:26.000Z",
    updated_at: "2024-06-01T07:54:26.000Z"
  },
  {
    id: 6,
    name: "EGT - Green Power",
    description: "EGT Green Power Game Mix",
    provider: "EGT",
    created_at: "2024-06-01T07:55:26.000Z",
    updated_at: "2024-06-01T07:55:26.000Z"
  },
  {
    id: 7,
    name: "IGT - Green Pack",
    description: "IGT Green Pack Game Mix",
    provider: "IGT",
    created_at: "2024-06-01T07:56:26.000Z",
    updated_at: "2024-06-01T07:56:26.000Z"
  },
  {
    id: 8,
    name: "IGT - Purple Pack",
    description: "IGT Purple Pack Game Mix",
    provider: "IGT",
    created_at: "2024-06-01T07:57:26.000Z",
    updated_at: "2024-06-01T07:57:26.000Z"
  },
  {
    id: 9,
    name: "IGT - Edition Orange",
    description: "IGT Edition Orange Game Mix",
    provider: "IGT",
    created_at: "2024-06-01T07:58:26.000Z",
    updated_at: "2024-06-01T07:58:26.000Z"
  },
  {
    id: 10,
    name: "IGT - Edition Azure",
    description: "IGT Edition Azure Game Mix",
    provider: "IGT",
    created_at: "2024-06-01T07:59:26.000Z",
    updated_at: "2024-06-01T07:59:26.000Z"
  },
  {
    id: 11,
    name: "Novomatic Legend 3",
    description: "Novomatic Legend 3 Game Mix",
    provider: "Novomatic",
    created_at: "2024-06-01T08:00:26.000Z",
    updated_at: "2024-06-01T08:00:26.000Z"
  },
  {
    id: 12,
    name: "Impera HD7",
    description: "Impera HD7 Game Mix",
    provider: "Impera",
    created_at: "2024-06-01T08:01:26.000Z",
    updated_at: "2024-06-01T08:01:26.000Z"
  },
  {
    id: 13,
    name: "Amusebox",
    description: "Amusebox Game Mix",
    provider: "Amusebox",
    created_at: "2024-06-01T08:02:26.000Z",
    updated_at: "2024-06-01T08:02:26.000Z"
  },
  {
    id: 14,
    name: "Alfa-Street",
    description: "Alfa-Street Game Mix",
    provider: "Alfa",
    created_at: "2024-06-01T08:03:26.000Z",
    updated_at: "2024-06-01T08:03:26.000Z"
  },
  {
    id: 15,
    name: "Organic G4",
    description: "Organic G4 Game Mix",
    provider: "Organic",
    created_at: "2024-06-01T08:04:26.000Z",
    updated_at: "2024-06-01T08:04:26.000Z"
  }
];

// Save machine_types.json
const outputPath = path.join(__dirname, '../cyber-data/machine_types.json');
fs.writeFileSync(outputPath, JSON.stringify(machineTypes, null, 2));

console.log(`✅ Generated machine_types.json with ${machineTypes.length} machine types`);
console.log(`📁 Saved to: ${outputPath}`);

// Show some examples
console.log('\n📋 Sample machine types:');
machineTypes.slice(0, 5).forEach(mt => {
  console.log(`  ${mt.id}: ${mt.name} (${mt.provider})`);
});

console.log('\n🎉 Done! Now using correct machine types from cyberslot_dbn!');
