import { describe, it, expect } from "vitest";
import { splitIntoChapters } from "./manuscript.js";

describe("splitIntoChapters", () => {
  // ── empty / blank ──────────────────────────────────────────────────────────
  it("returns [] for empty text", () => {
    expect(splitIntoChapters("", "Book")).toEqual([]);
  });

  it("returns [] for whitespace-only text", () => {
    expect(splitIntoChapters("   \n\n  ", "Book")).toEqual([]);
  });

  // ── single-chapter fallback ────────────────────────────────────────────────
  it("wraps the entire text in a single chapter when no headings are found", () => {
    const text = "Once upon a time there was a kingdom far away.";
    const chapters = splitIntoChapters(text, "My Book");
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe("My Book");
    expect(chapters[0].contentMd).toBe(text);
  });

  it("uses the fallback title for a single-chapter manuscript", () => {
    const chapters = splitIntoChapters("Plain body text.", "Custom Title");
    expect(chapters[0].title).toBe("Custom Title");
  });

  // ── markdown headings ──────────────────────────────────────────────────────
  it("splits on # headings", () => {
    const text = [
      "# The Beginning",
      "It all started here.",
      "# The Middle",
      "Things got complicated.",
      "# The End",
      "And then it was over.",
    ].join("\n");

    const chapters = splitIntoChapters(text, "Fallback");
    expect(chapters).toHaveLength(3);
    expect(chapters[0].title).toBe("The Beginning");
    expect(chapters[0].contentMd).toBe("It all started here.");
    expect(chapters[1].title).toBe("The Middle");
    expect(chapters[2].title).toBe("The End");
  });

  it("splits on ## headings", () => {
    const text = [
      "## Part One",
      "First part body.",
      "## Part Two",
      "Second part body.",
    ].join("\n");

    const chapters = splitIntoChapters(text, "Fallback");
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe("Part One");
    expect(chapters[1].title).toBe("Part Two");
  });

  it("captures preamble before the first markdown heading as Introduction", () => {
    const text = [
      "Preface content here.",
      "# Chapter One",
      "Body of chapter one.",
    ].join("\n");

    const chapters = splitIntoChapters(text, "Fallback");
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe("Introduction");
    expect(chapters[0].contentMd).toBe("Preface content here.");
    expect(chapters[1].title).toBe("Chapter One");
  });

  // ── digit-based chapter headings ───────────────────────────────────────────
  it("splits on 'Chapter N' (digit) headings", () => {
    const text = [
      "Chapter 1",
      "First chapter body.",
      "Chapter 2: The Sequel",
      "Second chapter body.",
      "Chapter 3",
      "Third chapter body.",
    ].join("\n");

    const chapters = splitIntoChapters(text, "Fallback");
    expect(chapters).toHaveLength(3);
    expect(chapters[0].title).toBe("Chapter 1");
    expect(chapters[0].contentMd).toBe("First chapter body.");
    expect(chapters[1].title).toBe("The Sequel");
    expect(chapters[2].title).toBe("Chapter 3");
  });

  it("handles CHAPTER N in uppercase", () => {
    const text = [
      "CHAPTER 1",
      "Uppercase body.",
      "CHAPTER 2",
      "More uppercase body.",
    ].join("\n");

    const chapters = splitIntoChapters(text, "Fallback");
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe("Chapter 1");
  });

  // ── spelled-out chapter headings ──────────────────────────────────────────
  it("splits a multi-chapter manuscript on spelled-out number headings", () => {
    // Two chapters with spelled-out headings — proves the regex fires and
    // creates real boundaries (not just the single-chapter fallback).
    const text = [
      "Chapter One",
      "Body of chapter one.",
      "Chapter Two",
      "Body of chapter two.",
    ].join("\n");

    const chapters = splitIntoChapters(text, "Fallback");
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe("Chapter 1"); // no inline subtitle → auto-numbered
    expect(chapters[0].contentMd).toBe("Body of chapter one.");
    expect(chapters[1].title).toBe("Chapter 2");
    expect(chapters[1].contentMd).toBe("Body of chapter two.");
  });

  it("recognises every spelled-out number from One to Twenty as a heading boundary", () => {
    // Build a 20-chapter manuscript and confirm all boundaries are detected.
    const words = [
      "One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
      "Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen",
      "Eighteen","Nineteen","Twenty",
    ];
    const lines: string[] = [];
    for (const w of words) {
      lines.push(`Chapter ${w}`);
      lines.push(`Body of chapter ${w.toLowerCase()}.`);
    }
    const chapters = splitIntoChapters(lines.join("\n"), "Fallback");
    expect(chapters).toHaveLength(20);
    // Spot-check a few bodies to confirm content was assigned correctly
    expect(chapters[0].contentMd).toBe("Body of chapter one.");
    expect(chapters[9].contentMd).toBe("Body of chapter ten.");
    expect(chapters[19].contentMd).toBe("Body of chapter twenty.");
  });

  it("picks up inline title after spelled-out chapter heading", () => {
    const text = [
      "Chapter One: Dawn",
      "The sun rose slowly.",
      "Chapter Two: Dusk",
      "The sun set slowly.",
    ].join("\n");

    const chapters = splitIntoChapters(text, "Fallback");
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe("Dawn");
    expect(chapters[1].title).toBe("Dusk");
  });

  // ── mixed manuscript ───────────────────────────────────────────────────────
  it("handles a mix of markdown and chapter headings", () => {
    const text = [
      "# Prologue",
      "Before it all began.",
      "Chapter 1: Act One",
      "The first act.",
      "## Interlude",
      "A brief pause.",
      "Chapter 2",
      "The second act.",
    ].join("\n");

    const chapters = splitIntoChapters(text, "Fallback");
    // All four boundaries should be found
    expect(chapters).toHaveLength(4);
    expect(chapters[0].title).toBe("Prologue");
    expect(chapters[1].title).toBe("Act One");
    expect(chapters[2].title).toBe("Interlude");
    expect(chapters[3].title).toBe("Chapter 4"); // no inline title → auto-numbered
  });

  // ── CRLF normalisation ────────────────────────────────────────────────────
  it("normalises Windows CRLF line endings", () => {
    const text = "# Chapter A\r\nWindows body.\r\n# Chapter B\r\nMore body.";
    const chapters = splitIntoChapters(text, "Fallback");
    expect(chapters).toHaveLength(2);
    expect(chapters[0].contentMd).toBe("Windows body.");
  });

  // ── filters empty chapters ─────────────────────────────────────────────────
  it("omits chapters with no body content", () => {
    const text = [
      "# Title With Content",
      "Some content here.",
      "# Empty Title",
      "# Another With Content",
      "More content.",
    ].join("\n");

    const chapters = splitIntoChapters(text, "Fallback");
    // "Empty Title" has no body, so only two chapters should remain
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe("Title With Content");
    expect(chapters[0].contentMd).toBe("Some content here.");
    expect(chapters[1].title).toBe("Another With Content");
    expect(chapters[1].contentMd).toBe("More content.");
    expect(chapters.every((c) => c.contentMd.length > 0)).toBe(true);
  });
});
