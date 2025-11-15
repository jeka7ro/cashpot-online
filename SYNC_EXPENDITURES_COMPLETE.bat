@echo off
setlocal enabledelayedexpansion

echo ========================================
echo CASHPOT - Sincronizare Cheltuieli
echo ========================================
echo.
echo Acest script va crea folder si descarca
echo toate fisierele necesare automat!
echo.

REM Creează folder pentru sync
set SYNC_FOLDER=%USERPROFILE%\Desktop\CashPot_Sync
echo Creare folder: %SYNC_FOLDER%
if not exist "%SYNC_FOLDER%" mkdir "%SYNC_FOLDER%"
cd /d "%SYNC_FOLDER%"
echo OK: Folder creat si schimbat!
echo.

REM Verifică Node.js
echo [1/7] Verificare Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [X] EROARE: Node.js NU este instalat!
    echo.
    echo Descarcă și instalează Node.js de la:
    echo https://nodejs.org
    echo.
    echo După instalare, rulează din nou acest script.
    echo.
    pause
    exit /b 1
)
node --version
echo OK: Node.js instalat!
echo.

REM Creează package.json
echo [2/7] Creare package.json...
(
echo {
echo   "name": "cashpot-sync",
echo   "version": "1.0.0",
echo   "type": "module",
echo   "dependencies": {
echo     "pg": "^8.11.3",
echo     "axios": "^1.6.2",
echo     "dotenv": "^16.3.1"
echo   }
echo }
) > package.json
echo OK: package.json creat!
echo.

REM Descarcă sync script de pe GitHub
if not exist sync_expenditures_local.js (
    echo [3/7] Descarcare sync_expenditures_local.js...
    curl -L -o sync_expenditures_local.js "https://raw.githubusercontent.com/jeka7ro/cashpot-online/main/backend/sync_expenditures_local.js"
    if %ERRORLEVEL% NEQ 0 (
        echo [X] EROARE: Nu am putut descărca fișierul!
        echo Verifică conexiunea la internet.
        pause
        exit /b 1
    )
    echo OK: Fișier descarcat!
) else (
    echo [3/7] Folosesc sync_expenditures_local.js existent (nu descarc din nou)
)
echo.

REM Creează .env cu configurația DB
echo [4/7] Creare .env (configurație baza de date)...
(
echo # External Database ^(LAN - 192.168.1.39^)
echo EXPENDITURES_DB_USER=cashpot
echo EXPENDITURES_DB_PASSWORD=129hj8oahwd7yaw3e21321
echo EXPENDITURES_DB_HOST=192.168.1.39
echo EXPENDITURES_DB_PORT=26257
echo EXPENDITURES_DB_NAME=cashpot
echo.
echo # Render Backend
echo RENDER_BACKEND_URL=https://cashpot-backend.onrender.com
echo.
echo # Optional: Admin token ^(dacă e necesar^)
echo ADMIN_TOKEN=
) > .env
echo OK: .env creat!
echo.

REM Instalare dependințe
echo [5/7] Instalare dependințe (pg, axios, dotenv)...
echo Poate dura 30-60 secunde...
echo.
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [X] EROARE: npm install a eșuat!
    echo Vezi ERROR_LOG.txt pentru detalii.
    pause
    exit /b 1
)
echo OK: Dependințe instalate!
echo.

REM Rulează sync script
echo [6/7] Sincronizare date din 192.168.1.39...
echo ========================================
echo Data range: 2023-01-01 ^<-^> 2025-12-31
echo ========================================
echo.
node sync_expenditures_local.js > "%SYNC_FOLDER%\sync_log.txt" 2>&1
set SYNC_ERROR=%ERRORLEVEL%
type "%SYNC_FOLDER%\sync_log.txt"
echo.

if %SYNC_ERROR% EQU 0 (
    echo ========================================
    echo [✓] SYNC COMPLETED SUCCESSFULLY!
    echo ========================================
    echo.
    echo Date noi sincronizate cu succes!
    echo Refresh aplicația ^(F5^) pentru a vedea datele.
    echo.
) else (
    echo ========================================
    echo [X] SYNC FAILED! Cod eroare: %SYNC_ERROR%
    echo ========================================
    echo.
    echo Posibile cauze:
    echo - NU ești conectat la rețeaua de birou
    echo - DB-ul 192.168.1.39 nu răspunde
    echo - Render backend offline
    echo.
)

echo [7/7] Finalizare...
echo.
echo Log salvat în: %SYNC_FOLDER%\sync_log.txt
echo.
goto :pause

:error
echo.
echo ========================================
echo EROARE CRITICĂ! Vezi mai sus.
echo ========================================

:pause
pause

