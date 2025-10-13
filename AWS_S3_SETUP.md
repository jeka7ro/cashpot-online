# 📦 Configurare AWS S3 pentru CASHPOT V7

## 🎯 De ce AWS S3?

- ✅ **Stocare permanentă** - fișierele nu se pierd la restart server
- ✅ **Scalabilitate** - stochezi cât vrei (GB, TB)
- ✅ **Ieftin** - $0.023/GB/lună (~2 cenți pe GB!)
- ✅ **Rapid** - CDN global
- ✅ **Sigur** - backup automat, encriptare

## 💰 Costuri estimate:
- **1 GB de PDF-uri:** ~$0.023/lună (2 cenți!)
- **10 GB:** ~$0.23/lună (23 cenți)
- **100 GB:** ~$2.30/lună
- **BONUS:** Primul an AWS Free Tier = **5 GB GRATIS!**

---

## 🚀 Pași de configurare AWS S3

### **Pasul 1: Creează cont AWS**

1. Du-te la: https://aws.amazon.com/
2. Click pe "Create an AWS Account"
3. Completează formularul (ai nevoie de card, dar e gratis primul an)
4. Verifică email-ul

### **Pasul 2: Creează S3 Bucket**

1. După login, mergi la **Services** → **S3**
2. Click pe **"Create bucket"**
3. Completează:
   - **Bucket name:** `cashpot-documents` (sau alt nume unic)
   - **AWS Region:** `eu-central-1` (Frankfurt - cel mai apropiat de România)
   - **Block Public Access:** LASĂ TOATE BIFATE (pentru securitate)
4. Scroll jos și click **"Create bucket"**

### **Pasul 3: Configurează CORS pentru bucket**

1. Click pe bucket-ul tău (`cashpot-documents`)
2. Mergi la tab-ul **"Permissions"**
3. Scroll până la **"Cross-origin resource sharing (CORS)"**
4. Click **"Edit"** și adaugă:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

5. Click **"Save changes"**

### **Pasul 4: Creează IAM User pentru aplicație**

1. Mergi la **Services** → **IAM**
2. Click pe **"Users"** din meniul stâng
3. Click **"Create user"**
4. Username: `cashpot-app-user`
5. Bifează **"Provide user access to the AWS Management Console - optional"** → **NO**
6. Click **"Next"**

#### Setează permisiunile:

7. Selectează **"Attach policies directly"**
8. Caută și bifează: **"AmazonS3FullAccess"** (sau creează policy custom mai restrictiv)
9. Click **"Next"**
10. Click **"Create user"**

### **Pasul 5: Creează Access Keys**

1. Click pe user-ul creat (`cashpot-app-user`)
2. Mergi la tab-ul **"Security credentials"**
3. Scroll până la **"Access keys"**
4. Click **"Create access key"**
5. Selectează **"Application running outside AWS"**
6. Click **"Next"**
7. Descriere (opțional): `CASHPOT V7 Backend`
8. Click **"Create access key"**

### **⚠️ IMPORTANT: Salvează aceste chei!**

Vei vedea:
- **Access key ID:** (ex: `AKIAIOSFODNN7EXAMPLE`)
- **Secret access key:** (ex: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)

**COPIAZĂ-LE ACUM!** Nu le vei mai putea vedea după ce închizi pagina!

---

## 🔧 Pasul 6: Configurează aplicația

### Editează fișierul `.env` din backend:

```bash
cd /Users/eugeniucazmal/dev/cashpot_online/backend
nano .env
```

Completează variabilele AWS:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AICI_PUNE_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=AICI_PUNE_SECRET_ACCESS_KEY
AWS_REGION=eu-central-1
AWS_S3_BUCKET=cashpot-documents
```

### Exemplu complet:

```env
DATABASE_URL=postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot
JWT_SECRET=cashpot-secret-key-2024-very-secure
PORT=5001
NODE_ENV=development

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=eu-central-1
AWS_S3_BUCKET=cashpot-documents
```

Salvează fișierul: `CTRL + X`, apoi `Y`, apoi `Enter`

---

## 🎉 Pasul 7: Restart serverul backend

```bash
# Oprește serverul curent (CTRL + C dacă rulează în terminal)

