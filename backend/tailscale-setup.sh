#!/bin/bash

# Tailscale Setup Script pentru Render
# Rulează automat la startup pentru a conecta Render la Tailscale VPN

echo "🔒 Starting Tailscale setup..."

# Check dacă Tailscale e deja instalat
if ! command -v tailscale &> /dev/null; then
    echo "📥 Installing Tailscale..."
    curl -fsSL https://tailscale.com/install.sh | sh
    echo "✅ Tailscale installed!"
else
    echo "✅ Tailscale already installed"
fi

# Start Tailscale cu authkey
if [ -n "$TAILSCALE_AUTHKEY" ]; then
    echo "🔌 Connecting to Tailscale network..."
    tailscale up --authkey="$TAILSCALE_AUTHKEY" --hostname=cashpot-render --accept-routes
    
    # Get Tailscale IP
    TAILSCALE_IP=$(tailscale ip -4)
    echo "✅ Tailscale connected! IP: $TAILSCALE_IP"
    
    # Test connectivity to external DB
    if [ -n "$EXPENDITURES_DB_HOST" ]; then
        echo "🔍 Testing connection to external DB at $EXPENDITURES_DB_HOST..."
        timeout 5 bash -c "cat < /dev/null > /dev/tcp/$EXPENDITURES_DB_HOST/26257" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ External DB is reachable via Tailscale!"
        else
            echo "⚠️ External DB not yet reachable (server might need Tailscale too)"
        fi
    fi
else
    echo "⚠️ TAILSCALE_AUTHKEY not set - skipping Tailscale setup"
    echo "   Expenditures feature will NOT work without Tailscale!"
fi

echo "🚀 Tailscale setup complete!"

