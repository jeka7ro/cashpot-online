# 🚀 CASHPOT V7 - Quick Start Guide

## ✅ Status Actual

### Ce funcționează ACUM:
- ✅ **Frontend Vite + React** - `http://localhost:5173/`
- ✅ **Backend Express + PostgreSQL** - `http://localhost:5001/`
- ✅ **Bază de date PostgreSQL** - Render.com (Frankfurt) - **ONLINE**
- ✅ **Sistem upload fișiere** - Pregătit pentru AWS S3
- ✅ **Autentificare JWT** - Securitate
- ✅ **API complet** - Toate modulele funcționale

---

## 🎯 Servere Pornite

```bash
# Verifică ce rulează:
lsof -i:5173  # Frontend Vite
lsof -i:5001  # Backend Express
```

### Pentru a porni serverele:

#### Backend:
```bash
cd /Users/eugeniucazmal/dev/cashpot_online/backend
node server-postgres.js
```

#### Frontend:
```bash
cd /Users/eugeniucazmal/dev/cashpot_online
npm run dev
```

---

## 📁 Stocare Fișiere

### Status: **Mod Local** (temporar)

Pentru a activa stocare cloud permanentă cu AWS S3:

👉 **[Vezi ghidul complet AWS S3](./AWS_S3_SETUP.md)** 👈

**Timp necesar:** ~15 minute  
**Cost:** ~$0.02/GB/lună (5GB gratis primul an!)

---

## 🗄️ Baza de Date

### PostgreSQL pe Render.com

```
Host: dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com
Database: cashpot
User: cashpot_user
Region: EU (Frankfurt, Germania)
Storage: 256 MB (Free Tier)
```

**Acces:** Online 24/7, backup automat, SSL

---

## 📋 Module Implementate

| Modul | Status | API Endpoint |
|-------|--------|--------------|
| **Companii** | ✅ | `/api/companies` |
| **Locații** | ✅ | `/api/locations` |
| **Furnizori** | ✅ | `/api/providers` |
| **Platforme** | ✅ | `/api/platforms` |
| **Cabinete** | ✅ | `/api/cabinets` |
| **Game Mixes** | ✅ | `/api/gameMixes` |
| **Sloturi** | ✅ | `/api/slots` |
| **Depozit** | ✅ | `/api/warehouse` |
| **Metrologie** | ✅ | `/api/metrology` |
| **Jackpots** | ✅ | `/api/jackpots` |
| **Facturi** | ✅ | `/api/invoices` |
| **Rapoarte ONJN** | ✅ | `/api/onjnReports` |
| **Documente Legale** | ✅ | `/api/legalDocuments` |
| **Utilizatori** | ✅ | `/api/users` |
| **Upload Fișiere** | ✅ | `/api/upload` |

---

## 🔑 Autentificare

### Login endpoint:
```http
POST http://localhost:5001/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### Răspuns:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "fullName": "Administrator",
    "role": "admin"
  }
}
```

Token-ul se folosește în header pentru toate request-urile:
```
Authorization: Bearer <token>
```

---

## 🛠️ Configurare .env

### Backend `.env` (IMPORTANT!):

```env
# Database
DATABASE_URL=postgresql://cashpot_user:V8Usuj5Do5KKQzMPHfQU3RXKLbnYSJ4X@dpg-d3ee3s6r433s73eijgig-a.frankfurt-postgres.render.com/cashpot

# Security
JWT_SECRET=cashpot-secret-key-2024-very-secure

# Server
PORT=5001
NODE_ENV=development

# AWS S3 (opțional - pentru stocare fișiere cloud)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-central-1
AWS_S3_BUCKET=cashpot-documents
```

**Note:**
- PORT=5001 (nu 5000!) - port 5000 e ocupat de macOS AirPlay
- Lasă AWS variabilele goale dacă nu ai încă cont AWS

---

## 📦 Dependențe Instalate

### Backend:
```json
{
  "express": "^4.18.2",
  "pg": "^8.16.3",
  "cors": "^2.8.5",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "multer": "^1.4.5-lts.1",
  "@aws-sdk/client-s3": "latest",
  "multer-s3": "latest"
}
```

