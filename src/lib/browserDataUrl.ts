export function buildTextDataUrl(content: string, mimeType: string): string {
  return `data:${mimeType},${encodeURIComponent(content)}`;
}
