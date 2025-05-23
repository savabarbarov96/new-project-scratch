import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import path from 'path';
import { fileURLToPath } from 'url';
import { TestSpecification, TestMetrics, LoadProfile } from '../types/index.js';
import { LoadEngineConfigService } from './LoadEngineConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LoadTestOptions {
  specification: TestSpecification;
  testRunId: string;
}

export interface LoadTestResult {
  testRunId: string;
  metrics: TestMetrics;
  success: boolean;
  error?: string;
  duration?: number;
  totalRequests?: number;
}

export interface TestProgress {
  status: string;
  message: string;
  phase?: string;
  currentPhase?: number;
  totalPhases?: number;
  progress?: number;
  errorCount?: number;
}

export interface TestMetricsUpdate {
  statusCode?: number;
  responseTime?: number;
  bytes?: number;
  timestamp: Date;
  phase?: string;
  responseCount?: number;
  errorCount?: number;
  currentRps?: number;
  phaseMetrics?: TestMetrics;
  aggregatedMetrics?: TestMetrics;
}

export class LoadTestEngine extends EventEmitter {
  private activeTests: Map<string, Worker> = new Map();
  private testQueue: LoadTestOptions[] = [];
  private maxConcurrentTests: number;
  private runningTests: number = 0;
  private isShuttingDown: boolean = false;
  private testStartTimes: Map<string, Date> = new Map();
  private testTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private configService: LoadEngineConfigService;

