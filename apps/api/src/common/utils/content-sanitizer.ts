/**
 * DARB Server-Side Content Sanitizer
 * Protects against Stored and Reflected Cross-Site Scripting (XSS) in educational
 * lesson content, titles, and descriptions while preserving Arabic RTL typography,
 * markdown structural syntax, and safe educational formatting.
 */
export class ContentSanitizer {
  // Strip entire script, style, and object blocks including content
  private static readonly BLOCKS_WITH_CONTENT_REGEX =
    /<(script|style|object|embed|iframe|applet)\b[^>]*>([\s\S]*?)<\/\1>/gi;

  // Dangerous standalone/self-closing HTML tags to strip
  private static readonly DANGEROUS_TAGS_REGEX =
    /<\s*\/?\s*(script|iframe|object|embed|applet|style|meta|link|form|input|button|svg|math|base|frame|frameset)[^>]*>/gi;

  // Inline JavaScript event handlers: onerror=, onload=, onclick=, etc.
  private static readonly EVENT_HANDLERS_REGEX = /\b(on\w+)\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi;

  // Pseudo-protocol URLs in HTML attributes: href="javascript:..."
  private static readonly JAVASCRIPT_PROTOCOL_REGEX =
    /(href|src)\s*=\s*(['"])\s*(javascript:|vbscript:|data:\s*text\/html)/gi;

  // Markdown link protocol injection: [text](javascript:alert(1))
  private static readonly MARKDOWN_JS_LINK_REGEX =
    /\[([^\]]+)\]\(\s*(?:javascript|vbscript|data):[^\n\r]*\)/gi;

  /**
   * Sanitizes rich educational text content.
   * Strips dangerous executable code, event handlers, and protocol exploits.
   */
  static sanitize(rawContent?: string | null): string {
    if (!rawContent || typeof rawContent !== 'string') {
      return '';
    }

    let sanitized = rawContent;

    // 1. Remove script/style/iframe blocks including internal code
    sanitized = sanitized.replace(this.BLOCKS_WITH_CONTENT_REGEX, '');

    // 2. Remove any remaining dangerous tags
    sanitized = sanitized.replace(this.DANGEROUS_TAGS_REGEX, '');

    // 3. Remove inline event handlers (onerror, onload, onclick, etc.)
    sanitized = sanitized.replace(this.EVENT_HANDLERS_REGEX, '');

    // 4. Neutralize javascript: & vbscript: in HTML attributes
    sanitized = sanitized.replace(this.JAVASCRIPT_PROTOCOL_REGEX, '$1=$2#blocked-protocol');

    // 5. Neutralize javascript: in markdown links: [Click](javascript:...)
    sanitized = sanitized.replace(this.MARKDOWN_JS_LINK_REGEX, '$1');

    // 6. Clean up any trailing broken angle brackets or script injection remnants
    sanitized = sanitized.replace(/<\s*script/gi, '').replace(/javascript\s*:/gi, 'blocked:');

    return sanitized.trim();
  }
}
