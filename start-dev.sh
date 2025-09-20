#!/bin/bash

# LMS Development Environment Startup Script

echo "🚀 Starting LMS Development Environment..."

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo "🗄️  Starting MongoDB connection and seeding data..."
cd backend && node seeder -i && cd ..

echo "🔧 Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

echo "⏳ Waiting for backend to start..."
sleep 5

echo "🌐 Starting frontend server..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo "🧪 Starting testing interface..."
python3 -m http.server 8080 &
TEST_SERVER_PID=$!

echo ""
echo "✅ All servers started successfully!"
echo ""
echo "📱 Access your LMS:"
echo "   Frontend:        http://localhost:3000"
echo "   Backend API:     http://localhost:5001"
echo "   Testing Interface: http://localhost:8080/course-crud-test.html"
echo ""
echo "🛑 To stop all servers, press Ctrl+C or run:"
echo "   kill $BACKEND_PID $FRONTEND_PID $TEST_SERVER_PID"
echo ""

# Wait for any process to exit
wait