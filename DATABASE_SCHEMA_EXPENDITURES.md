# Schema Bazei de Date - Cheltuieli (Expenditures)

## Tabele Principale

### 1. `expenditures_sync` - Tabelul Principal pentru Cheltuieli

**Descriere**: Tabelul central care stochează toate cheltuielile din toate sursele (BAT, Google Sheets, Preferences, Facturi Electrice).

**Structură**:

```sql
CREATE TABLE expenditures_sync (
  id SERIAL PRIMARY KEY,
  location_name VARCHAR(255),
  department_name VARCHAR(255),
  expenditure_type VARCHAR(255),
  amount DECIMAL(15,2),
  operational_date DATE,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  original_location_id INTEGER,
  mapped_location_id INTEGER REFERENCES locations(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_source VARCHAR(50) DEFAULT 'bat_sync',
  description TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Coloane**:

| Coloană | Tip | Nullable | Default | Descriere |
|---------|-----|----------|---------|-----------|
| `id` | SERIAL | NO | AUTO | Primary key, auto-increment |
| `location_name` | VARCHAR(255) | YES | NULL | Numele locației (ex: "Craiova", "Ploiesti (centru)") |
| `department_name` | VARCHAR(255) | YES | NULL | Numele departamentului (ex: "Salarii", "Chirie", "Bar") |
| `expenditure_type` | VARCHAR(255) | YES | NULL | Tipul de cheltuială (ex: "Transfer Salarii", "Chirie locatie lunara") |
| `amount` | DECIMAL(15,2) | YES | NULL | Suma cheltuielii în RON |
| `operational_date` | DATE | YES | NULL | Data operațională a cheltuielii (YYYY-MM-DD) |
| `synced_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Timestamp când a fost sincronizat |
| `original_location_id` | INTEGER | YES | NULL | ID-ul locației din baza externă (BAT) |
| `mapped_location_id` | INTEGER | YES | NULL | Foreign key către `locations(id)` |
| `created_at` | TIMESTAMP | NO | CURRENT_TIMESTAMP | Timestamp când a fost creată înregistrarea |
| `data_source` | VARCHAR(50) | YES | 'bat_sync' | Sursa datelor: `'bat_sync'`, `'google_sheets'`, `'preferences'`, `'electric_invoice'`, `'api_sync'` |
| `description` | TEXT | YES | NULL | Descriere detaliată a cheltuielii |
| `created_by` | INTEGER | YES | NULL | Foreign key către `users(id)` - utilizatorul care a creat |
| `updated_by` | INTEGER | YES | NULL | Foreign key către `users(id)` - utilizatorul care a actualizat |
| `updated_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Timestamp când a fost actualizată înregistrarea |

**Indexuri**:

```sql
-- Index unic pentru prevenirea duplicatelor
CREATE UNIQUE INDEX expenditures_sync_unique_record 
ON expenditures_sync (
  operational_date, 
  amount, 
  location_name, 
  department_name, 
  expenditure_type
)

