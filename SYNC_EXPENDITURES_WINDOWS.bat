@echo off
REM ===================================================================
REM CASHPOT - Sync Expenditures (LOCAL - Windows Script)
REM ===================================================================
REM 
REM RULARE: Double-click pe acest fisier!
REM 
REM CE FACE:
REM 1. Verifica Git si Node.js
REM 2. Clone/update repo
REM 3. Install dependencies
REM 4. Sync datele de pe 192.168.1.39
REM 5. Upload la Render
REM 
REM CERINTE:
REM - Conectat REMOTE la PC de la birou
REM - Git instalat: https://git-scm.com/download/win
REM - Node.js instalat: https://nodejs.org
REM ===================================================================

echo.
echo ========================================
echo   CASHPOT - Sync Expenditures
echo ========================================
echo.

REM Check Git
echo [1/5] Verifying Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo [X] ERROR: Git NU este instalat!
    echo.
    echo Download Git de aici:
    echo https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)
echo [OK] Git found!

REM Check Node.js
echo.
echo [2/5] Verifying Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [X] ERROR: Node.js NU este instalat!
    echo.
    echo Download Node.js de aici:
    echo https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js found!

REM Setup project directory
echo.
echo [3/5] Setting up project...
cd /d C:\

REM Check if repo exists
if exist "cashpot-online" (
    echo [OK] Repo exists - updating...
    cd cashpot-online
    git pull origin main
    if errorlevel 1 (
        echo [X] ERROR: Git pull failed!
        pause
        exit /b 1
    )
) else (
    echo [OK] Cloning repo...
    git clone https://github.com/jeka7ro/cashpot-online.git
    if errorlevel 1 (
        echo [X] ERROR: Git clone failed!
        pause
        exit /b 1
    )
    cd cashpot-online
)

REM Install dependencies
echo.
echo [4/5] Installing dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo [X] ERROR: npm install failed!
    pause
    exit /b 1
)

REM Run sync script
echo.
echo [5/5] Running sync script...
echo ========================================
echo.

call npm run sync-expenditures

echo.
echo ========================================
if errorlevel 1 (
    echo [X] SYNC FAILED!
    echo.
    echo Posibile cauze:
    echo - NU esti conectat remote la birou
    echo - DB-ul 192.168.1.39 nu raspunde
    echo - Credentials gresite
    echo.
) else (
    echo [OK] SYNC COMPLET!
    echo.
    echo Mergi pe www.w1n.ro/expenditures si vei vedea datele!
    echo.
)

pause

