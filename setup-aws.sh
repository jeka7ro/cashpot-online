#!/bin/bash

echo "🚀 CASHPOT V7 - Configurare AWS S3"
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Fișierul .env nu există!"
    exit 1
fi

echo "📋 Pentru a configura AWS S3, ai nevoie de:"
echo "   1. AWS Access Key ID"
echo "   2. AWS Secret Access Key"
echo "   3. Numele bucket-ului S3"
echo ""

# Get AWS credentials
read -p "🔑 Introdu AWS Access Key ID: " aws_access_key
read -s -p "🔐 Introdu AWS Secret Access Key: " aws_secret_key
echo ""
read -p "📦 Introdu numele bucket-ului S3 (ex: cashpot-documents-eugen): " bucket_name

# Validate inputs
if [ -z "$aws_access_key" ] || [ -z "$aws_secret_key" ] || [ -z "$bucket_name" ]; then
    echo "❌ Toate câmpurile sunt obligatorii!"
    exit 1
fi

# Update .env file
echo ""
echo "🔄 Actualizez fișierul .env..."

# Create backup
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update AWS credentials
sed -i '' "s/AWS_ACCESS_KEY_ID=.*/AWS_ACCESS_KEY_ID=$aws_access_key/" .env
sed -i '' "s/AWS_SECRET_ACCESS_KEY=.*/AWS_SECRET_ACCESS_KEY=$aws_secret_key/" .env
sed -i '' "s/AWS_S3_BUCKET=.*/AWS_S3_BUCKET=$bucket_name/" .env

echo "✅ Configurația AWS a fost actualizată!"
echo ""

# Test configuration
echo "🧪 Testez configurația..."
echo "   - Access Key ID: ${aws_access_key:0:8}..."
echo "   - Bucket: $bucket_name"
echo "   - Region: eu-central-1"
echo ""

echo "🔄 Pentru a aplica schimbările, restart serverul:"
echo "   1. Oprește serverul curent (CTRL + C)"
echo "   2. Pornește din nou: node server-simple.js"
echo ""

echo "📊 Pentru a testa backup-ul:"
echo "   curl -X POST http://localhost:5001/api/backup/create"
echo ""

echo "🎉 Configurarea AWS S3 este completă!"
echo "   Toate fișierele și backup-urile vor fi salvate în cloud!"