# Pornește din nou
cd /Users/eugeniucazmal/dev/cashpot_online/backend
node server-postgres.js
```

Dacă totul e OK, vei vedea în terminal:
```
✅ AWS S3 enabled - files will be stored in cloud
```

---

## 🧪 Testare

### Test 1: Verifică status

```bash
curl http://localhost:5001/api/upload/status
```

Răspuns așteptat:
```json
{
  "success": true,
  "storageType": "AWS S3",
  "isS3Enabled": true,
  "maxFileSize": "10MB",
  "allowedTypes": ["PDF", "Images (JPEG, PNG, GIF, WebP)", "Office Documents (Word, Excel)"]
}
```

### Test 2: Upload un fișier din interfața web

1. Deschide `http://localhost:5173/`
2. Loghează-te
3. Mergi la o secțiune care permite upload (ex: Documente Legale)
4. Încearcă să uploadezi un PDF
5. Dacă merge → GATA! Fișierele se salvează în S3!

---

## 📂 Organizarea fișierelor în S3

Fișierele vor fi organizate automat astfel:

```
cashpot-documents/
  ├── pdfs/
  │   ├── file-1633024800000-123456789.pdf
  │   └── file-1633024850000-987654321.pdf
  ├── images/
  │   ├── file-1633024900000-456789123.jpg
  │   └── file-1633025000000-789123456.png
  └── documents/
      ├── file-1633025100000-321654987.docx
      └── file-1633025200000-654987321.xlsx
```

---

## 🔒 Securitate

### ✅ Bune practici implementate:

1. **Validare tip fișier** - doar PDF, imagini, Office docs
2. **Limită dimensiune** - max 10MB per fișier
3. **Nume unice** - timestamp + random pentru fiecare fișier
4. **Metadata** - salvăm cine a uploadat și când
5. **CORS** - doar din aplicația ta poți accesa
6. **Bucket privat** - fișierele nu sunt publice

### 🔐 Pentru producție (mai târziu):

1. Creează IAM policy custom mai restrictiv (doar pentru bucket-ul tău)
2. Activează versioning în S3
3. Setează lifecycle rules (ștergere automată după X zile)
4. Activează encryption la rest
5. Folosește CloudFront pentru CDN

---

## 💡 Alternative dacă nu vrei AWS acum

Dacă lași variabilele AWS goale în `.env`, aplicația va folosi **stocare locală** (`uploads/` folder).

⚠️ **ATENȚIE:** Fișierele locale se vor pierde când faci deploy pe Render.com!

---

## ❓ Troubleshooting

### Eroare: "Access Denied"
- Verifică că IAM user-ul are permisiuni S3
- Verifică că cheile AWS sunt corecte în `.env`

### Eroare: "Bucket does not exist"
- Verifică că numele bucket-ului din `.env` este corect
- Verifică că region-ul este corect (`eu-central-1`)

### Fișierele nu apar în S3
- Verifică în AWS Console → S3 → cashpot-documents
- Uită-te în folderele `pdfs/`, `images/`, `documents/`

### Serverul folosește stocare locală în loc de S3
- Verifică că ai completat `AWS_ACCESS_KEY_ID` în `.env`
- Restart serverul după editarea `.env`

---

## 📞 Support

Dacă ai probleme, verifică:
1. AWS Console → CloudWatch pentru erori
2. Terminal-ul backend-ului pentru log-uri
3. Browser Console pentru erori frontend

---

## 🎓 Resurse utile

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [S3 Pricing Calculator](https://calculator.aws/)

**🎉 Gata! Acum ai stocare cloud profesională pentru fișierele tale!**



