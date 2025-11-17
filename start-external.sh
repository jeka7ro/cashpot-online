#!/bin/bash

# Script pentru pornirea serverelor cu acces extern
# IP: 82.76.35.50:9858

echo "🚀 Pornire servere pentru acces extern (82.76.35.50:9858)"

# Setează variabilele de mediu
export HOST=0.0.0.0
export PORT=3001  # sau 9859 dacă vrei alt port

# Pornește backend-ul în background
echo "📦 Pornire backend pe port $PORT..."
cd backend
HOST=0.0.0.0 PORT=$PORT node server-postgres.js &
BACKEND_PID=$!
cd ..

# Așteaptă puțin ca backend-ul să pornească
sleep 3

# Pornește frontend-ul
echo "🌐 Pornire frontend pe port 9858..."
cd src
npm run dev
FRONTEND_PID=$!

# Funcție pentru cleanup la ieșire
cleanup() {
    echo "🛑 Oprire servere..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Trap pentru cleanup
trap cleanup SIGINT SIGTERM

# Așteaptă până când procesele se termină
wait

