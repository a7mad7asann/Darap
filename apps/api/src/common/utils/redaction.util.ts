import { v4 as uuidv4 } from 'uuid';

/**
 * Sanitizes an incoming X-Request-Id header.
 * Allows alphanumeric, hyphens, and underscores up to 64 chars.
 * If invalid or absent, generates a fresh UUIDv4.
 */
export function sanitizeRequestId(rawHeader?: unknown): string {
  if (typeof rawHeader === 'string') {
    const trimmed = rawHeader.trim();
    if (trimmed.length > 0 && trimmed.length <= 64 && /^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
      return trimmed;
    }
  }
  return uuidv4();
}

/**
 * Normalizes an HTTP URL path into a safe route template.
 * Replaces UUIDs, numeric IDs, join codes, and high-entropy tokens
 * to prevent metric cardinality explosion and avoid leaking sensitive tokens.
 */
export function normalizeRouteTemplate(rawPath: string): string {
  if (!rawPath) return '/';

  // Strip query string and fragment
  let p = rawPath.split('?')[0].split('#')[0];

  // Replace standard UUIDs (8-4-4-4-12 hex) with :id
  p = p.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');

  // Replace long hex/base64/alphanumeric tokens or upload tickets (20+ characters)
  p = p.replace(/\/[a-zA-Z0-9_-]{20,}(\/|$)/g, '/:token$1');

  // Replace numeric IDs (e.g. /123/ or /123)
  p = p.replace(/\/\d+(\/|$)/g, '/:id$1');

  // Collapse consecutive slashes
  p = p.replace(/\/{2,}/g, '/');

  // Remove trailing slash if longer than root
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /pass/i,
  /secret/i,
  /token/i,
  /key/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /credentials/i,
  /database_url/i,
  /databaseurl/i,
  /signature/i,
  /uploadticket/i,
  /downloadticket/i,
];

/**
 * Redacts secrets, connection strings, auth headers, and signed URL tokens in strings.
 */
export function redactString(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return (
    text
      // Redact Bearer tokens: Bearer <token>
      .replace(/(Bearer\s+)[A-Za-z0-9_\-\.]+/gi, '$1[REDACTED]')
      // Redact Basic auth: Basic <base64>
      .replace(/(Basic\s+)[A-Za-z0-9+/=]+/gi, '$1[REDACTED]')
      // Redact PostgreSQL / DB connection strings with credentials
      .replace(/(postgres(ql)?:\/\/[^:]+:)[^@]+(@)/gi, '$1[REDACTED]$3')
      // Redact signed URL query parameters: ticket=..., X-Amz-Signature=..., signature=..., token=...
      .replace(
        /((?:ticket|signature|token|access_token|X-Amz-Signature|X-Amz-Credential)=)[^&\s"']+/gi,
        '$1[REDACTED]',
      )
  );
}

/**
 * Deeply redacts sensitive keys and values from objects, arrays, and primitives.
 */
export function redactSensitiveData<T = any>(value: T, depth = 0): T {
  if (depth > 10 || value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return redactString(value) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, depth + 1)) as unknown as T;
  }

  if (typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(k));
      if (isSensitiveKey) {
        result[k] = '[REDACTED]';
      } else {
        result[k] = redactSensitiveData(v, depth + 1);
      }
    }
    return result as unknown as T;
  }

  return value;
}
