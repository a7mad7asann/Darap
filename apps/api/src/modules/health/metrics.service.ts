import { Injectable } from '@nestjs/common';

export interface RouteMetricSummary {
  method: string;
  route: string;
  count: number;
  avgDurationMs: number;
  maxDurationMs: number;
}

export interface MetricsSnapshot {
  service: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  memory: {
    rssBytes: number;
    heapTotalBytes: number;
    heapUsedBytes: number;
    externalBytes: number;
  };
  http: {
    totalRequests: number;
    totalErrors: number;
    byStatusClass: {
      '2xx': number;
      '3xx': number;
      '4xx': number;
      '5xx': number;
    };
    routes: RouteMetricSummary[];
  };
}

@Injectable()
export class MetricsService {
  private totalRequests = 0;
  private totalErrors = 0;
  private statusClasses = {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
  };

  // Map key: `${method}:${safeRoute}:${status}`
  private requestCounts = new Map<string, number>();

  // Map key: `${method}:${safeRoute}`
  private requestDurations = new Map<
    string,
    { count: number; totalDurationMs: number; maxDurationMs: number }
  >();

  recordHttpRequest(
    method: string,
    safeRoute: string,
    statusCode: number,
    durationMs: number,
  ): void {
    this.totalRequests++;

    const statusClass =
      statusCode >= 500 ? '5xx' : statusCode >= 400 ? '4xx' : statusCode >= 300 ? '3xx' : '2xx';

    this.statusClasses[statusClass]++;
    if (statusCode >= 400) {
      this.totalErrors++;
    }

    // Update count by method|route|status
    const countKey = `${method.toUpperCase()}|${safeRoute}|${statusCode}`;
    this.requestCounts.set(countKey, (this.requestCounts.get(countKey) || 0) + 1);

    // Update durations by method|route
    const durationKey = `${method.toUpperCase()}|${safeRoute}`;
    const existingDuration = this.requestDurations.get(durationKey) || {
      count: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
    };
    existingDuration.count++;
    existingDuration.totalDurationMs += durationMs;
    if (durationMs > existingDuration.maxDurationMs) {
      existingDuration.maxDurationMs = durationMs;
    }
    this.requestDurations.set(durationKey, existingDuration);
  }

  getMetricsSnapshot(): MetricsSnapshot {
    const memory = process.memoryUsage();
    const routes: RouteMetricSummary[] = [];

    for (const [key, val] of this.requestDurations.entries()) {
      const [method, route] = key.split('|');
      routes.push({
        method,
        route,
        count: val.count,
        avgDurationMs:
          val.count > 0 ? Math.round((val.totalDurationMs / val.count) * 100) / 100 : 0,
        maxDurationMs: val.maxDurationMs,
      });
    }

    return {
      service: 'darb-api',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.round(process.uptime() * 100) / 100,
      timestamp: new Date().toISOString(),
      memory: {
        rssBytes: memory.rss,
        heapTotalBytes: memory.heapTotal,
        heapUsedBytes: memory.heapUsed,
        externalBytes: memory.external,
      },
      http: {
        totalRequests: this.totalRequests,
        totalErrors: this.totalErrors,
        byStatusClass: { ...this.statusClasses },
        routes,
      },
    };
  }

  toPrometheusFormat(): string {
    const memory = process.memoryUsage();
    const lines: string[] = [];

    lines.push('# HELP darb_process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE darb_process_uptime_seconds gauge');
    lines.push(`darb_process_uptime_seconds ${process.uptime().toFixed(2)}`);
    lines.push('');

    lines.push('# HELP darb_process_memory_bytes Process memory usage in bytes');
    lines.push('# TYPE darb_process_memory_bytes gauge');
    lines.push(`darb_process_memory_bytes{type="rss"} ${memory.rss}`);
    lines.push(`darb_process_memory_bytes{type="heapTotal"} ${memory.heapTotal}`);
    lines.push(`darb_process_memory_bytes{type="heapUsed"} ${memory.heapUsed}`);
    lines.push(`darb_process_memory_bytes{type="external"} ${memory.external}`);
    lines.push('');

    lines.push('# HELP darb_http_requests_total Total number of HTTP requests processed');
    lines.push('# TYPE darb_http_requests_total counter');
    if (this.requestCounts.size === 0) {
      lines.push('darb_http_requests_total 0');
    } else {
      for (const [key, count] of this.requestCounts.entries()) {
        const [method, route, status] = key.split('|');
        lines.push(
          `darb_http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`,
        );
      }
    }
    lines.push('');

    lines.push(
      '# HELP darb_http_request_duration_ms Summary of HTTP request durations in milliseconds',
    );
    lines.push('# TYPE darb_http_request_duration_ms summary');
    for (const [key, val] of this.requestDurations.entries()) {
      const [method, route] = key.split('|');
      const avg = val.count > 0 ? (val.totalDurationMs / val.count).toFixed(2) : '0';
      lines.push(
        `darb_http_request_duration_ms{method="${method}",route="${route}",quantile="avg"} ${avg}`,
      );
      lines.push(
        `darb_http_request_duration_ms{method="${method}",route="${route}",quantile="max"} ${val.maxDurationMs}`,
      );
    }
    lines.push('');

    lines.push('# HELP darb_http_errors_total Total number of HTTP errors');
    lines.push('# TYPE darb_http_errors_total counter');
    lines.push(`darb_http_errors_total{status_class="4xx"} ${this.statusClasses['4xx']}`);
    lines.push(`darb_http_errors_total{status_class="5xx"} ${this.statusClasses['5xx']}`);
    lines.push('');

    return lines.join('\n');
  }

  reset(): void {
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.statusClasses = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    this.requestCounts.clear();
    this.requestDurations.clear();
  }
}