### Frontend:
```json
{
  "react": "^18.2.0",
  "vite": "^4.2.0",
  "axios": "^1.3.4",
  "react-router-dom": "^6.8.1",
  "lucide-react": "^0.263.1",
  "recharts": "^2.5.0",
  "tailwindcss": "^3.2.7"
}
```

---

## 🐛 Troubleshooting

### Eroare: "EADDRINUSE: address already in use :::5000"
**Soluție:** Port-ul 5000 e ocupat de macOS AirPlay.
- ✅ REZOLVAT: Aplicația folosește acum port 5001

### Eroare: "Cannot read properties of undefined"
**Soluție:** Dashboard așteaptă date care nu sunt încă încărcate.
- ✅ REZOLVAT: Adăugat optional chaining (`?.`)

### Eroare: "esbuild platform mismatch"
**Soluție:** Node modules instalate pentru altă platformă.
- ✅ REZOLVAT: Reinstalat `npm install` pentru arm64

### Frontend nu se conectează la backend
**Verifică:**
1. Backend rulează pe port 5001: `lsof -i:5001`
2. Frontend folosește URL corect: `http://localhost:5001`
3. CORS e activat în backend ✅

---

## 📚 Documente Importante

| Document | Descriere |
|----------|-----------|
| **[AWS_S3_SETUP.md](./AWS_S3_SETUP.md)** | Ghid complet configurare AWS S3 |
| **[FILE_STORAGE_INFO.md](./FILE_STORAGE_INFO.md)** | Info despre sistemul de upload |
| **[POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md)** | Setup PostgreSQL |
| **[README.md](./README.md)** | Documentație generală |

---

## 🎓 Comenzi Utile

```bash
# Pornire backend
cd backend && node server-postgres.js

# Pornire frontend
npm run dev

# Verifică servere active
lsof -i:5001  # Backend
lsof -i:5173  # Frontend

# Oprește un server
kill -9 $(lsof -ti:5001)  # Backend
kill -9 $(lsof -ti:5173)  # Frontend

# Verifică logs PostgreSQL
# Vezi în Render.com Dashboard

# Test API
curl http://localhost:5001/api/upload/status
```

---

## 🚀 Next Steps

### Acum (Development):
1. ✅ Testează aplicația în browser: `http://localhost:5173/`
2. ✅ Loghează-te cu: `admin` / `admin123`
3. ✅ Explorează toate modulele
4. ✅ Adaugă date de test

### În curând (Producție):
1. **[Configurează AWS S3](./AWS_S3_SETUP.md)** - pentru fișiere permanente
2. **Deploy frontend** - Vercel sau Netlify (gratis)
3. **Deploy backend** - Render.com (gratis)
4. **Configurează domeniu** - (opțional)

---

## 💡 Tips

### Pentru development mai rapid:
```bash
# Instalează nodemon pentru auto-restart backend
cd backend
npm install -D nodemon

# Apoi folosește:
npx nodemon server-postgres.js
```

### Pentru debugging:
```bash
# Vezi toate request-urile în backend
# Server-ul logează automat (morgan middleware)

# Vezi console în browser
# F12 → Console tab
```

---

## 📞 Support

**Probleme?**
1. Verifică că ambele servere rulează
2. Verifică console browser (F12)
3. Verifică terminal backend pentru erori
4. Verifică că `.env` e configurat corect

**Pentru AWS S3:**
- Vezi [AWS_S3_SETUP.md](./AWS_S3_SETUP.md) - secțiunea Troubleshooting

---

## 🎉 Gata!

**Aplicația ta CASHPOT V7 este funcțională și gata de folosit!**

**✅ Servere:** Frontend + Backend ONLINE  
**✅ Database:** PostgreSQL cloud ONLINE  
**✅ Upload:** Pregătit pentru AWS S3  
**✅ API:** Toate modulele funcționale  

**🚀 Bucură-te de aplicație!**



