declare module 'autocannon' {
  interface AutocannonOptions {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string | Buffer;
    connections?: number;
    duration?: number;
    amount?: number;
    pipelining?: number;
    timeout?: number;
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

  interface AutocannonInstance {
    on(event: 'response', callback: (client: any, statusCode: number, resBytes: number, responseTime: number) => void): void;
    on(event: 'reqError', callback: (error: Error) => void): void;
    stop(): void;
  }

  function autocannon(
    options: AutocannonOptions,
    callback?: (err: Error | null, result: AutocannonResult) => void
  ): AutocannonInstance;

  export = autocannon;
} 