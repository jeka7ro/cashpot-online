# 🍃 MongoDB Atlas Setup - CASHPOT V7

## 📋 Pasii de Configurare

### 1️⃣ Creează un fișier `.env`

În directorul `backend/`, creează un fișier numit `.env` cu următorul conținut:

```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://jeka7ro:YOUR_PASSWORD_HERE@jeka7ro.gkyalir.mongodb.net/cashpot?retryWrites=true&w=majority&appName=jeka7ro

# JWT Secret
JWT_SECRET=cashpot-secret-key-2024-very-secure

# Server Port
PORT=5000

# Node Environment
NODE_ENV=development
```

### 2️⃣ Înlocuiește Parola MongoDB

Deschide MongoDB Atlas (așa cum arată în screenshot) și:

1. Găsește parola pentru user-ul `jeka7ro`
2. Înlocuiește `YOUR_PASSWORD_HERE` cu parola ta reală
3. Salvează fișierul `.env`

**Connection String Format:**
```
mongodb+srv://jeka7ro:<db_password>@jeka7ro.gkyalir.mongodb.net/?retryWrites=true&w=majority&appName=jeka7ro
```

### 3️⃣ Pornește Server-ul MongoDB

```bash
cd backend
node server-mongodb.js
```

### 4️⃣ Verifică Conexiunea

Ar trebui să vezi:
```
✅ Connected to MongoDB Atlas
🚀 Server running on port 5000
📡 API: http://localhost:5000/api
💚 Health: http://localhost:5000/health
✅ Admin user created
✅ Sample data created
```

### 5️⃣ Testează API-ul

```bash
# Check health
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get companies
curl http://localhost:5000/api/companies
```

## 🔐 Credențiale Implicite

- **Username**: `admin`
- **Password**: `admin123`

## 📊 Baza de Date

### Database Name: `cashpot`

### Collections:
- `users` - Utilizatori
- `companies` - Companii
- `locations` - Locații
- `slots` - Sloturi
- `providers` - Furnizori
- `cabinets` - Cabinete
- `gamemixes` - Mixuri jocuri
- `warehouses` - Depozit
- `metrologies` - Metrologie
- `jackpots` - Jackpot-uri
- `invoices` - Facturi
- `onjnreports` - Rapoarte ONJN
- `legaldocuments` - Documente legale

## 🔄 Migrare de la SQLite la MongoDB

Datele se vor crea automat când pornești server-ul pentru prima dată:

1. **Admin User** - Se creează automat
2. **Sample Companies** - 2 companii demo
3. **Sample Locations** - 2 locații demo

Toate celelalte date vor fi create când le adaugi din interfață.

## 🌐 Avantaje MongoDB Atlas

✅ **Online** - Datele sunt stocate în cloud
✅ **Sync în timp real** - Mai mulți utilizatori pot lucra simultan
✅ **Backup automat** - MongoDB Atlas face backup automat
✅ **Scalabil** - Poate gestiona volume mari de date
✅ **Securizat** - Conexiune criptată SSL/TLS

## 🛠️ Troubleshooting

### Eroare: "MongooseServerSelectionError"

**Cauze posibile:**
1. Parolă greșită în connection string
2. IP-ul tău nu este whitelisted în MongoDB Atlas
3. Probleme de rețea/firewall

**Soluție:**
1. Verifică parola în `.env`
2. În MongoDB Atlas → Network Access → Add IP Address → Add Current IP Address
3. Verifică conexiunea la internet

### Eroare: "Authentication failed"

**Soluție:**
- Asigură-te că ai URL-encoded parola dacă conține caractere speciale
- Folosește [URL Encoder](https://www.urlencoder.org/) pentru parolă

### Verificare Rapidă

```bash
# Test MongoDB connection
node -e "const mongoose = require('mongoose'); mongoose.connect('YOUR_MONGODB_URI').then(() => console.log('✅ Connected')).catch(err => console.error('❌ Error:', err))"
```

## 📝 Note Importante

1. **NU comite** fișierul `.env` în Git (este în `.gitignore`)
2. **Schimbă** `JWT_SECRET` pentru producție
3. **Activează** IP Whitelist în MongoDB Atlas
4. **Folosește** Environment Variables în producție

## 🚀 Deployment

Pentru deployment pe Render.com sau similar:

1. Adaugă `MONGODB_URI` în Environment Variables
2. Setează `NODE_ENV=production`
3. Server-ul va rula automat pe portul din environment

---

**Made with ❤️ for CASHPOT V7**

