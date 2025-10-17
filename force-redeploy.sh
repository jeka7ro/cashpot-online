#!/bin/bash

# Script pentru forțarea redeploy-ului Render
# Rulează: ./force-redeploy.sh

echo "🚀 FORȚARE REDEPLOY RENDER..."

# Increment build number
CURRENT_BUILD=$(grep -o 'BUILD_NUMBER = "[0-9]*"' backend/server-postgres.js | grep -o '[0-9]*')
NEW_BUILD=$((CURRENT_BUILD + 1))

echo "📦 Build curent: $CURRENT_BUILD"
echo "📦 Build nou: $NEW_BUILD"

# Update build number in server
sed -i '' "s/BUILD_NUMBER = '[0-9]*'/BUILD_NUMBER = '$NEW_BUILD'/" backend/server-postgres.js

# Update version in package.json
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' backend/package.json | grep -o '[0-9.]*')
NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g')

echo "📦 Versiune curentă: $CURRENT_VERSION"
echo "📦 Versiune nouă: $NEW_VERSION"

sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" backend/package.json

# Update render.yaml trigger
TIMESTAMP=$(date +%s)
sed -i '' "s/FORCE_REDEPLOY_TRIGGER.*/FORCE_REDEPLOY_TRIGGER: \"$TIMESTAMP\"/" render.yaml

echo "✅ Modificări făcute:"
echo "   - Build: $NEW_BUILD"
echo "   - Version: $NEW_VERSION" 
echo "   - Trigger: $TIMESTAMP"

# Git commit and push
git add -A
git commit -m "AUTO REDEPLOY: Build $NEW_BUILD - $(date)"
git push

echo "🚀 Push făcut! Render va detecta modificările în 2-3 minute."
echo "🔍 Verifică: https://cashpot-backend.onrender.com/health"
