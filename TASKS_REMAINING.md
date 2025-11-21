# 📋 TASKURI RĂMASE DE FĂCUT

## ✅ COMPLETATE RECENT
1. ✅ **Fix POS data showing zero** - Am actualizat query-urile pentru POS să folosească `DATE()` și să gestioneze NULL-urile corect
2. ✅ **Sincronizare query-uri POS** - Am făcut query-urile din `/overview` și `/pos-data` consistente

## 🔴 PRIORITATE ÎNALTĂ

### 1. **Verificare Fix POS**
- **Status**: ⏳ PENDING
- **Descriere**: Verifică dacă fix-ul pentru POS funcționează corect - test că valorile POS apar în tabelul "Prezentare generală"
- **Fișier**: `backend/routes/incasari.js` (liniile 744-755, 1346-1358)
- **Acțiune**: Testează endpoint-ul `/api/incasari/overview` și verifică dacă valorile POS sunt corecte pentru toate perioadele

### 2. **ExpendituresSettings - Progress Popup "Import Toate Datele"**
- **Status**: ⏳ PENDING  
- **Descriere**: Progress popup-ul pentru "Import Toate Datele" nu este vizibil. Trebuie să afișeze progresul.
- **Fișier**: `src/components/modals/ExpendituresSettingsModal.jsx`
- **Acțiune**: 
  - Verifică dacă există tab-ul "Acțiuni Manuale Cheltuieli" (menționat în summary)
  - Dacă nu există, adaugă-l cu butonul "Import Toate Datele"
  - Implementează progress display similar cu cel din `Incasari.jsx` (modal cu progress bar și log)
  - Endpoint: `/api/expenditures/import-all-status` pentru polling

### 3. **Game Mix History Storage**
- **Status**: ⏳ PENDING
- **Descriere**: Aplicația ar trebui să păstreze numele istorice de `game_mix` pentru sloturi, nu doar cel curent, pentru a permite filtrarea corectă pentru perioade trecute. Acest lucru necesită să se aducă `game_mix` din Cyber și să se stocheze în `incasari_daily`.
- **Fișier**: `backend/import-incasari-from-cyber.js`
- **Acțiune**: 
  - Verifică dacă `game_mix` este importat din Cyber (am văzut că există coloana în `incasari_daily`)
  - Dacă nu, adaugă JOIN cu `machine_types` sau altă tabelă relevantă pentru a obține `game_mix` istoric
  - Asigură-te că `game_mix` este salvat în `incasari_daily` pentru fiecare zi

## 🟡 PRIORITATE MEDIE

### 4. **Location-specific POS Data Linking**
- **Status**: ⏳ PENDING
- **Descriere**: Datele POS în "Prezentare generală" și grafice ar trebui să fie corect afișate, nu zero, și ar trebui să se potrivească cu cheltuielile. Datele POS ar trebui să fie legate de `date + location` când sunt active view-urile specifice locației.
- **Fișier**: `backend/routes/incasari.js` (endpoint `/overview`)
- **Acțiune**: 
  - Verifică dacă POS este corect legat de locații când `includeLocations` este setat
  - Ajustează query-ul POS să filtreze pe locații când este necesar

### 5. **Verificare Consistență Date**
- **Status**: ⏳ PENDING
- **Descriere**: Verifică dacă toate endpoint-urile pentru Încasări respectă setările de locații vizibile (`includeLocations`)
- **Fișier**: `backend/routes/incasari.js`
- **Acțiune**: 
  - Verifică că toate endpoint-urile (`/summary`, `/daily-stats`, `/avg-in-by-location`, etc.) folosesc `includeLocations`
  - Testează că filtrarea funcționează corect

## 🟢 PRIORITATE SCĂZUTĂ / FEATURE-URI VIITOARE

### 6. **Floorplan Feature**
- **Status**: ⏳ PENDING
- **Descriere**: Implementează o funcționalitate floorplan pentru fiecare locație, afișând drop mediu sau GGR pe slot, cu culori personalizabile bazate pe metrici. Ar trebui să folosească SVG.
- **Acțiune**: Feature nou - necesită planificare completă

### 7. **Upload PDF Plans**
- **Status**: ⏳ PENDING
- **Descriere**: Permite upload de planuri PDF ca referință pentru crearea de floorplan-uri SVG.
- **Acțiune**: Feature nou - necesită planificare completă

### 8. **Backoffice Page pentru Slot Serial Numbers**
- **Status**: ⏳ PENDING
- **Descriere**: Creează o pagină backoffice pentru gestionarea numerelor de serie ale sloturilor și altor detalii ale mașinilor.
- **Acțiune**: Feature nou - necesită planificare completă

### 9. **P&L Pages per Location**
- **Status**: ⏳ PENDING
- **Descriere**: Implementează pagini P&L per locație, per lună/an, combinând încasări și cheltuieli.
- **Acțiune**: Feature nou - necesită planificare completă

---

## 📝 NOTIȚE

- **POS Fix**: Am făcut modificările în `backend/routes/incasari.js` pentru a folosi `DATE()` și a gestiona NULL-urile. Trebuie testat.
- **ExpendituresSettings**: Trebuie verificat dacă tab-ul "Acțiuni Manuale" există și dacă progress popup-ul funcționează.
- **Game Mix History**: Coloana `game_mix` există în `incasari_daily`, dar trebuie verificat dacă este populată corect din Cyber.

---

**Ultima actualizare**: $(date)




