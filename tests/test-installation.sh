#!/bin/bash

echo "🚀 Testing Skhoot Backend Installation"
echo "======================================"

# Test backend compilation
echo "📦 Testing backend compilation..."
cd backend
if cargo check --quiet; then
    echo "✅ Backend compiles successfully"
else
    echo "❌ Backend compilation failed"
    exit 1
fi

# Test frontend dependencies
echo "📦 Testing frontend dependencies..."
cd ..
if npm list --depth=0 > /dev/null 2>&1; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Frontend dependencies missing"
    exit 1
fi

echo ""
echo "🎉 Installation Complete!"
echo "========================"
echo ""
echo "To start the backend:"
echo "  npm run backend:dev"
echo ""
echo "To start the full application:"
echo "  npm run tauri:dev"
echo ""
echo "To test backend endpoints:"
echo "  curl http://localhost:3001/health"
echo "  curl http://localhost:3001/api/v1/ping"
