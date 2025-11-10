# 🔄 SINCRONIZARE CHELTUIELI - INSTRUCȚIUNI

## ❌ DE CE NU MERGE BUTONUL "SINCRONIZARE DATE"?

**Butonul NU funcționează când NU ești la birou** pentru că:
- Backend-ul de pe Render.com încearcă să se conecteze la: `192.168.1.39:26257`
- Acesta este un **IP LOCAL** din rețeaua biroului
- Render.com **NU are acces** la rețeaua ta LAN
- **Rezultat:** 500 Internal Server Error

---

## ✅ SOLUȚIA: Sincronizare din BIROU

### **CÂND EȘTI LA BIROU:**

#### **Windows (Metoda Simplă):**
1. Deschide `SYNC_EXPENDITURES_WINDOWS.bat` (dublu-click)
2. Așteaptă să termine (vezi "✅ SYNC COMPLET!")
3. Gata! Datele sunt pe Render

#### **Manual (Terminal):**
```bash
cd backend
npm run sync-expenditures
```

---

## 📋 CE FACE SCRIPTUL?

1. **Se conectează** la DB-ul extern (192.168.1.39:26257) ✅
2. **Extrage datele** cu filtrele configurate ✅
3. **Uploadează** la Render backend ✅

---

## 🔧 CONFIGURARE FILTRE

### **Filtre active (în Settings Modal):**
- `is_deleted = false` ✅
- `show_in_expenditures = true` ✅
- Exclude: Alpha Bank, Casino Technology, Bambouane, Cafes, Catering
- Departamente selectate (în Settings)
- Tipuri cheltuieli selectate (în Settings)

---

## ⏰ AUTO-SINCRONIZARE (OPȚIONAL)

### **Task Scheduler (Windows):**
1. Deschide **Task Scheduler**
2. Create Basic Task → "Sync Cheltuieli"
3. Trigger: **Daily** la **02:00 AM**
4. Action: Start a program → `C:\path\to\SYNC_EXPENDITURES_WINDOWS.bat`
5. Gata! Sincronizare automată în fiecare noapte

### **Cron Job (Linux/Mac):**
```bash
# Editează crontab
crontab -e

# Adaugă linia (sincronizare la 2 dimineața):
0 2 * * * cd /path/to/backend && npm run sync-expenditures
```

---

## 🚨 TROUBLESHOOTING

### **Error: "Connection refused" sau "ECONNREFUSED"**
- **Cauză:** NU ești la birou SAU PC-ul cu DB-ul nu e pornit
- **Soluție:** Rulează scriptul DOAR când ești la birou și PC-ul cu DB-ul e pornit

### **Error: "500 Internal Server Error" la salvare setări**
- **Cauză:** Există duplicate în array-uri (72/71 tipuri)
- **Soluție:** Am implementat auto-cleanup, ar trebui să meargă acum

### **Grafic arată luni dezordonate**
- **Cauză:** Sortare alfabetică în loc de cronologică
- **Soluție:** AM FIXAT! Acum sortează corect (dec 2024 → ian 2025 → feb 2025, etc.)

---

## 📞 SUPORT

**Dacă întâmpini probleme:**
1. Verifică că ești **conectat la rețeaua biroului**
2. Verifică că **PC-ul cu DB-ul (192.168.1.39) este pornit**
3. Rulează scriptul și **trimite-mi eroarea exactă** din console

---

## 🎯 REZUMAT RAPID

| Situație | Acțiune |
|----------|---------|
| 🏢 La birou | Rulează `SYNC_EXPENDITURES_WINDOWS.bat` |
| 🏠 Acasă | NU poți sincroniza (nu ai acces la 192.168.1.39) |
| ⚙️ Setări | Modifică din "Setări Filtrare" în aplicație |
| 🔄 Auto-sync | Configurează Task Scheduler pentru sincronizare automată |

---

**Ultima actualizare:** 10 noiembrie 2025

