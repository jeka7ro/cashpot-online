import express from 'express'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const invoices = [
      {
        _id: '1',
        invoiceNumber: 'INV-2024-001',
        customer: 'BRML Industries',
        amount: '15000',
        status: 'Platit',
        dueDate: '31.12.2024',
        createdAt: new Date()
      }
    ]
    res.json(invoices)
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching invoices' })
  }
})

export default router
