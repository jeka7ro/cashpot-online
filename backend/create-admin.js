import bcryptjs from 'bcryptjs'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

async function createAdmin() {
  const db = await open({
    filename: './cashpot.db',
    driver: sqlite3.Database
  })

  const hashedPassword = await bcryptjs.hash('admin123', 10)
  
  try {
    await db.run(
      'INSERT OR IGNORE INTO users (username, password, fullName, email, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      ['admin', hashedPassword, 'Administrator Sistem', 'admin@cashpot-v7.com', 'admin', 'active']
    )
    
    console.log('✅ Admin user created/updated successfully')
    console.log('📧 Username: admin')
    console.log('🔑 Password: admin123')
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message)
  } finally {
    await db.close()
  }
}

createAdmin().catch(console.error)
