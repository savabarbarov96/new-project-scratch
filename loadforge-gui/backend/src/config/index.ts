import { config } from 'dotenv';

// Load environment variables
config();

export const appConfig = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    uri: process.env.MONGODB_URI || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('MONGODB_URI environment variable is required in production');
      }
      return 'mongodb://localhost:27017/loadforge';
    })(),
    dbName: process.env.MONGODB_DB_NAME || 'loadforge',
    gridFSBucketName: process.env.GRIDFS_BUCKET_NAME || 'loadforge-files',
  },
  fileUpload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '26214400', 10), // 25MB
    uploadDir: process.env.UPLOAD_DIR || './uploads',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || [
      'http://localhost:3000', 
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ],
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  loadTesting: {
    maxConcurrentTests: parseInt(process.env.MAX_CONCURRENT_TESTS || '10', 10),
    defaultTestTimeout: parseInt(process.env.DEFAULT_TEST_TIMEOUT || '300000', 10), // 5 minutes
  },
  jwt: {
    secret: process.env.JWT_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET environment variable is required in production');
      }
      return 'dev-jwt-secret-change-in-production';
    })(),
  },
  security: {
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // requests per window
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    enableHelmet: process.env.ENABLE_HELMET !== 'false',
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
  },
};

export default appConfig; 