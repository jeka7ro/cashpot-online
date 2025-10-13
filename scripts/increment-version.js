import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const versionFilePath = path.join(__dirname, '../version.json')

// Read current version
const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'))

// Increment build number
versionData.build += 1

// Update build date
versionData.buildDate = new Date().toISOString()

// Auto-increment patch version (7.0.1 -> 7.0.2)
const versionParts = versionData.version.split('.')
versionParts[2] = parseInt(versionParts[2]) + 1
versionData.version = versionParts.join('.')

// Write back to file
fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2))

console.log(`✅ Version updated to ${versionData.version} (Build #${versionData.build})`)
console.log(`📅 Build date: ${versionData.buildDate}`)

