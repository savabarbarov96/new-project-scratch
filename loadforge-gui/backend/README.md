# LoadForge Backend

A comprehensive load and stress testing application backend built with Node.js, Fastify, and MongoDB. LoadForge enables users to create, execute, and monitor concurrent load tests with customizable request patterns and load profiles.

## 🚀 Features

### Core Functionality
- ✅ **Test Specification Management** - CRUD operations for test configurations
- ✅ **Load Test Execution** - Run concurrent tests with custom load profiles
- ✅ **Real-time Monitoring** - WebSocket-based live test updates
- ✅ **File Management** - GridFS-based file storage for test data
- ✅ **Metrics Collection** - Comprehensive performance metrics and analytics
- ✅ **Health Monitoring** - System status and resource monitoring

### Technical Features
- ✅ **TypeScript Support** - Full type safety throughout the application
- ✅ **Fastify Framework** - High-performance web framework
- ✅ **MongoDB Integration** - Robust data persistence with GridFS
- ✅ **Input Validation** - Joi-based schema validation
- ✅ **CORS Support** - Cross-origin resource sharing
- ✅ **Rate Limiting** - Request throttling and abuse prevention
- ✅ **Security Headers** - Helmet.js security middleware
- ✅ **Load Testing Engine** - Autocannon-based HTTP load testing

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB (local instance or Atlas cluster)
- npm or yarn package manager

## ⚙️ Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/loadforge
MONGODB_DB_NAME=loadforge
GRIDFS_BUCKET_NAME=loadforge-files

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# File Upload Configuration
MAX_FILE_SIZE=26214400
UPLOAD_DIR=./uploads

# Load Testing Configuration
MAX_CONCURRENT_TESTS=10
DEFAULT_TEST_TIMEOUT=300000

# Security Configuration
JWT_SECRET=your-jwt-secret-change-in-production
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
ENABLE_HELMET=true

# Caching Configuration
CACHE_TTL=300
CACHE_MAX_SIZE=1000

# Logging Configuration
LOG_LEVEL=info
```

### 3. Start MongoDB
Ensure MongoDB is running locally or configure your cluster connection string.

```bash
# Local MongoDB
mongod --dbpath /your/db/path

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. Development Mode
```bash
npm run dev
```

### 5. Production Mode
```bash
npm run build
npm start
```

## 🔌 API Endpoints

### Health & Monitoring

#### Health Check
- **GET** `/health` - Comprehensive system health status
  ```json
  {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "version": "1.0.0",
    "environment": "development",
    "services": {
      "database": { "status": "connected", "name": "loadforge" },
      "websocket": { "status": "active", "activeSubscriptions": [] },
      "loadEngine": { "status": "active", "stats": {} }
    },
    "memory": { "used": 50, "total": 100, "external": 10 }
  }
  ```

#### System Metrics
- **GET** `/metrics` - Real-time system metrics
  ```json
  {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "loadEngine": { "activeTests": 0, "completedTests": 5 },
    "websocket": { "activeConnections": 2, "subscriptions": [] },
    "system": { "uptime": 3600, "memory": {}, "cpu": {} }
  }
  ```

### Test Specifications

#### Create Test Specification
- **POST** `/api/specs`
  ```json
  {
    "name": "API Load Test",
    "description": "Test API performance under load",
    "httpMethod": "GET",
    "url": "https://api.example.com/users",
    "headers": { "Authorization": "Bearer token123" },
    "queryParams": { "limit": "100" },
    "body": {
      "type": "raw",
      "content": "{\"userId\": 123}"
    },
    "loadProfile": {
      "type": "custom",
      "duration": 300,
      "rampUp": { "duration": 30, "startRate": 1, "endRate": 10 },
      "steadyState": { "duration": 240, "requestsPerSecond": 10 },
      "rampDown": { "duration": 30, "startRate": 10, "endRate": 1 }
    }
  }
  ```

#### List Test Specifications
- **GET** `/api/specs?page=1&limit=10` - Paginated list with filtering

#### Get Test Specification
- **GET** `/api/specs/:id` - Retrieve specific test specification

#### Update Test Specification
- **PUT** `/api/specs/:id` - Update existing test specification

#### Delete Test Specification
- **DELETE** `/api/specs/:id` - Remove test specification

#### Validate Test Specification
- **POST** `/api/specs/:id/validate` - Validate test configuration

### Test Execution

#### Start Test Run
- **POST** `/api/tests/run`
  ```json
  {
    "specId": "605c72ef5f1b2c001f647ac9"
  }
  ```

#### List Test Runs
- **GET** `/api/tests?page=1&limit=10` - Paginated test run history

#### Get Test Run
- **GET** `/api/tests/:id` - Retrieve specific test run with metrics

#### Get Test Run Status
- **GET** `/api/tests/:id/status` - Current test execution status

#### Stop Test Run
- **POST** `/api/tests/:id/stop` - Terminate running test

#### Delete Test Run
- **DELETE** `/api/tests/:id` - Remove test run and results

### File Management

#### Upload File
- **POST** `/api/files/upload` - Upload files for test specifications
  - Supports multipart/form-data
  - Optional `specId` parameter to associate with test

#### Get File Info
- **GET** `/api/files/:id/info` - Retrieve file metadata

#### Download File
- **GET** `/api/files/:id/download` - Download file content

#### Delete File
- **DELETE** `/api/files/:id` - Remove uploaded file

## 🔄 WebSocket Events

