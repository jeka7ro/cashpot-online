#!/usr/bin/env node

/**
 * Live Status Monitor for ONJN Scraping
 * Shows real-time progress of the scraping process
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

console.clear()

const getStatus = () => {
  const jsonPath = path.join(process.cwd(), 'backend', 'onjn-scraped-data.json')
  
  if (!fs.existsSync(jsonPath)) {
    return {
      slots: 0,
      size: '0KB',
      time: 'Never',
      exists: false
    }
  }
  
  try {
    const stats = fs.statSync(jsonPath)
    const content = fs.readFileSync(jsonPath, 'utf8')
    const slots = (content.match(/"serial_number"/g) || []).length
    const size = formatBytes(stats.size)
    const time = stats.mtime.toLocaleTimeString('ro-RO')
    
    return {
      slots,
      size,
      time,
      exists: true
    }
  } catch (error) {
    return {
      slots: 0,
      size: '0KB',
      time: 'Error',
      exists: false
    }
  }
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatPercent = (current, total) => {
  return ((current / total) * 100).toFixed(1)
}

const drawProgressBar = (current, total, width = 40) => {
  const percentage = current / total
  const filled = Math.round(width * percentage)
  const empty = width - filled
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `[${bar}] ${formatPercent(current, total)}%`
}

const monitor = () => {
  const status = getStatus()
  
  console.clear()
  console.log('🚀 ONJN SCRAPING - LIVE STATUS')
  console.log('══════════════════════════════════════════════')
  
  if (!status.exists) {
    console.log('❌ Fișierul JSON nu a fost creat încă...')
    console.log('⏳ Se așteaptă startarea procesului...')
    return
  }
  
  const targetSlots = 58533
  const targetPages = 1171
  const currentPages = Math.floor(status.slots / 50)
  
  console.log(`🎰 Sloturi scrapeate: ${status.slots.toLocaleString('ro-RO')} / ${targetSlots.toLocaleString('ro-RO')}`)
  console.log(`📊 Progres: ${drawProgressBar(status.slots, targetSlots)}`)
  console.log('')
  console.log(`📄 Pagini procesate: ${currentPages} / ${targetPages}`)
  console.log(`📊 Pages: ${drawProgressBar(currentPages, targetPages)}`)
  console.log('')
  console.log(`💾 Mărime fișier: ${status.size}`)
  console.log(`⏰ Ultima actualizare: ${status.time}`)
  console.log('')
  
  // Estimate remaining time
  if (status.slots > 0) {
    const remaining = targetSlots - status.slots
    const avgPerPage = status.slots / currentPages || 50
    const remainingPages = remaining / avgPerPage
    const estimatedMinutes = Math.round(remainingPages * 1.5) // ~1.5 sec per page
    
    console.log(`⏳ Timp estimat rămas: ~${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`)
  }
  
  console.log('══════════════════════════════════════════════')
  console.log('🔄 Actualizare automată la fiecare 5 secunde...')
  console.log('   (Apasă Ctrl+C pentru a ieși)')
}

// Start monitoring
console.log('🔍 Pornire monitor live...')
monitor()

const interval = setInterval(monitor, 5000) // Update every 5 seconds

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.clear()
  console.log('👋 Monitor oprit.')
  clearInterval(interval)
  process.exit(0)
})
