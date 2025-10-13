import express from 'express'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const warehouse = [
      {
        _id: '1',
        itemName: 'Cabinet EGT',
        category: 'Echipamente',
        quantity: 10,
        supplier: 'EGT Digital',
        status: 'In Stock',
        createdAt: new Date()
      }
    ]
    res.json(warehouse)
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching warehouse items' })
  }
})

export default router
