import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
    service.reset();
  });

  it('tracks requests, status classes, and error counts accurately', () => {
    service.recordHttpRequest('GET', '/api/v1/health/live', 200, 5);
    service.recordHttpRequest('GET', '/api/v1/health/live', 200, 15);
    service.recordHttpRequest('POST', '/api/v1/courses', 201, 50);
    service.recordHttpRequest('GET', '/api/v1/courses/:id', 404, 8);
    service.recordHttpRequest('POST', '/api/v1/files/presign-upload', 500, 25);

    const snapshot = service.getMetricsSnapshot();

    expect(snapshot.service).toBe('darb-api');
    expect(snapshot.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(snapshot.memory.rssBytes).toBeGreaterThan(0);
    expect(snapshot.http.totalRequests).toBe(5);
    expect(snapshot.http.totalErrors).toBe(2); // 404 + 500

    expect(snapshot.http.byStatusClass['2xx']).toBe(3);
    expect(snapshot.http.byStatusClass['4xx']).toBe(1);
    expect(snapshot.http.byStatusClass['5xx']).toBe(1);

    const liveRoute = snapshot.http.routes.find((r) => r.route === '/api/v1/health/live');
    expect(liveRoute).toBeDefined();
    expect(liveRoute?.count).toBe(2);
    expect(liveRoute?.avgDurationMs).toBe(10);
    expect(liveRoute?.maxDurationMs).toBe(15);
  });

  it('renders standard Prometheus text format correctly', () => {
    service.recordHttpRequest('GET', '/api/v1/health/live', 200, 5);
    service.recordHttpRequest('POST', '/api/v1/auth/login', 401, 20);

    const prom = service.toPrometheusFormat();

    expect(prom).toContain('# HELP darb_process_uptime_seconds Process uptime in seconds');
    expect(prom).toContain('# TYPE darb_process_uptime_seconds gauge');
    expect(prom).toContain('darb_process_uptime_seconds');

    expect(prom).toContain('# HELP darb_process_memory_bytes Process memory usage in bytes');
    expect(prom).toContain('darb_process_memory_bytes{type="rss"}');

    expect(prom).toContain(
      '# HELP darb_http_requests_total Total number of HTTP requests processed',
    );
    expect(prom).toContain(
      'darb_http_requests_total{method="GET",route="/api/v1/health/live",status="200"} 1',
    );
    expect(prom).toContain(
      'darb_http_requests_total{method="POST",route="/api/v1/auth/login",status="401"} 1',
    );

    expect(prom).toContain('# HELP darb_http_errors_total Total number of HTTP errors');
    expect(prom).toContain('darb_http_errors_total{status_class="4xx"} 1');
    expect(prom).toContain('darb_http_errors_total{status_class="5xx"} 0');
  });

  it('resets counters cleanly', () => {
    service.recordHttpRequest('GET', '/api/v1/health/live', 200, 5);
    expect(service.getMetricsSnapshot().http.totalRequests).toBe(1);

    service.reset();
    expect(service.getMetricsSnapshot().http.totalRequests).toBe(0);
    expect(service.getMetricsSnapshot().http.totalErrors).toBe(0);
    expect(service.getMetricsSnapshot().http.routes).toHaveLength(0);
  });
});
