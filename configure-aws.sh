#!/bin/bash

echo "🚀 CASHPOT V7 - Configurare AWS S3"
echo "=================================="
echo ""
echo "Ai nevoie de credențialele AWS S3:"
echo "1. AWS Access Key ID (începe cu AKIA...)"
echo "2. AWS Secret Access Key"
echo "3. Numele bucket-ului S3"
echo ""

# Get AWS credentials
read -p "🔑 AWS Access Key ID: " aws_access_key
read -s -p "🔐 AWS Secret Access Key: " aws_secret_key
echo ""
read -p "📦 Numele bucket-ului S3: " bucket_name

# Validate inputs
if [ -z "$aws_access_key" ] || [ -z "$aws_secret_key" ] || [ -z "$bucket_name" ]; then
    echo "❌ Toate câmpurile sunt obligatorii!"
    exit 1
fi

# Update .env file
echo ""
echo "🔄 Actualizez .env cu credențialele AWS..."

# Create backup
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update AWS credentials using sed
sed -i '' "s/AWS_ACCESS_KEY_ID=.*/AWS_ACCESS_KEY_ID=$aws_access_key/" .env
sed -i '' "s/AWS_SECRET_ACCESS_KEY=.*/AWS_SECRET_ACCESS_KEY=$aws_secret_key/" .env
sed -i '' "s/AWS_S3_BUCKET=.*/AWS_S3_BUCKET=$bucket_name/" .env

echo "✅ AWS S3 configurat cu succes!"
echo ""
echo "📋 Configurația actuală:"
echo "   - Access Key: ${aws_access_key:0:8}..."
echo "   - Bucket: $bucket_name"
echo "   - Region: eu-central-1"
echo ""
echo "🔄 Pentru a aplica schimbările:"
echo "   1. Oprește serverul (CTRL+C)"
echo "   2. Pornește din nou: node server-postgres.js"
echo ""
echo "🧪 Pentru a testa backup-ul:"
echo "   curl -X POST http://localhost:5001/api/backup/create"
echo ""
echo "🎉 Toate fișierele și backup-urile vor fi salvate pe AWS S3!"


