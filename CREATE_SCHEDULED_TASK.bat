@echo off
echo ========================================
echo CASHPOT - Creare Task Automat
echo ========================================
echo.
echo Acest script va crea un task in Windows
echo care va rula sincronizarea zilnic la 11:00 (ora Romaniei)
echo.

REM Verifică privilegii de Administrator
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [X] EROARE: Acest script trebuie rulat ca Administrator!
    echo.
    echo Click dreapta pe fisier si selecteaza "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo [1/3] Verificare privilegii Administrator...
echo OK: Administrator!
echo.

REM Cale către scriptul de sync (Desktop\CashPot_Sync)
SET SYNC_FOLDER=%USERPROFILE%\Desktop\CashPot_Sync
SET SYNC_SCRIPT=%SYNC_FOLDER%\sync_expenditures_local.js

echo [2/3] Verificare existenta script sync...
if not exist "%SYNC_SCRIPT%" (
    echo [X] EROARE: Scriptul %SYNC_SCRIPT% nu exista!
    echo.
    echo Rulează mai întâi SYNC_EXPENDITURES_COMPLETE.bat
    echo pentru a crea folder-ul și a descărca scriptul!
    echo.
    pause
    exit /b 1
)
echo OK: Script găsit!
echo.

echo [3/3] Creare task programat...
echo.
echo Detalii task:
echo   Nume: CashPot_Sync_Daily
echo   Ora: 11:00 (ora Romaniei - GMT+2/GMT+3)
echo   Frecvență: Zilnic
echo   Script: %SYNC_SCRIPT%
echo.

REM Șterge task-ul dacă există deja
schtasks /Delete /TN "CashPot_Sync_Daily" /F >nul 2>&1

REM Creează task-ul nou
schtasks /Create /TN "CashPot_Sync_Daily" /TR "cmd /c cd /d %SYNC_FOLDER% && node sync_expenditures_local.js >> sync_daily_log.txt 2>&1" /SC DAILY /ST 11:00 /F

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo [✓] TASK CREAT CU SUCCES!
    echo ========================================
    echo.
    echo Task-ul va rula AUTOMAT în fiecare zi la 11:00
    echo.
    echo Pentru a verifica:
    echo   1. Deschide "Task Scheduler" (Windows)
    echo   2. Caută "CashPot_Sync_Daily"
    echo.
    echo Pentru a șterge task-ul:
    echo   schtasks /Delete /TN "CashPot_Sync_Daily" /F
    echo.
    echo Log-urile se vor salva în:
    echo   %SYNC_FOLDER%\sync_daily_log.txt
    echo.
) else (
    echo.
    echo ========================================
    echo [X] EROARE: Nu am putut crea task-ul!
    echo ========================================
    echo.
    echo Posibile cauze:
    echo - Nu ai privilegii de Administrator
    echo - Task Scheduler service nu rulează
    echo.
)

echo ========================================
pause

