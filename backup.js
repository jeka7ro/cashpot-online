import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import dotenv from 'dotenv'
import archiver from 'archiver'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config()

// Configure AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

const isS3Enabled = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)

/**
 * Create a backup of the database and uploads folder
 */
export async function createBackup() {
  try {
    console.log('🔄 Starting backup process...')
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `cashpot-backup-${timestamp}.zip`
    const backupPath = path.join(__dirname, 'temp', backupFileName)
    
    // Ensure temp directory exists
    const tempDir = path.join(__dirname, 'temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    // Create zip archive
    const output = fs.createWriteStream(backupPath)
    const archive = archiver('zip', { zlib: { level: 9 } })
    
    return new Promise((resolve, reject) => {
      output.on('close', async () => {
        console.log(`📦 Backup archive created: ${archive.pointer()} bytes`)
        
        if (isS3Enabled) {
          try {
            // Upload to S3
            const fileContent = fs.readFileSync(backupPath)
            const uploadParams = {
              Bucket: process.env.AWS_S3_BUCKET,
              Key: `backups/${backupFileName}`,
              Body: fileContent,
              ContentType: 'application/zip',
              Metadata: {
                'backup-type': 'full',
                'created-at': new Date().toISOString(),
                'app-version': 'cashpot-v7'
              }
            }
            
            await s3Client.send(new PutObjectCommand(uploadParams))
            console.log('☁️ Backup uploaded to AWS S3 successfully!')
            
            // Clean up local temp file
            fs.unlinkSync(backupPath)
            console.log('🗑️ Local temp file cleaned up')
            
            resolve({
              success: true,
              message: 'Backup created and uploaded to AWS S3',
              fileName: backupFileName,
              size: archive.pointer(),
              location: 'AWS S3'
            })
          } catch (error) {
            console.error('❌ Error uploading to S3:', error)
            reject(error)
          }
        } else {
          console.log('💾 Backup saved locally (AWS not configured)')
          resolve({
            success: true,
            message: 'Backup created locally',
            fileName: backupFileName,
            size: archive.pointer(),
            location: 'Local storage'
          })
        }
      })
      
      archive.on('error', (err) => {
        console.error('❌ Archive error:', err)
        reject(err)
      })
      
      archive.pipe(output)
      
      // Add database file
      const dbPath = path.join(__dirname, 'cashpot.db')
      if (fs.existsSync(dbPath)) {
        archive.file(dbPath, { name: 'database/cashpot.db' })
        console.log('📊 Database added to backup')
      }
      
      // Add uploads folder
      const uploadsPath = path.join(__dirname, 'uploads')
      if (fs.existsSync(uploadsPath)) {
        archive.directory(uploadsPath, 'uploads')
        console.log('📁 Uploads folder added to backup')
      }
      
      // Add configuration files
      const configFiles = ['.env', 'package.json']
      configFiles.forEach(file => {
        const filePath = path.join(__dirname, file)
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: `config/${file}` })
        }
      })
      console.log('⚙️ Configuration files added to backup')
      
      archive.finalize()
    })
  } catch (error) {
    console.error('❌ Backup failed:', error)
    throw error
  }
}

/**
 * Schedule automatic backups
 */
export function scheduleBackups() {
  if (!process.env.AUTO_BACKUP_ENABLED || process.env.AUTO_BACKUP_ENABLED !== 'true') {
    console.log('📋 Automatic backups disabled')
    return
  }
  
  const intervalHours = parseInt(process.env.BACKUP_INTERVAL_HOURS) || 6
  const intervalMs = intervalHours * 60 * 60 * 1000 // Convert to milliseconds
  
  console.log(`⏰ Scheduling automatic backups every ${intervalHours} hours`)
  
  // Create initial backup
  setTimeout(() => {
    createBackup().catch(console.error)
  }, 5000) // Wait 5 seconds after server start
  
  // Schedule recurring backups
  setInterval(() => {
    createBackup().catch(console.error)
  }, intervalMs)
}

/**
 * Manual backup trigger (for API endpoint)
 */
export async function triggerManualBackup() {
  try {
    const result = await createBackup()
    return result
  } catch (error) {
    throw new Error(`Backup failed: ${error.message}`)
  }
}


