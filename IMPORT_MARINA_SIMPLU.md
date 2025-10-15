# 🚀 Import Date Marina - Soluție Simplă (FĂRĂ Configurare Server!)

## ✅ SOLUȚIA AUTOMATĂ - 2 Pași Simpli

### Pas 1: Export Date din Marina (Rulează Local)

Deschide terminal în folder-ul proiectului și rulează:

```bash
npm run export-marina
```

**Ce face?**
- Se conectează la serverul Marina (161.97.133.165)
- Extrage toate datele (sloturi, locații, provideri, cabinete, game mixes)
- Salvează în fișiere JSON locale

**Rezultat:**
- `marina-slots.json` - toate sloturile
- `marina-locations.json` - toate locațiile  
- `marina-providers.json` - toți providerii
- `marina-cabinets.json` - toate cabinetele
- `marina-game-mixes.json` - toate game mix-urile

### Pas 2: Import în Aplicație

1. **Accesează:** https://w1n.ro/slots/marina-import

2. **Click:** Butonul verde "Încarcă JSON"

3. **Selectează:** Fișierul `marina-slots.json` (sau `marina-locations.json`)

4. **Verifică:** Datele apar în tabel cu filtre și căutare

5. **Selectează:** 
   - Click pe checkbox-uri pentru înregistrările dorite
   - SAU click "Selectează Tot" pentru import masiv

6. **Importă:** Click pe "Importă Selectate"

## 🎯 De Ce E Mai Bine Așa?

✅ **Nu necesită configurare server** - nu trebuie să modifici firewall, MySQL, etc.

✅ **Controlezi datele** - vezi exact ce imporți înainte

✅ **Flexibil** - poți edita JSON-ul manual dacă e nevoie

✅ **Sigur** - serverul Render nu trebuie să se conecteze la Marina

✅ **Rapid** - exportul rulează local, importul e instant

## 📊 Funcționalități Disponibile

### În Pagina de Import:

- **Tabs:** Comută între Sloturi și Locații
- **Căutare:** Caută după orice câmp (serial, provider, cabinet, etc.)
- **Filtre:** Filtrează după provider, cabinet, game mix, status
- **Selecție:** Selectează individual sau tot
- **Statistici:** Vezi numărul de înregistrări, filtrate, selectate
- **Preview:** Vezi toate datele înainte de import

### După Import:

- Datele apar în Slots/Locations
- Se evită duplicatele (verificare după serial number)
- Providers, cabinets, game mixes se adaugă automat

## 🔄 Actualizare Date

Pentru a actualiza datele din Marina:

```bash
# 1. Export date noi
npm run export-marina

# 2. Import în aplicație (pasul 2 de mai sus)
```

## ⚠️ Troubleshooting

### "Connection refused" la export
**Cauză:** Calculatorul tău nu poate accesa serverul Marina

**Soluție:**
1. Verifică dacă ești pe aceeași rețea cu serverul Marina
2. Sau conectează-te prin VPN dacă serverul e remote
3. Sau rulează script-ul direct PE serverul Marina

### Fișierele JSON nu se creează
**Cauză:** Permisiuni sau eroare de conexiune

**Soluție:**
```bash
# Verifică dacă mysql2 e instalat
cd /Users/eugen/Documents/cashpot_online
npm install mysql2

# Rulează din nou
npm run export-marina
```

### Datele nu apar după import
**Cauză:** Format JSON invalid

**Soluție:**
- Verifică că fișierul JSON e valid (https://jsonlint.com)
- Asigură-te că structura e corectă (array de obiecte)

## 📁 Structura JSON Așteptată

### Pentru Sloturi:
```json
[
  {
    "id": 1,
    "serial_number": "123456",
    "provider": "EGT",
    "cabinet": "P42V Curved ST",
    "game_mix": "EGT - Union",
    "status": "Active",
    "location": "Craiova",
    "last_updated": "2025-10-15T10:00:00.000Z",
    "created_at": "2025-01-01T10:00:00.000Z"
  }
]
```

### Pentru Locații:
```json
[
  {
    "id": 1,
    "name": "Craiova Center",
    "address": "Str. Principale 123",
    "city": "Craiova",
    "company": "ENTERTAINMENT SOLUTIONS SRL",
    "surface_area": 100,
    "status": "Active",
    "last_updated": "2025-10-15T10:00:00.000Z",
    "created_at": "2025-01-01T10:00:00.000Z"
  }
]
```

## 🆘 Suport

Dacă întâmpini probleme:
1. Verifică că fișierul JSON e valid
2. Verifică că structura e corectă
3. Verifică console-ul browserului pentru erori
4. Contactează suportul tehnic

---

**Status:** ✅ Gata de utilizare
**Ultima actualizare:** 15 Octombrie 2025
**Versiune:** 2.0 (Soluție simplificată)

