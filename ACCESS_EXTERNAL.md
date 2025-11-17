# Configurare Acces Extern - 82.76.35.50:9858

## Pași pentru a permite accesul din afara biroului

### 1. Configurare Backend (Port 3001 sau 9859)

Backend-ul trebuie să ruleze pe un port (de ex. 3001 sau 9859) și să accepte conexiuni externe.

**Setări în `.env` sau variabile de mediu:**
```bash
PORT=9859
HOST=0.0.0.0
```

**Sau rulează direct cu:**
```bash
cd backend
HOST=0.0.0.0 PORT=9859 node server-postgres.js
```

### 2. Configurare Frontend (Port 9858)

Frontend-ul (Vite) este configurat să ruleze pe portul **9858** și să accepte conexiuni externe.

**Rulează frontend-ul:**
```bash
cd src
npm run dev
```

Frontend-ul va rula pe `http://0.0.0.0:9858`

### 3. Configurare Proxy Vite

Vite proxy-ul este configurat să redirecteze `/api` către backend-ul de pe același server.
Pentru acces extern, trebuie să configurezi backend-ul să ruleze pe același server sau să actualizezi proxy-ul.

**Opțiunea 1: Backend pe același server (recomandat)**
- Backend rulează pe port 9859 (sau altul)
- Frontend rulează pe port 9858
- Vite proxy redirectează `/api` către `http://localhost:9859`

**Opțiunea 2: Backend pe alt server**
- Actualizează `vite.config.js` cu IP-ul backend-ului:
  ```javascript
  target: 'http://82.76.35.50:9859'
  ```

### 4. Configurare Firewall/Router

Asigură-te că:
- Portul **9858** (frontend) este deschis în firewall
- Portul **9859** (sau portul backend) este deschis dacă accesezi direct
- Router-ul face port forwarding pentru 82.76.35.50:9858 → IP local:9858

### 5. Acces din Browser

După configurare, accesează:
```
http://82.76.35.50:9858
```

### 6. Notă Importantă

Dacă backend-ul rulează pe alt port (ex. 3001), actualizează proxy-ul în `vite.config.js`:
```javascript
target: process.env.VITE_API_URL || 'http://localhost:3001'
```

Sau setează variabila de mediu:
```bash
export VITE_API_URL=http://82.76.35.50:3001
```

### 7. Testare Rapidă

1. Verifică că backend-ul rulează: `curl http://82.76.35.50:9859/api/health` (dacă există)
2. Verifică că frontend-ul e accesibil: `curl http://82.76.35.50:9858`
3. Testează din browser: `http://82.76.35.50:9858`

### Securitate

⚠️ **IMPORTANT**: Accesul extern necesită:
- Firewall configurat corect
- HTTPS pentru producție (consideră Let's Encrypt)
- Autentificare și autorizare corecte
- Rate limiting activat (deja configurat în backend)

