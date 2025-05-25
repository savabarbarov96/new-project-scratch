# LoadForge GUI

A modern, user-friendly load and stress testing application with a React frontend and Node.js backend.

## Project Structure

```
loadforge-gui/
├── backend/          # Node.js + Fastify + MongoDB backend
│   ├── src/
│   │   ├── config/   # Configuration files
│   │   ├── models/   # MongoDB models
│   │   ├── routes/   # API routes
│   │   ├── services/ # Business logic
│   │   ├── types/    # TypeScript types
│   │   └── utils/    # Utility functions
│   └── package.json
├── frontend/         # React + TypeScript frontend
│   ├── app/          # React components and pages
│   └── package.json
└── .vscode/          # VS Code workspace settings
```

## Features

### ✅ Completed (Milestone 2)
- **Backend Foundation**: Fastify server with MongoDB integration
- **Test Specification CRUD**: Complete API for managing test specifications
- **GridFS File Storage**: Support for file attachments up to 25MB
- **Input Validation**: Joi schema validation for all endpoints
- **TypeScript Support**: Full type safety across backend and frontend
- **Code Quality**: ESLint and Prettier configurations

### 🔄 In Progress
- **Load Testing Engine** (Milestone 3)
- **Frontend UI** (Milestone 4)
- **Real-time Monitoring** (Milestone 5)

## Prerequisites

- **Node.js** 18+
- **MongoDB Atlas** account (cluster configured)
- **npm** or **yarn**
- **VS Code** (recommended)

## Quick Start

### 1. Backend Setup

```bash
cd loadforge-gui/backend
npm install
```

Create a `.env` file:
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb+srv://savadoom:Savata619@cluster0.ofbwo.mongodb.net/loadforge
MONGODB_DB_NAME=loadforge
CORS_ORIGIN=http://localhost:3000
```

Start the backend:
```bash
npm run dev
```

### 2. Frontend Setup

```bash
cd loadforge-gui/frontend
npm install
npm run dev
```

## Development

### Backend
- **Framework**: Fastify
- **Database**: MongoDB with Mongoose
- **Validation**: Joi
- **Development**: `npm run dev` (with nodemon)
- **Build**: `npm run build`

### Frontend  
- **Framework**: React 19 + React Router v7
- **Styling**: TailwindCSS
- **Development**: `npm run dev`
- **Build**: `npm run build`

### Code Quality
```bash
# Lint and format backend
cd backend
npm run lint
npm run format

# Lint and format frontend
cd frontend
npm run lint
npm run format
```

## API Endpoints

### Test Specifications
- `GET /health` - Health check
- `POST /api/specs` - Create test specification
- `GET /api/specs` - List specifications (with pagination)
- `GET /api/specs/:id` - Get specific specification
- `PUT /api/specs/:id` - Update specification
- `DELETE /api/specs/:id` - Delete specification
- `POST /api/specs/:id/validate` - Validate specification

## MongoDB Connection

The application is configured to use MongoDB Atlas cluster:
- **Cluster**: cluster0.ofbwo.mongodb.net
- **Database**: loadforge
- **GridFS**: For file storage (loadforge-files bucket)

## Next Steps

### Milestone 3: Load Testing Engine
- [ ] Worker threads for parallel execution
- [ ] Autocannon integration for HTTP load testing
- [ ] Test execution APIs
- [ ] Real-time WebSocket updates

### Milestone 4: Frontend UI
- [ ] Test specification editor
- [ ] Load profile configuration
- [ ] File upload interface
- [ ] Test execution dashboard

## Contributing

1. Follow the established code style (ESLint + Prettier)
2. Use TypeScript for type safety
3. Test your changes locally
4. Update documentation as needed

## License

MIT License 