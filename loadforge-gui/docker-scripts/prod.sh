#!/bin/bash

# LoadForge Production Environment Deployment Script

echo "🚀 Deploying LoadForge Production Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one from env.example and configure it for production."
    exit 1
fi

# Confirm production deployment
echo "⚠️  You are about to deploy to PRODUCTION environment."
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

# Stop any running development containers
echo "🛑 Stopping development containers..."
docker-compose down

# Build and start production services
echo "🔨 Building and starting production services..."
docker-compose -f docker-compose.prod.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check service health
echo "🔍 Checking service health..."

# Check MongoDB
if docker exec loadforge-mongo-prod mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
    echo "✅ MongoDB is ready"
else
    echo "❌ MongoDB failed to start"
    exit 1
fi

# Check Backend
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend is ready"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Check Frontend through Nginx
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ Nginx and Frontend are ready"
else
    echo "❌ Nginx or Frontend failed to start"
    exit 1
fi

echo ""
echo "🎉 LoadForge Production Environment is deployed successfully!"
echo ""
echo "🌐 Application: http://localhost"
echo "🔧 Backend API: http://localhost/api"
echo ""
echo "📋 Useful commands:"
echo "  docker-compose -f docker-compose.prod.yml logs -f          # View all logs"
echo "  docker-compose -f docker-compose.prod.yml logs -f backend  # View backend logs"
echo "  docker-compose -f docker-compose.prod.yml logs -f frontend # View frontend logs"
echo "  docker-compose -f docker-compose.prod.yml down             # Stop all services"
echo "  docker-compose -f docker-compose.prod.yml restart          # Restart all services"
echo "" 