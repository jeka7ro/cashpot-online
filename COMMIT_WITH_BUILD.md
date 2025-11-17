# Commit cu Build Number

De acum încolo, **TOATE** commit-urile trebuie să includă numărul build-ului!

## Mod de utilizare:

### Opțiunea 1: Folosește scriptul prepare-commit.sh (RECOMANDAT)

```bash
./scripts/prepare-commit.sh "mesaj commit"
git commit -m "mesaj commit - Build #XX"
git push origin main
```

Scriptul va:
- Incrementa automat build number în `version.json`
- Adăuga `version.json` în staging
- Afișa build number-ul pentru a-l include în commit message

### Opțiunea 2: Manual

1. Incrementa build number:
   ```bash
   node scripts/update-build.js
   ```

2. Verifică build number-ul:
   ```bash
   cat version.json | grep build
   ```

3. Adaugă build-ul în commit message:
   ```bash
   git add -A
   git commit -m "mesaj commit - Build #XX"
   git push origin main
   ```

## Format commit message:

```
[TIP] Mesaj descriptiv - Build #XX

- Detalii modificări
- Listă cu bullet points
```

**EXEMPLU:**
```
feat: Progres detaliat în timp real pentru sincronizare - Build #21

- Backend: endpoint GET /api/expenditures/sync-status
- Frontend: polling pentru progres în timp real
- Mesaj detaliat cu toate informațiile
```

## IMPORTANT:

- Build number-ul din `version.json` trebuie să corespundă cu cel afișat în header bar
- Build number-ul se incrementează automat cu `node scripts/update-build.js`
- **NU** commit fără build number în message!

