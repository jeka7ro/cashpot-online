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
    pause
    exit /b 1
)

echo [2/5] Node.js: OK
echo.

REM Verifică dacă npm este instalat
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] NPM NU este instalat!
    pause
    exit /b 1
)

echo [3/5] NPM: OK
echo.

REM Instalează dependințe dacă lipsesc
if not exist "node_modules\" (
    echo [4/5] Instalare dependințe...
    call npm install
) else (
    echo [4/5] Dependințe: OK
)
echo.

REM Rulează script-ul de sincronizare
echo [5/5] Running sync script...
echo ========================================
call npm run sync-expenditures

if %ERRORLEVEL% EQU 0 (
    echo ========================================
    echo [✓] SYNC COMPLETED SUCCESSFULLY!
    echo.
    echo Date noi sincronizate cu succes!
    echo Refresh aplicația (F5) pentru a vedea datele.
    echo ========================================
) else (
    echo ========================================
    echo [X] SYNC FAILED!
    echo.
    echo Posibile cauze:
    echo - NU esti conectat remote la birou
    echo - DB-ul 192.168.1.39 nu raspunde
    echo - Credentials gresite
    echo ========================================
)

echo.
pause

