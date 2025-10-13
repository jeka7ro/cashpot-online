import express from 'express'
import Company from '../models/Company.js'
import { body, validationResult } from 'express-validator'
import XLSX from 'xlsx'

const router = express.Router()

// Get all companies
router.get('/', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 15 } = req.query
    
    let query = {}
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { license: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } }
      ]
    }
    
    if (status) {
      query.status = status
    }
    
    const companies = await Company.find(query)
      .populate('createdBy', 'username fullName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
    
    const total = await Company.countDocuments(query)
    
    res.json(companies)
  } catch (error) {
    console.error('Get companies error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching companies'
    })
  }
})

// Get single company
router.get('/:id', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('createdBy', 'username fullName')
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      })
    }
    
    res.json(company)
  } catch (error) {
    console.error('Get company error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching company'
    })
  }
})

// Create company
router.post('/', [
  body('name').notEmpty().withMessage('Company name is required'),
  body('license').notEmpty().withMessage('License number is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('contactPerson').notEmpty().withMessage('Contact person is required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      })
    }

    const companyData = {
      ...req.body,
      createdBy: req.user?.id || '000000000000000000000000' // Default admin ID
    }

    const company = new Company(companyData)
    await company.save()
    
    res.status(201).json(company)
  } catch (error) {
    console.error('Create company error:', error)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Company with this license already exists'
      })
    }
    res.status(500).json({
      success: false,
      message: 'Error creating company'
    })
  }
})

// Update company
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('Company name cannot be empty'),
  body('license').optional().notEmpty().withMessage('License number cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().notEmpty().withMessage('Phone number cannot be empty'),
  body('address').optional().notEmpty().withMessage('Address cannot be empty'),
  body('contactPerson').optional().notEmpty().withMessage('Contact person cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      })
    }

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      })
    }
    
    res.json(company)
  } catch (error) {
    console.error('Update company error:', error)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Company with this license already exists'
      })
    }
    res.status(500).json({
      success: false,
      message: 'Error updating company'
    })
  }
})

// Delete company
router.delete('/:id', async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id)
    
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      })
    }
    
    res.json({
      success: true,
      message: 'Company deleted successfully'
    })
  } catch (error) {
    console.error('Delete company error:', error)
    res.status(500).json({
      success: false,
      message: 'Error deleting company'
    })
  }
})

// Export companies
router.get('/export/excel', async (req, res) => {
  try {
    const companies = await Company.find().populate('createdBy', 'username fullName')
    
    const data = companies.map(company => ({
      'Nume Companie': company.name,
      'Licență': company.license,
      'Email': company.email,
      'Telefon': company.phone,
      'Adresă': company.address,
      'Contact': company.contactPerson,
      'Status': company.status,
      'Creat de': company.createdBy?.fullName || 'N/A',
      'Data Creării': company.createdAt.toLocaleDateString('ro-RO')
    }))
    
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Companii')
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=companii.xlsx')
    res.send(buffer)
  } catch (error) {
    console.error('Export companies error:', error)
    res.status(500).json({
      success: false,
      message: 'Error exporting companies'
    })
  }
})

export default router
