# LoadForge Core Load Engine

## Overview

The LoadForge Core Load Engine is a high-performance, scalable load testing engine built on Node.js Worker Threads and Autocannon. It provides enterprise-grade load testing capabilities with advanced features like multi-phase load profiles, real-time metrics, file upload support, and comprehensive resource management.

## Architecture

### Components

1. **LoadTestEngine** - Main orchestration service that manages worker threads and test execution
2. **LoadTestWorker** - Worker thread implementation that executes actual load tests using Autocannon
3. **LoadEngineConfigService** - Configuration management service with environment variable support
4. **TestRunService** - Integration layer that connects the engine with the application's data layer

### Key Features

- **Worker Thread Architecture**: Isolated test execution using Node.js Worker Threads
- **Multi-Phase Load Profiles**: Support for ramp-up, steady-state, and ramp-down phases
- **Real-time Metrics**: Live performance metrics and progress reporting
- **File Upload Support**: Test with file attachments and custom content types
- **Resource Management**: Configurable memory limits and connection pooling
- **Queue Management**: Test queuing with capacity limits and wait time estimation
- **Graceful Shutdown**: Clean termination of running tests
- **Comprehensive Validation**: Input validation and error handling

## Configuration

### Environment Variables

The engine can be configured using environment variables:

```bash
# Concurrency settings
LOAD_ENGINE_MAX_CONCURRENT_TESTS=3
LOAD_ENGINE_MAX_QUEUE_SIZE=50

# Resource limits
LOAD_ENGINE_WORKER_MEMORY_LIMIT_MB=512
LOAD_ENGINE_REQUEST_TIMEOUT_SECONDS=30
LOAD_ENGINE_MAX_FILE_UPLOAD_SIZE_MB=100

# Monitoring
LOAD_ENGINE_PROGRESS_REPORTING=true
```

### Default Configuration

```typescript
{
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
}
```

## Usage

### Basic Test Execution

```typescript
import { LoadTestEngine } from './services/LoadTestEngine.js';

const engine = new LoadTestEngine();

// Start a test
await engine.startTest({
  specification: {
    name: 'API Load Test',
    url: 'https://api.example.com/endpoint',
    httpMethod: 'GET',
    loadProfile: {
      type: 'custom',
      duration: 60,
      steadyState: {
        duration: 60,
        requestsPerSecond: 100
      }
    }
  },
  testRunId: 'test-123'
});

// Monitor events
engine.on('test-progress', (testId, progress) => {
  console.log(`Test ${testId}: ${progress.message}`);
});

engine.on('test-metrics', (testId, metrics) => {
  console.log(`Test ${testId} RPS: ${metrics.currentRps}`);
});

engine.on('test-complete', (testId, result) => {
  console.log(`Test ${testId} completed:`, result.metrics);
});
```

### Advanced Load Profiles

```typescript
const loadProfile = {
  type: 'custom',
  duration: 300, // 5 minutes total
  rampUp: {
    duration: 60,    // 1 minute ramp-up
    startRate: 10,   // Start at 10 RPS
    endRate: 100     // End at 100 RPS
  },
  steadyState: {
    duration: 180,   // 3 minutes steady state
    requestsPerSecond: 100
  },
  rampDown: {
    duration: 60,    // 1 minute ramp-down
    startRate: 100,  // Start at 100 RPS
    endRate: 10      // End at 10 RPS
  }
};
```

### File Upload Testing

```typescript
const specification = {
  name: 'File Upload Test',
  url: 'https://api.example.com/upload',
  httpMethod: 'POST',
  headers: {
    'Authorization': 'Bearer token123'
  },
  body: {
    type: 'file',
    fileId: 'uploaded-file-id'
  },
  loadProfile: {
    type: 'custom',
    duration: 120,
    steadyState: {
      duration: 120,
      requestsPerSecond: 50
    }
  }
};
```

## Events

The LoadTestEngine emits the following events:

### test-started
Emitted when a test begins execution.
```typescript
engine.on('test-started', (testRunId: string, data: {
  specification: TestSpecification;
  estimatedDuration: number;
  startTime: Date;
}) => {
  // Handle test start
});
```

### test-progress
Emitted for progress updates during test execution.
```typescript
engine.on('test-progress', (testRunId: string, progress: {
  status: string;
  message: string;
  phase?: string;
  currentPhase?: number;
  totalPhases?: number;
  progress?: number;
  errorCount?: number;
}) => {
  // Handle progress update
});
```

### test-metrics
Emitted for real-time performance metrics.
```typescript
engine.on('test-metrics', (testRunId: string, metrics: {
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
}) => {
  // Handle metrics update
});
```

### test-complete
Emitted when a test completes successfully.
```typescript
engine.on('test-complete', (testRunId: string, result: {
  testRunId: string;
  metrics: TestMetrics;
  success: boolean;
  duration?: number;
  totalRequests?: number;
  message: string;
}) => {
  // Handle test completion
});
```

