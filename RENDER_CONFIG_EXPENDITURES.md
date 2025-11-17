# Configurare Sincronizare Cheltuieli pe Render

## Variabile de Mediu Necesare pe Render

Pentru ca sincronizarea cheltuielilor să funcționeze pe backend-ul de pe Render, trebuie să setezi următoarele variabile de mediu în dashboard-ul Render:

### 1. Acces la Dashboard Render
1. Mergi la https://dashboard.render.com
2. Selectează serviciul `cashpot-backend`
3. Click pe "Environment" în meniul din stânga
4. Adaugă următoarele variabile:

### 2. Variabile de Mediu pentru Baza de Date Externă

```
EXPENDITURES_DB_HOST=82.76.35.50
EXPENDITURES_DB_PORT=26257
EXPENDITURES_DB_NAME=cashpot
EXPENDITURES_DB_USER=cashpot
EXPENDITURES_DB_PASSWORD=129hj8oahwd7yaw3e21321
```

### 3. Important: Verificare Accesibilitate IP

**PROBLEMA PRINCIPALĂ**: Backend-ul de pe Render (serviciu cloud) **NU POATE** accesa direct IP-urile din rețeaua ta locală (82.76.35.50) pentru că:

1. **IP-ul 82.76.35.50** este probabil un IP extern/rutabil, dar:
   - Router-ul din birou trebuie să permită conexiuni **INBOUND** pe portul 26257
   - Firewall-ul trebuie să permită conexiuni de la serviciile cloud (Render)
   - Trebuie configurat **Port Forwarding** pe router

### 4. Soluții Posibile

#### Soluția 1: Port Forwarding + Firewall (Recomandat)
1. Configurează port forwarding pe router:
   - Port extern: 26257 (sau alt port public)
   - Port intern: 26257
   - IP intern: 192.168.1.39 (sau IP-ul serverului de bază de date)
   
2. Deschide portul în firewall:
   - Permite conexiuni INBOUND pe portul 26257
   - Permite conexiuni de la IP-urile Render (check IP ranges)

#### Soluția 2: VPN sau Tunnel
- Folosește un serviciu VPN (Tailscale, ZeroTier, etc.)
- Sau configurează un tunnel SSH
- Backend-ul de pe Render se conectează prin VPN/tunnel

#### Soluția 3: Sincronizare Locală (Când ești în birou)
- Când ești în birou, folosește script-ul local:
  ```bash
  cd backend && npm run sync-expenditures
  ```
- Acesta se conectează la IP-ul local (192.168.1.39)

### 5. Testare Conexiune

După configurare, testează conexiunea cu:
```bash
# De pe serverul Render (via SSH sau logs)
curl https://your-backend.onrender.com/api/expenditures/test-connection
```

### 6. Verificare Log-uri

În log-urile Render, vei vedea:
- ✅ `🔌 Creating NEW external DB pool:` - dacă pool-ul se creează
- ✅ `🧪 Testing external DB connection...` - dacă testul pornește
- ❌ `❌ Cannot create/connect to external DB pool:` - dacă eșuează

### 7. Debugging

Dacă vezi eroarea `ENETUNREACH` sau `ECONNREFUSED`:
1. Verifică dacă IP-ul 82.76.35.50 este accesibil public:
   ```bash
   ping 82.76.35.50
   telnet 82.76.35.50 26257
   ```

2. Verifică dacă portul este deschis:
   ```bash
   nmap -p 26257 82.76.35.50
   ```

3. Verifică firewall-ul routerului:
   - Trebuie să permită conexiuni INBOUND pe portul 26257
   - Trebuie să permită conexiuni de la IP-urile Render

## Notă Importantă

**Backend-ul de pe Render este un serviciu cloud și NU poate accesa direct rețelele private sau IP-urile care nu sunt accesibile public.** Dacă 82.76.35.50 este un IP public rutabil și portul este deschis în firewall, atunci ar trebui să funcționeze. Altfel, trebuie să configurezi port forwarding sau să folosești o soluție VPN/tunnel.

