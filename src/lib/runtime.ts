/**
 * Detects whether the application is running on static GitHub Pages hosting
 * where no Express / WebSocket backend (/api/*, /ws/*) is available.
 */
export function isStaticGitHubPagesHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'github.io' || host.endsWith('.github.io');
}
