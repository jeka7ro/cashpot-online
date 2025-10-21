import express from 'express'
import multer from 'multer'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const router = express.Router()

// AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

const S3_BUCKET = process.env.S3_BUCKET_NAME || 'cashpot-documents'
const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL || 'https://cashpot-documents.s3.eu-central-1.amazonaws.com'

// Multer memory storage for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
})

// Helper: Upload to S3
const uploadToS3 = async (file, folder = 'brands') => {
  const timestamp = Date.now()
  const filename = `${folder}/${timestamp}-${file.originalname.replace(/\s+/g, '-')}`
  
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: filename,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read'
  })

  await s3Client.send(command)
  return `${S3_PUBLIC_BASE_URL}/${filename}`
}

// @route   GET /api/brands
// @desc    Get all brands
// @access  Private
router.get('/', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    
    // Get brands with slot counts from onjn_operators
    const result = await pool.query(`
      SELECT 
        b.*,
        COUNT(DISTINCT o.id) as total_slots,
        COUNT(DISTINCT CASE WHEN o.status = 'În exploatare' THEN o.id END) as active_slots,
        u.username as created_by_name,
        u.full_name as created_by_full_name
      FROM brands b
      LEFT JOIN onjn_operators o ON b.brand_name = o.brand_name
      LEFT JOIN users u ON b.created_by = u.id
      GROUP BY b.id, u.username, u.full_name
      ORDER BY b.brand_name ASC
    `)
    
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching brands:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// @route   GET /api/brands/:brandName
// @desc    Get single brand with all slots
// @access  Private
router.get('/:brandName', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { brandName } = req.params
    const decodedBrandName = decodeURIComponent(brandName)
    
    // Get brand info
    const brandResult = await pool.query(`
      SELECT b.*, u.username as created_by_name, u.full_name as created_by_full_name
      FROM brands b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.brand_name = $1
    `, [decodedBrandName])
    
    if (brandResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Brand not found' })
    }
    
    // Get all slots for this brand
    const slotsResult = await pool.query(`
      SELECT * FROM onjn_operators 
      WHERE brand_name = $1 
      ORDER BY city, slot_address
    `, [decodedBrandName])
    
    res.json({
      brand: brandResult.rows[0],
      slots: slotsResult.rows
    })
  } catch (error) {
    console.error('Error fetching brand details:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// @route   POST /api/brands
// @desc    Create or update brand
// @access  Private
router.post('/', upload.single('logo'), async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const userId = req.user?.userId || 1
    const { brand_name, company_name, logo_url, logo_source = 'manual', description, website_url } = req.body
    
    if (!brand_name) {
      return res.status(400).json({ success: false, error: 'Brand name is required' })
    }

    let brand_logo = logo_url // URL provided directly
    let finalLogoSource = logo_source

    // If file uploaded, upload to S3
    if (req.file) {
      brand_logo = await uploadToS3(req.file, 'brands')
      finalLogoSource = 'upload'
    }

    // Check if brand exists
    const existingBrand = await pool.query('SELECT id FROM brands WHERE brand_name = $1', [brand_name])

    if (existingBrand.rows.length > 0) {
      // Update existing brand
      const result = await pool.query(`
        UPDATE brands SET
          company_name = $1,
          brand_logo = COALESCE($2, brand_logo),
          logo_source = $3,
          description = $4,
          website_url = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE brand_name = $6
        RETURNING *
      `, [company_name, brand_logo, finalLogoSource, description, website_url, brand_name])
      
      res.json({ success: true, brand: result.rows[0], message: 'Brand updated successfully' })
    } else {
      // Insert new brand
      const result = await pool.query(`
        INSERT INTO brands (brand_name, company_name, brand_logo, logo_source, description, website_url, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [brand_name, company_name, brand_logo, finalLogoSource, description, website_url, userId])
      
      res.json({ success: true, brand: result.rows[0], message: 'Brand created successfully' })
    }
  } catch (error) {
    console.error('Error creating/updating brand:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// @route   DELETE /api/brands/:id
// @desc    Delete brand
// @access  Private (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const { id } = req.params
    
    await pool.query('DELETE FROM brands WHERE id = $1', [id])
    
    res.json({ success: true, message: 'Brand deleted successfully' })
  } catch (error) {
    console.error('Error deleting brand:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// @route   POST /api/brands/sync-from-onjn
// @desc    Auto-create brands from ONJN operators data
// @access  Private
router.post('/sync-from-onjn', async (req, res) => {
  try {
    const pool = req.app.get('pool')
    const userId = req.user?.userId || 1
    
    // Get unique brands from onjn_operators
    const brandsResult = await pool.query(`
      SELECT DISTINCT 
        brand_name, 
        company_name,
        COUNT(*) as slot_count
      FROM onjn_operators
      WHERE brand_name IS NOT NULL
      GROUP BY brand_name, company_name
      ORDER BY brand_name
    `)
    
    let created = 0
    let skipped = 0
    
    for (const row of brandsResult.rows) {
      const { brand_name, company_name } = row
      
      // Check if brand already exists
      const existing = await pool.query('SELECT id FROM brands WHERE brand_name = $1', [brand_name])
      
      if (existing.rows.length === 0) {
        await pool.query(`
          INSERT INTO brands (brand_name, company_name, created_by)
          VALUES ($1, $2, $3)
        `, [brand_name, company_name, userId])
        created++
      } else {
        skipped++
      }
    }
    
    res.json({ 
      success: true, 
      message: `Sync complete: ${created} brands created, ${skipped} already existed`,
      created,
      skipped
    })
  } catch (error) {
    console.error('Error syncing brands from ONJN:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router

