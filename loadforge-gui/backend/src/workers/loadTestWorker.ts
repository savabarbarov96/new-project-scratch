import { parentPort, workerData } from 'worker_threads';
import autocannon from 'autocannon';
import { TestSpecification, TestMetrics } from '../types/index.js';
import { FileUploadService } from '../services/FileUploadService.js';
import { LoadEngineConfigService } from '../services/LoadEngineConfig.js';

interface WorkerData {
  specification: TestSpecification;
  testRunId: string;
}

interface AutocannonResult {
  title: string;
  url: string;
  requests: {
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    total: number;
    p0_001: number;
    p0_01: number;
    p0_1: number;
    p1: number;
    p2_5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p97_5: number;
    p99: number;
    p99_9: number;
    p99_99: number;
    p99_999: number;
    sent: number;
  };
  latency: {
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    p0_001: number;
    p0_01: number;
    p0_1: number;
    p1: number;
    p2_5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p97_5: number;
    p99: number;
    p99_9: number;
    p99_99: number;
    p99_999: number;
  };
  throughput: {
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    total: number;
  };
  errors: number;
  timeouts: number;
  mismatches: number;
  duration: number;
  start: Date;
  finish: Date;
  connections: number;
  pipelining: number;
  non2xx: number;
  '1xx': number;
  '2xx': number;
  '3xx': number;
  '4xx': number;
  '5xx': number;
}

interface PhaseExecutionPlan {
  phase: 'rampUp' | 'steadyState' | 'rampDown';
  duration: number;
  requestsPerSecond: number;
  connections: number;
  startTime: number;
}

class LoadTestWorker {
  private specification: TestSpecification;
  private testRunId: string;
  private instance: any = null;
  private fileUploadService = new FileUploadService();
  private configService = LoadEngineConfigService.getInstance();
  private isStopRequested = false;
  private currentPhase = 0;
  private totalPhases = 0;
  private startTime: Date = new Date();

  constructor(data: WorkerData) {
    this.specification = data.specification;
    this.testRunId = data.testRunId;
  }

