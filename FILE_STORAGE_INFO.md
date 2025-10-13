# 📁 Sistem de Stocare Fișiere - CASHPOT V7

## 🎯 Sistemul de Upload Implementat

Aplicația CASHPOT V7 are un **sistem de upload hibrid** care poate funcționa în 2 moduri:

### 1. **Mod AWS S3** (RECOMANDAT pentru producție)
✅ Fișierele stocate permanent în cloud  
✅ Acces rapid din orice loc  
✅ Backup automat  
✅ Scalabil la sute de GB  
✅ **Cost: ~$0.023/GB/lună**

### 2. **Mod Local** (doar pentru development)
⚠️ Fișierele în folder `uploads/`  
⚠️ Se pierd la restart server (pe Render.com)  
⚠️ Doar pentru testare locală

---

## 🔧 Status Curent

### Aplicația TA folosește acum:
- **Mod:** Local Storage (temporar)
- **De ce?** Nu ai încă cheile AWS configurate

### Pentru a activa AWS S3:
Vezi ghidul complet: **[AWS_S3_SETUP.md](./AWS_S3_SETUP.md)**

---

## 📊 API Endpoints pentru Upload

### 1. Upload un singur fișier
```http
POST http://localhost:5001/api/upload
Content-Type: multipart/form-data

Body:
  file: [selectează fișier]
```

**Răspuns (Local):**
```json
{
  "success": true,
  "message": "File uploaded successfully to Local",
  "file": {
    "filename": "file-1633024800000-123456789.pdf",
    "originalname": "document.pdf",
    "size": 245678,
    "url": "/uploads/file-1633024800000-123456789.pdf",
    "storageType": "Local"
  }
}
```

**Răspuns (S3):**
```json
{
  "success": true,
  "message": "File uploaded successfully to S3",
  "file": {
    "filename": "pdfs/file-1633024800000-123456789.pdf",
    "originalname": "document.pdf",
    "size": 245678,
    "location": "https://cashpot-documents.s3.eu-central-1.amazonaws.com/pdfs/file-1633024800000-123456789.pdf",
    "url": "https://cashpot-documents.s3.eu-central-1.amazonaws.com/pdfs/file-1633024800000-123456789.pdf",
    "storageType": "S3"
  }
}
```

### 2. Upload mai multe fișiere
```http
POST http://localhost:5001/api/upload/multiple
Content-Type: multipart/form-data

Body:
  files: [selectează multiple fișiere]
```

### 3. Verifică status stocare
```http
GET http://localhost:5001/api/upload/status
```

**Răspuns:**
```json
{
  "success": true,
  "storageType": "Local",  // sau "AWS S3"
  "isS3Enabled": false,   // sau true
  "maxFileSize": "10MB",
  "allowedTypes": [
    "PDF",
    "Images (JPEG, PNG, GIF, WebP)",
    "Office Documents (Word, Excel)"
  ]
}
```

---

## 📋 Tipuri de Fișiere Acceptate

