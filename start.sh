#!/bin/bash
# Start script for SDTM Spec Service

echo "=========================================="
echo "SDTM Spec Service Startup"
echo "=========================================="

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check Python dependencies
echo "Checking Python dependencies..."
pip install -q -r requirements.txt

# Start Flask API in background
echo "Starting Flask API on port 5000..."
python3 api.py &
API_PID=$!

# Wait for API to start
sleep 2

# Check if API is running
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "✅ API is running at http://localhost:5000"
else
    echo "❌ Failed to start API"
    exit 1
fi

echo ""
echo "=========================================="
echo "Available Endpoints:"
echo "  GET  http://localhost:5000/api/versions"
echo "  GET  http://localhost:5000/api/domains"
echo "  GET  http://localhost:5000/api/spec/VS"
echo "  GET  http://localhost:5000/api/codelists/VS"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop the server"

# Wait for API process
wait $API_PID
