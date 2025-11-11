# 🚀 Power BI Integration - Quick Start

## ⚡ Start Rapid (5 minute)

### Pas 1: Azure AD Setup
1. Mergi la https://portal.azure.com
2. **Azure Active Directory** → **App registrations** → **New registration**
3. Copiază: **Tenant ID**, **Client ID**
4. **Certificates & secrets** → **New client secret** → Copiază valoarea

### Pas 2: API Permissions
1. În app registration: **API permissions**
2. **Add permission** → **Power BI Service**
3. Selectează: `Dataset.Read.All`, `Workspace.Read.All`
4. **Grant admin consent** ✅

### Pas 3: Power BI IDs
1. Mergi la https://app.powerbi.com
2. Deschide workspace-ul tău
3. Din URL copiază:
   ```
   https://app.powerbi.com/groups/{WORKSPACE_ID}/datasets/{DATASET_ID}
   ```

### Pas 4: Backend Configuration
Adaugă în `backend/.env`:
```env
POWERBI_TENANT_ID=xxx
POWERBI_CLIENT_ID=xxx
POWERBI_CLIENT_SECRET=xxx
POWERBI_WORKSPACE_ID=xxx
POWERBI_DATASET_ID=xxx
POWERBI_TABLE_NAME=Expenditures
```

### Pas 5: Test în Aplicație
1. Pornește backend: `cd backend && node server-simple.js`
2. Deschide aplicația
3. Mergi la **Cheltuieli POS & Bancă**
4. Click **🔌 Power BI Config**
5. Completează datele
6. Click **Testează Conexiunea**
7. Click **Salvează**

### Pas 6: Sincronizare
1. Click **☁️ Power BI Sync**
2. Selectează dataset și tabel
3. Click **Previzualizare** (opțional)
4. Click **Sincronizează**

## 🎉 Gata!

Datele tale din Power BI sunt acum în CashPot Online!

---

## 📊 Structura Datelor Recomandată

Tabelul din Power BI ar trebui să aibă:
- `Date` (DateTime) - Data operațiunii
- `Department` (Text) - "POS" sau "Bancă"
- `Location` (Text) - Numele locației
- `ExpenditureType` (Text) - Tipul cheltuielii
- `Amount` (Number) - Suma în RON
- `Description` (Text) - Opțional
- `Reference` (Text) - Opțional

---

## 🆘 Probleme Comune?

### "Failed to authenticate"
→ Verifică Tenant ID, Client ID, Client Secret
→ Asigură-te că ai făcut "Grant admin consent"

### "Connection failed"
→ Verifică Workspace ID și Dataset ID
→ Adaugă Service Principal la workspace cu rol Member

### "No data"
→ Verifică numele tabelului
→ Încearcă fără filtre de dată

---

## 📖 Documentație Completă
Consultă `POWER_BI_INTEGRATION.md` pentru ghid complet.

---

**Need help?** Consultă documentația completă sau contactează echipa de suport.

