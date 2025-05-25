import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
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

    // Register security middleware
    if (appConfig.security.enableHelmet) {
      await fastify.register(helmet, {
        contentSecurityPolicy: false, // Disable CSP for API
      });
    }

    // Register rate limiting
    await fastify.register(rateLimit, {
      max: appConfig.security.rateLimitMax,
      timeWindow: appConfig.security.rateLimitWindow,
      errorResponseBuilder: function (request: any, context: any) {
        return {
          code: 429,
          error: 'Too Many Requests',
          message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
          expiresIn: Math.round(context.ttl / 1000)
        };
      }
    });

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

    // Enhanced health check endpoint
    fastify.get('/health', async (_request, _reply) => {
      const healthData = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: appConfig.server.nodeEnv,
        services: {
          database: {
            status: dbConnection.isConnected() ? 'connected' : 'disconnected',
            name: appConfig.database.dbName
          },
          websocket: {
            status: webSocketService ? 'active' : 'inactive',
            activeSubscriptions: webSocketService?.getActiveSubscriptions() || []
          },
          loadEngine: testRunService ? {
            status: 'active',
            stats: testRunService.getEngineStats ? testRunService.getEngineStats() : {}
          } : { status: 'inactive' }
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        }
      };

      return healthData;
    });

    // API metrics endpoint
    fastify.get('/metrics', async (_request, _reply) => {
      return {
        timestamp: new Date().toISOString(),
        loadEngine: testRunService?.getEngineStats ? testRunService.getEngineStats() : {},
        websocket: {
          activeConnections: webSocketService?.getActiveSubscriptions()?.length || 0,
          subscriptions: webSocketService?.getActiveSubscriptions() || []
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        }
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
    console.log(`🛡️  Security: Rate limiting (${appConfig.security.rateLimitMax} req/${appConfig.security.rateLimitWindow}ms), Helmet: ${appConfig.security.enableHelmet}`);
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