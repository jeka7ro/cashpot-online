# 📤 Migrare PDF-uri: OneDrive → AWS S3

## 🎯 Obiectiv

Mută toate PDF-urile (1000+) din OneDrive în AWS S3 pentru acces rapid din aplicație.

---

## 📋 Metode de Migrare

### **Metoda 1: Upload Manual (pentru puține fișiere)**

#### Folosind AWS Console:
1. Intră în AWS Console → S3
2. Click pe bucket-ul tău (`cashpot-documents`)
3. Click pe folder `pdfs/`
4. Click **"Upload"**
5. Drag & Drop toate PDF-urile din OneDrive
6. Click **"Upload"**

**Limită:** Max 10GB per upload session  
**Timp:** Depinde de internet (100 PDF-uri = ~5 min)

---

### **Metoda 2: AWS CLI (RECOMANDAT pentru multe fișiere)**

#### Instalare AWS CLI:

**macOS:**
```bash
brew install awscli
```

Sau download de pe: https://aws.amazon.com/cli/

#### Configurare:
```bash
aws configure

# Introduce:
# AWS Access Key ID: [din AWS IAM]
# AWS Secret Access Key: [din AWS IAM]
# Default region: eu-central-1
# Default output: json
```

#### Upload toate PDF-urile:

```bash
# Sync întreg folder OneDrive → S3
aws s3 sync "/Users/eugeniucazmal/OneDrive/cashpot-pdfs" s3://cashpot-documents/pdfs/ --exclude "*.DS_Store" --exclude "*Thumbs.db"

# Sau doar PDF-uri:
aws s3 sync "/Users/eugeniucazmal/OneDrive/cashpot-pdfs" s3://cashpot-documents/pdfs/ --exclude "*" --include "*.pdf"
```

**Avantaje:**
- ✅ Upload automat în batch
- ✅ Resume dacă se întrerupe
- ✅ Progress bar
- ✅ Verificare automată

---

### **Metoda 3: Script Node.js (pentru organizare automată)**

Creez un script care:
1. Citește toate PDF-urile din OneDrive
2. Le organizează în S3 pe categorii
3. Salvează metadata în PostgreSQL

#### Script de migrare:

```javascript
// migrate-to-s3.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Configurare S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

const BUCKET = process.env.AWS_S3_BUCKET || 'cashpot-documents'
const ONEDRIVE_PATH = '/Users/eugeniucazmal/OneDrive/cashpot-pdfs' // SCHIMBĂ CU PATH-UL TĂU

async function uploadFile(filePath, s3Key) {
  const fileContent = fs.readFileSync(filePath)
  
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: fileContent,
    ContentType: 'application/pdf',
    Metadata: {
      'original-name': path.basename(filePath),
      'upload-date': new Date().toISOString()
    }
  })
  
  await s3Client.send(command)
  console.log(`✅ Uploaded: ${s3Key}`)
}

async function migrateAllPDFs() {
  console.log('🚀 Starting migration from OneDrive to S3...')
  
  const files = fs.readdirSync(ONEDRIVE_PATH)
  const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'))
  
  console.log(`📄 Found ${pdfFiles.length} PDF files`)
  
  let uploaded = 0
  let failed = 0
  
  for (const file of pdfFiles) {
    try {
      const localPath = path.join(ONEDRIVE_PATH, file)
      const s3Key = `pdfs/${file}`
      
      await uploadFile(localPath, s3Key)
      uploaded++
      
      // Progress
      if (uploaded % 10 === 0) {
        console.log(`📊 Progress: ${uploaded}/${pdfFiles.length}`)
      }
    } catch (error) {
      console.error(`❌ Failed to upload ${file}:`, error.message)
      failed++
    }
  }
  
  console.log('\n✨ Migration complete!')
  console.log(`✅ Uploaded: ${uploaded}`)
  console.log(`❌ Failed: ${failed}`)
}

migrateAllPDFs()
```

#### Rulare script:
```bash
cd /Users/eugeniucazmal/dev/cashpot_online/backend
node migrate-to-s3.js
```

---

### **Metoda 4: Organizare pe Categorii (RECOMANDAT)**

Dacă vrei să organizezi PDF-urile pe tipuri:

