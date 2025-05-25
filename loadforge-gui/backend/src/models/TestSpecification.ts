import mongoose, { Schema, Document } from 'mongoose';
import { LoadProfile } from '../types/index.js';

export interface TestSpecificationDocument extends Document {
  name: string;
  description?: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: Map<string, string>;
  queryParams?: Map<string, string>;
  body?: {
    type: 'raw' | 'file';
    content?: string;
    fileId?: string;
    fileName?: string;
  };
  loadProfile: LoadProfile;
}

const LoadProfileSchema = new Schema<LoadProfile>({
  type: {
    type: String,
    enum: ['custom', 'spike', 'step', 'soak'],
    required: true,
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
  },
  rampUp: {
    duration: {
      type: Number,
      min: 0,
    },
    startRate: {
      type: Number,
      min: 0,
    },
    endRate: {
      type: Number,
      min: 0,
    },
  },
  steadyState: {
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    requestsPerSecond: {
      type: Number,
      required: true,
      min: 0.1,
    },
  },
  rampDown: {
    duration: {
      type: Number,
      min: 0,
    },
    startRate: {
      type: Number,
      min: 0,
    },
    endRate: {
      type: Number,
      min: 0,
    },
  },
});

const TestSpecificationSchema = new Schema<TestSpecificationDocument>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  httpMethod: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    required: true,
  },
  url: {
    type: String,
    required: true,
    trim: true,
  },
  headers: {
    type: Map,
    of: String,
  },
  queryParams: {
    type: Map,
    of: String,
  },
  body: {
    type: {
      type: String,
      enum: ['raw', 'file'],
    },
    content: String,
    fileId: String,
    fileName: String,
  },
  loadProfile: {
    type: LoadProfileSchema,
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
TestSpecificationSchema.index({ name: 1 });
TestSpecificationSchema.index({ createdAt: -1 });

export const TestSpecificationModel = mongoose.model<TestSpecificationDocument>('TestSpecification', TestSpecificationSchema); 