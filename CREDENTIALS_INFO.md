# Credențiale Baza de Date Externă

## Credențiale Configurate

- **Username**: `Jeka` (sau `jeka` - verifică case sensitivity)
- **Password**: `31ianurie` sau `30ianuarie` (testează care funcționează)
- **Host**: `82.76.35.50`
- **Port**: `26257`
- **Database**: `cashpot`

## Notă Importantă

Ambele parole testate (`31ianurie` și `30ianuarie`) au eșuat cu ambele formate de username (`Jeka` și `jeka`). 

**Verifică:**
1. Exact ce username funcționează (poate fi case-sensitive)
2. Exact ce parolă funcționează (poate există spații sau caractere speciale)
3. Dacă utilizatorul `Jeka` există în baza de date

## Configurare pe Render

Setează următoarele variabile de mediu pe Render:

```
EXPENDITURES_DB_USER=Jeka
EXPENDITURES_DB_PASSWORD=31ianurie
EXPENDITURES_DB_HOST=82.76.35.50
EXPENDITURES_DB_PORT=26257
EXPENDITURES_DB_NAME=cashpot
```

## Test Local

Pentru a testa conexiunea local:

```bash
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  user: 'Jeka',
  password: '31ianurie',  // sau '30ianuarie'
  host: '82.76.35.50',
  port: 26257,
  database: 'cashpot'
});
pool.query('SELECT NOW() as time').then(res => {
  console.log('✅ OK:', res.rows[0].time);
  pool.end();
}).catch(err => {
  console.log('❌ Eroare:', err.message);
  pool.end();
});
"
```

