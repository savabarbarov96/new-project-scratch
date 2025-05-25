import { TestRun } from '../types/index.js';
import { TestRunModel } from '../models/TestRun.js';
import { LoadTestEngine, LoadTestOptions } from './LoadTestEngine.js';
import { TestSpecificationService } from './TestSpecificationService.js';

// Import WebSocket service - will be injected
let webSocketService: any = null;

export class TestRunService {
  private loadTestEngine: LoadTestEngine;
  private testSpecService: TestSpecificationService;
  private activeTestSpecs: Map<string, TestSpecification> = new Map(); // Store specs for metrics

  constructor() {
    this.loadTestEngine = new LoadTestEngine();
    this.testSpecService = new TestSpecificationService();
    this.setupEngineEventHandlers();
  }

  /**
   * Set WebSocket service for real-time updates
   */
  setWebSocketService(wsService: any): void {
    webSocketService = wsService;
  }

  /**
   * Start a new test run
   */
  async startTestRun(specId: string): Promise<TestRun> {
    // Get the test specification
    const specResponse = await this.testSpecService.getTestSpecificationById(specId);
    if (!specResponse.success || !specResponse.data) {
      throw new Error(`Test specification with ID ${specId} not found`);
    }

    const specification = specResponse.data;

    // Create a new test run record
    const testRun: Partial<TestRun> = {
      specId,
      specName: specification.name,
      status: 'pending',
      createdAt: new Date(),
    };

    const savedTestRun = await TestRunModel.create(testRun);
    const testRunId = savedTestRun._id.toString();

    // Store specification for later use in metrics
    this.activeTestSpecs.set(testRunId, specification);

    // Start the load test
    const loadTestOptions: LoadTestOptions = {
      specification,
      testRunId,
    };

    try {
      await this.loadTestEngine.startTest(loadTestOptions);
      
      // Update status to running
      await this.updateTestRunStatus(testRunId, 'running', { startTime: new Date() });
      
      // Emit WebSocket event
      if (webSocketService) {
        webSocketService.emitTestStatus(testRunId, 'running', {
          specification: specification.name,
          startTime: new Date()
        });
        webSocketService.emitTestStarted(testRunId, specification.name);
      }
      
      return await this.getTestRun(testRunId);
    } catch (error) {
      // Update status to failed
      await this.updateTestRunStatus(testRunId, 'failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Emit WebSocket event
      if (webSocketService) {
        webSocketService.emitTestError(testRunId, error instanceof Error ? error.message : 'Unknown error');
      }
      
      throw error;
    }
  }

  /**
   * Stop a running test
   */
  async stopTestRun(testRunId: string): Promise<boolean> {
    const testRun = await this.getTestRun(testRunId);
    if (!testRun) {
      throw new Error(`Test run with ID ${testRunId} not found`);
    }

    if (testRun.status !== 'running') {
      throw new Error(`Test run ${testRunId} is not currently running`);
    }

    const stopped = await this.loadTestEngine.stopTest(testRunId);
    
    if (stopped) {
      await this.updateTestRunStatus(testRunId, 'cancelled', { 
        endTime: new Date(),
        duration: testRun.startTime ? Date.now() - testRun.startTime.getTime() : 0
      });
      
      // Clean up stored spec
      this.activeTestSpecs.delete(testRunId);
      
      // Emit WebSocket event
      if (webSocketService) {
        webSocketService.emitTestStatus(testRunId, 'cancelled', {
          endTime: new Date(),
          reason: 'User requested stop'
        });
      }
    }

    return stopped;
  }

  /**
   * Get a test run by ID
   */
  async getTestRun(testRunId: string): Promise<TestRun> {
    const testRun = await TestRunModel.findById(testRunId);
    if (!testRun) {
      throw new Error(`Test run with ID ${testRunId} not found`);
    }
    return this.documentToTestRun(testRun);
  }

  /**
   * Get all test runs with pagination
   */
  async getTestRuns(page: number = 1, limit: number = 10): Promise<{
    testRuns: TestRun[];
    total: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    
    const [testRunDocs, total] = await Promise.all([
      TestRunModel.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TestRunModel.countDocuments(),
    ]);

    const testRuns = testRunDocs.map(doc => this.documentToTestRun(doc));

    return {
      testRuns,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get test runs for a specific specification
   */
  async getTestRunsBySpec(specId: string, page: number = 1, limit: number = 10): Promise<{
    testRuns: TestRun[];
    total: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    
    const [testRunDocs, total] = await Promise.all([
      TestRunModel.find({ specId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TestRunModel.countDocuments({ specId }),
    ]);

    const testRuns = testRunDocs.map(doc => this.documentToTestRun(doc));

    return {
      testRuns,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete a test run
   */
  async deleteTestRun(testRunId: string): Promise<boolean> {
    const testRun = await TestRunModel.findById(testRunId);
    if (!testRun) {
      return false;
    }

    // Stop the test if it's running
    if (testRun.status === 'running') {
      await this.stopTestRun(testRunId);
    }

    await TestRunModel.findByIdAndDelete(testRunId);
    return true;
  }

  /**
   * Get test run status
   */
  async getTestRunStatus(testRunId: string): Promise<{
    status: TestRun['status'];
    isRunning: boolean;
    progress?: any;
  }> {
    const testRun = await this.getTestRun(testRunId);
    const isRunning = this.loadTestEngine.isTestRunning(testRunId);

    return {
      status: testRun.status,
      isRunning,
      progress: testRun.metrics,
    };
  }

  /**
   * Convert document to TestRun interface
   */
  private documentToTestRun(doc: any): TestRun {
    return {
      _id: doc._id.toString(),
      specId: doc.specId,
      specName: doc.specName,
      status: doc.status,
      startTime: doc.startTime,
      endTime: doc.endTime,
      duration: doc.duration,
      metrics: doc.metrics,
      logs: doc.logs,
      error: doc.error,
      createdAt: doc.createdAt,
    };
  }

  /**
   * Update test run status and data
   */
  private async updateTestRunStatus(
    testRunId: string, 
    status: TestRun['status'], 
    updates: Partial<TestRun> = {}
  ): Promise<void> {
    await TestRunModel.findByIdAndUpdate(testRunId, {
      status,
      ...updates,
    });
  }

  /**
   * Setup event handlers for the load test engine
   */
  private setupEngineEventHandlers(): void {
    this.loadTestEngine.on('test-started', (testRunId: string) => {
      console.log(`Test ${testRunId} started`);
      
      // Emit WebSocket event
      if (webSocketService) {
        webSocketService.emitTestStatus(testRunId, 'started');
      }
    });

    this.loadTestEngine.on('test-progress', (testRunId: string, progress: any) => {
      console.log(`Test ${testRunId} progress:`, progress);
      
      // Emit WebSocket event for real-time updates
      if (webSocketService) {
        webSocketService.emitTestProgress({
          testRunId,
          timestamp: new Date(),
          status: progress.status,
          message: progress.message,
          phase: progress.phase,
          currentPhase: progress.currentPhase,
          totalPhases: progress.totalPhases,
          progress: progress.progress
        });
      }
    });

    this.loadTestEngine.on('test-metrics', (testRunId: string, metrics: any) => {
      console.log(`Test ${testRunId} metrics:`, metrics);
      
      // Get the test specification for this test
      const specification = this.activeTestSpecs.get(testRunId);
      
      // Emit WebSocket event for real-time metrics
      if (webSocketService) {
        // Handle both individual request metrics and aggregated metrics
        if (metrics.statusCode && metrics.responseTime) {
          // Individual request log with actual URL and method
          webSocketService.emitRequestLog({
            testRunId,
            timestamp: metrics.timestamp || new Date(),
            method: specification?.httpMethod || 'GET',
            url: specification?.url || 'unknown',
            statusCode: metrics.statusCode,
            responseTime: metrics.responseTime,
            bytes: metrics.bytes || 0,
            phase: metrics.phase || 'unknown',
            error: metrics.statusCode >= 400 ? `HTTP ${metrics.statusCode}` : undefined
          });
        }
        
        if (metrics.responseCount !== undefined) {
          // Aggregated metrics
          webSocketService.emitTestMetrics({
            testRunId,
            timestamp: metrics.timestamp || new Date(),
            phase: metrics.phase || 'unknown',
            responseCount: metrics.responseCount,
            errorCount: metrics.errorCount || 0,
            currentRps: metrics.currentRps || 0,
            averageResponseTime: metrics.averageResponseTime || metrics.responseTime || 0,
            statusCodes: metrics.statusCodes || { [metrics.statusCode || 200]: 1 }
          });
        }
      }
    });

    this.loadTestEngine.on('test-complete', async (testRunId: string, result: any) => {
      console.log(`Test ${testRunId} completed`);
      
      try {
        const endTime = new Date();
        const testRun = await this.getTestRun(testRunId);
        const duration = testRun.startTime ? endTime.getTime() - testRun.startTime.getTime() : 0;

        await this.updateTestRunStatus(testRunId, 'completed', {
          endTime,
          duration,
          metrics: result.metrics,
        });
        
        // Clean up stored spec
        this.activeTestSpecs.delete(testRunId);
        
        // Emit WebSocket event
        if (webSocketService) {
          webSocketService.emitTestComplete(testRunId, {
            metrics: result.metrics,
            duration,
            endTime
          });
          webSocketService.emitTestCompleted(testRunId, testRun.specName, result.metrics);
        }
      } catch (error) {
        console.error(`Error updating completed test ${testRunId}:`, error);
      }
    });

    this.loadTestEngine.on('test-error', async (testRunId: string, error: string) => {
      console.error(`Test ${testRunId} error:`, error);
      
      try {
        const endTime = new Date();
        const testRun = await this.getTestRun(testRunId);
        const duration = testRun.startTime ? endTime.getTime() - testRun.startTime.getTime() : 0;

        await this.updateTestRunStatus(testRunId, 'failed', {
          endTime,
          duration,
          error,
        });
        
        // Clean up stored spec
        this.activeTestSpecs.delete(testRunId);
        
        // Emit WebSocket event
        if (webSocketService) {
          webSocketService.emitTestError(testRunId, error);
        }
      } catch (updateError) {
        console.error(`Error updating failed test ${testRunId}:`, updateError);
      }
    });

    this.loadTestEngine.on('test-stopped', async (testRunId: string) => {
      console.log(`Test ${testRunId} stopped`);
      // Status update is handled in stopTestRun method
      
      // Emit WebSocket event
      if (webSocketService) {
        webSocketService.emitTestStatus(testRunId, 'stopped');
      }
    });

    this.loadTestEngine.on('test-queued', (testRunId: string, queueInfo: any) => {
      console.log(`Test ${testRunId} queued`);
      
      // Emit WebSocket event for queue status
      if (webSocketService) {
        webSocketService.emitTestStatus(testRunId, 'queued', {
          queuePosition: queueInfo?.queuePosition,
          estimatedWaitTime: queueInfo?.estimatedWaitTime
        });
      }
    });
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    await this.loadTestEngine.shutdown();
  }
} 