The system provides real-time updates via WebSocket connections at `ws://localhost:3001`.

### Event Types

#### Test Status Updates
```json
{
  "type": "test-status",
  "testId": "605c72ef5f1b2c001f647ac9",
  "data": {
    "status": "running",
    "progress": 45.5,
    "phase": "steady-state"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Live Metrics
```json
{
  "type": "test-metrics",
  "testId": "605c72ef5f1b2c001f647ac9",
  "data": {
    "currentRPS": 150,
    "avgResponseTime": 120,
    "errorRate": 0.02,
    "totalRequests": 5000
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Request Logs
```json
{
  "type": "test-log",
  "testId": "605c72ef5f1b2c001f647ac9",
  "data": {
    "level": "info",
    "message": "Request completed",
    "statusCode": 200,
    "responseTime": 95
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Test Completion
```json
{
  "type": "test-complete",
  "testId": "605c72ef5f1b2c001f647ac9",
  "data": {
    "status": "completed",
    "finalMetrics": { ... },
    "duration": 300000
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🏗️ Architecture

### Project Structure
```
backend/
├── src/
│   ├── config/              # Configuration management
│   │   ├── database.ts      # MongoDB connection setup
│   │   └── index.ts         # Environment configuration
│   ├── models/              # MongoDB data models
│   │   ├── TestRun.ts       # Test execution model
│   │   └── TestSpec.ts      # Test specification model
│   ├── routes/              # API route handlers
│   │   ├── testRuns.ts      # Test execution endpoints
│   │   ├── testSpecs.ts     # Test specification endpoints
│   │   └── fileUpload.ts    # File management endpoints
│   ├── services/            # Business logic layer
│   │   ├── TestRunService.ts    # Test execution service
│   │   ├── WebSocketService.ts  # Real-time communication
│   │   └── LoadTestingEngine.ts # Load testing implementation
│   ├── types/               # TypeScript definitions
│   │   ├── index.ts         # Core type definitions
│   │   └── autocannon.d.ts  # Autocannon type definitions
│   ├── utils/               # Utility functions
│   ├── workers/             # Background job processing
│   └── index.ts             # Application entry point
├── dist/                    # Compiled JavaScript output
├── uploads/                 # Temporary file storage
├── .env                     # Environment variables
├── package.json             # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

### Key Components

#### Load Testing Engine
- **Autocannon Integration** - HTTP load testing with configurable parameters
- **Worker Threads** - Parallel test execution for multiple specifications
- **Resource Monitoring** - CPU and memory usage tracking during tests
- **Dynamic Scaling** - Automatic load adjustment based on system resources

#### WebSocket Service
- **Real-time Communication** - Live test updates and metrics streaming
- **Connection Management** - Client subscription and cleanup handling
- **Event Broadcasting** - Multi-client update distribution
- **Error Handling** - Graceful degradation and reconnection support

#### Test Run Service
- **Execution Management** - Test lifecycle coordination
- **Metrics Collection** - Performance data aggregation
- **Result Storage** - Persistent test result management
- **Status Tracking** - Real-time test state monitoring

## 🧪 Load Testing Capabilities

### Supported Load Profiles

1. **Custom Profile** - User-defined ramp-up, steady-state, and ramp-down phases
2. **Spike Testing** - Sudden load increases to test system limits
3. **Step Testing** - Gradual load increases in defined steps
4. **Soak Testing** - Extended duration testing at consistent load

### HTTP Methods Supported
- GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS

### Request Configuration
- Custom headers and query parameters
- Raw body content or file-based payloads
- Authentication token support
- Content-type flexibility

### Metrics Collected
- **Response Times** - Min, max, average, and percentiles (50th, 90th, 95th, 99th)
- **Throughput** - Requests per second and bytes per second
- **Error Rates** - HTTP status code distribution and error percentages
- **System Resources** - CPU and memory usage during test execution

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm start            # Start production server
npm run test         # Run test suite
npm run lint         # Run ESLint code analysis
npm run format       # Format code with Prettier
```

### Technology Stack
- **Runtime** - Node.js 18+
- **Framework** - Fastify (high-performance web framework)
- **Database** - MongoDB with Mongoose ODM
- **File Storage** - GridFS for large file handling
- **Validation** - Joi schema validation
- **Load Testing** - Autocannon HTTP benchmarking
- **WebSockets** - Socket.io for real-time communication
- **Security** - Helmet.js, CORS, rate limiting
- **Development** - TypeScript, ESLint, Prettier

### Contributing
1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Run linting and formatting
5. Submit a pull request

## 📊 Monitoring & Observability

### Health Checks
- Database connectivity status
- WebSocket service availability
- Load testing engine health
- Memory usage monitoring

### Logging
- Structured JSON logging
- Configurable log levels
- Request/response logging
- Error tracking and reporting

### Performance Metrics
- Test execution statistics
- System resource utilization
- API response times
- WebSocket connection metrics

## 🚀 Deployment

### Docker Support
```bash
# Build image
docker build -t loadforge-backend .

# Run container
docker run -p 3001:3001 --env-file .env loadforge-backend
```

### Production Considerations
- Configure MongoDB Atlas for cloud deployment
- Set up proper logging and monitoring
- Implement SSL/TLS termination
- Configure load balancing for multiple instances
- Set appropriate resource limits and timeouts

## 📝 API Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "The request data is invalid"
}
```

Paginated responses:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
``` 