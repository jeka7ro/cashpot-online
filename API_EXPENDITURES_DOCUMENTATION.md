a# API Documentație - Cheltuieli (Expenditures)

## Tip de API
**REST API** (Express.js) - Toate endpoint-urile folosesc HTTP methods standard (GET, POST, PUT, DELETE)

## Base URL
```
http://localhost:5001/api/expenditures
```
sau în producție:
```
https://cashpot-backend.onrender.com/api/expenditures
```

## Autentificare
Majoritatea endpoint-urilor necesită token JWT în header:
```
Authorization: Bearer <token>
```

---

## Endpoint-uri Principale

### 1. GET `/data` - Obține toate cheltuielile
**Autentificare**: Nu (public)

**Răspuns JSON**:
```json
[
  {
    "id": 1423273,
    "operational_date": "2025-12-09T22:00:00.000Z",
    "amount": "17116.00",
    "location_name": "Ploiesti (centru)",
    "department_name": "Salarii",
    "expenditure_type": "Salariile agenților paza",
    "data_source": "bat_sync",
    "description": "",
    "created_at": "2025-12-17T12:57:44.889Z",
    "updated_at": "2025-12-17T12:57:44.889Z",
    "created_by": null,
    "updated_by": null,
    "synced_at": "2025-12-17T12:57:44.889Z"
  }
]
```

---

### 2. GET `/sql-table` - Obține cheltuieli paginate cu filtre
**Autentificare**: Da (authenticateToken)

**Query Parameters**:
- `startDate` (string, format: YYYY-MM-DD)
- `endDate` (string, format: YYYY-MM-DD)
- `department` (string, default: 'all')
- `type` (string, default: 'all')
- `location` (string, default: 'all')
- `dataSource` (string, default: 'all')
- `search` (string)
- `page` (number, default: 1)
- `pageSize` (number sau 'all', default: 50)
- `sortBy` (string, default: 'operational_date')
- `order` ('asc' | 'desc', default: 'desc')

**Exemplu Request**:
```
GET /api/expenditures/sql-table?startDate=2024-01-01&endDate=2025-12-31&department=Salarii&page=1&pageSize=25
```

