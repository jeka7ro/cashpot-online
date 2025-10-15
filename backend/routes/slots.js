import express from 'express'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const slots = [
      {
        _id: '1',
        slotId: 'SLOT-001',
        game: 'Book of Ra',
        location: 'Locația Centru',
        payout: '95%',
        status: 'Activ',
        createdAt: new Date()
      }
    ]
    res.json(slots)
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching slots' })
  }
})

// POST endpoint pentru crearea de sloturi (import din Cyber)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { serial_number, provider, cabinet, game_mix, status, location, notes } = req.body
    
    // Validate required fields
    if (!serial_number) {
      return res.status(400).json({ 
        success: false, 
        error: 'Numărul serial este obligatoriu' 
      })
    }

    // Create new slot with unique ID
    const newSlot = {
      _id: Date.now().toString(),
      serial_number,
      provider: provider || 'Unknown',
      cabinet: cabinet || 'Unknown', 
      game_mix: game_mix || 'Unknown',
      status: status || 'Active',
      location: location || 'Unknown',
      notes: notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: req.user?.username || 'system'
    }

    console.log('✅ New slot created:', newSlot)
    
    res.status(201).json({
      success: true,
      message: 'Slot creat cu succes',
      data: newSlot
    })
    
  } catch (error) {
    console.error('❌ Error creating slot:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Eroare la crearea slotului' 
    })
  }
})

export default router