| Tip | Extensii | MIME Type |
|-----|----------|-----------|
| **PDF** | `.pdf` | `application/pdf` |
| **Imagini** | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` | `image/*` |
| **Word** | `.doc`, `.docx` | `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| **Excel** | `.xls`, `.xlsx` | `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

**Limită dimensiune:** 10 MB per fișier

---

## 🗂️ Structura Fișierelor în S3

Când AWS S3 e activat, fișierele sunt organizate automat:

```
cashpot-documents/  (bucket-ul tău)
│
├── pdfs/
│   ├── file-1633024800000-123456789.pdf
│   ├── file-1633024850000-987654321.pdf
│   └── contract-1633025000000-456123789.pdf
│
├── images/
│   ├── file-1633024900000-456789123.jpg
│   ├── logo-1633025000000-789123456.png
│   └── screenshot-1633025100000-321456789.webp
│
└── documents/
    ├── file-1633025200000-654987321.docx
    └── report-1633025300000-987321654.xlsx
```

---

## 🔐 Securitate Implementată

### Validări:
- ✅ Verificare tip fișier (extensie + MIME type)
- ✅ Limită dimensiune (max 10MB)
- ✅ Nume unice (timestamp + random)
- ✅ Metadata (cine a uploadat, când)

### Pentru AWS S3:
- ✅ Bucket privat (nu public)
- ✅ CORS configurat corect
- ✅ IAM permissions restrictive
- ✅ Encriptare disponibilă

---

## 💰 Costuri AWS S3

### Estimări realiste:

| Utilizare | Stocare | Cost/lună | Cost/an |
|-----------|---------|-----------|---------|
| **Mic** | 1 GB (100 PDF-uri) | $0.02 | $0.24 |
| **Mediu** | 10 GB (1000 PDF-uri) | $0.23 | $2.76 |
| **Mare** | 50 GB (5000 PDF-uri) | $1.15 | $13.80 |
| **Foarte Mare** | 100 GB | $2.30 | $27.60 |

**BONUS:** Primele 5 GB sunt GRATUITE în primul an (AWS Free Tier)!

### Calcul:
- **Stocare:** $0.023/GB/lună
- **Transfer OUT:** $0.09/GB (primele 1 GB/lună gratis)
- **Request-uri:** $0.005/1000 requests (aproape neglijabil)

**Un PDF mediu = ~500 KB = 2000 PDF-uri = 1 GB**

---

## 🚀 Cum folosești în aplicație?

### Frontend (React) - Exemplu upload:

```javascript
const handleFileUpload = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    const response = await axios.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    console.log('File uploaded:', response.data.file.url)
    // Salvează URL-ul în baza de date
    
  } catch (error) {
    console.error('Upload error:', error)
  }
}
```

### Salvare URL în baza de date:

După upload, primești un URL. Salvează-l în PostgreSQL:

```javascript
// Exemplu pentru document legal
const newDocument = {
  name: 'Contract ONJN 2025',
  type: 'Contract',
  fileUrl: response.data.file.url,  // URL-ul din S3 sau local
  uploadedBy: currentUser.id,
  uploadedAt: new Date()
}

await axios.post('/api/legalDocuments', newDocument)
```

---

## 📱 Cum se afișează fișierele?

### Pentru fișiere S3:
URL-ul e public și direct accesibil:
```html
<a href="https://cashpot-documents.s3.eu-central-1.amazonaws.com/pdfs/file-123.pdf" 
   target="_blank">
  Descarcă Document
</a>
```

### Pentru fișiere locale:
URL-ul e relativ la server:
```html
<a href="http://localhost:5001/uploads/file-123.pdf" 
   target="_blank">
  Descarcă Document
</a>
```

---

## 🔄 Migrare de la Local la S3

Când activezi S3:
1. ✅ Fișierele noi se uploadează automat în S3
2. ⚠️ Fișierele vechi (din `uploads/`) rămân local
3. 💡 Poți face o migrație manuală cu script

### Script migrare (pentru viitor):
```bash
# Uploadează toate fișierele locale în S3
aws s3 sync ./uploads/ s3://cashpot-documents/migrated/ --region eu-central-1
```

---

## 🛠️ Next Steps

### Imediat:
1. **[Configurează AWS S3](./AWS_S3_SETUP.md)** - ~15 minute
2. Testează upload-ul de PDF-uri
3. Verifică că fișierele apar în S3 Console

### Mai târziu (producție):
1. Activează **S3 Versioning** (backup la modificări)
2. Setează **Lifecycle Rules** (ștergere automată după X zile)
3. Activează **CloudFront CDN** (mai rapid la nivel global)
4. Configurează **S3 Intelligent-Tiering** (cost optimization)

---

## 📞 Support

**Probleme cu upload-ul?**
1. Verifică `/api/upload/status` - vezi ce mod folosești
2. Verifică log-urile serverului pentru erori
3. Verifică browser console pentru erori CORS

**Probleme cu AWS S3?**
1. Vezi [AWS_S3_SETUP.md](./AWS_S3_SETUP.md) - troubleshooting section
2. Verifică AWS CloudWatch pentru erori
3. Verifică IAM permissions

---

## 📚 Fișiere Relevante

```
backend/
├── config/
│   └── s3.js              # Configurație AWS S3 + Multer
├── routes/
│   └── upload.js          # API endpoints pentru upload
└── .env                   # Chei AWS (SECRETĂ!)

AWS_S3_SETUP.md            # Ghid complet AWS setup
FILE_STORAGE_INFO.md       # Acest fișier
```

---

**🎉 Sistemul de upload este GATA și funcțional!**

**Status actual:** Folosește stocare locală (temporară)  
**Pentru producție:** Configurează AWS S3 în ~15 minute

Vezi: **[AWS_S3_SETUP.md](./AWS_S3_SETUP.md)**



