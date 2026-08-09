/**
 * SalesPagePreview unit tests
 *
 * These tests cover the shared presentational component used by both the
 * buyer-facing SalesPage and the editor live-preview. All visual markup lives
 * here — if someone extracts markup back into SalesPage.tsx the companion
 * SalesPage.test.tsx catches the divergence.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { SalesPagePreview, formatPrice, type SalesPagePreviewProps } from "./SalesPagePreview";

// framer-motion reduces to no-op in jsdom so animations don't interfere.
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    motion: new Proxy(
      {},
      {
        get:
          (_target, tag: string) =>
          ({ children, ...rest }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => {
            const React = require("react");
            return React.createElement(tag, rest, children);
          },
      }
    ),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Explicitly typed so the fixture is compatible with the component props.
const BASE_PROPS: SalesPagePreviewProps = {
  headline: "Master React in 30 Days",
  subheadline: "A practical guide for working developers",
  bullets: ["Learn hooks", "Master state", "Build real apps"],
  whoItsFor: "Developers who want to level up fast",
  faq: [
    { question: "Is this for beginners?", answer: "Yes, it starts from zero." },
    { question: "How long does it take?", answer: "Most readers finish in two weeks." },
  ],
  ctaText: "Get the Book",
  title: "Master React",
  authorName: "Jane Doe",
  priceCents: 2900,
  chapterCount: 12,
  coverUrl: null,
};

// ---------------------------------------------------------------------------
// formatPrice utility
// ---------------------------------------------------------------------------
describe("formatPrice", () => {
  it("returns 'Name your price' for null", () => {
    expect(formatPrice(null)).toBe("Name your price");
  });

  it("returns 'Name your price' for undefined", () => {
    expect(formatPrice(undefined)).toBe("Name your price");
  });

  it("formats whole-dollar amounts without cents", () => {
    expect(formatPrice(2900)).toBe("$29");
  });

  it("formats amounts with non-zero cents", () => {
    expect(formatPrice(1999)).toBe("$19.99");
  });
});

// ---------------------------------------------------------------------------
// Core content rendering
// ---------------------------------------------------------------------------
describe("SalesPagePreview – content rendering", () => {
  it("renders the headline", () => {
    render(<SalesPagePreview {...BASE_PROPS} />);
    expect(screen.getAllByText("Master React in 30 Days").length).toBeGreaterThan(0);
  });

  it("renders the subheadline", () => {
    render(<SalesPagePreview {...BASE_PROPS} />);
    expect(screen.getByText("A practical guide for working developers")).toBeInTheDocument();
  });

  it("renders all bullet points", () => {
    render(<SalesPagePreview {...BASE_PROPS} />);
    expect(screen.getByText("Learn hooks")).toBeInTheDocument();
    expect(screen.getByText("Master state")).toBeInTheDocument();
    expect(screen.getByText("Build real apps")).toBeInTheDocument();
  });

  it("renders the whoItsFor section", () => {
    render(<SalesPagePreview {...BASE_PROPS} />);
    expect(screen.getByText(/"Developers who want to level up fast"/)).toBeInTheDocument();
  });

  it("renders FAQ questions", () => {
    render(<SalesPagePreview {...BASE_PROPS} />);
    expect(screen.getByText("Is this for beginners?")).toBeInTheDocument();
    expect(screen.getByText("How long does it take?")).toBeInTheDocument();
  });

  it("renders the author name", () => {
    render(<SalesPagePreview {...BASE_PROPS} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("renders the formatted price in CTAs", () => {
    render(<SalesPagePreview {...BASE_PROPS} />);
    const priceNodes = screen.getAllByText("$29");
    expect(priceNodes.length).toBeGreaterThan(0);
  });

  it("renders chapter count in the trust bar", () => {
    render(<SalesPagePreview {...BASE_PROPS} />);
    expect(screen.getByText("12 Chapters")).toBeInTheDocument();
  });

  it("omits whoItsFor section when prop is empty", () => {
    render(<SalesPagePreview {...BASE_PROPS} whoItsFor="" />);
    expect(screen.queryByText("Who This Is For")).not.toBeInTheDocument();
  });

  it("omits bullets section when array is empty", () => {
    render(<SalesPagePreview {...BASE_PROPS} bullets={[]} />);
    expect(screen.queryByText("Inside the Book")).not.toBeInTheDocument();
  });

  it("omits FAQ section when array is empty", () => {
    render(<SalesPagePreview {...BASE_PROPS} faq={[]} />);
    expect(screen.queryByText("Frequently Asked Questions")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Interactive vs. preview mode  (the onBuy prop)
// ---------------------------------------------------------------------------
describe("SalesPagePreview – interactive vs. preview mode", () => {
  it("calls onBuy when CTA is clicked in interactive mode", async () => {
    const handleBuy = vi.fn();
    render(<SalesPagePreview {...BASE_PROPS} onBuy={handleBuy} />);

    const buttons = screen.getAllByRole("button", { name: /Get the Book/i });
    await userEvent.click(buttons[0]);
    expect(handleBuy).toHaveBeenCalledTimes(1);
  });

  it("does not fire onBuy in preview (non-interactive) mode", () => {
    render(<SalesPagePreview {...BASE_PROPS} />);

    const buttons = screen.getAllByRole("button", { name: /Get the Book/i });
    // classList.contains checks the standalone class; avoids false positives from
    // compound selectors like `disabled:pointer-events-none` in the base Button style.
    buttons.forEach((btn) => {
      expect(btn.classList.contains("pointer-events-none")).toBe(true);
    });
  });

  it("renders CTA buttons without pointer-events-none in interactive mode", () => {
    render(<SalesPagePreview {...BASE_PROPS} onBuy={() => {}} />);

    const buttons = screen.getAllByRole("button", { name: /Get the Book/i });
    buttons.forEach((btn) => {
      expect(btn.classList.contains("pointer-events-none")).toBe(false);
    });
  });
});
