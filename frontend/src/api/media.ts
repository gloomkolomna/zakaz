const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function mediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE}${path}`;
}
