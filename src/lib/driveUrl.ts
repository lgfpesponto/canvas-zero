/**
 * Helpers para lidar com URLs do Google Drive.
 * O QR do PDF codifica o mesmo link salvo em order.fotos[],
 * geralmente no formato https://drive.google.com/file/d/{ID}/view.
 */

export function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function isDriveUrl(url: string): boolean {
  return /drive\.google\.com/i.test(url);
}

export function getDriveFileId(url: string): string | null {
  if (!url) return null;
  const m =
    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? null;
}

/** URL utilizável diretamente em <img src>. */
export function toDriveImageUrl(url: string): string | null {
  const id = getDriveFileId(url);
  return id ? `https://lh3.googleusercontent.com/d/${id}` : null;
}

/** URL utilizável em <iframe> (cobre PDFs e imagens privadas). */
export function toDrivePreviewUrl(url: string): string | null {
  const id = getDriveFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}
