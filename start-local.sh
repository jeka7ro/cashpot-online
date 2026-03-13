#!/bin/bash
# Script pornire locala CashPot
echo "🚀 Pornire CashPot Local..."

# Kill procese vechi
pkill -f "nodemon server-postgres" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Pornire backend
echo "▶️  Backend (port 5001)..."
cd "$(dirname "$0")/backend"
npm run dev &
BACKEND_PID=$!

# Asteapta sa porneasca
sleep 3

# Pornire frontend
echo "▶️  Frontend (port 5173)..."
cd "$(dirname "$0")"
npx vite &
FRONTEND_PID=$!

echo ""
echo "✅ Ambele servere pornite!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:5001"
echo ""
echo "Apasa Ctrl+C pentru a opri ambele servere"

# Asteapta input
wait $BACKEND_PID $FRONTEND_PID
