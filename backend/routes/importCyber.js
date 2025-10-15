import express from 'express'
import { getMarinaConnection } from '../config/marina.js'

const router = express.Router()

// Import slots from Marina
router.post('/slots/import-marina', async (req, res) => {
  try {
    const { items } = req.body
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' })
    }

    const marinaPool = getMarinaConnection()
    const connection = await marinaPool.getConnection()
    
    let imported = 0
    let errors = []

    for (const item of items) {
      try {
        // Check if slot already exists by serial number
        const existingQuery = 'SELECT id FROM slots WHERE serial_number = ?'
        const [existingRows] = await connection.execute(existingQuery, [item.serial_number])
        
        if (existingRows.length > 0) {
          // Update existing slot
          const updateQuery = `
            UPDATE slots SET 
              provider = ?,
              cabinet = ?,
              game_mix = ?,
              status = ?,
              location = ?,
              last_updated = NOW()
            WHERE serial_number = ?
          `
          await connection.execute(updateQuery, [
            item.provider,
            item.cabinet,
            item.game_mix,
            item.status,
            item.location,
            item.serial_number
          ])
        } else {
          // Insert new slot
          const insertQuery = `
            INSERT INTO slots (
              serial_number, provider, cabinet, game_mix, 
              status, location, created_at, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
          `
          await connection.execute(insertQuery, [
            item.serial_number,
            item.provider,
            item.cabinet,
            item.game_mix,
            item.status,
            item.location
          ])
        }
        
        imported++
      } catch (itemError) {
        console.error(`Error importing slot ${item.serial_number}:`, itemError)
        errors.push({
          serial_number: item.serial_number,
          error: itemError.message
        })
      }
    }
    
    connection.release()
    
    res.json({
      imported,
      errors: errors.length,
      errorDetails: errors
    })
  } catch (error) {
    console.error('Error importing slots from Marina:', error)
    res.status(500).json({ error: 'Failed to import slots from Marina' })
  }
})

// Import locations from Marina
router.post('/locations/import-marina', async (req, res) => {
  try {
    const { items } = req.body
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' })
    }

    const marinaPool = getMarinaConnection()
    const connection = await marinaPool.getConnection()
    
    let imported = 0
    let errors = []

    for (const item of items) {
      try {
        // Check if location already exists by name
        const existingQuery = 'SELECT id FROM locations WHERE name = ?'
        const [existingRows] = await connection.execute(existingQuery, [item.name])
        
        if (existingRows.length > 0) {
          // Update existing location
          const updateQuery = `
            UPDATE locations SET 
              address = ?,
              city = ?,
              company = ?,
              surface_area = ?,
              status = ?,
              last_updated = NOW()
            WHERE name = ?
          `
          await connection.execute(updateQuery, [
            item.address,
            item.city,
            item.company,
            item.surface_area,
            item.status,
            item.name
          ])
        } else {
          // Insert new location
          const insertQuery = `
            INSERT INTO locations (
              name, address, city, company, 
              surface_area, status, created_at, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
          `
          await connection.execute(insertQuery, [
            item.name,
            item.address,
            item.city,
            item.company,
            item.surface_area,
            item.status
          ])
        }
        
        imported++
      } catch (itemError) {
        console.error(`Error importing location ${item.name}:`, itemError)
        errors.push({
          name: item.name,
          error: itemError.message
        })
      }
    }
    
    connection.release()
    
    res.json({
      imported,
      errors: errors.length,
      errorDetails: errors
    })
  } catch (error) {
    console.error('Error importing locations from Marina:', error)
    res.status(500).json({ error: 'Failed to import locations from Marina' })
  }
})

export default router