### test-error
Emitted when a test encounters an error.
```typescript
engine.on('test-error', (testRunId: string, error: string, data?: any) => {
  // Handle test error
});
```

### test-stopped
Emitted when a test is manually stopped.
```typescript
engine.on('test-stopped', (testRunId: string) => {
  // Handle test stop
});
```

### test-queued
Emitted when a test is queued due to capacity limits.
```typescript
engine.on('test-queued', (testRunId: string, queueInfo: {
  queuePosition: number;
  estimatedWaitTime: number;
}) => {
  // Handle test queuing
});
```

## Performance Tuning

### Connection Optimization

The engine automatically calculates optimal connection counts based on the target RPS:
- Default ratio: 10 RPS per connection
- Maximum connections per test: 1000 (configurable)
- Connections are distributed across test phases

### Memory Management

- Worker threads have configurable memory limits
- Default: 512MB per worker (384MB old generation + 128MB young generation)
- Automatic cleanup after test completion

### Timeout Handling

- Request timeout: 30 seconds (configurable)
- Worker timeout: Test duration + 60 seconds buffer
- Bailout threshold: 10 consecutive failures (configurable)

## Monitoring and Observability

### Real-time Metrics

- Response times (min, max, average, percentiles)
- Request rates (current, average)
- Error rates and status code distribution
- Throughput (bytes per second)
- Phase-specific metrics

### Progress Tracking

- Phase execution progress
- Overall test progress percentage
- Error counts and warnings
- File loading status

### Engine Statistics

```typescript
const stats = engine.getStats();
console.log(stats);
// {
//   activeTests: 2,
//   queuedTests: 1,
//   totalCapacity: 3,
//   isShuttingDown: false,
//   uptime: 3600,
//   config: { ... }
// }
```

## Error Handling

### Validation Errors

- Invalid URLs
- Missing required fields
- Invalid load profile configurations
- File size/type validation

### Runtime Errors

- Network connectivity issues
- Server errors (4xx, 5xx responses)
- Timeout errors
- Worker thread failures

### Recovery Mechanisms

- Automatic retry for transient failures
- Graceful degradation on resource constraints
- Queue management for capacity overruns

## Best Practices

### Test Design

1. **Start Small**: Begin with low RPS and short durations
2. **Use Ramp-up**: Gradually increase load to avoid overwhelming targets
3. **Monitor Resources**: Watch both client and server resource usage
4. **Validate Results**: Ensure test results are realistic and consistent

### Configuration

1. **Memory Limits**: Set appropriate worker memory limits based on test complexity
2. **Connection Pooling**: Tune connection ratios for your specific use case
3. **Timeout Values**: Set timeouts based on expected response times
4. **Queue Limits**: Configure queue sizes based on expected test volume

### Monitoring

1. **Real-time Dashboards**: Use metrics events for live monitoring
2. **Alerting**: Set up alerts for error rates and performance degradation
3. **Historical Analysis**: Store test results for trend analysis
4. **Resource Monitoring**: Monitor system resources during tests

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Reduce worker memory limits or concurrent tests
2. **Connection Errors**: Check network connectivity and target server capacity
3. **Timeout Issues**: Increase timeout values or check server response times
4. **Queue Overflow**: Increase queue size or reduce test frequency

### Debug Logging

Enable debug logging for detailed troubleshooting:
```bash
DEBUG=loadforge:* npm start
```

### Performance Profiling

Use Node.js profiling tools to analyze performance:
```bash
node --prof --prof-process dist/index.js
```

## Integration

### WebSocket Integration

The engine integrates with WebSocket for real-time updates:

```typescript
// In TestRunService
this.loadTestEngine.on('test-metrics', (testRunId, metrics) => {
  // Emit to WebSocket clients
  io.to(`test-${testRunId}`).emit('metrics', metrics);
});
```

### Database Integration

Test results are automatically stored via TestRunService:

```typescript
// Automatic result storage
this.loadTestEngine.on('test-complete', async (testRunId, result) => {
  await this.updateTestRunStatus(testRunId, 'completed', {
    endTime: new Date(),
    metrics: result.metrics
  });
});
```

## Security Considerations

1. **Input Validation**: All inputs are validated before execution
2. **Resource Limits**: Memory and connection limits prevent resource exhaustion
3. **File Type Restrictions**: Only allowed MIME types can be uploaded
4. **Network Isolation**: Worker threads provide process isolation
5. **Timeout Protection**: Prevents runaway tests

## Future Enhancements

1. **Distributed Testing**: Multi-node load generation
2. **Custom Protocols**: Support for WebSocket, gRPC, etc.
3. **Advanced Metrics**: Custom metric collection and analysis
4. **Test Scheduling**: Cron-based test execution
5. **Result Comparison**: Historical test comparison and regression detection 