#!/bin/bash
echo "=== BUILDING ==="
echo "Current directory: $(pwd)"
echo "Running npm install..."
npm install
echo "Checking node_modules..."
ls -la node_modules/ | head -5
echo "Checking express..."
ls -la node_modules/express/ 2>/dev/null || echo "Express not found!"
echo "=== BUILD COMPLETE ==="
