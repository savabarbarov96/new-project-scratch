import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

// Forward declaration for TestRunService to avoid circular dependency
let testRunService: any = null;

export interface RequestLog {
  testRunId: string;
  timestamp: Date;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  bytes: number;
  phase: string;
  error?: string;
}

export interface TestMetrics {
  testRunId: string;
  timestamp: Date;
  phase: string;
  responseCount: number;
  errorCount: number;
  currentRps: number;
  averageResponseTime: number;
  statusCodes: Record<string, number>;
}

export interface TestProgress {
  testRunId: string;
  timestamp: Date;
  status: string;
  message: string;
  phase?: string;
  currentPhase?: number;
  totalPhases?: number;
  progress?: number;
  errorCount?: number;
}

export interface SystemEvent {
  type: 'spec-created' | 'spec-updated' | 'spec-deleted' | 'test-started' | 'test-completed' | 'test-failed' | 'system-info' | 'error';
  timestamp: Date;
  message: string;
  data?: any;
  level: 'info' | 'warn' | 'error' | 'success';
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedClients: Map<string, Set<string>> = new Map(); // testRunId -> Set of socketIds

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173'
        ],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
  }

  /**
   * Set TestRunService for handling stop requests
   */
  setTestRunService(service: any): void {
    testRunService = service;
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`WebSocket client connected: ${socket.id}`);

      // Handle client subscribing to test updates
      socket.on('subscribe-test', (testRunId: string) => {
        console.log(`Client ${socket.id} subscribing to test ${testRunId}`);
        socket.join(`test-${testRunId}`);
        
        // Track client subscription
        if (!this.connectedClients.has(testRunId)) {
          this.connectedClients.set(testRunId, new Set());
        }
        this.connectedClients.get(testRunId)!.add(socket.id);
        
        // Emit subscription confirmation
        this.emitSystemEvent({
          type: 'system-info',
          timestamp: new Date(),
          message: `Client subscribed to test ${testRunId} updates`,
          data: { testRunId, socketId: socket.id },
          level: 'info'
        });
      });

      // Handle client unsubscribing from test updates
      socket.on('unsubscribe-test', (testRunId: string) => {
        console.log(`Client ${socket.id} unsubscribing from test ${testRunId}`);
        socket.leave(`test-${testRunId}`);
        
        // Remove client from tracking
        const clients = this.connectedClients.get(testRunId);
        if (clients) {
          clients.delete(socket.id);
          if (clients.size === 0) {
            this.connectedClients.delete(testRunId);
          }
        }
      });

      // Handle client requesting to stop a test
      socket.on('stop-test', async (testRunId: string) => {
        console.log(`Client ${socket.id} requesting to stop test ${testRunId}`);
        
        // Emit to all clients that a stop was requested
        this.io.to(`test-${testRunId}`).emit('test-stop-requested', { testRunId });
        
        // Emit system event
        this.emitSystemEvent({
          type: 'system-info',
          timestamp: new Date(),
          message: `Stop request received for test ${testRunId}`,
          data: { testRunId, requestedBy: socket.id },
          level: 'warn'
        });
        
        // Actually stop the test if TestRunService is available
        if (testRunService) {
          try {
            const stopped = await testRunService.stopTestRun(testRunId);
            if (stopped) {
              this.emitSystemEvent({
                type: 'system-info',
                timestamp: new Date(),
                message: `Test ${testRunId} stop request processed successfully`,
                data: { testRunId },
                level: 'success'
              });
            } else {
              this.emitSystemEvent({
                type: 'error',
                timestamp: new Date(),
                message: `Failed to stop test ${testRunId} - test may not be running`,
                data: { testRunId },
                level: 'error'
              });
            }
          } catch (error) {
            console.error(`Error stopping test ${testRunId}:`, error);
            this.emitSystemEvent({
              type: 'error',
              timestamp: new Date(),
              message: `Error stopping test ${testRunId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              data: { testRunId, error },
              level: 'error'
            });
          }
        } else {
          console.warn('TestRunService not available for stop request');
          this.emitSystemEvent({
            type: 'error',
            timestamp: new Date(),
            message: `Cannot stop test ${testRunId} - service not available`,
            data: { testRunId },
            level: 'error'
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`WebSocket client disconnected: ${socket.id}`);
        
        // Remove client from all test subscriptions
        for (const [testRunId, clients] of this.connectedClients.entries()) {
          clients.delete(socket.id);
          if (clients.size === 0) {
            this.connectedClients.delete(testRunId);
          }
        }
      });
    });
  }

  /**
   * Emit real-time request log to subscribed clients
   */
  emitRequestLog(log: RequestLog): void {
    const subscribedClients = this.connectedClients.get(log.testRunId)?.size || 0;
    console.log(`📡 Emitting request-log to ${subscribedClients} subscribed clients for test ${log.testRunId}:`, {
      method: log.method,
      url: log.url,
      statusCode: log.statusCode,
      responseTime: log.responseTime
    });
    
    this.io.to(`test-${log.testRunId}`).emit('request-log', log);
  }

  /**
   * Emit real-time metrics to subscribed clients
   */
  emitTestMetrics(metrics: TestMetrics): void {
    this.io.to(`test-${metrics.testRunId}`).emit('test-metrics', metrics);
  }

  /**
   * Emit test progress updates to subscribed clients
   */
  emitTestProgress(progress: TestProgress): void {
    this.io.to(`test-${progress.testRunId}`).emit('test-progress', progress);
  }

  /**
   * Emit test status changes to subscribed clients
   */
  emitTestStatus(testRunId: string, status: string, data?: any): void {
    this.io.to(`test-${testRunId}`).emit('test-status', {
      testRunId,
      status,
      timestamp: new Date(),
      ...data
    });
  }

  /**
   * Emit test completion to subscribed clients
   */
  emitTestComplete(testRunId: string, result: any): void {
    this.io.to(`test-${testRunId}`).emit('test-complete', {
      testRunId,
      result,
      timestamp: new Date()
    });
  }

  /**
   * Emit test error to subscribed clients
   */
  emitTestError(testRunId: string, error: string): void {
    this.io.to(`test-${testRunId}`).emit('test-error', {
      testRunId,
      error,
      timestamp: new Date()
    });
    
    // Also emit as system event
    this.emitSystemEvent({
      type: 'test-failed',
      timestamp: new Date(),
      message: `Test ${testRunId} failed: ${error}`,
      data: { testRunId, error },
      level: 'error'
    });
  }

  /**
   * Emit system events for comprehensive logging
   */
  emitSystemEvent(event: SystemEvent): void {
    this.io.emit('system-event', event);
  }

  /**
   * Emit spec creation event
   */
  emitSpecCreated(specId: string, specName: string): void {
    this.emitSystemEvent({
      type: 'spec-created',
      timestamp: new Date(),
      message: `Test specification "${specName}" created successfully`,
      data: { specId, specName },
      level: 'success'
    });
  }

  /**
   * Emit spec update event
   */
  emitSpecUpdated(specId: string, specName: string): void {
    this.emitSystemEvent({
      type: 'spec-updated',
      timestamp: new Date(),
      message: `Test specification "${specName}" updated successfully`,
      data: { specId, specName },
      level: 'info'
    });
  }

  /**
   * Emit spec deletion event
   */
  emitSpecDeleted(specId: string, specName: string): void {
    this.emitSystemEvent({
      type: 'spec-deleted',
      timestamp: new Date(),
      message: `Test specification "${specName}" deleted`,
      data: { specId, specName },
      level: 'warn'
    });
  }

  /**
   * Emit test start event
   */
  emitTestStarted(testRunId: string, specName: string): void {
    this.emitSystemEvent({
      type: 'test-started',
      timestamp: new Date(),
      message: `Load test started for "${specName}"`,
      data: { testRunId, specName },
      level: 'info'
    });
  }

  /**
   * Emit test completion event
   */
  emitTestCompleted(testRunId: string, specName: string, metrics?: any): void {
    this.emitSystemEvent({
      type: 'test-completed',
      timestamp: new Date(),
      message: `Load test completed for "${specName}"`,
      data: { testRunId, specName, metrics },
      level: 'success'
    });
  }

  /**
   * Emit system information event
   */
  emitSystemInfo(message: string, data?: any): void {
    this.emitSystemEvent({
      type: 'system-info',
      timestamp: new Date(),
      message,
      data,
      level: 'info'
    });
  }

  /**
   * Emit error event
   */
  emitError(message: string, error?: any): void {
    this.emitSystemEvent({
      type: 'error',
      timestamp: new Date(),
      message,
      data: error,
      level: 'error'
    });
  }

  /**
   * Get number of clients subscribed to a test
   */
  getSubscribedClientCount(testRunId: string): number {
    return this.connectedClients.get(testRunId)?.size || 0;
  }

  /**
   * Get all active test subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.connectedClients.keys());
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    this.io.close();
  }
} 