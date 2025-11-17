# Configurare Acces Extern la Baza de Date - 82.76.35.50

## Situația actuală:
- **Server în birou**: IP extern `82.76.35.50`
- **Baza de date**: IP local `192.168.1.39:26257` (CockroachDB/PostgreSQL)
- **Problema**: Baza de date nu este accesibilă de pe orice PC (doar din rețeaua locală)

## Ce trebuie configurat pentru acces extern:

### 1. Configurare Router/Port Forwarding

Pe router-ul din birou, configurează **Port Forwarding**:

```
Port Extern: 26257 → IP Intern: 192.168.1.39:26257
Sau
Port Extern: 26258 (alt port) → IP Intern: 192.168.1.39:26257
```

### 2. Configurare Firewall pe Server (192.168.1.39)

Asigură-te că firewall-ul permite conexiuni pe portul 26257:

```bash
# Linux/Mac
sudo ufw allow 26257/tcp

# Sau verifică regula existentă
sudo iptables -L -n | grep 26257
```

### 3. Configurare CockroachDB/PostgreSQL

Pe serverul de baze de date (192.168.1.39), verifică configurația:

**Pentru CockroachDB:**
- Verifică `--listen-addr` în configurație
- Trebuie să fie `0.0.0.0` sau `--listen-addr=0.0.0.0:26257`

**Pentru PostgreSQL:**
- Verifică `postgresql.conf`: `listen_addresses = '*'`
- Verifică `pg_hba.conf`: permite conexiuni de la IP-urile externe

### 4. Actualizare Configurație Backend

Creează/actualizează fișierul `.env` în folderul `backend/`:

```env
# Baza de date cheltuieli - ACCES EXTERN
EXPENDITURES_DB_USER=cashpot
EXPENDITURES_DB_PASSWORD=129hj8oahwd7yaw3e21321
EXPENDITURES_DB_HOST=82.76.35.50
EXPENDITURES_DB_PORT=26257
EXPENDITURES_DB_NAME=cashpot
```

**IMPORTANT**: Dacă router-ul folosește alt port extern (ex: 26258), folosește:
```env
EXPENDITURES_DB_HOST=82.76.35.50
EXPENDITURES_DB_PORT=26258
```

### 5. Testare Conexiune

```bash
# Test direct din terminal:
psql -h 82.76.35.50 -p 26257 -U cashpot -d cashpot

# Sau test din Node.js:
cd backend
node -e "
const pg = require('pg');
const pool = new pg.Pool({
  user: 'cashpot',
  password: '129hj8oahwd7yaw3e21321',
  host: '82.76.35.50',
  port: 26257,
  database: 'cashpot'
});
pool.query('SELECT COUNT(*) FROM expenditures_sync', (err, res) => {
  if (err) console.error('❌ Eroare:', err.message);
  else console.log('✅ Conectat! Înregistrări:', res.rows[0].count);
  pool.end();
});
"
```

### 6. Securitate ⚠️

**IMPORTANT**: Accesul direct la baza de date din exterior este riscant!

**Opțiuni mai sigure:**
1. **Folosește VPN** pentru acces la baza de date
2. **Folosește SSH Tunnel**:
   ```bash
   ssh -L 26257:192.168.1.39:26257 user@82.76.35.50
   ```
   Apoi conectează-te la `localhost:26257`
3. **Folosește API-ul backend** (recomandat):
   - Backend ascultă pe `82.76.35.50:3001`
   - Accesează doar API-ul, nu direct baza de date
   - API-ul are autentificare și securitate

### 7. Recomandare Finală

**Cel mai sigur**: Folosește backend-ul ca intermediar:
- Backend rulează pe `82.76.35.50:3001`
- Backend se conectează la baza de date local (192.168.1.39:26257)
- Frontend/API accesează backend-ul, nu direct baza de date

În acest caz, doar backend-ul trebuie să aibă acces la baza de date (din rețeaua locală), și restul accesează prin API.

