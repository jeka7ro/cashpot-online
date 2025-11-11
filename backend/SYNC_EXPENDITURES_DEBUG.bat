@echo off
echo ========================================
echo CASHPOT - Sincronizare Cheltuieli DEBUG
echo ========================================
echo.
echo Toate mesajele vor fi salvate in: ERROR_LOG.txt
echo.

REM Șterge log-ul vechi
if exist ERROR_LOG.txt del ERROR_LOG.txt

REM Redirect TOTUL în fișier
(
echo ======================================== 
echo CASHPOT SYNC DEBUG - START
echo Data: %date% %time%
echo ========================================
echo.

echo [1/6] Verificare Node.js...
where node
if %ERRORLEVEL% NEQ 0 (
    echo EROARE: Node.js NU este instalat!
    echo Instalează de la: https://nodejs.org
    goto :error
)
echo OK: Node.js gasit!
echo.

echo [2/6] Verificare NPM...
where npm
if %ERRORLEVEL% NEQ 0 (
    echo EROARE: NPM NU este instalat!
    goto :error
)
echo OK: NPM gasit!
echo.

echo [3/6] Verificare director curent...
cd
echo.

echo [4/6] Verificare fisier sync_expenditures_local.js...
if not exist "sync_expenditures_local.js" (
    echo EROARE: Fisierul sync_expenditures_local.js NU exista in acest director!
    echo Director curent:
    cd
    echo.
    echo Continut director:
    dir /b
    goto :error
)
echo OK: sync_expenditures_local.js gasit!
echo.

echo [5/6] Instalare dependinte...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo EROARE: npm install a esuat!
    goto :error
)
echo OK: Dependinte instalate!
echo.

echo [6/6] Rulare sync script...
echo ========================================
node sync_expenditures_local.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo EROARE: Sync script a esuat!
    goto :error
)

echo.
echo ========================================
echo SUCCESS! Sincronizare completă!
echo ========================================
goto :end

:error
echo.
echo ========================================
echo EROARE DETECTATĂ! Vezi detalii mai sus.
echo ========================================

:end
echo.
echo Data: %date% %time%
echo ========================================
) > ERROR_LOG.txt 2>&1

REM Afișează log-ul
type ERROR_LOG.txt

echo.
echo.
echo ========================================
echo LOG SALVAT ÎN: ERROR_LOG.txt
echo Trimite acest fișier pentru debug!
echo ========================================
echo.
echo Apasă orice tastă pentru a închide...
pause >nul