  async execute(): Promise<void> {
    try {
      this.sendMessage('progress', { 
        status: 'starting', 
        message: 'Initializing load test...',
        phase: 'initialization',
        progress: 0
      });

      // Validate specification
      this.validateSpecification();

      // Build autocannon options
      const baseOptions = await this.buildAutocannonOptions();
      
      this.sendMessage('progress', { 
        status: 'running', 
        message: `Starting load test: ${this.specification.name}`,
        phase: 'execution',
        progress: 5
      });

      // Execute the load test based on load profile
      const result = await this.executeLoadProfile(baseOptions);
      
      // Convert autocannon result to our metrics format
      const metrics = this.convertToTestMetrics(result);
      
      this.sendMessage('complete', {
        metrics,
        success: true,
        duration: result.duration,
        totalRequests: result.requests.total,
        message: 'Load test completed successfully'
      });

    } catch (error) {
      console.error('Load test worker error:', error);
      this.sendMessage('error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        phase: this.getCurrentPhaseInfo(),
        testRunId: this.testRunId
      });
    }
  }

  private validateSpecification(): void {
    if (!this.specification.url) {
      throw new Error('URL is required for load testing');
    }

    if (!this.specification.loadProfile) {
      throw new Error('Load profile is required');
    }

    if (!this.specification.loadProfile.steadyState) {
      throw new Error('Steady state configuration is required in load profile');
    }

    // Validate URL format
    try {
      new URL(this.specification.url);
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  private async buildAutocannonOptions(): Promise<any> {
    const spec = this.specification;
    const config = this.configService.getConfig();
    const autocannonDefaults = this.configService.getAutocannonDefaults();
    
    const options: any = {
      url: spec.url,
      method: spec.httpMethod,
      headers: spec.headers ? { ...spec.headers } : {},
      ...autocannonDefaults,
    };

    // Add query parameters to URL if present
    if (spec.queryParams && Object.keys(spec.queryParams).length > 0) {
      const url = new URL(spec.url);
      Object.entries(spec.queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
      options.url = url.toString();
    }

    // Add body if present
    if (spec.body) {
      if (spec.body.type === 'raw' && spec.body.content) {
        options.body = spec.body.content;
        
        // Set content-type if not already set
        if (!options.headers['content-type'] && !options.headers['Content-Type']) {
          options.headers['Content-Type'] = 'application/json';
        }
      } else if (spec.body.type === 'file' && spec.body.fileId) {
        try {
          this.sendMessage('progress', { 
            status: 'loading', 
            message: 'Loading file attachment...',
            phase: 'file-loading'
          });
          
          const { buffer, metadata } = await this.fileUploadService.downloadFileBuffer(spec.body.fileId);
          
          // Validate file size against config
          const maxSizeBytes = config.maxFileUploadSizeMb * 1024 * 1024;
          if (metadata.size > maxSizeBytes) {
            throw new Error(`File size (${Math.round(metadata.size / 1024 / 1024)}MB) exceeds maximum allowed size (${config.maxFileUploadSizeMb}MB)`);
          }
          
          // Validate MIME type
          if (!this.configService.isMimeTypeAllowed(metadata.mimeType)) {
            throw new Error(`File type '${metadata.mimeType}' is not allowed`);
          }
          
          options.body = buffer;
          
          // Set content-type based on file metadata if not already set
          if (!options.headers['content-type'] && !options.headers['Content-Type']) {
            options.headers['Content-Type'] = metadata.mimeType;
          }
          
          this.sendMessage('progress', { 
            status: 'loaded', 
            message: `File loaded: ${metadata.originalName} (${Math.round(metadata.size / 1024)}KB)`,
            phase: 'file-loaded'
          });
        } catch (fileError) {
          throw new Error(`Failed to load file attachment: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
        }
      }
    }

    return options;
  }

  private async executeLoadProfile(baseOptions: any): Promise<AutocannonResult> {
    const loadProfile = this.specification.loadProfile;
    
    // Generate execution plan from load profile
    const executionPlan = this.generateExecutionPlan(loadProfile);
    this.totalPhases = executionPlan.length;
    
    let aggregatedResult: AutocannonResult | null = null;
    let totalDuration = 0;
    
    for (let i = 0; i < executionPlan.length; i++) {
      if (this.isStopRequested) {
        throw new Error('Test execution stopped by user request');
      }

      this.currentPhase = i + 1;
      const phase = executionPlan[i];
      
      this.sendMessage('progress', {
        status: 'running',
        message: `Executing ${phase.phase} phase: ${phase.requestsPerSecond} req/s for ${phase.duration}s`,
        phase: phase.phase,
        currentPhase: this.currentPhase,
        totalPhases: this.totalPhases,
        progress: Math.round((i / executionPlan.length) * 90) + 10 // 10-100% range
      });
      
      const phaseResult = await this.executePhase(baseOptions, phase);
      
      // Aggregate results
      if (!aggregatedResult) {
        aggregatedResult = phaseResult;
      } else {
        aggregatedResult = this.aggregateResults(aggregatedResult, phaseResult);
      }
      
      totalDuration += phase.duration;

      // Send intermediate metrics
      this.sendMessage('metrics', {
        phase: phase.phase,
        phaseMetrics: this.convertToTestMetrics(phaseResult),
        aggregatedMetrics: this.convertToTestMetrics(aggregatedResult),
        progress: Math.round(((i + 1) / executionPlan.length) * 90) + 10
      });
    }
    
    if (!aggregatedResult) {
      throw new Error('No phases executed');
    }
    
    // Update total duration
    aggregatedResult.duration = totalDuration;
    
    return aggregatedResult;
  }

  private generateExecutionPlan(loadProfile: any): PhaseExecutionPlan[] {
    const plan: PhaseExecutionPlan[] = [];
    let currentTime = 0;

    // Ramp-up phase
    if (loadProfile.rampUp && loadProfile.rampUp.duration > 0) {
      const connections = this.configService.getOptimalConnections(loadProfile.rampUp.endRate);
      plan.push({
        phase: 'rampUp',
        duration: loadProfile.rampUp.duration,
        requestsPerSecond: loadProfile.rampUp.endRate,
        connections,
        startTime: currentTime,
      });
      currentTime += loadProfile.rampUp.duration;
    }

    // Steady state phase
    const steadyConnections = this.configService.getOptimalConnections(loadProfile.steadyState.requestsPerSecond);
    plan.push({
      phase: 'steadyState',
      duration: loadProfile.steadyState.duration,
      requestsPerSecond: loadProfile.steadyState.requestsPerSecond,
      connections: steadyConnections,
      startTime: currentTime,
    });
    currentTime += loadProfile.steadyState.duration;

    // Ramp-down phase
    if (loadProfile.rampDown && loadProfile.rampDown.duration > 0) {
      const connections = this.configService.getOptimalConnections(loadProfile.rampDown.startRate);
      plan.push({
        phase: 'rampDown',
        duration: loadProfile.rampDown.duration,
        requestsPerSecond: loadProfile.rampDown.startRate,
        connections,
        startTime: currentTime,
      });
    }

    return plan;
  }

  private async executePhase(options: any, phase: PhaseExecutionPlan): Promise<AutocannonResult> {
    const config = this.configService.getConfig();
    
    return new Promise((resolve, reject) => {
      if (this.isStopRequested) {
        reject(new Error('Test execution stopped'));
        return;
      }

      console.log(`Starting ${phase.phase} phase: ${phase.requestsPerSecond} RPS for ${phase.duration}s`);
      
      const phaseOptions = {
        ...options,
        connections: phase.connections,
        duration: phase.duration,
        overallRate: phase.requestsPerSecond,
      };

      this.instance = autocannon(phaseOptions, (err: Error | null, result: AutocannonResult) => {
        if (err) {
          console.error(`Error in ${phase.phase} phase:`, err);
          reject(err);
        } else {
          console.log(`Completed ${phase.phase} phase`);
          resolve(result);
        }
      });

      // Track progress and metrics in real-time - FIXED EVENT HANDLER
      let responseCount = 0;
      let errorCount = 0;

      this.instance.on('response', (_client: any, statusCode: number, resBytes: number, responseTime: number) => {
        responseCount++;
        
        // Emit EVERY individual request log for real-time monitoring
        this.sendMessage('metrics', {
          statusCode,
          responseTime,
          bytes: resBytes,
          timestamp: new Date(),
          phase: phase.phase,
          url: this.specification.url,
          method: this.specification.httpMethod,
          // Mark this as individual request data
          isIndividualRequest: true
        });

        // Also send aggregated metrics at intervals for performance monitoring
        if (responseCount % 5 === 0) { // Every 5 requests
          const currentRps = responseCount / ((Date.now() - this.startTime.getTime()) / 1000);
          this.sendMessage('metrics', {
            timestamp: new Date(),
            phase: phase.phase,
            responseCount,
            errorCount,
            currentRps,
            averageResponseTime: responseTime // approximate
          });
        }
      });

      this.instance.on('reqError', (error: Error) => {
        errorCount++;
        if (config.progressReportingEnabled) {
          this.sendMessage('progress', {
            status: 'warning',
            message: `Request error in ${phase.phase}: ${error.message}`,
            phase: phase.phase,
            errorCount
          });
        }
      });

      this.instance.on('timeout', () => {
        if (config.progressReportingEnabled) {
          this.sendMessage('progress', {
            status: 'warning',
            message: `Request timeout in ${phase.phase}`,
            phase: phase.phase
          });
        }
      });
    });
  }

  private aggregateResults(result1: AutocannonResult, result2: AutocannonResult): AutocannonResult {
    // Add null/undefined checks for all result properties
    const requests1 = result1?.requests || {};
    const requests2 = result2?.requests || {};
    const latency1 = result1?.latency || {};
    const latency2 = result2?.latency || {};
    const throughput1 = result1?.throughput || {};
    const throughput2 = result2?.throughput || {};
    
    // Weighted aggregation based on request counts
    const total1 = requests1.total || 0;
    const total2 = requests2.total || 0;
    const totalRequests = total1 + total2;
    
    if (totalRequests === 0) return result1;
    
    const weight1 = total1 / totalRequests;
    const weight2 = total2 / totalRequests;

    return {
      ...result1,
      requests: {
        ...requests1,
        total: totalRequests,
        average: ((requests1.average || 0) * weight1) + ((requests2.average || 0) * weight2),
        mean: ((requests1.mean || 0) * weight1) + ((requests2.mean || 0) * weight2),
        min: Math.min(requests1.min || 0, requests2.min || 0),
        max: Math.max(requests1.max || 0, requests2.max || 0),
        stddev: Math.sqrt((Math.pow(requests1.stddev || 0, 2) * weight1) + (Math.pow(requests2.stddev || 0, 2) * weight2)),
        // Aggregate percentiles (simplified approach)
        p50: ((requests1.p50 || 0) * weight1) + ((requests2.p50 || 0) * weight2),
        p90: ((requests1.p90 || 0) * weight1) + ((requests2.p90 || 0) * weight2),
        p99: ((requests1.p99 || 0) * weight1) + ((requests2.p99 || 0) * weight2),
        p99_9: ((requests1.p99_9 || 0) * weight1) + ((requests2.p99_9 || 0) * weight2),
        p99_99: ((requests1.p99_99 || 0) * weight1) + ((requests2.p99_99 || 0) * weight2),
        p99_999: ((requests1.p99_999 || 0) * weight1) + ((requests2.p99_999 || 0) * weight2),
        p0_001: Math.min(requests1.p0_001 || 0, requests2.p0_001 || 0),
        p0_01: Math.min(requests1.p0_01 || 0, requests2.p0_01 || 0),
        p0_1: Math.min(requests1.p0_1 || 0, requests2.p0_1 || 0),
        p1: ((requests1.p1 || 0) * weight1) + ((requests2.p1 || 0) * weight2),
        p2_5: ((requests1.p2_5 || 0) * weight1) + ((requests2.p2_5 || 0) * weight2),
        p10: ((requests1.p10 || 0) * weight1) + ((requests2.p10 || 0) * weight2),
        p25: ((requests1.p25 || 0) * weight1) + ((requests2.p25 || 0) * weight2),
        p75: ((requests1.p75 || 0) * weight1) + ((requests2.p75 || 0) * weight2),
        p97_5: ((requests1.p97_5 || 0) * weight1) + ((requests2.p97_5 || 0) * weight2),
        sent: (requests1.sent || 0) + (requests2.sent || 0),
      },
      latency: {
        ...latency1,
        average: ((latency1.average || 0) * weight1) + ((latency2.average || 0) * weight2),
        mean: ((latency1.mean || 0) * weight1) + ((latency2.mean || 0) * weight2),
        min: Math.min(latency1.min || 0, latency2.min || 0),
        max: Math.max(latency1.max || 0, latency2.max || 0),
        stddev: Math.sqrt((Math.pow(latency1.stddev || 0, 2) * weight1) + (Math.pow(latency2.stddev || 0, 2) * weight2)),
        // Aggregate percentiles
        p50: ((latency1.p50 || 0) * weight1) + ((latency2.p50 || 0) * weight2),
        p90: ((latency1.p90 || 0) * weight1) + ((latency2.p90 || 0) * weight2),
        p99: ((latency1.p99 || 0) * weight1) + ((latency2.p99 || 0) * weight2),
        p99_9: ((latency1.p99_9 || 0) * weight1) + ((latency2.p99_9 || 0) * weight2),
        p99_99: ((latency1.p99_99 || 0) * weight1) + ((latency2.p99_99 || 0) * weight2),
        p99_999: ((latency1.p99_999 || 0) * weight1) + ((latency2.p99_999 || 0) * weight2),
        p0_001: Math.min(latency1.p0_001 || 0, latency2.p0_001 || 0),
        p0_01: Math.min(latency1.p0_01 || 0, latency2.p0_01 || 0),
        p0_1: Math.min(latency1.p0_1 || 0, latency2.p0_1 || 0),
        p1: ((latency1.p1 || 0) * weight1) + ((latency2.p1 || 0) * weight2),
        p2_5: ((latency1.p2_5 || 0) * weight1) + ((latency2.p2_5 || 0) * weight2),
        p10: ((latency1.p10 || 0) * weight1) + ((latency2.p10 || 0) * weight2),
        p25: ((latency1.p25 || 0) * weight1) + ((latency2.p25 || 0) * weight2),
        p75: ((latency1.p75 || 0) * weight1) + ((latency2.p75 || 0) * weight2),
        p97_5: ((latency1.p97_5 || 0) * weight1) + ((latency2.p97_5 || 0) * weight2),
      },
      throughput: {
        ...throughput1,
        total: (throughput1.total || 0) + (throughput2.total || 0),
        average: ((throughput1.average || 0) * weight1) + ((throughput2.average || 0) * weight2),
        mean: ((throughput1.mean || 0) * weight1) + ((throughput2.mean || 0) * weight2),
        min: Math.min(throughput1.min || 0, throughput2.min || 0),
        max: Math.max(throughput1.max || 0, throughput2.max || 0),
        stddev: Math.sqrt((Math.pow(throughput1.stddev || 0, 2) * weight1) + (Math.pow(throughput2.stddev || 0, 2) * weight2)),
      },
      errors: (result1?.errors || 0) + (result2?.errors || 0),
      timeouts: (result1?.timeouts || 0) + (result2?.timeouts || 0),
      mismatches: (result1?.mismatches || 0) + (result2?.mismatches || 0),
      '1xx': (result1?.['1xx'] || 0) + (result2?.['1xx'] || 0),
      '2xx': (result1?.['2xx'] || 0) + (result2?.['2xx'] || 0),
      '3xx': (result1?.['3xx'] || 0) + (result2?.['3xx'] || 0),
      '4xx': (result1?.['4xx'] || 0) + (result2?.['4xx'] || 0),
      '5xx': (result1?.['5xx'] || 0) + (result2?.['5xx'] || 0),
      non2xx: (result1?.non2xx || 0) + (result2?.non2xx || 0),
      duration: (result1?.duration || 0) + (result2?.duration || 0),
      finish: result2?.finish || result1?.finish || new Date(), // Use the finish time of the last phase
      connections: Math.max(result1?.connections || 0, result2?.connections || 0),
      pipelining: result1?.pipelining || 0, // Keep the first one
      start: result1?.start || new Date(), // Keep the start time of the first phase
      title: result1?.title || '',
      url: result1?.url || '',
    };
  }

  private convertToTestMetrics(result: AutocannonResult): TestMetrics {
    // Add null/undefined checks for all result properties
    const requests = result?.requests || {};
    const latency = result?.latency || {};
    const throughput = result?.throughput || {};
    
    const totalRequests = requests.total || 0;
    const successfulRequests = (result?.['2xx'] || 0) + (result?.['3xx'] || 0);
    const failedRequests = (result?.['4xx'] || 0) + (result?.['5xx'] || 0) + (result?.errors || 0) + (result?.timeouts || 0);
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: latency.average || 0,
      minResponseTime: latency.min || 0,
      maxResponseTime: latency.max || 0,
      requestsPerSecond: requests.average || 0,
      errorRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
      throughput: throughput.average || 0,
      statusCodes: {
        '1xx': result?.['1xx'] || 0,
        '2xx': result?.['2xx'] || 0,
        '3xx': result?.['3xx'] || 0,
        '4xx': result?.['4xx'] || 0,
        '5xx': result?.['5xx'] || 0,
      },
      responseTimePercentiles: {
        p50: latency.p50 || 0,
        p90: latency.p90 || 0,
        p95: latency.p97_5 || 0,
        p99: latency.p99 || 0,
      },
    };
  }

  private getCurrentPhaseInfo(): string {
    return `Phase ${this.currentPhase}/${this.totalPhases}`;
  }

  private sendMessage(type: string, data: any): void {
    if (parentPort) {
      parentPort.postMessage({ 
        type, 
        data: {
          ...data,
          testRunId: this.testRunId,
          timestamp: new Date()
        }
      });
    }
  }

  stop(): void {
    this.isStopRequested = true;
    if (this.instance) {
      this.instance.stop();
    }
  }
}

// Initialize and run the worker
if (workerData) {
  const worker = new LoadTestWorker(workerData);
  
  // Handle stop signals
  if (parentPort) {
    parentPort.on('message', (message) => {
      if (message.type === 'stop') {
        worker.stop();
      }
    });
  }
  
  // Start execution
  worker.execute().catch((error) => {
    console.error('Worker execution failed:', error);
    if (parentPort) {
      parentPort.postMessage({ 
        type: 'error', 
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          testRunId: workerData.testRunId,
          timestamp: new Date()
        }
      });
    }
  });
} 