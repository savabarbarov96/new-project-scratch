import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Joi from 'joi';
import { createServer } from 'http';
import { dbConnection } from './config/database.js';
import { appConfig } from './config/index.js';
import { testSpecificationRoutes } from './routes/testSpecifications.js';
import { testRunRoutes, setTestRunService } from './routes/testRuns.js';
import { fileUploadRoutes } from './routes/fileUpload.js';
import { WebSocketService } from './services/WebSocketService.js';
import { TestRunService } from './services/TestRunService.js';

// Create HTTP server first
const httpServer = createServer();

const fastify = Fastify({
  logger: {
    level: appConfig.logging.level,
  },
  serverFactory: (handler, _opts) => {
    httpServer.on('request', handler);
    return httpServer;
  }
});

// Global WebSocket service instance
let webSocketService: WebSocketService;
let testRunService: TestRunService;

// Configure Joi validator compiler
fastify.setValidatorCompiler(({ schema, method: _method, url: _url, httpPart: _httpPart }) => {
  return data => {
    const result = (schema as Joi.Schema).validate(data);
    if (result.error) {
      return { error: result.error };
    }
    return { value: result.value };
  };
});

async function start() {
  try {
    // Initialize WebSocket service early with the HTTP server
    webSocketService = new WebSocketService(httpServer);
    
    // Initialize TestRunService
    testRunService = new TestRunService();
    
    // Inject WebSocket service into services
    testRunService.setWebSocketService(webSocketService);
    
    // Inject TestRunService into WebSocketService for stop requests
    webSocketService.setTestRunService(testRunService);

    // Register CORS with proper multiple origin handling
    await fastify.register(cors, {
      origin: (origin, callback) => {
        // List of allowed origins
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:5173', 
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173'
        ];
        
        fastify.log.info(`CORS request from origin: ${origin || 'no origin'}`);
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          fastify.log.info('Allowing request with no origin');
          callback(null, true);
          return;
        }
        
        // Check if the origin is in the allowed list
        if (allowedOrigins.includes(origin)) {
          fastify.log.info(`Allowing origin: ${origin}`);
          callback(null, true);
          return;
        }
        
        // For development, also allow any localhost or 127.0.0.1 origin
        if (appConfig.server.nodeEnv === 'development') {
          const url = new URL(origin);
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            fastify.log.info(`Allowing development origin: ${origin}`);
            callback(null, true);
            return;
          }
        }
        
        // Reject other origins
        fastify.log.warn(`Rejecting origin: ${origin}`);
        callback(new Error('Not allowed by CORS'), false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      preflightContinue: false,
      optionsSuccessStatus: 204
    });

    // Register multipart for file uploads
    await fastify.register(multipart, {
      limits: {
        fileSize: appConfig.fileUpload.maxFileSize,
      },
    });

    // Health check endpoint
    fastify.get('/health', async (_request, _reply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbConnection.isConnected() ? 'connected' : 'disconnected',
        websocket: webSocketService ? 'active' : 'inactive',
        activeSubscriptions: webSocketService?.getActiveSubscriptions() || []
      };
    });
    
    // Register API routes
    await fastify.register(testSpecificationRoutes, { prefix: '/api' });
    await fastify.register(testRunRoutes, { prefix: '/api' });
    await fastify.register(fileUploadRoutes, { prefix: '/api' });

    // Connect to MongoDB
    await dbConnection.connect({
      uri: appConfig.database.uri,
      dbName: appConfig.database.dbName,
      gridFSBucketName: appConfig.database.gridFSBucketName,
    });

    // Start server
    await fastify.listen({
      port: appConfig.server.port,
      host: appConfig.server.host,
    });
    
    // Get TestSpecificationService instance and inject WebSocket service
    const { testSpecificationService } = await import('./services/TestSpecificationService.js');
    testSpecificationService.setWebSocketService(webSocketService);
    
    // Inject TestRunService into routes
    setTestRunService(testRunService);

    console.log(`🚀 LoadForge Backend server running on http://${appConfig.server.host}:${appConfig.server.port}`);
    console.log(`📊 Environment: ${appConfig.server.nodeEnv}`);
    console.log(`🗄️  Database: ${appConfig.database.dbName}`);
    console.log(`🔌 WebSocket server initialized on same port`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    if (testRunService) {
      await testRunService.shutdown();
    }
    if (webSocketService) {
      webSocketService.close();
    }
    await dbConnection.disconnect();
    await fastify.close();
    console.log('✅ Server shut down successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Export WebSocket service for use in other modules
export { webSocketService, testRunService };

start(); 