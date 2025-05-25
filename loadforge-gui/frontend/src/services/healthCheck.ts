import api from './api';
import type { ApiResponse } from '@/types';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      name: string;
    };
    websocket: {
      status: 'active' | 'inactive';
      activeSubscriptions: string[];
    };
    loadEngine: {
      status: 'active' | 'inactive';
      stats?: Record<string, unknown>;
    };
  };
  memory: {
    used: number;
    total: number;
    external: number;
  };
}

export interface SystemMetrics {
  timestamp: string;
  loadEngine: Record<string, unknown>;
  websocket: {
    activeConnections: number;
    subscriptions: string[];
  };
  system: {
    uptime: number;
    memory: Record<string, unknown>;
    cpu: Record<string, unknown>;
  };
}

export interface SystemStatus {
  backend: 'connected' | 'disconnected';
  database: 'connected' | 'disconnected';
  websocket: 'connected' | 'disconnected';
  fileStorage: 'available' | 'unavailable';
}

class HealthCheckService {
  async getHealth(): Promise<HealthStatus> {
    try {
      const response = await api.get<ApiResponse<HealthStatus>>('/health');
      return response.data.data!;
    } catch {
      throw new Error('Failed to fetch health status');
    }
  }

  async getMetrics(): Promise<SystemMetrics> {
    try {
      const response = await api.get<ApiResponse<SystemMetrics>>('/metrics');
      return response.data.data!;
    } catch {
      throw new Error('Failed to fetch system metrics');
    }
  }

  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const health = await this.getHealth();
      
      return {
        backend: health.status === 'ok' ? 'connected' : 'disconnected',
        database: health.services.database.status,
        websocket: health.services.websocket.status === 'active' ? 'connected' : 'disconnected',
        fileStorage: health.services.database.status === 'connected' ? 'available' : 'unavailable',
      };
    } catch {
      return {
        backend: 'disconnected',
        database: 'disconnected',
        websocket: 'disconnected',
        fileStorage: 'unavailable',
      };
    }
  }

  async ping(): Promise<boolean> {
    try {
      await api.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

export const healthCheckService = new HealthCheckService();
export default healthCheckService; 