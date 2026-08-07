import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

export const EXPORT_DIR = path.resolve(process.cwd(), "data", "exports");

type CoverConfig = {
  title?: string;
  subtitle?: string;
  author?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
};

type ChapterInput = { title: string; contentMd: string | null };

/** Very small markdown renderer for pdfkit: headings, bullets, bold stripped. */
function renderMarkdown(doc: PDFKit.PDFDocument, md: string): void {
  const lines = md.split("\n");
  for (const raw of lines) {
    const line = raw.trimEnd();
    const clean = (s: string) =>
      s
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`(.+?)`/g, "$1")
        .replace(/\[(.+?)\]\(.+?\)/g, "$1");
    if (doc.y > doc.page.height - doc.page.margins.bottom - 40) {
      doc.addPage();
    }
    if (line.startsWith("### ")) {
      doc.moveDown(0.6);
      doc.font("Helvetica-Bold").fontSize(12).text(clean(line.slice(4)));
      doc.moveDown(0.2);
    } else if (line.startsWith("## ")) {
      doc.moveDown(0.8);
      doc.font("Helvetica-Bold").fontSize(14).text(clean(line.slice(3)));
      doc.moveDown(0.3);
    } else if (line.startsWith("# ")) {
      doc.moveDown(0.8);
      doc.font("Helvetica-Bold").fontSize(16).text(clean(line.slice(2)));
      doc.moveDown(0.3);
    } else if (/^\s*[-*]\s+/.test(line)) {
      doc
        .font("Helvetica")
        .fontSize(10.5)
        .text(`•  ${clean(line.replace(/^\s*[-*]\s+/, ""))}`, {
          indent: 12,
          lineGap: 2,
        });
    } else if (/^\s*\d+\.\s+/.test(line)) {
      doc
        .font("Helvetica")
        .fontSize(10.5)
        .text(clean(line), { indent: 12, lineGap: 2 });
    } else if (line.trim() === "") {
      doc.moveDown(0.4);
    } else {
      doc
        .font("Helvetica")
        .fontSize(10.5)
        .text(clean(line), { lineGap: 3, align: "justify" });
    }
  }
}

export async function renderProductPdf(input: {
  title: string;
  subtitle?: string | null;
  cover?: CoverConfig | null;
  chapters: ChapterInput[];
  pageSize: "a4" | "letter";
  footerText?: string | null;
  filePath: string;
}): Promise<{ pageCount: number; fileSizeBytes: number }> {
  fs.mkdirSync(path.dirname(input.filePath), { recursive: true });
  const size = input.pageSize === "letter" ? "LETTER" : "A4";
  const doc = new PDFDocument({ size, margins: { top: 64, bottom: 64, left: 64, right: 64 } });
  const stream = fs.createWriteStream(input.filePath);
  doc.pipe(stream);

  const primary = input.cover?.primaryColor ?? "#0B3B2E";
  const accent = input.cover?.accentColor ?? "#E3B341";

  // Cover page
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(primary);
  doc.rect(0, doc.page.height - 18, doc.page.width, 18).fill(accent);
  doc
    .fill("#FFFFFF")
    .font("Helvetica-Bold")
    .fontSize(34)
    .text(input.cover?.title ?? input.title, 64, doc.page.height * 0.32, {
      width: doc.page.width - 128,
    });
  const subtitle = input.cover?.subtitle ?? input.subtitle;
  if (subtitle) {
    doc
      .font("Helvetica")
      .fontSize(16)
      .fillOpacity(0.85)
      .text(subtitle, { width: doc.page.width - 128 });
    doc.fillOpacity(1);
  }
  if (input.cover?.author) {
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(input.cover.author, 64, doc.page.height - 110);
  }

  // Table of contents
  doc.addPage();
  doc.fill("#111111").font("Helvetica-Bold").fontSize(20).text("Contents");
  doc.moveDown(0.8);
  input.chapters.forEach((ch, i) => {
    doc
      .font("Helvetica")
      .fontSize(11.5)
      .fill("#333333")
      .text(`${i + 1}.  ${ch.title}`, { lineGap: 6 });
  });

  // Chapters
  input.chapters.forEach((ch, i) => {
    doc.addPage();
    doc.fill(primary).font("Helvetica-Bold").fontSize(11);
    doc.text(`CHAPTER ${i + 1}`);
    doc.moveDown(0.2);
    doc.fill("#111111").fontSize(20).text(ch.title);
    doc
      .moveTo(64, doc.y + 8)
      .lineTo(160, doc.y + 8)
      .lineWidth(2)
      .stroke(accent);
    doc.moveDown(1.2);
    doc.fill("#222222");
    renderMarkdown(doc, ch.contentMd ?? "_This chapter has no content yet._");
  });

  if (input.footerText) {
    doc
      .fontSize(8)
      .fill("#666666")
      .text(input.footerText, 64, doc.page.height - 50);
  }

  const pageCount = doc.bufferedPageRange().count;
  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });
  const stat = fs.statSync(input.filePath);
  return { pageCount, fileSizeBytes: stat.size };
}

export function renderProductMarkdown(input: {
  title: string;
  subtitle?: string | null;
  chapters: ChapterInput[];
}): string {
  const parts = [`# ${input.title}`];
  if (input.subtitle) parts.push(`_${input.subtitle}_`);
  input.chapters.forEach((ch, i) => {
    parts.push(`\n\n## Chapter ${i + 1}: ${ch.title}\n\n${ch.contentMd ?? ""}`);
  });
  return parts.join("\n");
}
