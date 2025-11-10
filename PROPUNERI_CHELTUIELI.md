# 💡 PROPUNERI SMART - Cheltuieli în Locație + 2 Grafice NOI

---

## 📊 **PROPUNERE 1: Cheltuieli în LocationDetail**

### **Unde:** Pagina Location Detail (ex: Valcea)
### **Ce:** Secțiune nouă "Cheltuieli Locație" între "Statistici Financiare" și "Contracte"

### **Design propus:**

```
┌─────────────────────────────────────────────────────────────┐
│ 💰 Cheltuieli Locație                                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Card 1: Total]  [Card 2: Luna Curentă]  [Card 3: Trend]   │
│                                                               │
│  ┌─ Mini Grafic (Evoluție 6 luni) ────────────────────────┐ │
│  │  Line chart: ian, feb, mar, apr, mai, iun               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─ Top 5 Categorii pentru această locație ───────────────┐ │
│  │  1. Salarii: 50,000 RON (40%)                           │ │
│  │  2. Chirie: 30,000 RON (24%)                            │ │
│  │  3. Bar: 20,000 RON (16%)                               │ │
│  │  4. Electricitate: 15,000 RON (12%)                     │ │
│  │  5. Curățenie: 10,000 RON (8%)                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [Buton: 📊 Vezi Toate Cheltuielile →]                       │
│  (Link către pagina Cheltuieli cu filtru pe această locație) │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### **3 Cards:**
- **Total Cheltuieli:** Suma totală pentru această locație (all-time)
- **Luna Curentă:** Cheltuieli luna curentă pentru această locație
- **Trend:** ↗️ +15% față de luna trecută (sau ↘️ -10%)

### **Mini grafic:**
- Line chart simplu (evoluție ultimele 6 luni)
- Doar pentru această locație

### **Top 5 Categorii:**
- Lista cu progress bars
- Click pe categorie → Filtrează pagina Cheltuieli

### **Buton "Vezi Toate":**
- Navighează la `/expenditures?location=Valcea`
- Filtrează automat cheltuielile pentru Valcea

---

## 📊 **PROPUNERE 2: 2 Grafice NOI pe pagina Cheltuieli**

### **Grafic 1: Comparație Luna Curentă vs Luna Precedentă (Bar Chart)**

```
┌─ Comparație Luni ─────────────────────────┐
│                                            │
│  Salarii    ████████████ 50K (Nov)        │
│             ████████ 40K (Oct)            │
│                                            │
│  Chirie     ██████ 30K (Nov)              │
│             ██████ 30K (Oct)              │
│                                            │
│  Bar        ████ 20K (Nov)                │
│             ███ 15K (Oct)                 │
│                                            │
│  Legend: █ Nov 2025  █ Oct 2025           │
└────────────────────────────────────────────┘
```

**Ce arată:**
- Comparație side-by-side pentru fiecare departament
- Luna curentă (albastru) vs Luna precedentă (gri)
- Ușor de identificat creșteri/scăderi

---

### **Grafic 2: Heatmap Cheltuieli pe Categorii x Locații**

```
┌─ Heatmap Categorii x Locații ────────────────────────────┐
│                Pitești  Craiova  Ploiești  Valcea  Total │
│                                                           │
│  Salarii       🟩 50K   🟨 40K   🟩 45K   🟦 30K   165K  │
│  Chirie        🟨 30K   🟩 35K   🟨 28K   🟦 20K   113K  │
│  Bar           🟦 20K   🟦 15K   🟨 25K   🟦 10K    70K  │
│  Electricitate 🟦 15K   🟦 12K   🟦 18K   🟦 8K     53K  │
│                                                           │
│  Legend: 🟩 >40K  🟨 20-40K  🟦 <20K                      │
└───────────────────────────────────────────────────────────┘
```

**Ce arată:**
- Matrix cu culori (heatmap)
- Identifici rapid unde sunt cheltuielile mari
- Click pe celulă → Filtrare departament + locație

---

### **ALTE VARIANTE (alege tu!):**

**A) Pie Chart Categorii (mai detaliat)**
- Top 10 categorii în loc de Top 5
- Slice-uri mai mici pentru vizibilitate

**B) Stacked Area Chart (Evoluție pe Departamente)**
- Line chart cu arii colorate pentru fiecare departament
- Vezi contribuția fiecărui departament în timp

**C) Trend Prediction (AI)**
- Linie cu predicție pentru lunile următoare
- Bazată pe medie mobilă + trend

---

## ❓ **ALEGE CE VREI:**

**Pentru CHELTUIELI ÎN LOCAȚIE:**
- [ ] **Opțiunea propusă** (3 cards + mini grafic + top 5 + buton)
- [ ] **Mai simplu** (doar 1 card cu total + buton)
- [ ] **Mai complex** (tab separat în LocationDetail cu toate cheltuielile)

**Pentru 2 GRAFICE NOI:**
- [ ] **Grafic 1:** Comparație Luna Curentă vs Precedentă (Bar Chart)
- [ ] **Grafic 2:** Heatmap Categorii x Locații
- [ ] **SAU alte variante:** (A/B/C de mai sus)

---

## 🚀 **ÎN TIMPUL ĂSTA, FAC FIX PENTRU "$":**

<function_calls>
<invoke name="grep">
<parameter name="pattern">DollarSign|BarChart3.*w-8
