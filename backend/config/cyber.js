import mysql from 'mysql2/promise'

// Cyber Database Configuration (MySQL)
const cyberConfig = {
  host: '161.97.133.165',
  port: 3306, // MySQL default port
  user: 'eugen',
  password: '(@Ee0wRHVohZww33',
  database: 'cyberslot_dbn', // Correct database name from Power BI
  connectionLimit: 20,
  // Remove invalid options for MySQL2
  // acquireTimeout and timeout are not valid for MySQL2
}

// Create Cyber connection pool
const cyberPool = mysql.createPool(cyberConfig)

// Test Cyber connection
const testCyberConnection = async () => {
  try {
    const connection = await cyberPool.getConnection()
    console.log('✅ Cyber database connected successfully')
    
    // Test query to check if we can access the database
    const [rows] = await connection.execute('SELECT VERSION() as version')
    console.log('Cyber DB Version:', rows[0].version)
    
    connection.release()
    return true
  } catch (error) {
    console.error('❌ Cyber database connection failed:', error.message)
    return false
  }
}

// Get Cyber connection
const getCyberConnection = () => {
  return cyberPool
}

// Close Cyber connection
const closeCyberConnection = async () => {
  await cyberPool.end()
}

export {
  cyberPool,
  testCyberConnection,
  getCyberConnection,
  closeCyberConnection
}
