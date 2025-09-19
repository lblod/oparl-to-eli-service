export function rewriteLinkWithProxy(originalUrl: string, req: any): string {
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
