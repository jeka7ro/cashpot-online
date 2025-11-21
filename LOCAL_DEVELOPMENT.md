# 🚀 Dezvoltare Locală - CASHPOT ERP

## 📋 Cerințe

- Node.js >= 18.0.0
- PostgreSQL (pentru backend)
- npm sau yarn

## 🔧 Configurare Inițială

### 1. Configurare Backend

```bash
# Copiază fișierul de exemplu
cp backend/env.example backend/.env

# Editează backend/.env cu configurația ta:
# - DATABASE_URL: conexiunea la PostgreSQL local
# - PORT: portul backend-ului (default: 3001)
# - JWT_SECRET: cheie secretă pentru JWT
# - EXPENDITURES_DB_*: configurația pentru baza de date externă (dacă este necesar)
```

### 2. Instalare Dependențe

```bash
# Instalare dependențe backend
cd backend
npm install
cd ..

# Instalare dependențe frontend
cd src
npm install
cd ..
```

## 🎯 Pornire Aplicație

### Opțiunea 1: Pornire Completă (Backend + Frontend)

```bash
# Rulează scriptul care pornește ambele
./start-local.sh
```

Aceasta va porni:
- Backend pe `http://localhost:5001` (sau PORT din backend/.env)
- Frontend pe `http://localhost:5174` (5173 este folosit de altă aplicație)

### Opțiunea 2: Pornire Separată

**Terminal 1 - Backend:**
```bash
./start-backend-local.sh
# sau
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
./start-frontend-local.sh
# sau
cd src
npm run dev
```

## 🌐 Accesare Aplicație

După pornire, accesează aplicația la:
- **Frontend:** http://localhost:5174 (sau portul setat în vite.config.js)
- **Backend API:** http://localhost:5001/api (sau PORT din backend/.env)

## ⚙️ Configurare Variabile de Mediu

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/cashpot_db
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# CORS (pentru development local)
CORS_ORIGIN=http://localhost:5174

# Expenditures External Database (opțional)
EXPENDITURES_DB_HOST=82.76.35.50
EXPENDITURES_DB_PORT=26257
EXPENDITURES_DB_NAME=cashpot
EXPENDITURES_DB_USER=cashpot
EXPENDITURES_DB_PASSWORD=your-password
```

### Frontend

Frontend-ul folosește proxy automat către backend prin `vite.config.js`. Nu este necesară configurare suplimentară.

## 🐛 Debugging

### Verificare Log-uri Backend

Backend-ul rulează cu `nodemon`, deci se repornește automat la modificări. Log-urile apar în terminal.

### Verificare Log-uri Frontend

Frontend-ul rulează cu `vite`, deci se reîncarcă automat la modificări. Log-urile apar în terminal și în browser console.

## 🛑 Oprire Aplicație

- **Dacă ai folosit `start-local.sh`:** Apasă `Ctrl+C` în terminal
- **Dacă ai pornit separat:** Apasă `Ctrl+C` în fiecare terminal

## 📝 Note

- Backend-ul folosește PostgreSQL local sau remote
- Frontend-ul folosește Vite pentru development
- Proxy-ul este configurat automat în `vite.config.js` pentru `/api` și `/uploads`
- Modificările în cod se reflectă automat (hot reload)

## 🔍 Verificare Status

```bash
# Verifică dacă backend-ul rulează (portul poate fi 3001 sau 5001, verifică în backend/.env)
curl http://localhost:5001/api/health

# Verifică dacă frontend-ul rulează
curl http://localhost:5174
```

## 🆘 Probleme Comune

### Port deja folosit

```bash
# Găsește procesul care folosește portul
lsof -i :5001  # pentru backend (sau portul din backend/.env)
lsof -i :5174  # pentru frontend (sau portul setat în vite.config.js)

# Oprește procesul
kill -9 <PID>
```

### Eroare de conexiune la baza de date

Verifică:
- PostgreSQL rulează local
- `DATABASE_URL` este corect în `backend/.env`
- Credențialele sunt corecte

### Frontend nu se conectează la backend

Verifică:
- Backend-ul rulează pe portul corect (verifică PORT în backend/.env, default: 5001)
- `vite.config.js` are proxy-ul configurat corect (trebuie să corespundă cu PORT din backend/.env)
- Nu există erori CORS în backend
- `CORS_ORIGIN` în backend/.env include `http://localhost:5174` (sau portul setat în vite.config.js)

