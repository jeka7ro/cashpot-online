import mysql from 'mysql2/promise'

// Marina Database Configuration (MySQL)
const marinaConfig = {
  host: '161.97.133.165',
  port: 3306, // MySQL default port
  user: 'eugen',
  password: '(@Ee0wRHVohZww33',
  database: 'cyberslot_dbn', // Correct database name from Power BI
  connectionLimit: 20,
  // Remove invalid options for MySQL2
  // acquireTimeout and timeout are not valid for MySQL2
}

// Create Marina connection pool
const marinaPool = mysql.createPool(marinaConfig)

// Test Marina connection
const testMarinaConnection = async () => {
  try {
    const connection = await marinaPool.getConnection()
    console.log('✅ Marina database connected successfully')
    
    // Test query to check if we can access the database
    const [rows] = await connection.execute('SELECT VERSION() as version')
    console.log('Marina DB Version:', rows[0].version)
    
    connection.release()
    return true
  } catch (error) {
    console.error('❌ Marina database connection failed:', error.message)
    return false
  }
}

// Get Marina connection
const getMarinaConnection = () => {
  return marinaPool
}

// Close Marina connection
const closeMarinaConnection = async () => {
  await marinaPool.end()
}

export {
  marinaPool,
  testMarinaConnection,
  getMarinaConnection,
  closeMarinaConnection
}
