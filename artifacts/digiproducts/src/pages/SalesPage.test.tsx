/**
 * SalesPage delegation tests
 *
 * These tests render the real SalesPage route (with mocked network) and assert
 * that it delegates all visual rendering to SalesPagePreview rather than
 * duplicating its own markup.  If anyone moves markup into SalesPage.tsx and
 * stops calling SalesPagePreview, these tests fail.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- module mocks (hoisted by vitest, must precede imports) ---

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

vi.mock("wouter", () => ({
  useParams: () => ({ slug: "test-ebook" }),
}));

vi.mock("@workspace/api-client-react", () => ({
  useGetPublicSalesPage: vi.fn(),
  getGetPublicSalesPageQueryKey: vi.fn(() => ["/api/public/sales-page/test-ebook"]),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Spy on SalesPagePreview while letting the real component render through.
// If SalesPage stops calling SalesPagePreview the spy won't fire and tests fail.
vi.mock("@/components/SalesPagePreview", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/components/SalesPagePreview")>();
  return {
    ...real,
    SalesPagePreview: vi.fn(real.SalesPagePreview),
  };
});

// --- imports (resolved after mocks are registered) ---
import { useGetPublicSalesPage } from "@workspace/api-client-react";
import { SalesPagePreview } from "@/components/SalesPagePreview";
import SalesPage from "./SalesPage";

// Typed mock helpers
const mockHook = useGetPublicSalesPage as ReturnType<typeof vi.fn>;
const mockPreview = SalesPagePreview as ReturnType<typeof vi.fn>;

const MOCK_API_DATA = {
  productId: "prod-1",
  title: "Master React",
  authorName: "Jane Doe",
  coverImageUrl: null,
  priceCents: 2900,
  chapterCount: 12,
  salesCopy: {
    headline: "Master React in 30 Days",
    subheadline: "A practical guide for working developers",
    bullets: ["Learn hooks", "Build real apps"],
    whoItsFor: "Working developers who want to level up",
    faq: [{ question: "Is it hard?", answer: "No, step by step." }],
    ctaText: "Get the Book",
  },
};

describe("SalesPage – delegation to SalesPagePreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Primary identity guarantee
  // -----------------------------------------------------------------------
  it("renders SalesPagePreview exactly once with props derived from the API response", () => {
    mockHook.mockReturnValue({ data: MOCK_API_DATA, isLoading: false, isError: false });

    render(<SalesPage />);

    // SalesPagePreview must be called — if markup is duplicated in SalesPage
    // this assertion fails because the spy is never invoked.
    expect(mockPreview).toHaveBeenCalledTimes(1);

    const props = mockPreview.mock.calls[0][0];

    // Fields mapped from salesCopy
    expect(props.headline).toBe("Master React in 30 Days");
    expect(props.subheadline).toBe("A practical guide for working developers");
    expect(props.bullets).toEqual(["Learn hooks", "Build real apps"]);
    expect(props.whoItsFor).toBe("Working developers who want to level up");
    expect(props.faq).toEqual([{ question: "Is it hard?", answer: "No, step by step." }]);
    expect(props.ctaText).toBe("Get the Book");

    // Fields mapped from top-level data
    expect(props.title).toBe("Master React");
    expect(props.authorName).toBe("Jane Doe");
    expect(props.priceCents).toBe(2900);
    expect(props.chapterCount).toBe(12);
    expect(props.coverUrl).toBeNull();

    // onBuy must be a function — the buyer page must be interactive
    expect(typeof props.onBuy).toBe("function");
  });

  it("passes null coverUrl when coverImageUrl is null", () => {
    mockHook.mockReturnValue({
      data: { ...MOCK_API_DATA, coverImageUrl: null },
      isLoading: false,
      isError: false,
    });

    render(<SalesPage />);

    expect(mockPreview).toHaveBeenCalledTimes(1);
    expect(mockPreview.mock.calls[0][0].coverUrl).toBeNull();
  });

  it("constructs a coverUrl with BASE_URL prefix when coverImageUrl is provided", () => {
    mockHook.mockReturnValue({
      data: { ...MOCK_API_DATA, coverImageUrl: "/covers/abc.jpg" },
      isLoading: false,
      isError: false,
    });

    render(<SalesPage />);

    expect(mockPreview).toHaveBeenCalledTimes(1);
    const { coverUrl } = mockPreview.mock.calls[0][0];
    expect(coverUrl).toMatch(/api\/covers\/abc\.jpg$/);
  });

  // -----------------------------------------------------------------------
  // Loading / error states — SalesPagePreview must NOT render
  // -----------------------------------------------------------------------
  it("renders a loading spinner and does not call SalesPagePreview while loading", () => {
    mockHook.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    render(<SalesPage />);

    expect(mockPreview).not.toHaveBeenCalled();
    // Loader2 renders as an SVG with animate-spin
    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  it("renders an error message and does not call SalesPagePreview on error", () => {
    mockHook.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    render(<SalesPage />);

    expect(mockPreview).not.toHaveBeenCalled();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByText(/no longer available/i)).toBeInTheDocument();
  });

  it("renders an error message when data is missing even without an error flag", () => {
    mockHook.mockReturnValue({ data: undefined, isLoading: false, isError: false });

    render(<SalesPage />);

    expect(mockPreview).not.toHaveBeenCalled();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Defensive prop mapping: SalesPage must not crash on sparse salesCopy
  // -----------------------------------------------------------------------
  it("falls back to empty strings/arrays when salesCopy fields are missing", () => {
    mockHook.mockReturnValue({
      data: {
        ...MOCK_API_DATA,
        salesCopy: {}, // no fields set
      },
      isLoading: false,
      isError: false,
    });

    render(<SalesPage />);

    expect(mockPreview).toHaveBeenCalledTimes(1);
    const props = mockPreview.mock.calls[0][0];
    expect(props.headline).toBe("");
    expect(props.subheadline).toBe("");
    expect(props.bullets).toEqual([]);
    expect(props.whoItsFor).toBe("");
    expect(props.faq).toEqual([]);
    expect(props.ctaText).toBe("");
  });

  it("falls back to empty strings/arrays when salesCopy is absent", () => {
    mockHook.mockReturnValue({
      data: {
        ...MOCK_API_DATA,
        salesCopy: undefined,
      },
      isLoading: false,
      isError: false,
    });

    render(<SalesPage />);

    expect(mockPreview).toHaveBeenCalledTimes(1);
    const props = mockPreview.mock.calls[0][0];
    expect(props.headline).toBe("");
    expect(props.bullets).toEqual([]);
    expect(props.faq).toEqual([]);
  });
});
