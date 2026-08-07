/**
 * Normalizes a YouTube URL (watch, share, or already-embed format) into an
 * embeddable `/embed/<id>` URL. Non-YouTube URLs are returned unchanged.
 *
 * Browsers refuse to render `youtube.com/watch?...` or `youtu.be/...` links
 * inside an <iframe> (X-Frame-Options), which is what caused
 * "Firefox Can't Open This Page" for lessons whose video URL wasn't in
 * embed form.
 */
export function toEmbeddableVideoUrl(rawUrl: string): string {
  const url = rawUrl.trim();
  if (!url) return url;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname.startsWith("/embed/")) return url;
      if (parsed.pathname === "/watch") {
        const id = parsed.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : url;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        const id = parsed.pathname.split("/")[2];
        return id ? `https://www.youtube.com/embed/${id}` : url;
      }
    }

    return url;
  } catch {
    return url;
  }
}
