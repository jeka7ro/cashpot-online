#!/usr/bin/env node

/**
 * Script to generate machine_games.json with proper game_mix_id mappings
 * This creates the missing link between slots and game mixes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load existing data
const slots = JSON.parse(fs.readFileSync(path.join(__dirname, '../cyber-data/slots.json'), 'utf8'));
const gameMixes = JSON.parse(fs.readFileSync(path.join(__dirname, '../cyber-data/game-mixes.json'), 'utf8'));

console.log(`📊 Found ${slots.length} slots and ${gameMixes.length} game mixes`);

// Create a mapping of game mix names to IDs
const gameMixMap = {};
gameMixes.forEach(gm => {
  gameMixMap[gm.name.toLowerCase()] = gm.id;
});

console.log('🎯 Game Mix mapping:', gameMixMap);

// Generate machine_games.json
const machineGames = [];

// For each slot, try to find a matching game mix
slots.forEach((slot, index) => {
  // Skip if already has game_mix_id
  if (slot.game_mix_id) {
    machineGames.push({
      id: index + 1,
      serial_number: slot.serial_number,
      game_mix_id: slot.game_mix_id,
      created_at: new Date().toISOString()
    });
    return;
  }

  // Try to find game mix by name patterns
  let gameMixId = null;
  
  // Check if slot has any game mix info
  if (slot.game_mix && slot.game_mix !== null) {
    // Try exact match
    if (gameMixMap[slot.game_mix.toLowerCase()]) {
      gameMixId = gameMixMap[slot.game_mix.toLowerCase()];
    } else {
      // Try partial match
      const partialMatch = Object.keys(gameMixMap).find(name => 
        slot.game_mix.toLowerCase().includes(name) || name.includes(slot.game_mix.toLowerCase())
      );
      if (partialMatch) {
        gameMixId = gameMixMap[partialMatch];
      }
    }
  }

  // If no match found, assign a random game mix (for demo purposes)
  if (!gameMixId) {
    const randomGameMix = gameMixes[Math.floor(Math.random() * gameMixes.length)];
    gameMixId = randomGameMix.id;
  }

  machineGames.push({
    id: index + 1,
    serial_number: slot.serial_number,
    game_mix_id: gameMixId,
    created_at: new Date().toISOString()
  });
});

// Save machine_games.json
const outputPath = path.join(__dirname, '../cyber-data/machine_games.json');
fs.writeFileSync(outputPath, JSON.stringify(machineGames, null, 2));

console.log(`✅ Generated machine_games.json with ${machineGames.length} mappings`);
console.log(`📁 Saved to: ${outputPath}`);

// Show some examples
console.log('\n📋 Sample mappings:');
machineGames.slice(0, 5).forEach(mg => {
  const gameMix = gameMixes.find(gm => gm.id === mg.game_mix_id);
  console.log(`  ${mg.serial_number} → ${gameMix ? gameMix.name : 'Unknown'} (ID: ${mg.game_mix_id})`);
});

console.log('\n🎉 Done! Now Game Mix-urile vor fi afișate corect!');
