# LoadForge Backend

Load and stress testing application backend built with Node.js, Fastify, and MongoDB.

## Features

- ✅ Test Specification CRUD operations
- ✅ MongoDB with GridFS for file storage
- ✅ Input validation with Joi
- ✅ TypeScript support
- ✅ Fastify web framework
- ✅ CORS support
- ✅ File upload handling
- ✅ Health check endpoint

## Prerequisites

- Node.js 18+ 
- MongoDB (local or cluster)
- npm or yarn

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file in the backend directory:
   ```env
   PORT=3001
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/loadforge
   MONGODB_DB_NAME=loadforge
   CORS_ORIGIN=http://localhost:3000
   MAX_FILE_SIZE=26214400
   GRIDFS_BUCKET_NAME=loadforge-files
   ```

3. **Start MongoDB:**
   Make sure MongoDB is running locally or configure your cluster connection string.

4. **Development:**
   ```bash
   npm run dev
   ```

5. **Production:**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Test Specifications

- `POST /api/specs` - Create a new test specification
- `GET /api/specs` - List all test specifications (with pagination)
- `GET /api/specs/:id` - Get a specific test specification
- `PUT /api/specs/:id` - Update a test specification
- `DELETE /api/specs/:id` - Delete a test specification
- `POST /api/specs/:id/validate` - Validate a test specification

### Health Check

- `GET /health` - Server health status

## Project Structure

```
src/
├── config/          # Configuration files
├── models/          # MongoDB models
├── routes/          # API routes
├── services/        # Business logic
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

## Development

The backend uses:
- **Fastify** - Fast and efficient web framework
- **Mongoose** - MongoDB object modeling
- **Joi** - Schema validation
- **TypeScript** - Type safety
- **GridFS** - File storage in MongoDB

## Next Steps (Milestone 3)

- [ ] Load testing engine implementation
- [ ] Worker threads for parallel execution
- [ ] Autocannon integration
- [ ] Real-time WebSocket updates
- [ ] Test execution APIs 