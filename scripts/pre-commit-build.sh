#!/bin/bash

# Script pentru a include automat numărul build-ului în commit message
# Acest script trebuie să fie rulat înainte de commit

# Increment build number
node scripts/update-build.js

# Read current build number from version.json
BUILD_NUMBER=$(node -e "const v = require('./version.json'); console.log(v.build)")

# Update commit message to include build number if not already present
COMMIT_MSG_FILE=$1

if [ -f "$COMMIT_MSG_FILE" ]; then
    # Check if build number is already in commit message
    if ! grep -q "Build #" "$COMMIT_MSG_FILE"; then
        # Add build number to first line if it doesn't exist
        FIRST_LINE=$(head -n 1 "$COMMIT_MSG_FILE")
        echo "$FIRST_LINE - Build #$BUILD_NUMBER" > "$COMMIT_MSG_FILE.tmp"
        tail -n +2 "$COMMIT_MSG_FILE" >> "$COMMIT_MSG_FILE.tmp"
        mv "$COMMIT_MSG_FILE.tmp" "$COMMIT_MSG_FILE"
    fi
fi

# Stage version.json for commit
git add version.json

