#!/bin/bash

# Kill any existing processes on ports
echo "🧹 Cleaning up existing processes..."
lsof -ti tcp:8003 | xargs kill -9 2>/dev/null
lsof -ti tcp:5173 | xargs kill -9 2>/dev/null

# Start Backend
echo "🚀 Starting Backend on port 8003..."
cd "/Users/useraccount/Downloads/iot copy 3"
source .venv/bin/activate
uvicorn backend.main:app --host 127.0.0.1 --port 8003 --reload &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
sleep 3

# Start Frontend
echo "🎨 Starting Frontend on port 5173..."
cd "/Users/useraccount/Downloads/iot copy 3/frontend/react-dashboard"

# Create .env.local
cat > .env.local << ENVEOF
VITE_API_BASE_URL=http://127.0.0.1:8003
VITE_BACKEND_BASE_URL=http://127.0.0.1:8003
ENVEOF

npm run dev -- --port 5173 --host &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo ""
echo "✅ Services started successfully!"
echo "📊 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://127.0.0.1:8003"
echo "📖 API Docs: http://127.0.0.1:8003/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Trap Ctrl+C and kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Wait for both processes
wait
