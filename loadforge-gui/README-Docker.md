# LoadForge Docker Setup

This document provides instructions for running LoadForge using Docker for both development and production environments.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0+
- Git

## Quick Start

### Development Environment

1. **Clone and navigate to the project:**
   ```bash
   cd loadforge-gui
   ```

2. **Create environment file:**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env file with your preferred settings
   # The default values should work for development
   ```

3. **Start development environment:**

   **On Windows (PowerShell):**
   ```powershell
   # Start all services
   docker-compose up --build -d
   
   # View logs
   docker-compose logs -f
   ```

   **On Unix/Linux/Mac:**
   ```bash
   # Make scripts executable
   chmod +x docker-scripts/dev.sh docker-scripts/prod.sh
   
   # Start development environment
   ./docker-scripts/dev.sh
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - MongoDB: mongodb://localhost:27017

### Production Environment

1. **Configure environment for production:**
   ```bash
   # Update .env file with production settings
   # Set NODE_ENV=production
   # Update MongoDB credentials
   # Set proper JWT_SECRET
   ```

2. **Deploy to production:**

   **On Windows (PowerShell):**
   ```powershell
   docker-compose -f docker-compose.prod.yml up --build -d
   ```

   **On Unix/Linux/Mac:**
   ```bash
   ./docker-scripts/prod.sh
   ```

3. **Access the application:**
   - Application: http://localhost (via Nginx)
   - Backend API: http://localhost/api

## Docker Services

### Frontend Service
- **Technology:** React Router v7 + Vite
- **Port:** 3000
- **Development:** Hot reload enabled with volume mounting
- **Production:** Optimized build served by Node.js

### Backend Service
- **Technology:** Node.js + TypeScript + Fastify
- **Port:** 3001
- **Development:** Hot reload with tsx
- **Production:** Compiled TypeScript served by Node.js

### MongoDB Service
- **Version:** MongoDB 7.0
- **Port:** 27017
- **Data:** Persisted in Docker volumes
- **Credentials:** admin/password (change in production)

### Nginx Service (Production Only)
- **Purpose:** Reverse proxy and load balancer
- **Features:** Rate limiting, security headers, SSL ready
- **Ports:** 80 (HTTP), 443 (HTTPS)

## Useful Commands

### Development Commands
```bash
# Start all services
docker-compose up -d

# Start with rebuild
docker-compose up --build -d

# View logs
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart backend

# Execute commands in containers
docker-compose exec backend npm run lint
docker-compose exec frontend npm run typecheck

# Access container shell
docker-compose exec backend sh
docker-compose exec frontend sh
```

### Production Commands
```bash
# Deploy production
docker-compose -f docker-compose.prod.yml up --build -d

# View production logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop production
docker-compose -f docker-compose.prod.yml down

# Update production deployment
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Maintenance Commands
```bash
# Clean up unused Docker resources
docker system prune -a

# Remove all LoadForge containers and volumes
docker-compose down -v
docker-compose -f docker-compose.prod.yml down -v

# Backup MongoDB data
docker exec loadforge-mongo-dev mongodump --out /backup
docker cp loadforge-mongo-dev:/backup ./mongodb-backup

# Restore MongoDB data
docker cp ./mongodb-backup loadforge-mongo-dev:/backup
docker exec loadforge-mongo-dev mongorestore /backup
```

## Environment Variables

### Backend Variables
- `NODE_ENV`: Environment (development/production)
- `PORT`: Backend server port (default: 3001)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT token signing
- `CORS_ORIGIN`: Allowed CORS origins

### Frontend Variables
- `VITE_API_URL`: Backend API URL for frontend

### MongoDB Variables
- `MONGO_INITDB_ROOT_USERNAME`: MongoDB root username
- `MONGO_INITDB_ROOT_PASSWORD`: MongoDB root password
- `MONGO_INITDB_DATABASE`: Initial database name

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Check what's using the ports
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :3001
   
   # Change ports in docker-compose.yml if needed
   ```

2. **Permission issues (Linux/Mac):**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

3. **MongoDB connection issues:**
   ```bash
   # Check MongoDB logs
   docker-compose logs mongo
   
   # Verify MongoDB is running
   docker-compose exec mongo mongosh --eval "db.runCommand('ping')"
   ```

4. **Frontend build issues:**
   ```bash
   # Clear node_modules and rebuild
   docker-compose down
   docker-compose build --no-cache frontend
   docker-compose up -d
   ```

5. **Backend TypeScript issues:**
   ```bash
   # Check TypeScript compilation
   docker-compose exec backend npm run build
   ```

### Performance Optimization

1. **Development:**
   - Use volume mounts for hot reload
   - Exclude node_modules from volume mounts
   - Use multi-stage builds for faster rebuilds

2. **Production:**
   - Enable resource limits in docker-compose.prod.yml
   - Use nginx for static file serving
   - Enable gzip compression
   - Configure proper caching headers

### Security Considerations

1. **Change default passwords** in production
2. **Use environment-specific .env files**
3. **Enable HTTPS** with proper SSL certificates
4. **Configure firewall rules** for production deployment
5. **Regular security updates** for base images
6. **Use secrets management** for sensitive data

## Monitoring and Logging

### Log Management
```bash
# View real-time logs
docker-compose logs -f --tail=100

# Export logs to file
docker-compose logs > loadforge-logs.txt

# Configure log rotation in production
# Add to docker-compose.prod.yml:
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Health Checks
- Backend: http://localhost:3001/health
- Frontend: http://localhost:3000
- Nginx: http://localhost/health

## Scaling

For production scaling, consider:
- Using Docker Swarm or Kubernetes
- Implementing horizontal scaling for backend services
- Using external MongoDB cluster
- Adding Redis for session management
- Implementing proper load balancing

## Support

For issues related to Docker setup:
1. Check the logs: `docker-compose logs -f`
2. Verify Docker installation: `docker --version && docker-compose --version`
3. Check system resources: `docker system df`
4. Review environment configuration in `.env` file 