-- Index pentru performanță pe data operațională
CREATE INDEX idx_expenditures_sync_operational_date 
ON expenditures_sync (operational_date)
```

**Valori posibile pentru `data_source`**:
- `'bat_sync'` - Date importate din baza externă BAT (casino_payments)
- `'google_sheets'` - Date importate din Google Sheets
- `'preferences'` - Date introduse manual prin Preferences
- `'electric_invoice'` - Date transferate din facturi electrice
- `'api_sync'` - Date sincronizate prin API extern

**Exemplu înregistrare**:
```json
{
  "id": 1423273,
  "location_name": "Ploiesti (centru)",
  "department_name": "Salarii",
  "expenditure_type": "Salariile agenților paza",
  "amount": "17116.00",
  "operational_date": "2025-12-09",
  "synced_at": "2025-12-17T12:57:44.889Z",
  "original_location_id": null,
  "mapped_location_id": null,
  "created_at": "2025-12-17T12:57:44.889Z",
  "data_source": "bat_sync",
  "description": null,
  "created_by": null,
  "updated_by": null,
  "updated_at": "2025-12-17T12:57:44.889Z"
}
```

---

### 2. `electric_invoices_nlc` - Facturi Electrice (NLC)

**Descriere**: Tabel pentru stocarea datelor extrase din facturi electrice PDF (NLC = Număr Loc de Consum).

**Structură**:

```sql
CREATE TABLE electric_invoices_nlc (
  id SERIAL PRIMARY KEY,
  nlc_code VARCHAR(50) NOT NULL,
  location_name VARCHAR(255),
  numar_factura VARCHAR(100),
  perioada_facturare VARCHAR(100),
  suma_totala DECIMAL(15,2),
  suma_activa DECIMAL(15,2),
  suma_reactiva DECIMAL(15,2),
  consum_kwh DECIMAL(15,3),
  consum_reactiv_kvarh DECIMAL(15,3),
  pret_per_kwh DECIMAL(10,4),
  tva DECIMAL(5,2),
  furnizor VARCHAR(255),
  numar_contor VARCHAR(100),
  data_emiterii DATE,
  data_scadenta DATE,
  invoice_file_path TEXT,
  invoice_link TEXT,
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  saved_to_expenditures BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  notes TEXT,
  slots_count INTEGER,
  kwh_per_slot DECIMAL(10,3),
  cost_per_slot DECIMAL(10,2),
  pdf_file BYTEA,
  pdf_filename VARCHAR(255),
  invoice_total_amount DECIMAL(15,2),
  UNIQUE(nlc_code, perioada_facturare, numar_factura)
)
```

**Coloane**:

| Coloană | Tip | Descriere |
|---------|-----|-----------|
| `id` | SERIAL | Primary key |
| `nlc_code` | VARCHAR(50) | Număr Loc de Consum (identificator unic pentru locație) |
| `location_name` | VARCHAR(255) | Numele locației asociate cu NLC-ul |
| `numar_factura` | VARCHAR(100) | Numărul facturii |
| `perioada_facturare` | VARCHAR(100) | Perioada de facturare (ex: "01.12.2025 - 31.12.2025") |
| `suma_totala` | DECIMAL(15,2) | Suma totală a facturii pentru acest NLC |
| `suma_activa` | DECIMAL(15,2) | Suma pentru energie activă |
| `suma_reactiva` | DECIMAL(15,2) | Suma pentru energie reactivă |
| `consum_kwh` | DECIMAL(15,3) | Consum energie activă în kWh |
| `consum_reactiv_kvarh` | DECIMAL(15,3) | Consum energie reactivă în kVArh |
| `pret_per_kwh` | DECIMAL(10,4) | Preț per kWh |
| `tva` | DECIMAL(5,2) | Procent TVA (default: 19) |
| `furnizor` | VARCHAR(255) | Numele furnizorului de energie |
| `numar_contor` | VARCHAR(100) | Numărul contorului |
| `data_emiterii` | DATE | Data emiterii facturii |
| `data_scadenta` | DATE | Data scadenței facturii |
| `invoice_file_path` | TEXT | Calea către fișierul PDF al facturii |
| `invoice_link` | TEXT | Link către factură (dacă e stocată în cloud) |
| `extracted_at` | TIMESTAMP | Timestamp când a fost extrasă informația |
| `saved_to_expenditures` | BOOLEAN | Flag care indică dacă a fost transferată în `expenditures_sync` |
| `created_by` | INTEGER | Foreign key către `users(id)` |
| `notes` | TEXT | Note suplimentare |
| `slots_count` | INTEGER | Număr de sloturi pentru calculul costului per slot |
| `kwh_per_slot` | DECIMAL(10,3) | Consum kWh per slot |
| `cost_per_slot` | DECIMAL(10,2) | Cost per slot |
| `pdf_file` | BYTEA | Conținutul PDF al facturii (binary) |
| `pdf_filename` | VARCHAR(255) | Numele fișierului PDF |
| `invoice_total_amount` | DECIMAL(15,2) | Suma totală a facturii (extrasă direct, nu calculată) |

**Indexuri**:
```sql
CREATE INDEX idx_electric_nlc_code ON electric_invoices_nlc(nlc_code)
CREATE INDEX idx_electric_nlc_location ON electric_invoices_nlc(location_name)
CREATE INDEX idx_electric_nlc_period ON electric_invoices_nlc(perioada_facturare)
CREATE INDEX idx_electric_invoice_total ON electric_invoices_nlc(numar_factura, invoice_total_amount)
```

**Constraint unic**: `(nlc_code, perioada_facturare, numar_factura)` - previne duplicate pentru același NLC în aceeași perioadă și factură.

---

### 3. `expenditure_location_mapping` - Mapping Locații

**Descriere**: Tabel pentru maparea numelor de locații din baza externă (BAT) la ID-urile din tabelul `locations`.

**Structură**:

```sql
CREATE TABLE expenditure_location_mapping (
  id SERIAL PRIMARY KEY,
  external_location_name VARCHAR(255) UNIQUE NOT NULL,
  local_location_id INTEGER REFERENCES locations(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Coloane**:

| Coloană | Tip | Descriere |
|---------|-----|-----------|
| `id` | SERIAL | Primary key |
| `external_location_name` | VARCHAR(255) UNIQUE | Numele locației din baza externă (BAT) |
| `local_location_id` | INTEGER | Foreign key către `locations(id)` |
| `created_at` | TIMESTAMP | Timestamp creare |
| `updated_at` | TIMESTAMP | Timestamp actualizare |

**Exemplu**:
```json
{
  "id": 1,
  "external_location_name": "Craiova E.S",
  "local_location_id": 5,
  "created_at": "2025-01-01T00:00:00.000Z",
  "updated_at": "2025-01-01T00:00:00.000Z"
}
```

---

### 4. `expenditures_backup_rules` - Reguli de Backup

**Descriere**: Tabel pentru configurarea regulilor de backup automat pentru cheltuieli.

**Structură**:

```sql
CREATE TABLE expenditures_backup_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  schedule_type VARCHAR(50) NOT NULL,
  schedule_time VARCHAR(10),
  day_of_week VARCHAR(10),
  day_of_month INTEGER,
  start_date DATE,
  end_date DATE,
  retention_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Coloane**:

| Coloană | Tip | Descriere |
|---------|-----|-----------|
| `id` | SERIAL | Primary key |
| `name` | VARCHAR(255) | Numele regulii de backup |
| `schedule_type` | VARCHAR(50) | Tip programare: `'manual'`, `'daily'`, `'weekly'`, `'monthly'` |
| `schedule_time` | VARCHAR(10) | Ora programării (format: `'HH:MM'`, ex: `'02:00'`) |
| `day_of_week` | VARCHAR(10) | Ziua săptămânii pentru `'weekly'` (ex: `'Mon'`, `'Tue'`) |
| `day_of_month` | INTEGER | Ziua lunii pentru `'monthly'` (1-31) |
| `start_date` | DATE | Data de început a programării |
| `end_date` | DATE | Data de sfârșit a programării |
| `retention_days` | INTEGER | Numărul de zile pentru păstrarea backup-urilor (default: 30) |
| `is_active` | BOOLEAN | Dacă regula este activă (default: TRUE) |
| `created_by` | INTEGER | Foreign key către `users(id)` |
| `created_at` | TIMESTAMP | Timestamp creare |
| `updated_at` | TIMESTAMP | Timestamp actualizare |

---

### 5. `slots_monthly` - Sloturi Lunare

**Descriere**: Tabel pentru stocarea numărului de sloturi pe locație, pe lună și an (folosit pentru calculul costului per slot pentru facturi electrice).

**Structură**:

```sql
CREATE TABLE slots_monthly (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  location_name VARCHAR(255) NOT NULL,
  slots_count INTEGER NOT NULL,
  source VARCHAR(50) DEFAULT 'incasari_sync',
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(year, month, location_name)
)
```

**Coloane**:

| Coloană | Tip | Descriere |
|---------|-----|-----------|
| `id` | SERIAL | Primary key |
| `year` | INTEGER | Anul (ex: 2024, 2025) |
| `month` | INTEGER | Luna (1-12) |
| `location_name` | VARCHAR(255) | Numele locației |
| `slots_count` | INTEGER | Număr de sloturi pentru acea locație în acea lună |
| `source` | VARCHAR(50) | Sursa datelor: `'incasari_sync'` (sincronizat automat) sau `'manual'` (introdus manual) |
| `notes` | TEXT | Note suplimentare |
| `created_by` | INTEGER | Foreign key către `users(id)` |
| `updated_by` | INTEGER | Foreign key către `users(id)` |
| `created_at` | TIMESTAMP | Timestamp creare |
| `updated_at` | TIMESTAMP | Timestamp actualizare |

**Constraint unic**: `(year, month, location_name)` - previne duplicate pentru aceeași combinație.

**Exemplu înregistrare**:
```json
{
  "id": 1,
  "year": 2025,
  "month": 12,
  "location_name": "Craiova",
  "slots_count": 150,
  "source": "incasari_sync",
  "notes": null,
  "created_by": 1,
  "updated_by": null,
  "created_at": "2025-12-01T00:00:00.000Z",
  "updated_at": "2025-12-01T00:00:00.000Z"
}
```

---

## Relații între Tabele

```
expenditures_sync
  ├── mapped_location_id → locations(id)
  ├── created_by → users(id)
  └── updated_by → users(id)

electric_invoices_nlc
  └── created_by → users(id)

expenditure_location_mapping
  └── local_location_id → locations(id)

expenditures_backup_rules
  └── created_by → users(id)

slots_monthly
  ├── created_by → users(id)
  └── updated_by → users(id)
```

---

## Tabele Externe (BAT - Baza de Date Externă)

Cheltuielile sunt importate din baza de date externă BAT care conține:

### `public.casino_payments` (BAT)
- `id` - ID plată
- `date` - Data cheltuielii (mapată la `operational_date`)
- `amount` - Suma
- `location_id` → `casino_locations(id)`
- `department_id` → `casino_departments(id)`
- `expenditure_type_id` → `casino_expenditure_types(id)`
- `is_deleted` - Flag pentru ștergere logică

### `public.casino_locations` (BAT)
- `id` - ID locație
- `name` - Numele locației

### `public.casino_departments` (BAT)
- `id` - ID departament
- `name` - Numele departamentului

### `public.casino_expenditure_types` (BAT)
- `id` - ID tip cheltuială
- `name` - Numele tipului de cheltuială

---

## Exemple de Query-uri

### Obține toate cheltuielile pentru o locație
```sql
SELECT * FROM expenditures_sync 
WHERE location_name = 'Craiova' 
ORDER BY operational_date DESC;
```

### Obține cheltuielile pentru un departament
```sql
SELECT * FROM expenditures_sync 
WHERE department_name = 'Salarii' 
ORDER BY operational_date DESC;
```

### Obține suma totală pe locație
```sql
SELECT 
  location_name,
  SUM(amount) as total
FROM expenditures_sync
GROUP BY location_name
ORDER BY total DESC;
```

### Obține cheltuielile pentru o perioadă
```sql
SELECT * FROM expenditures_sync
WHERE operational_date >= '2024-01-01' 
  AND operational_date <= '2025-12-31'
ORDER BY operational_date DESC;
```

### Obține facturi electrice ne-transferate
```sql
SELECT * FROM electric_invoices_nlc
WHERE saved_to_expenditures = FALSE
ORDER BY extracted_at DESC;
```

---

## Note Importante

1. **Normalizare locații**: Numele locațiilor sunt normalizate (fără diacritice) pentru matching consistent
2. **Prevenire duplicate**: Index unic pe `(operational_date, amount, location_name, department_name, expenditure_type)`
3. **Data source tracking**: Fiecare înregistrare știe de unde provine (`data_source`)
4. **Audit trail**: `created_by`, `updated_by`, `created_at`, `updated_at` pentru tracking modificări
5. **Soft delete**: Nu există ștergere fizică, doar flag-uri sau ștergere directă (fără soft delete)
