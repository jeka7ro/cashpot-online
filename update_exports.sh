#!/bin/bash

# List of files to update
files=(
  "src/pages/Companies.jsx"
  "src/pages/Locations.jsx"
  "src/pages/Providers.jsx"
  "src/pages/Warehouse.jsx"
  "src/pages/Metrology.jsx"
  "src/pages/Jackpots.jsx"
  "src/pages/Invoices.jsx"
  "src/pages/Users.jsx"
  "src/pages/LegalDocuments.jsx"
  "src/pages/ONJNReports.jsx"
  "src/pages/GamesLibrary.jsx"
)

for file in "${files[@]}"; do
  echo "Processing $file..."
  
  # Get the entity name from the file path
  entity=$(basename "$file" .jsx | tr '[:upper:]' '[:lower:]')
  
  # Check if file exists
  if [ -f "$file" ]; then
    echo "  ✓ Found $file"
  else
    echo "  ✗ Not found: $file"
  fi
done

echo "Done!"
