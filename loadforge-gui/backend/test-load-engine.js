#!/usr/bin/env node

/**
 * LoadForge Core Load Engine Test Script
 * 
 * This script demonstrates the Core Load Engine functionality
 * and can be used to verify the implementation works correctly.
 */

import { LoadTestEngine } from './dist/services/LoadTestEngine.js';
import { LoadEngineConfigService } from './dist/services/LoadEngineConfig.js';

// Test configuration
const TEST_CONFIG = {
  // Test against a public HTTP testing service
  url: 'https://httpbin.org/delay/1',
  duration: 30, // 30 seconds
  requestsPerSecond: 5, // Low RPS for testing
};

async function runLoadEngineTest() {
  console.log('🚀 LoadForge Core Load Engine Test');
  console.log('=====================================\n');

  // Initialize configuration service
  const configService = LoadEngineConfigService.getInstance();
  console.log('📋 Engine Configuration:');
  console.log(JSON.stringify(configService.getConfig(), null, 2));
  console.log('\n');

  // Initialize load test engine
  const engine = new LoadTestEngine(1); // Single concurrent test for demo
  
  // Set up event listeners
  engine.on('test-started', (testRunId, data) => {
    console.log(`✅ Test Started: ${testRunId}`);
    console.log(`   URL: ${data.specification.url}`);
    console.log(`   Estimated Duration: ${data.estimatedDuration}s`);
    console.log(`   Start Time: ${data.startTime.toISOString()}\n`);
  });

  engine.on('test-progress', (testRunId, progress) => {
    const progressBar = '█'.repeat(Math.floor((progress.progress || 0) / 5)) + 
                       '░'.repeat(20 - Math.floor((progress.progress || 0) / 5));
    console.log(`📊 Progress [${progressBar}] ${progress.progress || 0}% - ${progress.message}`);
    
    if (progress.phase) {
      console.log(`   Phase: ${progress.phase} (${progress.currentPhase}/${progress.totalPhases})`);
    }
  });

  engine.on('test-metrics', (testRunId, metrics) => {
    if (metrics.currentRps) {
      console.log(`📈 Metrics: ${metrics.currentRps.toFixed(1)} RPS, ` +
                 `${metrics.responseTime?.toFixed(0)}ms avg response time, ` +
                 `${metrics.responseCount} requests, ${metrics.errorCount} errors`);
    }
  });

  engine.on('test-complete', (testRunId, result) => {
    console.log(`\n🎉 Test Completed: ${testRunId}`);
    console.log('📊 Final Results:');
    console.log(`   Total Requests: ${result.totalRequests}`);
    console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);
    console.log(`   Success Rate: ${((result.metrics.successfulRequests / result.metrics.totalRequests) * 100).toFixed(1)}%`);
    console.log(`   Average Response Time: ${result.metrics.averageResponseTime.toFixed(0)}ms`);
    console.log(`   Requests/Second: ${result.metrics.requestsPerSecond.toFixed(1)}`);
    console.log(`   Error Rate: ${result.metrics.errorRate.toFixed(1)}%`);
    console.log('\n📈 Response Time Percentiles:');
    console.log(`   P50: ${result.metrics.responseTimePercentiles.p50.toFixed(0)}ms`);
    console.log(`   P90: ${result.metrics.responseTimePercentiles.p90.toFixed(0)}ms`);
    console.log(`   P95: ${result.metrics.responseTimePercentiles.p95.toFixed(0)}ms`);
    console.log(`   P99: ${result.metrics.responseTimePercentiles.p99.toFixed(0)}ms`);
    console.log('\n🔢 Status Codes:');
    Object.entries(result.metrics.statusCodes).forEach(([code, count]) => {
      if (count > 0) {
        console.log(`   ${code}: ${count}`);
      }
    });
  });

  engine.on('test-error', (testRunId, error, data) => {
    console.error(`❌ Test Error: ${testRunId}`);
    console.error(`   Error: ${error}`);
    if (data?.phase) {
      console.error(`   Phase: ${data.phase}`);
    }
  });

  engine.on('test-queued', (testRunId, queueInfo) => {
    console.log(`⏳ Test Queued: ${testRunId}`);
    console.log(`   Queue Position: ${queueInfo.queuePosition}`);
    console.log(`   Estimated Wait Time: ${queueInfo.estimatedWaitTime}s`);
  });

  // Create test specification
  const testSpec = {
    name: 'Core Load Engine Test',
    description: 'Testing the LoadForge Core Load Engine implementation',
    url: TEST_CONFIG.url,
    httpMethod: 'GET',
    headers: {
      'User-Agent': 'LoadForge-Core-Engine-Test/1.0',
      'Accept': 'application/json'
    },
    loadProfile: {
      type: 'custom',
      duration: TEST_CONFIG.duration,
      steadyState: {
        duration: TEST_CONFIG.duration,
        requestsPerSecond: TEST_CONFIG.requestsPerSecond
      }
    }
  };

  try {
    // Start the test
    console.log('🎯 Starting Load Test...\n');
    await engine.startTest({
      specification: testSpec,
      testRunId: `test-${Date.now()}`
    });

    // Wait for test completion
    await new Promise((resolve) => {
      engine.once('test-complete', resolve);
      engine.once('test-error', resolve);
    });

    // Show engine statistics
    console.log('\n📊 Engine Statistics:');
    const stats = engine.getStats();
    console.log(`   Active Tests: ${stats.activeTests}`);
    console.log(`   Queued Tests: ${stats.queuedTests}`);
    console.log(`   Total Capacity: ${stats.totalCapacity}`);
    console.log(`   Engine Uptime: ${stats.uptime.toFixed(1)}s`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Shutting down engine...');
    await engine.shutdown();
    console.log('✅ Engine shutdown complete');
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  runLoadEngineTest().catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
} 