import { S3Client } from '@aws-sdk/client-s3'
import multerS3 from 'multer-s3'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

// Configure AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  // Add signature version for better compatibility
  forcePathStyle: false,
  useAccelerateEndpoint: false
})

// Configure Multer to upload to S3
const uploadS3 = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'cashpot-documents',
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        uploadedBy: req.user?.username || 'system',
        uploadedAt: new Date().toISOString()
      })
    },
    key: (req, file, cb) => {
      // Generate unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      const ext = path.extname(file.originalname)
      const filename = `${file.fieldname}-${uniqueSuffix}${ext}`
      
      // Organize by file type
      let folder = 'documents'
      if (file.mimetype.startsWith('image/')) {
        folder = 'images'
      } else if (file.mimetype === 'application/pdf') {
        folder = 'pdfs'
      }
      
      cb(null, `${folder}/${filename}`)
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF, images, and common document formats
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/msword', // .doc
      'application/vnd.ms-excel' // .xls
    ]
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tip de fișier nepermis. Doar PDF, imagini și documente Office sunt acceptate.'))
    }
  }
})

// Fallback: Local storage (if AWS not configured)
const uploadLocal = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/')
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
})

// Export appropriate uploader based on AWS config
const upload = process.env.AWS_ACCESS_KEY_ID ? uploadS3 : uploadLocal
const isS3Enabled = !!process.env.AWS_ACCESS_KEY_ID

export { upload, s3Client, isS3Enabled }



