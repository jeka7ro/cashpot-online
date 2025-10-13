# 🚀 CONFIGURARE AWS S3 pentru CASHPOT V7

## ⚠️ IMPORTANT: Configurează AWS pentru salvare permanentă!

Momentan aplicația funcționează cu stocare locală, dar **toate datele se vor pierde** când faci deploy pe server sau restartezi sistemul.

Pentru a salva **PERMANENT** toate datele și fișierele pe AWS S3:

---

## 📋 Pasul 1: Creează cont AWS (GRATUIT primul an!)

1. **Mergi la:** https://aws.amazon.com/
2. **Click:** "Create an AWS Account"
3. **Completează:** email, parolă, nume
4. **Verifică:** email-ul
5. **Adaugă:** card (nu se taxează primul an - 5GB gratis!)

---

## 📦 Pasul 2: Creează S3 Bucket

1. **Login în AWS Console**
2. **Caută:** "S3" în bara de căutare
3. **Click:** "Create bucket"
4. **Completează:**
   - **Bucket name:** `cashpot-documents-[numele-tau]` (trebuie să fie unic global)
   - **AWS Region:** `eu-central-1` (Frankfurt - cel mai apropiat de România)
   - **Block Public Access:** LASĂ TOATE BIFATE ✅
5. **Click:** "Create bucket"

---

## 🔐 Pasul 3: Creează IAM User

1. **Caută:** "IAM" în AWS Console
2. **Click:** "Users" → "Create user"
3. **Username:** `cashpot-app-user`
4. **Access type:** Programmatic access (NU Console access)
5. **Click:** "Next"

### Setează permisiunile:
6. **Click:** "Attach policies directly"
7. **Caută și bifează:** "AmazonS3FullAccess"
8. **Click:** "Next" → "Create user"

---

## 🔑 Pasul 4: Obține Access Keys

1. **Click pe user-ul creat:** `cashpot-app-user`
2. **Tab:** "Security credentials"
3. **Click:** "Create access key"
4. **Selectează:** "Application running outside AWS"
5. **Click:** "Next" → "Create access key"

### ⚠️ SALVEAZĂ ACESTE CHEI ACUM!

Vei vedea:
- **Access Key ID:** (ex: `AKIAIOSFODNN7EXAMPLE`)
- **Secret Access Key:** (ex: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)

**COPIAZĂ-LE ÎN NOTEPAD!** Nu le vei mai putea vedea!

---

## ⚙️ Pasul 5: Configurează aplicația

### Editează fișierul `.env`:

```bash
cd /Users/eugen/Documents/cashpot_online/backend
nano .env
```

### Completează cu cheile tale AWS:

```env
# AWS Configuration - COMPLETEAZĂ CU CHEILE TALE!
AWS_ACCESS_KEY_ID=AICI_PUNE_ACCESS_KEY_ID_TAU
AWS_SECRET_ACCESS_KEY=AICI_PUNE_SECRET_ACCESS_KEY_TAU
AWS_REGION=eu-central-1
AWS_S3_BUCKET=cashpot-documents-numele-tau
```

### Exemplu complet:

```env
# Database Configuration
DATABASE_URL=sqlite:./cashpot.db

# Server Configuration
PORT=5001
NODE_ENV=development

# JWT Configuration
JWT_SECRET=cashpot-secret-key-2024-very-secure

# AWS Configuration
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=eu-central-1
AWS_S3_BUCKET=cashpot-documents-eugen

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Backup Configuration
AUTO_BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=6
```

---

## 🔄 Pasul 6: Restart aplicația

```bash
# Oprește serverul curent (CTRL + C)
# Apoi pornește din nou:
cd /Users/eugen/Documents/cashpot_online/backend
node server-simple.js
```

### Dacă totul e OK, vei vedea:
```
🚀 Server running on port 5001
☁️ AWS S3 enabled - files and backups will be stored in cloud
📦 S3 Bucket: cashpot-documents-eugen
🔄 Starting backup process...
📦 Backup archive created: 6919993 bytes
☁️ Backup uploaded to AWS S3 successfully!
```

---

## ✅ Pasul 7: Testează

### Test 1: Verifică status
```bash
curl http://localhost:5001/api/backup/status
```

### Test 2: Creează backup manual
```bash
curl -X POST http://localhost:5001/api/backup/create
```

### Test 3: Upload un fișier
1. Deschide aplicația: `http://localhost:5173`
2. Loghează-te cu `admin` / `admin123`
3. Mergi la orice secțiune cu upload (Companies, Invoices, etc.)
4. Încearcă să uploadezi un PDF
5. Dacă merge → PERFECT! Fișierul e în S3!

---

## 📊 Ce se salvează automat pe AWS:

### 🔄 Backup-uri automate (la fiecare 6 ore):
- ✅ Baza de date completă (SQLite)
- ✅ Toate fișierele uploadate
- ✅ Configurațiile aplicației
- ✅ Arhivă ZIP comprimată

### 📁 Upload-uri în timp real:
- ✅ PDF-uri (facturi, contracte, documente)
- ✅ Imagini (logo-uri, poze)
- ✅ Documente Office (Word, Excel)

### 📂 Organizare în S3:
```
cashpot-documents-numele-tau/
├── backups/
│   ├── cashpot-backup-2025-10-03T16-29-08-123Z.zip
│   └── cashpot-backup-2025-10-03T22-29-08-456Z.zip
├── pdfs/
│   ├── invoice-1759437370164-657740271.pdf
│   └── contract-1759438675836-861298373.pdf
├── images/
│   ├── logo-1759439638513-975494198.png
│   └── photo-1759440170424-317782583.jpg
└── documents/
    ├── report-1759440519655-65318352.docx
    └── data-1759441234567-123456789.xlsx
```

---

## 💰 Costuri AWS S3:

- **5 GB GRATIS** primul an
- **După primul an:** ~$0.023/GB/lună (2 cenți pe GB!)
- **Pentru 100 GB:** ~$2.30/lună
- **Transfer:** Primul 1 GB/lună gratis

### Estimare pentru CASHPOT:
- **Aplicație mică (1-5 GB):** GRATIS primul an, apoi ~$0.10/lună
- **Aplicație medie (10-50 GB):** ~$1/lună
- **Aplicație mare (100+ GB):** ~$3-5/lună

---

## 🆘 Troubleshooting

### ❌ "InvalidAccessKeyId"
- Verifică că ai copiat corect Access Key ID
- Verifică că nu ai spații în plus

### ❌ "Access Denied"
- Verifică că IAM user-ul are permisiuni S3
- Verifică că Secret Access Key e corect

### ❌ "Bucket does not exist"
- Verifică că numele bucket-ului e corect în .env
- Verifică că bucket-ul există în AWS Console

### ❌ Backup-urile nu apar în S3
- Verifică în AWS Console → S3 → bucket-ul tău → folder `backups/`
- Verifică că regiunea din .env e aceeași cu regiunea bucket-ului

---

## 🎉 GATA!

Odată configurat AWS S3:
- ✅ **ZERO pierderi de date** - totul e în cloud
- ✅ **Backup automat** la fiecare 6 ore
- ✅ **Upload instant** - fișierele merg direct în S3
- ✅ **Acces de oriunde** - datele tale sunt sigure
- ✅ **Scalabil** - poți stoca cât vrei

**🔥 Aplicația ta CASHPOT e acum ENTERPRISE-READY!**


