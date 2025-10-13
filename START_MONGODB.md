# 🚀 Start CASHPOT V7 cu MongoDB

## ⚡ Quick Start

### 1. Configurează MongoDB Connection String

**Opțiunea A: Folosind Terminal**
```bash
cd backend
echo 'MONGODB_URI=mongodb+srv://jeka7ro:YOUR_PASSWORD@jeka7ro.gkyalir.mongodb.net/cashpot?retryWrites=true&w=majority&appName=jeka7ro' > .env
echo 'JWT_SECRET=cashpot-secret-key-2024-very-secure' >> .env
echo 'PORT=5000' >> .env
echo 'NODE_ENV=development' >> .env
```

**Opțiunea B: Manual**
1. Creează fișierul `backend/.env`
2. Copiază și completează:
```env
MONGODB_URI=mongodb+srv://jeka7ro:YOUR_PASSWORD@jeka7ro.gkyalir.mongodb.net/cashpot?retryWrites=true&w=majority&appName=jeka7ro
JWT_SECRET=cashpot-secret-key-2024-very-secure
PORT=5000
NODE_ENV=development
```

### 2. Pornește Backend-ul (MongoDB)

```bash
cd backend
node server-mongodb.js
```

Ar trebui să vezi:
```
✅ Connected to MongoDB Atlas
🚀 Server running on port 5000
📡 API: http://localhost:5000/api
💚 Health: http://localhost:5000/health
✅ Admin user created
✅ Sample data created
```

### 3. Pornește Frontend-ul

**În alt terminal:**
```bash
npm run dev
```

### 4. Accesează Aplicația

🌐 **Frontend**: http://localhost:5173
🔐 **Login**: 
- Username: `admin`
- Password: `admin123`

## 📊 Verificare Conexiune

```bash
# Health check
curl http://localhost:5000/health

# Răspuns așteptat:
{
  "status": "OK",
  "timestamp": "2025-10-01T...",
  "uptime": 123.456,
  "database": "Connected"
}
```

## 🔄 Workflow Complet

```bash
# Terminal 1 - Backend MongoDB
cd backend
node server-mongodb.js

# Terminal 2 - Frontend
npm run dev

# Terminal 3 - Testing (opțional)
curl http://localhost:5000/health
```

## 🌐 Configurare MongoDB Atlas

### Obține Connection String din Dashboard:

1. **Deschide MongoDB Atlas** → Clusters
2. **Click pe "Connect"** pentru cluster-ul `jeka7ro`
3. **Selectează "Connect your application"**
4. **Copiază Connection String**:
   ```
   mongodb+srv://jeka7ro:<password>@jeka7ro.gkyalir.mongodb.net/?retryWrites=true&w=majority&appName=jeka7ro
   ```
5. **Înlocuiește `<password>`** cu parola ta
6. **Adaugă database name**: `/cashpot` după `.net`

**Connection String Final:**
```
mongodb+srv://jeka7ro:YOUR_PASSWORD@jeka7ro.gkyalir.mongodb.net/cashpot?retryWrites=true&w=majority&appName=jeka7ro
```

### Whitelist IP Address:

1. **MongoDB Atlas** → **Network Access**
2. **Click "Add IP Address"**
3. **Selectează "Add Current IP Address"**
4. **Sau adaugă `0.0.0.0/0`** pentru acces de oriunde (doar pentru development!)

## 🔐 Securitate

### Resetare Parolă MongoDB:

1. **MongoDB Atlas** → **Database Access**
2. **Găsește user-ul `jeka7ro`**
3. **Click "Edit"**
4. **Click "Edit Password"**
5. **Auto-generate sau setează parola ta**
6. **Update User**
7. **Actualizează `.env`** cu noua parolă

## 🐛 Troubleshooting

### Eroare: "MongooseServerSelectionError"

**Cauză**: Parolă greșită sau IP nu este whitelisted

**Soluție**:
1. Verifică parola în `.env`
2. Whitelist IP-ul în MongoDB Atlas

### Eroare: "ECONNREFUSED"

**Cauză**: Backend-ul nu rulează

**Soluție**:
```bash
cd backend
node server-mongodb.js
```

### Eroare: "Authentication failed"

**Cauză**: Parolă incorectă sau user inexistent

**Soluție**:
1. Verifică user-ul în MongoDB Atlas → Database Access
2. Resetează parola
3. Actualizează `.env`

## 📝 Note

- **SQLite** (`server-simple.js`) - Pentru dezvoltare locală
- **MongoDB** (`server-mongodb.js`) - Pentru producție și multiple utilizatori
- Ambele servere funcționează pe portul `5000`
- Rulează doar unul la un moment dat

## 🎯 Avantaje MongoDB

✅ **Multi-user** - Mai mulți utilizatori pot lucra simultan
✅ **Cloud Storage** - Datele sunt în cloud, nu local
✅ **Auto Backup** - MongoDB Atlas face backup automat
✅ **Scalabil** - Crește automat cu datele tale
✅ **Securizat** - Conexiune criptată SSL/TLS

---

**Made with ❤️ for CASHPOT V7**

