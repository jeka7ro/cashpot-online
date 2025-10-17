#!/bin/bash

# Script automat pentru build-uri Render
# Rulează: ./auto-build.sh [mesaj]

MESSAGE=${1:-"AUTO BUILD"}
TIMESTAMP=$(date +%s)
BUILD_DATE=$(date '+%d.%m.%Y - %H:%M')

echo "🚀 AUTO BUILD - $MESSAGE"
echo "📅 Data: $BUILD_DATE"
echo "⏰ Timestamp: $TIMESTAMP"

# Update build number in server
CURRENT_BUILD=$(grep -o 'BUILD_NUMBER = "[0-9]*"' backend/server-postgres.js | grep -o '[0-9]*' || echo "0")
NEW_BUILD=$((CURRENT_BUILD + 1))

echo "📦 Build: $CURRENT_BUILD -> $NEW_BUILD"

# Update server-postgres.js
sed -i '' "s/BUILD_NUMBER = '[0-9]*'/BUILD_NUMBER = '$NEW_BUILD'/" backend/server-postgres.js
sed -i '' "s/BUILD_DATE = .*/BUILD_DATE = new Date('$BUILD_DATE')/" backend/server-postgres.js

# Update package.json version
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' backend/package.json | grep -o '[0-9.]*')
NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g')

echo "📦 Version: $CURRENT_VERSION -> $NEW_VERSION"
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" backend/package.json

# Update render.yaml trigger
sed -i '' "s/value: \"[^\"]*\"/value: \"$TIMESTAMP-$MESSAGE\"/" render.yaml

# Update root package.json for frontend
ROOT_VERSION=$(grep -o '"version": "[^"]*"' package.json | grep -o '[0-9.]*')
ROOT_NEW_VERSION=$(echo $ROOT_VERSION | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g')
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$ROOT_NEW_VERSION\"/" package.json

echo "✅ Toate modificările făcute:"
echo "   - Backend Build: $NEW_BUILD"
echo "   - Backend Version: $NEW_VERSION"
echo "   - Frontend Version: $ROOT_NEW_VERSION"
echo "   - Render Trigger: $TIMESTAMP-$MESSAGE"

# Git operations
git add -A
git commit -m "AUTO BUILD $NEW_BUILD: $MESSAGE - $BUILD_DATE"
git push

echo ""
echo "🚀 Push făcut! Render va detecta modificările în 2-3 minute."
echo "🔍 Verifică build-ul: https://cashpot-backend.onrender.com/health"
echo "📊 Verifică endpoint-uri: https://cashpot-backend.onrender.com/api/promotions"
echo ""
echo "💡 Pentru următorul build, rulează: ./auto-build.sh 'mesajul tău'"