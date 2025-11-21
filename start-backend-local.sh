#!/bin/bash

# Script pentru pornirea doar a backend-ului local

echo "🚀 Pornire backend CASHPOT local..."
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

echo ""
echo "✅ Dependențe instalate!"
echo ""
echo "📋 Configurație:"
echo "   - Backend: http://localhost:5001 (sau PORT din backend/.env)"
echo ""
echo "🔄 Pornire backend..."
echo ""

# Pornește backend
cd backend
npm run dev