**Răspuns JSON**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1423273,
      "operational_date": "2025-12-09T22:00:00.000Z",
      "amount": "17116.00",
      "location_name": "Ploiesti (centru)",
      "department_name": "Salarii",
      "expenditure_type": "Salariile agenților paza",
      "description": "",
      "data_source": "bat_sync",
      "created_by": 1,
      "updated_by": null,
      "created_at": "2025-12-17T12:57:44.889Z",
      "updated_at": "2025-12-17T12:57:44.889Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 43896,
    "totalPages": 1756,
    "totalAmount": 38785162.27
  }
}
```

---

### 3. POST `/sync` - Sincronizează date din baza externă (BAT)
**Autentificare**: Da (authenticateToken)

**Body**:
```json
{
  "startDate": "2024-01-01",
  "endDate": "2026-12-31",
  "filters": {
    "show_in_expenditures": true,
    "exclude_deleted": true
  }
}
```

**Răspuns JSON**:
```json
{
  "success": true,
  "message": "Sync started",
  "syncId": "sync_1234567890"
}
```

**Status Check**: `GET /sync-status`

---

### 4. POST `/import-all` - Importă toate datele (BAT + Google Sheets + Preferences)
**Autentificare**: Da (authenticateToken)

**Body**: (opțional, poate fi gol)
```json
{}
```

**Răspuns JSON**:
```json
{
  "success": true,
  "message": "Import început. Verifică progresul la /api/expenditures/import-all-status"
}
```

**Status Check**: `GET /import-all-status`

**Răspuns Status**:
```json
{
  "status": "running" | "completed" | "failed",
  "currentStep": "Se preiau 40000 înregistrări din BAT...",
  "totalFound": 40000,
  "totalProcessed": 15000,
  "imported": 12000,
  "skipped": 3000,
  "errors": 0,
  "startTime": "2025-12-17T12:00:00.000Z"
}
```

---

### 5. GET `/departments` - Obține lista de departamente
**Autentificare**: Nu (public)

**Răspuns JSON**:
```json
[
  {
    "id": "1",
    "name": "Salarii",
    "record_count": "506",
    "total_amount": "4590128.00"
  },
  {
    "id": "2",
    "name": "Chirie",
    "record_count": "197",
    "total_amount": "3744551.72"
  }
]
```

---

### 6. GET `/expenditure-types` - Obține lista de tipuri de cheltuieli
**Autentificare**: Nu (public)

**Răspuns JSON**:
```json
[
  {
    "id": "1",
    "name": "Chirie locatie lunara (factura integrala)",
    "record_count": "197",
    "total_amount": "3177329.58"
  },
  {
    "id": "2",
    "name": "Salarii angajați",
    "record_count": "216",
    "total_amount": "2973221.00"
  }
]
```

---

### 7. GET `/external-locations` - Obține lista de locații
**Autentificare**: Nu (public)

**Răspuns JSON**:
```json
{
  "success": true,
  "locations": [
    "Craiova",
    "Pitesti",
    "Ploiesti (centru)",
    "Ploiesti (nord)",
    "Valcea"
  ]
}
```

---

### 8. GET `/settings` - Obține setările utilizatorului
**Autentificare**: Da (authenticateToken)

**Răspuns JSON**:
```json
{
  "autoSync": false,
  "syncInterval": 24,
  "syncTime": "02:00",
  "excludeDeleted": true,
  "showInExpenditures": true,
  "googleSheetsUrl": "https://docs.google.com/spreadsheets/d/...",
  "includedDepartments": ["Salarii", "Chirie", "Bar"],
  "includedExpenditureTypes": ["Transfer Salarii", "Chirie locatie lunara"],
  "includedLocations": ["Craiova", "Pitesti", "Ploiesti (centru)"]
}
```

---

### 9. PUT `/settings` - Actualizează setările utilizatorului
**Autentificare**: Da (authenticateToken)

**Body**:
```json
{
  "autoSync": true,
  "syncInterval": 12,
  "syncTime": "03:00",
  "includedDepartments": ["Salarii", "Chirie"],
  "includedExpenditureTypes": ["Transfer Salarii"],
  "includedLocations": ["Craiova", "Pitesti"]
}
```

**Răspuns JSON**:
```json
{
  "success": true,
  "message": "Setări actualizate cu succes"
}
```

---

### 10. GET `/stats` - Obține statistici
**Autentificare**: Da (authenticateToken)

**Query Parameters**:
- `startDate` (string)
- `endDate` (string)
- `department` (string, opțional)
- `location` (string, opțional)

**Răspuns JSON**:
```json
{
  "success": true,
  "total": 43896,
  "totalAmount": 38785162.27,
  "byDepartment": {
    "Salarii": 192096.00,
    "Chirie": 3744551.72
  },
  "byLocation": {
    "Craiova": 8058269.47,
    "Pitesti": 10230228.73
  }
}
```

---

### 11. PUT `/sql-table/:id` - Actualizează o înregistrare
**Autentificare**: Da (authenticateToken)

**Body**:
```json
{
  "amount": "20000.00",
  "location_name": "Craiova",
  "department_name": "Salarii",
  "expenditure_type": "Transfer Salarii",
  "operational_date": "2025-12-15"
}
```

**Răspuns JSON**:
```json
{
  "success": true,
  "message": "Înregistrare actualizată",
  "record": { ... }
}
```

---

### 12. DELETE `/sql-table/:id` - Șterge o înregistrare
**Autentificare**: Da (authenticateToken)

**Răspuns JSON**:
```json
{
  "success": true,
  "message": "Înregistrare ștearsă",
  "deletedId": 1423273
}
```

---

### 13. POST `/sql-table/bulk-delete` - Șterge multiple înregistrări
**Autentificare**: Da (authenticateToken)

**Body**:
```json
{
  "ids": [1423273, 1423274, 1423275]
}
```

**Răspuns JSON**:
```json
{
  "success": true,
  "deletedCount": 3,
  "message": "3 înregistrări șterse"
}
```

---

### 14. POST `/import-google-sheets` - Importă date din Google Sheets
**Autentificare**: Da (authenticateToken)

**Body**:
```json
{
  "sheetUrl": "https://docs.google.com/spreadsheets/d/...",
  "force": false,
  "startDate": "2024-01-01",
  "endDate": "2025-12-31",
  "department": "Salarii",
  "location": "Craiova"
}
```

**Răspuns JSON**:
```json
{
  "success": true,
  "imported": 150,
  "skipped": 10,
  "errors": 0,
  "message": "Import completat: 150 noi, 10 duplicate"
}
```

---

### 15. DELETE `/google-sheets-data` - Șterge date din Google Sheets
**Autentificare**: Da (authenticateToken)

**Body**:
```json
{
  "department": "Salarii",
  "startDate": "2024-01-01",
  "endDate": "2025-12-31"
}
```

**Răspuns JSON**:
```json
{
  "success": true,
  "deletedCount": 50,
  "message": "Șterse 50 înregistrări Google Sheets pentru Salarii (2024-01-01 - 2025-12-31)"
}
```
---

## Endpoint-uri pentru Facturi Electrice

### 16. POST `/save-electric-invoice` - Salvează factură electrică
**Autentificare**: Da (authenticateToken)

**Body** (multipart/form-data):
- `file` (PDF)
- `nlc_code` (string)
- `location_name` (string)

**Răspuns JSON**:
```json
{
  "success": true,
  "invoice": {
    "invoice_number": "FAC-2025-001",
    "nlc_code": "123456",
    "location_name": "Craiova",
    "suma_totala": 5000.00,
    "perioada_facturare": "01.12.2025 - 31.12.2025"
  }
}
```

---

### 17. POST `/transfer-electric-to-expenditures` - Transferă facturi electrice în cheltuieli
**Autentificare**: Da (authenticateToken)

**Body**:
```json
{
  "invoiceNumbers": ["FAC-2025-001", "FAC-2025-002"]
}
```

**Răspuns JSON**:
```json
{
  "success": true,
  "transferred": 2,
  "message": "2 facturi transferate în cheltuieli"
}
```

---

## Endpoint-uri pentru Sloturi Lunare

### 18. GET `/slots-monthly` - Obține date despre sloturi pe lună
**Autentificare**: Da (authenticateToken)

**Query Parameters**:
- `year` (number)
- `month` (number, 1-12)
- `location_name` (string, opțional)

**Răspuns JSON**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "year": 2025,
      "month": 12,
      "location_name": "Craiova",
      "slots_count": 150,
      "notes": ""
    }
  ]
}
```

