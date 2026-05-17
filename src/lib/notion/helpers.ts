export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

/**
 * Validates a URL against an allowlist of safe protocols. Returns the URL
 * unchanged when safe, otherwise returns the fallback. Prevents XSS via
 * `javascript:`, `data:`, etc. in user-controlled href/src attributes.
 */
const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export function safeUrl(url: string | null | undefined, fallback = "#"): string {
  if (!url) return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  // Relative URLs (path, hash, query) are safe
  if (/^[/?#]/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (SAFE_PROTOCOLS.has(parsed.protocol)) return trimmed;
  } catch {
    // Not a parseable URL — reject
  }
  return fallback;
}

export function plainText(items: any[] = []): string {
  return items.map((i: any) => i.plain_text ?? "").join("");
}

/**
 * Drop cap heuristic: only render when the opening paragraph has
 * enough body to contain the floated cap (~2 reading lines).
 */
export function firstParagraphLength(html: string): number {
  if (!html) return 0;
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  if (!match) return 0;
  return match[1].replace(/<[^>]+>/g, "").trim().length;
}
