# 🔢 Sistem de Versioning Automat - CASHPOT V7

## 📋 Descriere

Aplicația CASHPOT V7 folosește un sistem de versioning automat care incrementează versiunea și numărul de build la fiecare build de producție.

## 🎯 Cum Funcționează

### Fișiere Importante

1. **`version.json`** - Conține versiunea curentă, numărul de build și data build-ului
2. **`scripts/increment-version.js`** - Script care incrementează automat versiunea
3. **`src/utils/version.js`** - Utilitare pentru afișarea versiunii în aplicație

### Format Versiune

```
v7.0.3 - Build #3 - 01.10.2025 - 09:38
```

- **v7.0.3** - Versiunea aplicației (MAJOR.MINOR.PATCH)
- **Build #3** - Numărul de build (incrementat automat)
- **01.10.2025 - 09:38** - Data și ora build-ului

## 🚀 Comenzi

### Build de Producție (cu auto-increment)
```bash
npm run build
```
Această comandă va:
1. Incrementa versiunea patch (7.0.1 → 7.0.2)
2. Incrementa numărul de build (#1 → #2)
3. Actualiza data build-ului
4. Crea build-ul de producție

### Build fără auto-increment
```bash
npm run build:no-version
```
Folosește această comandă dacă vrei să construiești fără a incrementa versiunea.

### Doar Incrementare Versiune
```bash
npm run version:increment
```
Incrementează versiunea fără a construi aplicația.

## 📍 Unde Apare Versiunea

Versiunea apare în următoarele locații:

1. **Header** - Sub logo-ul CASHPOT V7
2. **Sidebar** - În josul sidebar-ului (opțional)
3. **Console** - La build în consola terminalului

## 🔧 Modificare Manuală

### Incrementare MINOR (7.0.x → 7.1.0)

Editează `version.json`:
```json
{
  "version": "7.1.0",
  "build": 1,
  "buildDate": "2025-10-01T06:38:31.232Z"
}
```

### Incrementare MAJOR (7.x.x → 8.0.0)

Editează `version.json`:
```json
{
  "version": "8.0.0",
  "build": 1,
  "buildDate": "2025-10-01T06:38:31.232Z"
}
```

### Reset Build Number

Editează `version.json` și setează `build` la 1:
```json
{
  "version": "7.0.3",
  "build": 1,
  "buildDate": "2025-10-01T06:38:31.232Z"
}
```

## 📊 Exemplu Evoluție Versiuni

```
7.0.1 (Build #1) → 7.0.2 (Build #2) → 7.0.3 (Build #3)
     ↓
7.1.0 (Build #4) → 7.1.1 (Build #5) → 7.1.2 (Build #6)
     ↓
8.0.0 (Build #7) → 8.0.1 (Build #8) → 8.0.2 (Build #9)
```

## 🎨 Personalizare Format Dată

Pentru a schimba formatul datei, editează `src/utils/version.js`:

```javascript
export const getBuildDate = () => {
  const date = new Date(versionData.buildDate)
  return date.toLocaleString('ro-RO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/\//g, '.').replace(',', ' -')
}
```

## ⚠️ Important

- **NU modifica** manual `version.json` între build-uri de producție
- Folosește `npm run build:no-version` pentru testing fără incrementare
- Versiunea se incrementează **automat** la fiecare `npm run build`
- Build number-ul **NU se resetează** la incrementare de versiune

## 🔄 Workflow Recomandat

1. **Development**: Folosește `npm run dev` (nu incrementează)
2. **Testing Build**: Folosește `npm run build:no-version`
3. **Production Build**: Folosește `npm run build` (incrementează automat)
4. **Deploy**: Deploy-ul folosește versiunea incrementată

---

**Made with ❤️ for CASHPOT V7**

