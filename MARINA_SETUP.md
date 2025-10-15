# Configurare Acces Remote la Serverul Marina

## 🎯 Obiectiv
Permite aplicației CashPot (deployată pe Render) să se conecteze la serverul Marina MySQL pentru import date.

## 📋 Pași de Configurare

### 1️⃣ Conectare la Serverul Marina
```bash
ssh eugen@161.97.133.165
```

### 2️⃣ Configurare Permisiuni MySQL

Conectează-te la MySQL:
```bash
mysql -u root -p
```

Rulează comenzile SQL:
```sql
-- Permite conexiuni de la orice IP pentru userul eugen
CREATE USER IF NOT EXISTS 'eugen'@'%' IDENTIFIED BY '(@Ee0wRHVohZww33';
GRANT ALL PRIVILEGES ON cyberslot_dbn.* TO 'eugen'@'%';
FLUSH PRIVILEGES;

-- Verifică permisiunile
SHOW GRANTS FOR 'eugen'@'%';

-- Ieși din MySQL
EXIT;
```

### 3️⃣ Configurare MySQL pentru Conexiuni Externe

Editează fișierul de configurare:
```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Caută și modifică:
```ini
# ÎNAINTE:
bind-address = 127.0.0.1

# DUPĂ:
bind-address = 0.0.0.0
```

Salvează fișierul: `Ctrl+O`, `Enter`, `Ctrl+X`

### 4️⃣ Restart MySQL

```bash
sudo systemctl restart mysql
sudo systemctl status mysql
```

### 5️⃣ Configurare Firewall

Permite trafic pe portul MySQL:
```bash
sudo ufw allow 3306/tcp
sudo ufw status
```

### 6️⃣ Verificare Configurare

Testează conexiunea locală:
```bash
mysql -u eugen -p'(@Ee0wRHVohZww33' -h 161.97.133.165 cyberslot_dbn -e "SELECT COUNT(*) FROM machines;"
```

## 🧪 Testare din Aplicație

După configurare, testează conexiunea:

1. **Endpoint de Test**: https://cashpot-backend.onrender.com/api/marina/test
   - Trebuie să returneze: `{"success": true, "message": "Marina database connection successful"}`

2. **Test Sloturi**: https://cashpot-backend.onrender.com/api/marina/slots
   - Trebuie să returneze lista de sloturi

3. **Test Locații**: https://cashpot-backend.onrender.com/api/marina/locations
   - Trebuie să returneze lista de locații

## 🔍 Verificare în Aplicație

1. Accesează: https://w1n.ro/slots/marina-import
2. Ar trebui să vezi datele din Marina
3. Selectează sloturi/locații și importă-le

## ⚠️ Troubleshooting

### Eroare: "Connection refused"
- Verifică dacă MySQL rulează: `sudo systemctl status mysql`
- Verifică firewall: `sudo ufw status`

### Eroare: "Access denied"
- Verifică permisiunile user-ului: `SHOW GRANTS FOR 'eugen'@'%';`
- Re-creează user-ul dacă e nevoie

### Eroare: "Timeout"
- Verifică dacă portul 3306 este deschis în firewall-ul serverului
- Verifică dacă providerul de hosting permite trafic pe portul 3306

## 📊 Informații Conexiune

- **Host**: 161.97.133.165
- **Port**: 3306
- **User**: eugen
- **Database**: cyberslot_dbn
- **Tabele principale**:
  - `machines` - sloturi
  - `machine_manufacturers` - furnizori
  - `machine_cabinet_types` - cabinete
  - `machine_game_templates` - game mix-uri
  - `locations` - locații
  - `companies` - companii

## ✅ Checklist Final

- [ ] MySQL permite conexiuni externe (`bind-address = 0.0.0.0`)
- [ ] User-ul `eugen@%` are permisiuni pe `cyberslot_dbn`
- [ ] Firewall permite portul 3306
- [ ] MySQL service rulează
- [ ] Endpoint `/api/marina/test` returnează success
- [ ] Datele apar în aplicație la `/slots/marina-import`

---

**Status**: ⏳ În așteptare - configurare necesară pe serverul Marina
**Ultima actualizare**: 15 Octombrie 2025

