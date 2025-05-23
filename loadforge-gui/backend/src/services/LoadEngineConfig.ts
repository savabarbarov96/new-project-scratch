export interface LoadEngineConfig {
  // Concurrency settings
  maxConcurrentTests: number;
  maxQueueSize: number;
  
  // Resource limits
  workerMemoryLimitMb: number;
  workerTimeoutBufferSeconds: number;
  
  // Performance tuning
  defaultConnectionsPerRps: number;
  maxConnectionsPerTest: number;
  requestTimeoutSeconds: number;
  bailoutThreshold: number;
  
  // Monitoring
  metricsUpdateIntervalMs: number;
  progressReportingEnabled: boolean;
  
  // File handling
  maxFileUploadSizeMb: number;
  allowedMimeTypes: string[];
}

export class LoadEngineConfigService {
  private static instance: LoadEngineConfigService;
  private config: LoadEngineConfig;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.loadFromEnvironment();
  }

  public static getInstance(): LoadEngineConfigService {
    if (!LoadEngineConfigService.instance) {
      LoadEngineConfigService.instance = new LoadEngineConfigService();
    }
    return LoadEngineConfigService.instance;
  }

  public getConfig(): LoadEngineConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<LoadEngineConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfig();
  }

  public resetToDefaults(): void {
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): LoadEngineConfig {
    return {
      // Concurrency settings
      maxConcurrentTests: 3,
      maxQueueSize: 50,
      
      // Resource limits
      workerMemoryLimitMb: 512,
      workerTimeoutBufferSeconds: 60,
      
      // Performance tuning
      defaultConnectionsPerRps: 10,
      maxConnectionsPerTest: 1000,
      requestTimeoutSeconds: 30,
      bailoutThreshold: 10,
      
      // Monitoring
      metricsUpdateIntervalMs: 1000,
      progressReportingEnabled: true,
      
      // File handling
      maxFileUploadSizeMb: 100,
      allowedMimeTypes: [
        'application/json',
        'application/xml',
        'text/plain',
        'text/csv',
        'application/x-www-form-urlencoded',
        'multipart/form-data'
      ]
    };
  }

  private loadFromEnvironment(): void {
    const envConfig: Partial<LoadEngineConfig> = {};

    // Load from environment variables
    if (process.env.LOAD_ENGINE_MAX_CONCURRENT_TESTS) {
      envConfig.maxConcurrentTests = parseInt(process.env.LOAD_ENGINE_MAX_CONCURRENT_TESTS, 10);
    }

    if (process.env.LOAD_ENGINE_MAX_QUEUE_SIZE) {
      envConfig.maxQueueSize = parseInt(process.env.LOAD_ENGINE_MAX_QUEUE_SIZE, 10);
    }

    if (process.env.LOAD_ENGINE_WORKER_MEMORY_LIMIT_MB) {
      envConfig.workerMemoryLimitMb = parseInt(process.env.LOAD_ENGINE_WORKER_MEMORY_LIMIT_MB, 10);
    }

    if (process.env.LOAD_ENGINE_REQUEST_TIMEOUT_SECONDS) {
      envConfig.requestTimeoutSeconds = parseInt(process.env.LOAD_ENGINE_REQUEST_TIMEOUT_SECONDS, 10);
    }

    if (process.env.LOAD_ENGINE_MAX_FILE_UPLOAD_SIZE_MB) {
      envConfig.maxFileUploadSizeMb = parseInt(process.env.LOAD_ENGINE_MAX_FILE_UPLOAD_SIZE_MB, 10);
    }

    if (process.env.LOAD_ENGINE_PROGRESS_REPORTING === 'false') {
      envConfig.progressReportingEnabled = false;
    }

    this.updateConfig(envConfig);
  }

  private validateConfig(): void {
    const { config } = this;

    if (config.maxConcurrentTests < 1 || config.maxConcurrentTests > 20) {
      throw new Error('maxConcurrentTests must be between 1 and 20');
    }

    if (config.maxQueueSize < 1 || config.maxQueueSize > 1000) {
      throw new Error('maxQueueSize must be between 1 and 1000');
    }

    if (config.workerMemoryLimitMb < 128 || config.workerMemoryLimitMb > 2048) {
      throw new Error('workerMemoryLimitMb must be between 128 and 2048');
    }

    if (config.requestTimeoutSeconds < 5 || config.requestTimeoutSeconds > 300) {
      throw new Error('requestTimeoutSeconds must be between 5 and 300');
    }

    if (config.maxFileUploadSizeMb < 1 || config.maxFileUploadSizeMb > 500) {
      throw new Error('maxFileUploadSizeMb must be between 1 and 500');
    }

    if (config.defaultConnectionsPerRps < 1 || config.defaultConnectionsPerRps > 100) {
      throw new Error('defaultConnectionsPerRps must be between 1 and 100');
    }

    if (config.maxConnectionsPerTest < 1 || config.maxConnectionsPerTest > 10000) {
      throw new Error('maxConnectionsPerTest must be between 1 and 10000');
    }

    if (config.bailoutThreshold < 1 || config.bailoutThreshold > 100) {
      throw new Error('bailoutThreshold must be between 1 and 100');
    }

    if (config.metricsUpdateIntervalMs < 100 || config.metricsUpdateIntervalMs > 10000) {
      throw new Error('metricsUpdateIntervalMs must be between 100 and 10000');
    }
  }

  /**
   * Get optimal connection count for a given RPS
   */
  public getOptimalConnections(requestsPerSecond: number): number {
    const connections = Math.ceil(requestsPerSecond / this.config.defaultConnectionsPerRps);
    return Math.min(connections, this.config.maxConnectionsPerTest);
  }

  /**
   * Check if a MIME type is allowed for file uploads
   */
  public isMimeTypeAllowed(mimeType: string): boolean {
    return this.config.allowedMimeTypes.includes(mimeType);
  }

  /**
   * Get worker resource limits
   */
  public getWorkerResourceLimits(): {
    maxOldGenerationSizeMb: number;
    maxYoungGenerationSizeMb: number;
  } {
    return {
      maxOldGenerationSizeMb: this.config.workerMemoryLimitMb,
      maxYoungGenerationSizeMb: Math.floor(this.config.workerMemoryLimitMb / 4),
    };
  }

  /**
   * Get autocannon options based on config
   */
  public getAutocannonDefaults(): {
    timeout: number;
    bailout: number;
    workers: number;
  } {
    return {
      timeout: this.config.requestTimeoutSeconds,
      bailout: this.config.bailoutThreshold,
      workers: 1, // Always use single worker for better control
    };
  }
} 