---

### 19. GET `/slots-monthly/summary` - Obține sumar pe locații
**Autentificare**: Da (authenticateToken)

**Răspuns JSON**:
```json
{
  "success": true,
  "locations": ["Craiova", "Pitesti", "Ploiesti (centru)"],
  "years": [2024, 2025],
  "summary": {
    "2024": {
      "1": {
        "Craiova": 150,
        "Pitesti": 120
      }
    }
  }
}
```

---

## Coduri de Eroare

- `200` - Success
- `400` - Bad Request (date invalide)
- `401` - Unauthorized (token lipsă sau invalid)
- `403` - Forbidden (permisiuni insuficiente)
- `404` - Not Found
- `500` - Internal Server Error

---

## Exemple de Utilizare

### cURL - Obține toate cheltuielile
```bash
curl http://localhost:5001/api/expenditures/data
```

### cURL - Obține cheltuieli cu filtre
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5001/api/expenditures/sql-table?startDate=2024-01-01&endDate=2025-12-31&department=Salarii&page=1&pageSize=25"
```

### cURL - Sincronizează date
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2024-01-01","endDate":"2026-12-31"}' \
  http://localhost:5001/api/expenditures/sync
```

### JavaScript/Fetch - Obține date
```javascript
const response = await fetch('http://localhost:5001/api/expenditures/data')
const data = await response.json()
console.log(data)
```

### JavaScript/Fetch - Cu autentificare
```javascript
const response = await fetch('http://localhost:5001/api/expenditures/sql-table?page=1&pageSize=50', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
const data = await response.json()
```

---

## Note Importante

1. **Filtrele de utilizator**: Multe endpoint-uri aplică automat filtrele din setările utilizatorului (`includedDepartments`, `includedExpenditureTypes`, `includedLocations`)

2. **Normalizare diacritice**: Locațiile și tipurile sunt normalizate pentru matching (ț/ţ, ș/ş devin aceleași)

3. **Paginare**: Endpoint-urile care returnează liste suportă paginare cu `page` și `pageSize`

4. **Sortare**: Endpoint-ul `/sql-table` suportă sortare după multiple coloane

5. **Date Range**: Majoritatea endpoint-urilor acceptă `startDate` și `endDate` pentru filtrare
