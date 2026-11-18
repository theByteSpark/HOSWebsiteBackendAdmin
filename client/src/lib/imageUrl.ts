/**
 * Derives the server-generated thumbnail URL for an uploaded image.
 *
 * Backend convention (media.controller.ts): every raster upload gets a
 * sibling file named `<stem>-thumb.webp` in the same /uploads/<folder>/ dir.
 *
 * Returns null when the URL doesn't look like one of our uploads
 * (external URLs, svg, video) — caller should fall back to the original.
 */
export function thumbnailFor(url?: string | null): string | null {
  if (!url || !url.includes('/uploads/')) return null;
  const dot = url.lastIndexOf('.');
  const slash = url.lastIndexOf('/');
  if (dot <= slash) return null;
  const ext = url.slice(dot + 1).toLowerCase();
  // thumbs are only generated for these types
  if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return null;
  return `${url.slice(0, dot)}-thumb.webp`;
}
