/**
 * Resolves root-relative public asset paths (e.g. "/images/restaurant/foo.jpg")
 * against Vite's configured BASE_URL so assets load both at "/" (dev & Express)
 * and at subpath hosts like GitHub Pages ("https://user.github.io/repo/").
 */
export function resolvePublicAssetUrl(url?: string | null): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  const base = import.meta.env?.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  if (url.startsWith('/')) {
    return `${normalizedBase}${url.slice(1)}`;
  }
  return `${normalizedBase}${url}`;
}
