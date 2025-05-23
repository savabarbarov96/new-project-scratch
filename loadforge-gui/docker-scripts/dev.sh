#!/bin/bash

# LoadForge Development Environment Startup Script

echo "🚀 Starting LoadForge Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please review and update the configuration if needed."
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Check MongoDB
if docker exec loadforge-mongo-dev mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
    echo "✅ MongoDB is ready"
else
    echo "⚠️  MongoDB might still be starting up"
fi

# Check Backend
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend is ready"
else
    echo "⚠️  Backend might still be starting up"
fi

# Check Frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is ready"
else
    echo "⚠️  Frontend might still be starting up"
fi

echo ""
echo "🎉 LoadForge Development Environment is starting up!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3001"
echo "🗄️  MongoDB: mongodb://localhost:27017"
echo ""
echo "📋 Useful commands:"
echo "  docker-compose logs -f          # View all logs"
echo "  docker-compose logs -f backend  # View backend logs"
echo "  docker-compose logs -f frontend # View frontend logs"
echo "  docker-compose down             # Stop all services"
echo "  docker-compose restart          # Restart all services"
echo "" 