  constructor(maxConcurrentTests?: number) {
    super();
    this.configService = LoadEngineConfigService.getInstance();
    const config = this.configService.getConfig();
    
    this.maxConcurrentTests = maxConcurrentTests ?? config.maxConcurrentTests;
    this.maxConcurrentTests = Math.max(1, this.maxConcurrentTests);
    
    // Handle process signals for graceful shutdown
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());
  }

  /**
   * Start a load test execution
   */
  async startTest(options: LoadTestOptions): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Load test engine is shutting down');
    }

    // Validate test specification
    this.validateTestSpecification(options.specification);

    const config = this.configService.getConfig();
    
    // Check queue size limit
    if (this.testQueue.length >= config.maxQueueSize) {
      throw new Error(`Test queue is full (max: ${config.maxQueueSize}). Please try again later.`);
    }

    if (this.runningTests >= this.maxConcurrentTests) {
      this.testQueue.push(options);
      this.emit('test-queued', options.testRunId, {
        queuePosition: this.testQueue.length,
        estimatedWaitTime: this.estimateWaitTime()
      });
      return;
    }

    await this.executeTest(options);
  }

  /**
   * Stop a running test
   */
  async stopTest(testRunId: string): Promise<boolean> {
    const worker = this.activeTests.get(testRunId);
    if (!worker) {
      return false;
    }

    try {
      // Send stop signal to worker
      worker.postMessage({ type: 'stop' });
      
      // Set a timeout for forceful termination
      const forceTimeout = setTimeout(async () => {
        console.warn(`Force terminating worker for test ${testRunId}`);
        await worker.terminate();
      }, 5000); // 5 second timeout

      // Wait for worker to exit gracefully
      await new Promise<void>((resolve) => {
        worker.once('exit', () => {
          clearTimeout(forceTimeout);
          resolve();
        });
      });

      this.cleanupTest(testRunId);
      this.emit('test-stopped', testRunId);
      
      return true;
    } catch (error) {
      console.error(`Error stopping test ${testRunId}:`, error);
      // Force cleanup even if stop failed
      this.cleanupTest(testRunId);
      return false;
    }
  }

  /**
   * Get status of all active tests
   */
  getActiveTests(): string[] {
    return Array.from(this.activeTests.keys());
  }

  /**
   * Check if a test is currently running
   */
  isTestRunning(testRunId: string): boolean {
    return this.activeTests.has(testRunId);
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    runningTests: number;
    maxConcurrentTests: number;
    estimatedWaitTime: number;
    maxQueueSize: number;
  } {
    const config = this.configService.getConfig();
    return {
      queueLength: this.testQueue.length,
      runningTests: this.runningTests,
      maxConcurrentTests: this.maxConcurrentTests,
      estimatedWaitTime: this.estimateWaitTime(),
      maxQueueSize: config.maxQueueSize
    };
  }

  /**
   * Update maximum concurrent tests
   */
  setMaxConcurrentTests(max: number): void {
    this.maxConcurrentTests = Math.max(1, max);
    // Process queue if we increased capacity
    this.processQueue();
  }

  /**
   * Validate test specification
   */
  private validateTestSpecification(spec: TestSpecification): void {
    if (!spec.url) {
      throw new Error('URL is required');
    }

    if (!spec.httpMethod) {
      throw new Error('HTTP method is required');
    }

    if (!spec.loadProfile) {
      throw new Error('Load profile is required');
    }

    if (!spec.loadProfile.steadyState) {
      throw new Error('Steady state configuration is required in load profile');
    }

    if (spec.loadProfile.steadyState.requestsPerSecond <= 0) {
      throw new Error('Requests per second must be greater than 0');
    }

    if (spec.loadProfile.steadyState.duration <= 0) {
      throw new Error('Test duration must be greater than 0');
    }

    // Validate URL format
    try {
      new URL(spec.url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Validate file upload if present
    if (spec.body?.type === 'file' && spec.body.fileId) {
      // Additional validation can be added here for file size, type, etc.
    }
  }

  /**
   * Execute a load test using worker thread
   */
  private async executeTest(options: LoadTestOptions): Promise<void> {
    const workerPath = path.join(__dirname, '../workers/loadTestWorker.js');
    const config = this.configService.getConfig();
    
    try {
      const worker = new Worker(workerPath, {
        workerData: {
          specification: options.specification,
          testRunId: options.testRunId,
        },
        resourceLimits: this.configService.getWorkerResourceLimits()
      });

      this.activeTests.set(options.testRunId, worker);
      this.testStartTimes.set(options.testRunId, new Date());
      this.runningTests++;

      // Set up test timeout
      const totalDuration = this.calculateTotalDuration(options.specification.loadProfile);
      const timeoutMs = (totalDuration + config.workerTimeoutBufferSeconds) * 1000;
      const timeout = setTimeout(() => {
        console.warn(`Test ${options.testRunId} timed out after ${timeoutMs}ms`);
        this.stopTest(options.testRunId);
      }, timeoutMs);
      
      this.testTimeouts.set(options.testRunId, timeout);

      // Listen for worker messages
      worker.on('message', (message) => {
        this.handleWorkerMessage(options.testRunId, message);
      });

      // Handle worker errors
      worker.on('error', (error) => {
        console.error(`Worker error for test ${options.testRunId}:`, error);
        this.emit('test-error', options.testRunId, error.message);
        this.cleanupTest(options.testRunId);
      });

      // Handle worker exit
      worker.on('exit', (code) => {
        if (code !== 0 && !this.isShuttingDown) {
          console.error(`Worker stopped with exit code ${code}`);
          this.emit('test-error', options.testRunId, `Worker exited with code ${code}`);
        }
        this.cleanupTest(options.testRunId);
      });

      this.emit('test-started', options.testRunId, {
        specification: options.specification,
        estimatedDuration: totalDuration,
        startTime: new Date()
      });
    } catch (error) {
      console.error(`Error starting test ${options.testRunId}:`, error);
      this.emit('test-error', options.testRunId, error instanceof Error ? error.message : 'Unknown error');
      this.cleanupTest(options.testRunId);
    }
  }

  /**
   * Handle messages from worker threads
   */
  private handleWorkerMessage(testRunId: string, message: any): void {
    const config = this.configService.getConfig();
    
    // Filter messages based on configuration
    if (!config.progressReportingEnabled && message.type === 'progress') {
      return;
    }

    switch (message.type) {
      case 'progress':
        this.emit('test-progress', testRunId, message.data as TestProgress);
        break;
      case 'metrics':
        this.emit('test-metrics', testRunId, message.data as TestMetricsUpdate);
        break;
      case 'complete':
        this.emit('test-complete', testRunId, message.data as LoadTestResult);
        this.cleanupTest(testRunId);
        break;
      case 'error':
        this.emit('test-error', testRunId, message.data.error, message.data);
        this.cleanupTest(testRunId);
        break;
      default:
        console.warn(`Unknown message type from worker: ${message.type}`);
    }
  }

  /**
   * Clean up after test completion
   */
  private cleanupTest(testRunId: string): void {
    this.activeTests.delete(testRunId);
    this.testStartTimes.delete(testRunId);
    
    // Clear timeout
    const timeout = this.testTimeouts.get(testRunId);
    if (timeout) {
      clearTimeout(timeout);
      this.testTimeouts.delete(testRunId);
    }
    
    this.runningTests = Math.max(0, this.runningTests - 1);
    
    // Process next test in queue
    if (!this.isShuttingDown) {
      this.processQueue();
    }
  }

  /**
   * Process next test in queue
   */
  private processQueue(): void {
    while (this.testQueue.length > 0 && this.runningTests < this.maxConcurrentTests && !this.isShuttingDown) {
      const nextTest = this.testQueue.shift();
      if (nextTest) {
        this.executeTest(nextTest).catch(error => {
          console.error('Error executing queued test:', error);
        });
      }
    }
  }

  /**
   * Calculate total test duration
   */
  private calculateTotalDuration(loadProfile: LoadProfile): number {
    let totalDuration = loadProfile.steadyState.duration;
    
    if (loadProfile.rampUp) {
      totalDuration += loadProfile.rampUp.duration;
    }
    
    if (loadProfile.rampDown) {
      totalDuration += loadProfile.rampDown.duration;
    }
    
    return totalDuration;
  }

  /**
   * Estimate wait time for queued tests
   */
  private estimateWaitTime(): number {
    if (this.testQueue.length === 0) return 0;
    
    // Calculate average test duration from running tests
    const now = new Date();
    let avgDuration = 300; // Default 5 minutes
    
    if (this.testStartTimes.size > 0) {
      const durations = Array.from(this.testStartTimes.values()).map(startTime => 
        now.getTime() - startTime.getTime()
      );
      avgDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length / 1000;
    }
    
    const availableSlots = this.maxConcurrentTests - this.runningTests;
    const queuePosition = Math.ceil(this.testQueue.length / Math.max(1, availableSlots));
    
    return queuePosition * avgDuration;
  }

  /**
   * Generate load profile execution plan
   */
  static generateExecutionPlan(loadProfile: LoadProfile): Array<{
    phase: 'rampUp' | 'steadyState' | 'rampDown';
    duration: number;
    requestsPerSecond: number;
    startTime: number;
  }> {
    const plan: Array<{
      phase: 'rampUp' | 'steadyState' | 'rampDown';
      duration: number;
      requestsPerSecond: number;
      startTime: number;
    }> = [];

    let currentTime = 0;

    // Ramp-up phase
    if (loadProfile.rampUp && loadProfile.rampUp.duration > 0) {
      plan.push({
        phase: 'rampUp',
        duration: loadProfile.rampUp.duration,
        requestsPerSecond: loadProfile.rampUp.endRate,
        startTime: currentTime,
      });
      currentTime += loadProfile.rampUp.duration;
    }

    // Steady state phase
    plan.push({
      phase: 'steadyState',
      duration: loadProfile.steadyState.duration,
      requestsPerSecond: loadProfile.steadyState.requestsPerSecond,
      startTime: currentTime,
    });
    currentTime += loadProfile.steadyState.duration;

    // Ramp-down phase
    if (loadProfile.rampDown && loadProfile.rampDown.duration > 0) {
      plan.push({
        phase: 'rampDown',
        duration: loadProfile.rampDown.duration,
        requestsPerSecond: loadProfile.rampDown.startRate,
        startTime: currentTime,
      });
    }

    return plan;
  }

  /**
   * Graceful shutdown
   */
  private async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    
    console.log('Load test engine shutting down gracefully...');
    this.isShuttingDown = true;
    
    // Clear the queue
    this.testQueue = [];
    
    // Stop all active tests
    const stopPromises = Array.from(this.activeTests.keys()).map(testId => 
      this.stopTest(testId)
    );
    
    try {
      await Promise.all(stopPromises);
      console.log('All tests stopped successfully');
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
    }
  }

  /**
   * Shutdown the engine and stop all tests
   */
  async shutdown(): Promise<void> {
    await this.gracefulShutdown();
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    activeTests: number;
    queuedTests: number;
    totalCapacity: number;
    isShuttingDown: boolean;
    uptime: number;
    config: any;
  } {
    return {
      activeTests: this.runningTests,
      queuedTests: this.testQueue.length,
      totalCapacity: this.maxConcurrentTests,
      isShuttingDown: this.isShuttingDown,
      uptime: process.uptime(),
      config: this.configService.getConfig()
    };
  }
} 