export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_AVATAR_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isAllowedAvatarContentType(contentType: string): boolean {
  return ALLOWED_AVATAR_CONTENT_TYPES.has(contentType.toLowerCase());
}

export interface VerifiedAvatarImage {
  buffer: Buffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
}

function detectedAvatarContentType(
  buffer: Buffer,
): VerifiedAvatarImage["contentType"] | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).equals(Buffer.from("RIFF")) &&
    buffer.subarray(8, 12).equals(Buffer.from("WEBP"))
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Reads and verifies an uploaded avatar without trusting its declared MIME
 * type. The upload URL is generic, so this check is required before an object
 * can be attached to a public profile or sent to an anonymous visitor.
 */
export async function verifyAvatarImage(
  response: Response,
): Promise<VerifiedAvatarImage | null> {
  if (!response.ok || !response.body) {
    return null;
  }

  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_AVATAR_SIZE_BYTES) {
    return null;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalSize = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalSize += value.byteLength;
      if (totalSize > MAX_AVATAR_SIZE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  const buffer = Buffer.concat(chunks);
  const contentType = detectedAvatarContentType(buffer);
  return contentType ? { buffer, contentType } : null;
}