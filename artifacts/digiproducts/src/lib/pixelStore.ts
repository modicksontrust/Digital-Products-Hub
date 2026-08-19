/**
 * In-memory pixel store — persists within the browser session.
 * A future task will wire this to real API-backed storage.
 */

export type PixelPlatform = "meta" | "google" | "tiktok" | "snapchat" | "pinterest";

export const PLATFORM_LABELS: Record<PixelPlatform, string> = {
  meta: "Meta (Facebook/Instagram)",
  google: "Google Analytics / Ads",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  pinterest: "Pinterest",
};

export const PLATFORM_EVENTS: Record<PixelPlatform, string[]> = {
  meta: ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase", "Lead", "CompleteRegistration", "Contact", "Subscribe"],
  google: ["page_view", "view_item", "add_to_cart", "begin_checkout", "purchase", "generate_lead", "sign_up"],
  tiktok: ["ViewContent", "AddToCart", "InitiateCheckout", "CompletePayment", "Contact", "Subscribe"],
  snapchat: ["PAGE_VIEW", "VIEW_CONTENT", "ADD_CART", "START_CHECKOUT", "PURCHASE", "SIGN_UP"],
  pinterest: ["page_visit", "view_category", "add_to_cart", "checkout", "purchase", "lead", "signup"],
};

export interface PixelRecord {
  id: string;
  platform: PixelPlatform;
  pixelId: string;
  capiToken: string;
  applyTo: "bio" | "all";
  events: string[];
  enabled: boolean;
  createdAt: string;
}

let _pixels: PixelRecord[] = [];

function genId() {
  return `pixel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

export function addPixel(data: Omit<PixelRecord, "id" | "createdAt">): PixelRecord {
  const px: PixelRecord = { ...data, id: genId(), createdAt: new Date().toISOString() };
  _pixels = [..._pixels, px];
  return px;
}

export function listPixels(): PixelRecord[] {
  return _pixels;
}

export function updatePixel(id: string, patch: Partial<PixelRecord>): void {
  _pixels = _pixels.map((p) => (p.id === id ? { ...p, ...patch } : p));
}

export function deletePixel(id: string): void {
  _pixels = _pixels.filter((p) => p.id !== id);
}
