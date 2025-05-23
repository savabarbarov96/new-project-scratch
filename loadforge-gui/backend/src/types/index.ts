export interface TestSpecification {
  _id?: string;
  name: string;
  description?: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: {
    type: 'raw' | 'file';
    content?: string;
    fileId?: string;
    fileName?: string;
  };
  loadProfile: LoadProfile;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LoadProfile {
  type: 'custom' | 'spike' | 'step' | 'soak';
  duration: number; // Total duration in seconds
  rampUp?: {
    duration: number; // Ramp-up duration in seconds
    startRate: number; // Starting requests per second
    endRate: number; // Ending requests per second
  };
  steadyState: {
    duration: number; // Steady state duration in seconds
    requestsPerSecond: number;
  };
  rampDown?: {
    duration: number; // Ramp-down duration in seconds
    startRate: number; // Starting requests per second
    endRate: number; // Ending requests per second
  };
}

export interface TestRun {
  _id?: string;
  specId: string;
  specName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  duration?: number; // Duration in milliseconds
  metrics?: TestMetrics;
  logs?: TestLog[];
  error?: string;
  createdAt?: Date;
}

export interface TestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number; // in milliseconds
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number; // percentage
  throughput: number; // bytes per second
  statusCodes: Record<string, number>;
  responseTimePercentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface TestLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export interface ScheduledTest {
  _id?: string;
  specId: string;
  specName: string;
  cronExpression: string;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FileAttachment {
  _id?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadDate: Date;
  specId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WebSocketMessage {
  type: 'test-status' | 'test-metrics' | 'test-log' | 'test-complete';
  testId: string;
  data: any;
  timestamp: Date;
} 