```javascript
// migrate-organized.js
const categories = {
  'contracts': ['contract', 'conventie', 'acord'],
  'licenses': ['licenta', 'autorizatie'],
  'invoices': ['factura', 'chitanta'],
  'reports': ['raport', 'situatie']
}

function getCategoryFromFilename(filename) {
  const lower = filename.toLowerCase()
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return category
    }
  }
  
  return 'documents' // default
}

async function migrateOrganized() {
  const files = fs.readdirSync(ONEDRIVE_PATH)
  const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'))
  
  for (const file of pdfFiles) {
    const category = getCategoryFromFilename(file)
    const localPath = path.join(ONEDRIVE_PATH, file)
    const s3Key = `pdfs/${category}/${file}`
    
    await uploadFile(localPath, s3Key)
  }
}
```

---

## 📊 Structură Finală în S3

După migrare, vei avea:

```
cashpot-documents/
├── pdfs/
│   ├── contracts/
│   │   ├── contract-onjn-2024.pdf
│   │   └── conventie-locatie-123.pdf
│   ├── licenses/
│   │   ├── licenta-a123.pdf
│   │   └── autorizatie-locatie-456.pdf
│   ├── invoices/
│   │   └── factura-2024-001.pdf
│   └── reports/
│       └── raport-onjn-martie.pdf
├── images/
└── documents/
```

---

## 🔄 Actualizare Bază de Date

După upload în S3, actualizează URL-urile în PostgreSQL:

```sql
-- Exemplu: Update legal documents cu URL-uri S3
UPDATE legal_documents 
SET file_url = REPLACE(
  file_url, 
  '/uploads/', 
  'https://cashpot-documents.s3.eu-central-1.amazonaws.com/pdfs/'
)
WHERE file_url LIKE '/uploads/%';
```

---

## ⚡ Migrare Incrementală (dacă ai multe fișiere)

Dacă ai 1000+ PDF-uri, le poți upload în batch-uri:

```bash
# Batch 1: Primele 100
aws s3 sync "/path/to/pdfs" s3://cashpot-documents/pdfs/ --exclude "*" --include "*.pdf" --max-items 100

# Batch 2: Următoarele 100
# etc...
```

Sau folosind script cu pauze:

```javascript
// Upload cu pauze pentru a evita rate limits
for (let i = 0; i < pdfFiles.length; i++) {
  await uploadFile(...)
  
  // Pauză la fiecare 100 fișiere
  if (i % 100 === 0 && i > 0) {
    console.log('⏸️  Pausing for 5 seconds...')
    await new Promise(resolve => setTimeout(resolve, 5000))
  }
}
```

---

## 🧪 Test După Migrare

1. **Verifică în AWS Console:**
   - S3 → cashpot-documents → pdfs/
   - Ar trebui să vezi toate fișierele

2. **Test API:**
```bash
curl http://localhost:5001/api/upload/status
# Ar trebui să răspundă cu "storageType": "AWS S3"
```

3. **Test upload nou:**
   - Încearcă să uploadezi un PDF din aplicație
   - Verifică că apare în S3

---

## 💰 Cost Final

**1000 PDF-uri × 500 KB = 500 MB**

- **Storage:** $0.023/GB × 0.5 GB = **$0.01/lună**
- **PUT requests:** $0.005/1000 × 1 = **$0.005 (one time)**
- **GET requests:** Primele 20,000 gratis

**TOTAL:** **< $0.05/lună** (5 cenți!)

---

## 🚨 Important

### Backup OneDrive
**NU șterge fișierele din OneDrive imediat!**

1. Verifică că toate s-au uploadat corect în S3
2. Testează access din aplicație
3. Păstrează backup în OneDrive 1-2 luni
4. Apoi poți arhiva/șterge

### Security
- ✅ Bucket-ul S3 e privat (nu public)
- ✅ Access doar prin IAM keys
- ✅ SSL/HTTPS pentru toate transferurile

---

## 📞 Dacă Ai Probleme

**Eroare: "Access Denied"**
- Verifică IAM permissions (AmazonS3FullAccess)
- Verifică region-ul (eu-central-1)

**Eroare: "Slow upload"**
- Folosește AWS CLI în loc de script Node.js
- Verifică conexiunea internet

**Prea multe fișiere?**
- Upload în batch-uri de 100
- Sau contactează AWS Support pentru increase limits

---

## ✅ Checklist

- [ ] Cont AWS creat
- [ ] S3 Bucket creat (`cashpot-documents`)
- [ ] IAM User cu S3 permissions
- [ ] Access Keys generate
- [ ] `.env` actualizat cu AWS keys
- [ ] Backend restart cu S3 enabled
- [ ] AWS CLI instalat (opțional)
- [ ] PDF-uri uploadate în S3
- [ ] Testate în aplicație
- [ ] Backup OneDrive păstrat

---

**Timp total estimat:** 30-60 minute (include configurare + upload 1000 PDFs)



