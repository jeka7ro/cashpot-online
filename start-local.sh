#!/bin/bash

# Script pentru pornirea aplicației local (backend + frontend)

echo "🚀 Pornire aplicație CASHPOT local..."
echo ""

# Verifică dacă există .env în backend
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Nu există backend/.env!"
    echo "📋 Copiază backend/env.example în backend/.env și configurează-l"
    exit 1
fi

# Verifică dacă node_modules există
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Instalare dependențe backend..."
    cd backend
    npm install
    cd ..
fi

if [ ! -d "src/node_modules" ]; then
    echo "📦 Instalare dependențe frontend..."
    cd src
    npm install
    cd ..
fi

echo ""
echo "✅ Dependențe instalate!"
echo ""
echo "📋 Configurație:"
echo "   - Backend: http://localhost:5001 (sau PORT din backend/.env)"
echo "   - Frontend: http://localhost:5174 (5173 este folosit de altă aplicație)"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Backend-ul va rula în acest terminal"
echo "   - Frontend-ul va rula într-un terminal separat"
echo ""
echo "🔄 Pornire backend..."
echo ""

# Pornește backend în background
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Așteaptă puțin ca backend-ul să pornească
sleep 3

echo ""
echo "🔄 Pornire frontend..."
echo ""

# Pornește frontend
cd src
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Aplicația rulează!"
echo ""
echo "📊 Procese:"
echo "   - Backend PID: $BACKEND_PID"
echo "   - Frontend PID: $FRONTEND_PID"
echo ""
echo "🌐 Accesează aplicația la: http://localhost:5174"
echo ""
echo "⏹️  Pentru oprire, apasă Ctrl+C sau rulează:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Așteaptă Ctrl+C
trap "echo ''; echo '🛑 Oprire aplicație...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Așteaptă până când procesele se termină
wait

