# 📅 Completare Automată An Fabricat

## 🎯 Scopul Scriptului

Acest script populează automat câmpul **"An Fabricat"** pentru sloturi pe baza unui tabel cu numere de serie și ani.

## 📋 Pași de Utilizare

### 1. Pregătește fișierul JSON cu datele

Creează un fișier JSON (ex: `serial-years.json`) cu următoarea structură:

```json
[
  { "serial_number": "149616", "manufacture_year": 2020 },
  { "serial_number": "149597", "manufacture_year": 2019 },
  { "serial_number": "149631", "manufacture_year": 2021 },
  ...
]
```

### 2. Plasează fișierul în directorul `backend/scripts/`

```bash
cp serial-years.json backend/scripts/
```

### 3. Rulează scriptul

```bash
cd backend
node scripts/populate-manufacture-years.js scripts/serial-years.json
```

### 4. Verifică rezultatele

Scriptul va afișa:
- ✅ Câte înregistrări au fost actualizate cu succes
- ⚠️ Câte numere de serie nu au fost găsite în baza de date
- ❌ Câte erori au apărut

## 📊 Exemplu de Output

```
📊 Loaded 1122 serial number entries
🔌 Connecting to PostgreSQL...
✅ Connected to PostgreSQL

🔄 Updating manufacture years...

✅ 149616 → 2020
✅ 149597 → 2019
✅ 149631 → 2021
⚠️  999999 not found in database
...

============================================================
📊 SUMMARY:
============================================================
✅ Successfully updated: 1120
⚠️  Not found in database: 2
❌ Errors: 0
📋 Total processed: 1122
============================================================

🎉 Manufacture years populated successfully!
```

## 🔧 Alternative: Folosirea Excel/CSV

Dacă ai datele în Excel/CSV, poți converti astfel:

1. **Excel → JSON online**: https://www.convertcsv.com/csv-to-json.htm
2. **Sau folosește Python**:

```python
import pandas as pd
import json

# Citește Excel
df = pd.read_excel('serial-years.xlsx')

# Convertește la JSON
data = df[['serial_number', 'manufacture_year']].to_dict('records')

# Salvează
with open('serial-years.json', 'w') as f:
    json.dump(data, f, indent=2)
```

## 💡 Tips

- **Backup**: Fă backup la baza de date înainte de a rula scriptul
- **Test**: Testează mai întâi cu un subset mic de date
- **Validare**: Verifică că numerele de serie sunt corecte

## 📞 Suport

Dacă ai probleme, contactează-mă cu:
- Path-ul fișierului JSON
- Eroarea exactă
- Câteva exemple de date din tabel

