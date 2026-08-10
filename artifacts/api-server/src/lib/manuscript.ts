/**
 * Manuscript import helpers: extract raw text from an uploaded file (docx/pdf/plain text)
 * and split it into chapters using a heading-detection heuristic.
 */

export interface ParsedChapter {
  title: string;
  contentMd: string;
}

/** Extract plain text from a manuscript file buffer based on its file name / mime type. */
export async function extractManuscriptText(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (lower.endsWith(".pdf")) {
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = pdfParseModule.default;
    const result = await pdfParse(buffer);
    return result.text;
  }
  // Treat anything else (.txt, .md, no extension) as plain text
  return buffer.toString("utf-8");
}

/**
 * Split raw manuscript text into chapters.
 *
 * Heuristics, in order of preference:
 * 1. Markdown headings (`# Title` or `## Title`)
 * 2. Lines matching "Chapter N[: Title]" / "CHAPTER N"
 * 3. Fallback: the whole manuscript becomes a single chapter
 */
export function splitIntoChapters(rawText: string, fallbackTitle: string): ParsedChapter[] {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const lines = text.split("\n");

  const markdownHeadingRe = /^#{1,2}\s+(.+)$/;
  // Matches "Chapter 3" (digits) or "Chapter Three" (spelled-out numbers up to twenty)
  const chapterHeadingRe =
    /^chapter\s+(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)[:.\-\s]*(.*)$/i;

  type Boundary = { index: number; title: string };
  const boundaries: Boundary[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const mdMatch = trimmed.match(markdownHeadingRe);
    if (mdMatch) {
      boundaries.push({ index: i, title: mdMatch[1].trim() });
      return;
    }
    const chMatch = trimmed.match(chapterHeadingRe);
    if (chMatch && trimmed.length < 120) {
      const title = chMatch[1]?.trim();
      boundaries.push({
        index: i,
        title: title || `Chapter ${boundaries.length + 1}`,
      });
    }
  });

  if (boundaries.length === 0) {
    return [{ title: fallbackTitle, contentMd: text }];
  }

  const chapters: ParsedChapter[] = [];
  for (let b = 0; b < boundaries.length; b++) {
    const start = boundaries[b].index + 1;
    const end = b + 1 < boundaries.length ? boundaries[b + 1].index : lines.length;
    const body = lines.slice(start, end).join("\n").trim();
    if (!body && boundaries[b].title.length === 0) continue;
    chapters.push({
      title: boundaries[b].title || `Chapter ${b + 1}`,
      contentMd: body,
    });
  }

  // If content preceded the first heading, keep it as an intro chapter
  const preamble = lines.slice(0, boundaries[0].index).join("\n").trim();
  if (preamble) {
    chapters.unshift({ title: "Introduction", contentMd: preamble });
  }

  return chapters.filter((c) => c.contentMd.length > 0);
}
