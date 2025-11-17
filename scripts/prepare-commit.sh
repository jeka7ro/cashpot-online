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

# Get build date and time in format DD.MM.YYYY HH:mm (același format ca getBuildWithDateTime!)
BUILD_DATE_TIME=$(node -e "const v = require('./version.json'); const d = new Date(v.buildDate); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); const hours = String(d.getHours()).padStart(2, '0'); const minutes = String(d.getMinutes()).padStart(2, '0'); console.log(\`\${day}.\${month}.\${year} \${hours}:\${minutes}\`);")

# Create commit message with build number and date/time (format ca în header bar!)
COMMIT_MESSAGE="$MESSAGE - Build #$BUILD_NUMBER - $BUILD_DATE_TIME"

echo "📝 Commit message: $COMMIT_MESSAGE"
echo "🔢 Build number: $BUILD_NUMBER"

# Show what will be committed
git status --short

echo ""
echo "✅ Gata! Rulează:"
echo "   git commit -m \"$COMMIT_MESSAGE\""
echo "   git push origin main"

