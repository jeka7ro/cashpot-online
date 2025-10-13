#!/bin/bash

echo "🔧 Configurare CASHPOT V7 - MongoDB"
echo ""
echo "Te rog să introduci parola pentru MongoDB Atlas (user: jeka7ro):"
read -s password

cat > .env << ENVFILE
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://jeka7ro:${password}@jeka7ro.gkyalir.mongodb.net/cashpot?retryWrites=true&w=majority&appName=jeka7ro

# JWT Secret
JWT_SECRET=cashpot-secret-key-2024-very-secure

# Server Port
PORT=5000

# Node Environment
NODE_ENV=development
ENVFILE

chmod 600 .env

echo ""
echo "✅ Fișierul .env a fost creat cu succes!"
echo ""
echo "Pornește server-ul cu:"
echo "  node server-mongodb.js"
echo ""
