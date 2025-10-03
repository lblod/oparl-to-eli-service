import { Request } from 'express';

export function rewriteLinkWithProxy(
  originalUrl: string,
  req: Request,
): string {
  const protocol = req.protocol;
  const host = req.get('host');
  const proxyBaseUrl = `${protocol}://${host}`;
  try {
    const url = new URL(originalUrl);
    return proxyBaseUrl + url.pathname + url.search;
  } catch (error) {
    console.error('Invalid URL:', originalUrl);
    return originalUrl; // Fallback to the original URL if parsing fails
  }
}

export async function fetchJson(url) {
  const response = await fetch(url);
  console.log('Sent request:', url);
  if (!response.ok) throw new Error(`OParl request failed: ${response.status}`);

  return await response.json();
}
