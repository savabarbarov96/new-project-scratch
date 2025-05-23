import mongoose, { Schema, Document } from 'mongoose';
import { TestRun, TestMetrics, TestLog } from '../types/index.js';

export interface TestRunDocument extends Omit<TestRun, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const TestLogSchema = new Schema<TestLog>({
  timestamp: { type: Date, required: true },
  level: { type: String, enum: ['info', 'warn', 'error'], required: true },
  message: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
});

const TestMetricsSchema = new Schema<TestMetrics>({
  totalRequests: { type: Number, required: true },
  successfulRequests: { type: Number, required: true },
  failedRequests: { type: Number, required: true },
  averageResponseTime: { type: Number, required: true },
  minResponseTime: { type: Number, required: true },
  maxResponseTime: { type: Number, required: true },
  requestsPerSecond: { type: Number, required: true },
  errorRate: { type: Number, required: true },
  throughput: { type: Number, required: true },
  statusCodes: {
    type: Map,
    of: Number,
    required: true,
  },
  responseTimePercentiles: {
    p50: { type: Number, required: true },
    p90: { type: Number, required: true },
    p95: { type: Number, required: true },
    p99: { type: Number, required: true },
  },
});

const TestRunSchema = new Schema<TestRunDocument>({
  specId: { type: String, required: true, index: true },
  specName: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    required: true,
    default: 'pending',
  },
  startTime: { type: Date },
  endTime: { type: Date },
  duration: { type: Number }, // Duration in milliseconds
  metrics: { type: TestMetricsSchema },
  logs: [TestLogSchema],
  error: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Indexes for performance
TestRunSchema.index({ createdAt: -1 });
TestRunSchema.index({ status: 1 });
TestRunSchema.index({ specId: 1, createdAt: -1 });

export const TestRunModel = mongoose.model<TestRunDocument>('TestRun', TestRunSchema); 