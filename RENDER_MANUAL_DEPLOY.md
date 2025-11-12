# 🚀 RENDER MANUAL DEPLOY - INSTRUCȚIUNI

## PROBLEMA:
Backend-ul pe Render.com are **version 1.0.49** (VECHI!)  
Trebuie: **version 2.0.0** (cu fix pentru Google Sheets import)

---

## SOLUȚIE: MANUAL DEPLOY (2 minute)

### PASUL 1: Deschide Render Dashboard
```
https://dashboard.render.com/web/srv-ctci3hrtq21c73d21km0
```

### PASUL 2: Login (dacă cere)

### PASUL 3: Click "Manual Deploy" (buton albastru, dreapta sus)

### PASUL 4: Selectează:
- **"Clear build cache & deploy"** ✅ IMPORTANT!

### PASUL 5: Click "Deploy"

### PASUL 6: AȘTEAPTĂ 3-5 minute

### PASUL 7: Verifică versiunea:
```
https://cashpot-backend.onrender.com/health
```

**Trebuie să vezi:**
```json
{
  "status": "OK",
  "version": "2.0.0"  ✅
}
```

---

## APOI: IMPORTUL GOOGLE SHEETS VA FUNCȚIONA!

1. Refresh site: `Ctrl+Shift+R`
2. Cheltuieli → Setări → Google Sheets
3. Click "PREVIEW Date"
4. Click "CONFIRMĂ IMPORT"
5. ✅ Gata în 30-60 secunde!

---

**Fă manual deploy ACUM în timp ce eu continuu cu codul!** 🚀

