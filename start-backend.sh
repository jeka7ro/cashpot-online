#!/bin/bash
echo "🚀 Starting backend from script..."
cd backend
echo "📂 Current directory: $(pwd)"
echo "📋 Listing files:"
ls -la | head -10
echo "🚀 Starting npm..."
npm start

