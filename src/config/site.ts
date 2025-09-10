export const SITE_URL =
  (import.meta.env.VITE_PUBLIC_SITE_URL as string) ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080');
