import express from 'express'
import { createBackup, triggerManualBackup } from '../backup.js'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
})

const router = express.Router()

// Manual backup trigger
router.post('/create', async (req, res) => {
  try {
    console.log('🔄 Manual backup requested')
    const result = await triggerManualBackup()
    res.json({
      success: true,
      message: 'Backup created successfully',
      data: result
    })
  } catch (error) {
    console.error('❌ Manual backup failed:', error)
    res.status(500).json({
      success: false,
      message: 'Backup failed',
      error: error.message
    })
  }
})

// Backup status
router.get('/status', (req, res) => {
  const isS3Enabled = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  const autoBackupEnabled = process.env.AUTO_BACKUP_ENABLED === 'true'
  const backupInterval = parseInt(process.env.BACKUP_INTERVAL_HOURS) || 6
  
  res.json({
    success: true,
    data: {
      s3Enabled: isS3Enabled,
      autoBackupEnabled,
      backupIntervalHours: backupInterval,
      storageLocation: isS3Enabled ? 'AWS S3' : 'Local storage',
      bucketName: process.env.AWS_S3_BUCKET || 'Not configured',
      region: process.env.AWS_REGION || 'Not configured'
    }
  })
})

// Get database statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total records count for all tables
    const tables = [
      'companies', 'locations', 'providers', 'cabinets', 'game_mixes', 
      'slots', 'warehouse', 'metrology', 'jackpots', 'invoices', 
      'onjn_reports', 'legal_documents', 'users'
    ]
    
    const stats = {}
    let totalRecords = 0
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`)
        const count = parseInt(result.rows[0].count)
        stats[table] = count
        totalRecords += count
      } catch (error) {
        stats[table] = 0
      }
    }
    
    // Get database size (PostgreSQL specific)
    let databaseSize = 'N/A'
    try {
      const sizeResult = await pool.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `)
      databaseSize = sizeResult.rows[0].size
    } catch (error) {
      console.log('Could not get database size')
    }
    
    res.json({
      success: true,
      data: {
        totalRecords,
        tableStats: stats,
        databaseSize,
        lastBackup: null // Will be implemented with backup history
      }
    })
  } catch (error) {
    console.error('❌ Failed to get backup stats:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get backup statistics',
      error: error.message
    })
  }
})

// Export database as SQL (download)
router.get('/export', async (req, res) => {
  try {
    // This is a simplified export - in production, use pg_dump
    const tables = [
      'companies', 'locations', 'providers', 'cabinets', 'game_mixes', 
      'slots', 'warehouse', 'metrology', 'jackpots', 'invoices', 
      'onjn_reports', 'legal_documents', 'users'
    ]
    
    let sqlDump = '-- CASHPOT Database Backup\n'
    sqlDump += `-- Generated: ${new Date().toISOString()}\n\n`
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT * FROM ${table}`)
        if (result.rows.length > 0) {
          sqlDump += `\n-- Table: ${table}\n`
          sqlDump += `-- Records: ${result.rows.length}\n\n`
        }
      } catch (error) {
        sqlDump += `\n-- Error exporting ${table}: ${error.message}\n`
      }
    }
    
    res.setHeader('Content-Type', 'application/sql')
    res.setHeader('Content-Disposition', `attachment; filename="cashpot_backup_${new Date().toISOString().split('T')[0]}.sql"`)
    res.send(sqlDump)
  } catch (error) {
    console.error('❌ Failed to export database:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to export database',
      error: error.message
    })
  }
})

export default router
