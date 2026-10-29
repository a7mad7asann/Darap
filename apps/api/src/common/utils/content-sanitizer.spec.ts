import { ContentSanitizer } from './content-sanitizer';

describe('ContentSanitizer — Server-Side XSS Protection', () => {
  it('should strip <script> tags and embedded executable scripts', () => {
    const malicious = 'شرح قانون الجاذبية <script>alert("XSS")</script> فيزياء نيوتن';
    const clean = ContentSanitizer.sanitize(malicious);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('alert');
    expect(clean).toBe('شرح قانون الجاذبية  فيزياء نيوتن');
  });

  it('should strip inline event handlers like onerror and onload', () => {
    const malicious = 'صورة توضيحية <img src="x" onerror="alert(\'attack\')" /> الدرس الأول';
    const clean = ContentSanitizer.sanitize(malicious);
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('alert');
  });

  it('should neutralize javascript: pseudo-protocols in links and markdown', () => {
    const maliciousHtml = '<a href="javascript:alert(1)">اضغط هنا للدرس</a>';
    const cleanHtml = ContentSanitizer.sanitize(maliciousHtml);
    expect(cleanHtml).not.toContain('javascript:alert(1)');

    const maliciousMd = '[رابط الدرس](javascript:stealCookies())';
    const cleanMd = ContentSanitizer.sanitize(maliciousMd);
    expect(cleanMd).not.toContain('javascript:');
    expect(cleanMd).toBe('رابط الدرس');
  });

  it('should strip <iframe>, <object>, and <embed> tags', () => {
    const malicious =
      'مقدمة <iframe src="https://evil.com"></iframe> <embed src="payload.swf" /> نهاية';
    const clean = ContentSanitizer.sanitize(malicious);
    expect(clean).not.toContain('<iframe');
    expect(clean).not.toContain('<embed');
    expect(clean).toBe('مقدمة   نهاية');
  });

  it('should preserve valid Arabic headings, markdown, and safe formatting', () => {
    const safeArabicLesson = `
# الوحدة الأولى: الكيمياء العضوية
## الدرس الأول: الهيدروكربونات المشبعة

- الألكانات ذات السلاسل المستقيمة
- الصيغة الجزيئية العامة: CnH2n+2

> ملاحظة هامة: يجب حفظ الصيغ البنائية الأولية.

[رابط مرجع الكيمياء](https://edu.darb.app/reference.pdf)
    `.trim();

    const clean = ContentSanitizer.sanitize(safeArabicLesson);
    expect(clean).toContain('# الوحدة الأولى: الكيمياء العضوية');
    expect(clean).toContain('- الألكانات ذات السلاسل المستقيمة');
    expect(clean).toContain('> ملاحظة هامة: يجب حفظ الصيغ البنائية الأولية.');
    expect(clean).toContain('[رابط مرجع الكيمياء](https://edu.darb.app/reference.pdf)');
  });
});
