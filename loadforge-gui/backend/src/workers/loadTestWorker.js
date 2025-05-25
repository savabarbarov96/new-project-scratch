import { parentPort, workerData } from 'worker_threads';
import autocannon from 'autocannon';

class LoadTestWorker {
  constructor(data) {
    this.specification = data.specification;
    this.testRunId = data.testRunId;
    this.instance = null;
  }

  async execute() {
    try {
      this.sendMessage('progress', { status: 'starting', message: 'Initializing load test...' });

      const autocannonOptions = this.buildAutocannonOptions();
      
      this.sendMessage('progress', { 
        status: 'running', 
        message: `Starting load test with ${this.specification.loadProfile.steadyState.requestsPerSecond} req/s` 
      });

      // Execute the load test based on load profile
      const result = await this.executeLoadProfile(autocannonOptions);
      
      // Convert autocannon result to our metrics format
      const metrics = this.convertToTestMetrics(result);
      
      this.sendMessage('complete', {
        metrics,
        success: true,
        duration: result.duration,
      });

    } catch (error) {
      console.error('Load test worker error:', error);
      this.sendMessage('error', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  buildAutocannonOptions() {
    const spec = this.specification;
    const options = {
      url: spec.url,
      method: spec.httpMethod,
      headers: spec.headers || {},
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
    if (spec.body && spec.body.type === 'raw' && spec.body.content) {
      options.body = spec.body.content;
      
      // Set content-type if not already set
      if (!options.headers['content-type'] && !options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }
    }

    return options;
  }

  async executeLoadProfile(baseOptions) {
    const loadProfile = this.specification.loadProfile;
    
    // For now, implement a simplified version that runs the steady state
    // TODO: Implement proper ramp-up/ramp-down phases
    const options = {
      ...baseOptions,
      connections: Math.max(1, Math.ceil(loadProfile.steadyState.requestsPerSecond / 10)),
      duration: loadProfile.steadyState.duration,
      amount: loadProfile.steadyState.requestsPerSecond * loadProfile.steadyState.duration,
    };

    return new Promise((resolve, reject) => {
      this.instance = autocannon(options, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });

      // Track progress
      this.instance.on('response', (client, statusCode, resBytes, responseTime) => {
        this.sendMessage('metrics', {
          statusCode,
          responseTime,
          bytes: resBytes,
          timestamp: new Date(),
        });
      });

      this.instance.on('reqError', (error) => {
        this.sendMessage('progress', {
          status: 'error',
          message: `Request error: ${error.message}`,
        });
      });
    });
  }

  convertToTestMetrics(result) {
    // Handle case where result properties might be undefined
    const requests = result.requests || {};
    const latency = result.latency || {};
    const throughput = result.throughput || {};
    
    const totalRequests = requests.total || 0;
    const successfulRequests = (result['2xx'] || 0) + (result['3xx'] || 0);
    const failedRequests = (result['4xx'] || 0) + (result['5xx'] || 0) + (result.errors || 0) + (result.timeouts || 0);
    
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
        '1xx': result['1xx'] || 0,
        '2xx': result['2xx'] || 0,
        '3xx': result['3xx'] || 0,
        '4xx': result['4xx'] || 0,
        '5xx': result['5xx'] || 0,
      },
      responseTimePercentiles: {
        p50: latency.p50 || 0,
        p90: latency.p90 || 0,
        p95: latency.p97_5 || 0,
        p99: latency.p99 || 0,
      },
    };
  }

  sendMessage(type, data) {
    if (parentPort) {
      parentPort.postMessage({ type, data });
    }
  }

  stop() {
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
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
} 