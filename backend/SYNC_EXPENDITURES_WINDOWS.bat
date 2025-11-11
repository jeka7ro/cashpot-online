@echo off
echo ========================================
echo CASHPOT - Sincronizare Cheltuieli
echo ========================================
echo.
echo [1/5] Verificare conexiune la baza de date...
echo.

REM Verifică dacă Node.js este instalat
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] Node.js NU este instalat!
    echo Instalează Node.js de la: https://nodejs.org
    echo.
    echo Apasă orice tastă pentru a închide...
    pause >nul
    exit /b 1
)

echo [2/5] Node.js: OK
echo.

REM Verifică dacă npm este instalat
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] NPM NU este instalat!
    echo.
    echo Apasă orice tastă pentru a închide...
    pause >nul
    exit /b 1
)

echo [3/5] NPM: OK
echo.

REM Instalează dependințe dacă lipsesc
if not exist "node_modules\" (
    echo [4/5] Instalare dependințe...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [X] EROARE la instalare dependințe!
        echo.
        echo Apasă orice tastă pentru a închide...
        pause >nul
        exit /b 1
    )
) else (
    echo [4/5] Dependințe: OK
)
echo.

REM Rulează script-ul de sincronizare și salvează output în fișier
echo [5/5] Running sync script...
echo ========================================
echo.
echo Output va fi salvat în: sync_log.txt
echo.

call npm run sync-expenditures > sync_log.txt 2>&1

if %ERRORLEVEL% EQU 0 (
    echo ========================================
    echo [✓] SYNC COMPLETED SUCCESSFULLY!
    echo.
    echo Date noi sincronizate cu succes!
    echo Refresh aplicația (F5) pentru a vedea datele.
    echo ========================================
    echo.
    type sync_log.txt
) else (
    echo ========================================
    echo [X] SYNC FAILED! Citește eroarea mai jos:
    echo ========================================
    echo.
    type sync_log.txt
    echo.
    echo ========================================
    echo [X] SYNC FAILED!
    echo.
    echo Posibile cauze:
    echo - NU ești conectat remote la birou
    echo - DB-ul 192.168.1.39 nu răspunde
    echo - Credentials greșite
    echo - Render backend offline
    echo.
    echo Log complet salvat în: sync_log.txt
    echo ========================================
)

echo.
echo Apasă orice tastă pentru a închide...
pause >nul
