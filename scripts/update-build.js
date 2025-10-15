#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read current version.json
const versionPath = path.join(__dirname, '..', 'version.json')
const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'))

// Update build number and date
versionData.build = versionData.build + 1
versionData.buildDate = new Date().toISOString()

// Write back to file
fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2))

console.log(`✅ Build updated to #${versionData.build} at ${new Date().toLocaleString('ro-RO')}`)
