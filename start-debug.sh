#!/bin/bash
echo "=== DEBUG INFO ==="
echo "Current directory: $(pwd)"
echo "Contents:"
ls -la
echo ""
echo "Node modules:"
ls -la node_modules/ | head -10
echo ""
echo "Express module:"
ls -la node_modules/express/ 2>/dev/null || echo "Express not found!"
echo ""
echo "=== STARTING SERVER ==="
node server-postgres.js
