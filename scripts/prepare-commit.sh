#!/bin/bash

# Script pentru pregătire commit cu build number
# Folosește: ./scripts/prepare-commit.sh "mesaj commit"

MESSAGE=${1:-"Update"}

# Increment build number
echo "🔄 Incrementare build number..."
node scripts/update-build.js

# Read current build number from version.json
BUILD_NUMBER=$(node -e "const v = require('./version.json'); console.log(v.build)")

# Add all changes including version.json
git add -A

# Create commit message with build number
COMMIT_MESSAGE="$MESSAGE - Build #$BUILD_NUMBER"

echo "📝 Commit message: $COMMIT_MESSAGE"
echo "🔢 Build number: $BUILD_NUMBER"

# Show what will be committed
git status --short

echo ""
echo "✅ Gata! Rulează:"
echo "   git commit -m \"$COMMIT_MESSAGE\""
echo "   git push origin main"

