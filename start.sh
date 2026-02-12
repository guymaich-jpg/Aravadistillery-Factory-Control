#!/bin/bash

# Factory Control App - Quick Start Script
# This script starts a local web server and opens the app in your browser

echo "🏭 Starting Factory Control App..."
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 found"
    echo "🌐 Starting server on http://localhost:8080"
    echo ""
    echo "📱 Opening app in your default browser..."
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Open browser after a short delay
    sleep 2 && open http://localhost:8080 &
    
    # Start Python server
    python3 -m http.server 8080
else
    echo "❌ Python 3 not found. Please install Python 3 or open index.html directly in your browser."
    exit 1
fi
