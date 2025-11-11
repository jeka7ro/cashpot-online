# 📊 Power BI Integration - Ghid Complet

## 🎯 Prezentare Generală

Această implementare permite sincronizarea automată a datelor de cheltuieli din Power BI în aplicația CashPot Online folosind Power BI REST API.

## ✨ Funcționalități

- ✅ Configurare credentials Power BI (Azure AD)
- ✅ Testare conexiune la Power BI
- ✅ Listare datasets și tabele disponibile
- ✅ Executare query-uri DAX personalizate
- ✅ Sincronizare automată a datelor
- ✅ Filtrare pe perioadă de timp
- ✅ Previzualizare date înainte de import
- ✅ Mapping automat între structura Power BI și aplicație

---

## 📋 Cerințe Preliminare

### 1. Azure AD App Registration

**Pasul 1: Creare App Registration**
1. Accesează [Azure Portal](https://portal.azure.com)
2. Navighează la **Azure Active Directory** → **App registrations**
3. Click pe **New registration**
4. Completează:
   - **Name**: "CashPot Power BI Integration"
   - **Supported account types**: "Accounts in this organizational directory only"
   - **Redirect URI**: (lasă gol pentru service-to-service)
5. Click **Register**

**Pasul 2: Notează credentialele**
După creare, vei vedea:
- **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

Salvează aceste valori!

**Pasul 3: Creare Client Secret**
1. În aplicația ta, mergi la **Certificates & secrets**
2. Click pe **New client secret**
3. Adaugă o descriere: "CashPot Integration Secret"
4. Selectează expirare: 24 months
5. Click **Add**
6. **IMPORTANT**: Copiază imediat valoarea secretului! Nu o vei mai putea vedea!

**Pasul 4: Configurare API Permissions**
1. Mergi la **API permissions**
2. Click pe **Add a permission**
3. Selectează **Power BI Service**
4. Selectează **Delegated permissions**:
   - `Dataset.Read.All`
   - `Dataset.ReadWrite.All`
   - `Workspace.Read.All`
5. Click **Add permissions**
6. **IMPORTANT**: Click pe **Grant admin consent** pentru organizația ta

### 2. Power BI Configuration

**Workspace ID și Dataset ID:**
1. Deschide [Power BI Service](https://app.powerbi.com)
2. Navighează la workspace-ul tău
3. ID-urile se găsesc în URL:
   ```
   https://app.powerbi.com/groups/{WORKSPACE_ID}/datasets/{DATASET_ID}
   ```

**Exemplu URL:**
```
https://app.powerbi.com/groups/f3d0a123-abcd-4567-89ef-abc123456789/datasets/e4b8c456-def0-1234-5678-def456789abc
```
- `WORKSPACE_ID` = `f3d0a123-abcd-4567-89ef-abc123456789`
- `DATASET_ID` = `e4b8c456-def0-1234-5678-def456789abc`

---

## 🔧 Setup Backend

### 1. Instalare Dependințe

Backend-ul folosește deja Express și Axios, deci nu sunt necesare dependințe suplimentare.

### 2. Configurare Environment Variables

Adaugă în fișierul `.env` (backend):

```env
# Power BI Configuration
POWERBI_TENANT_ID=your-tenant-id-here
POWERBI_CLIENT_ID=your-client-id-here
POWERBI_CLIENT_SECRET=your-client-secret-here
POWERBI_WORKSPACE_ID=your-workspace-id-here
POWERBI_DATASET_ID=your-dataset-id-here
POWERBI_TABLE_NAME=Expenditures
```

**⚠️ IMPORTANT**: Nu commitezi niciodată fișierul `.env` în git!

### 3. Verificare Setup

Server-ul are deja route-ul `/api/powerbi` adăugat în `server-simple.js`:

```javascript
import powerbiRoutes from './routes/powerbi.js'
app.use('/api/powerbi', powerbiRoutes)
```

---

## 🎨 Setup Frontend

### UI Components

Componentele sunt deja create și integrate:

1. **PowerBIConfigModal** - Configurare credentials
2. **PowerBISyncModal** - Sincronizare date

### Integrare în ExpendituresPOS

Butoanele sunt deja adăugate în header:

```jsx
<button onClick={() => setShowPowerBIConfigModal(true)}>
  🔌 Power BI Config
</button>

<button onClick={() => setShowPowerBISyncModal(true)}>
  ☁️ Power BI Sync
</button>
```

---

## 📊 Structura Datelor Power BI

### Format Recomandat pentru Tabel

Tabelul din Power BI trebuie să aibă următoarele coloane:

```
| Column Name        | Type     | Description                    |
|--------------------|----------|--------------------------------|
| Date               | DateTime | Data operațiunii               |
| Department         | Text     | "POS" sau "Bancă"              |
| Location           | Text     | Numele locației                |
| ExpenditureType    | Text     | Tipul cheltuielii              |
| Amount             | Number   | Suma (RON)                     |
| Description        | Text     | Descriere (opțional)           |
| Reference          | Text     | Referință (opțional)           |
```

### Exemplu DAX Query

```dax
EVALUATE
FILTER(
    Expenditures,
    [Date] >= DATE(2024, 1, 1) &&
    [Date] <= DATE(2024, 12, 31) &&
    [Department] = "POS"
)
```

---

## 🚀 Utilizare

### 1. Configurare Inițială

1. **Deschide pagina Cheltuieli POS & Bancă**
2. **Click pe "🔌 Power BI Config"**
3. **Completează formularul:**
   - Tenant ID
   - Client ID
   - Client Secret
   - Workspace ID
   - Dataset ID
   - Table Name (default: "Expenditures")
4. **Click "Testează Conexiunea"** pentru a verifica
5. **Click "Salvează"**

### 2. Sincronizare Date

1. **Click pe "☁️ Power BI Sync"**
2. **Selectează:**
   - Dataset (din lista disponibilă)
   - Tabel (din lista disponibilă)
   - Perioadă (opțional)
3. **Click "Previzualizare"** pentru a vedea datele
4. **Click "Sincronizează"** pentru import

### 3. Filtre și Opțiuni

- **Data început / Data sfârșit**: Filtrează după perioadă
- **Combină cu date existente**: Păstrează datele locale existente

---

## 🔌 API Endpoints

### Backend Routes

#### 1. Get Configuration
```http
GET /api/powerbi/config
Authorization: Bearer {token}
```

**Response:**
```json
{
  "configured": true,
  "tenantId": "xxx",
  "clientId": "xxx",
  "workspaceId": "xxx",
  "datasetId": "xxx",
  "tableName": "Expenditures",
  "hasSecret": true,
  "tokenValid": true
}
```

#### 2. Update Configuration
```http
POST /api/powerbi/config
Authorization: Bearer {token}
Content-Type: application/json

{
  "tenantId": "xxx",
  "clientId": "xxx",
  "clientSecret": "xxx",
  "workspaceId": "xxx",
  "datasetId": "xxx",
  "tableName": "Expenditures"
}
```

#### 3. Test Connection
```http
GET /api/powerbi/test
Authorization: Bearer {token}
```

#### 4. Get Datasets
```http
GET /api/powerbi/datasets
Authorization: Bearer {token}
```

#### 5. Get Tables
```http
GET /api/powerbi/tables
Authorization: Bearer {token}
```

#### 6. Execute DAX Query
```http
POST /api/powerbi/query
Authorization: Bearer {token}
Content-Type: application/json

{
  "query": "EVALUATE Expenditures"
}
```

#### 7. Get Expenditures
```http
GET /api/powerbi/expenditures?startDate=2024-01-01&endDate=2024-12-31&category=POS
Authorization: Bearer {token}
```

#### 8. Sync Data
```http
POST /api/powerbi/sync
Authorization: Bearer {token}
Content-Type: application/json

{
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "merge": true
}
```

---

## 🔒 Securitate

### Best Practices

1. **Credentials Storage**
   - ✅ Folosește variabile de mediu pentru production
   - ✅ Nu commitezi niciodată secrets în git
   - ✅ Rotește secret-urile periodic

2. **Access Control**
   - ✅ Doar utilizatorii autentificați pot accesa API-ul
   - ✅ Verifică permisiunile în Azure AD
   - ✅ Folosește principiul least privilege

3. **Token Management**
   - ✅ Token-urile sunt cached și reîmprospătate automat
   - ✅ Expirare automată după 1 oră
   - ✅ Refresh 5 minute înainte de expirare

---

## 🐛 Troubleshooting

### Eroare: "Failed to authenticate with Power BI"

**Cauze posibile:**
- Tenant ID, Client ID sau Client Secret incorecte
- App Registration nu are permisiunile necesare
- Admin consent nu a fost acordat

**Soluție:**
1. Verifică credentials în Azure Portal
2. Asigură-te că API permissions sunt configurate
3. Grant admin consent pentru organizație

### Eroare: "Connection failed"

**Cauze posibile:**
- Workspace ID sau Dataset ID incorecte
- App nu are acces la workspace
- Dataset nu există sau a fost șters

**Soluție:**
1. Verifică ID-urile în Power BI Service
2. Adaugă Service Principal la workspace cu rol Member/Admin
3. Verifică că dataset-ul există

### Eroare: "No data returned"

**Cauze posibile:**
- Tabelul nu există în dataset
- Filtrele sunt prea restrictive
- Structura tabelului nu corespunde cu așteptările

**Soluție:**
1. Verifică numele tabelului
2. Încearcă fără filtre
3. Verifică structura datelor cu "Previzualizare"

---

## 📈 Performanță

### Optimizări

1. **Token Caching**: Token-urile sunt cached pentru a evita apeluri inutile
2. **Lazy Loading**: Datele sunt încărcate doar când sunt necesare
3. **Batch Queries**: Posibilitate de a executa multiple query-uri

### Limitări

- **Rate Limiting**: Power BI API are limite de rate
- **Dataset Refresh**: Dataset-ul trebuie să fie actualizat în Power BI
- **Data Size**: Datasets mari pot dura mai mult la sincronizare

---

## 🔄 Sincronizare Automată (Viitor)

### Opțiuni de Implementare

1. **Scheduled Jobs** (recomand cron job)
   ```javascript
   // Example: Daily sync at 6 AM
   cron.schedule('0 6 * * *', async () => {
     await syncPowerBIData()
   })
   ```

2. **Webhooks** (requires Power BI Premium)
3. **Manual Trigger** (implementat deja)

---

## 📝 Exemple de Utilizare

### Exemplu 1: Sync All Data

```javascript
// Frontend
const handleSyncAll = async () => {
  const response = await axios.post('/api/powerbi/sync', {
    merge: true
  }, {
    headers: { Authorization: `Bearer ${token}` }
  })
  console.log(`Synced ${response.data.count} records`)
}
```

### Exemplu 2: Sync Specific Period

```javascript
// Frontend
const handleSyncPeriod = async () => {
  const response = await axios.post('/api/powerbi/sync', {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    merge: true
  }, {
    headers: { Authorization: `Bearer ${token}` }
  })
}
```

### Exemplu 3: Custom DAX Query

```javascript
// Frontend
const handleCustomQuery = async () => {
  const response = await axios.post('/api/powerbi/query', {
    query: `
      EVALUATE
      SUMMARIZE(
        Expenditures,
        [Department],
        "Total", SUM([Amount])
      )
    `
  }, {
    headers: { Authorization: `Bearer ${token}` }
  })
}
```

---

## 🎓 Resurse Utile

### Documentație Oficială

- [Power BI REST API](https://learn.microsoft.com/en-us/rest/api/power-bi/)
- [Azure AD App Registration](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Power BI Embedded](https://learn.microsoft.com/en-us/power-bi/developer/embedded/embed-sample-for-customers)

### DAX Resources

- [DAX Guide](https://dax.guide/)
- [SQLBI](https://www.sqlbi.com/articles/)

---

## ✅ Checklist Setup Complet

- [ ] Azure AD App Registration creat
- [ ] API Permissions configurate și admin consent acordat
- [ ] Client Secret generat și salvat
- [ ] Workspace ID și Dataset ID identificate
- [ ] Environment variables configurate în backend
- [ ] Backend routes testate
- [ ] UI components verificate
- [ ] Test conexiune reușit
- [ ] Prima sincronizare completă
- [ ] Mapping date verificat

---

## 🎉 Gata!

Acum ai o integrare completă Power BI → CashPot Online!

Pentru întrebări sau probleme, consultă secțiunea Troubleshooting sau contactează echipa de suport.

---

**Developed by:** CashPot Team  
**Version:** 1.0.0  
**Last Updated:** November 2024

