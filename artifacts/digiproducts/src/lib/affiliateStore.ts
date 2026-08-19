/**
 * In-memory affiliate link store — persists within the browser session.
 */

export interface AffiliateLink {
  id: string;
  code: string;
  affiliateName: string;
  affiliateEmail: string;
  productId: string;
  productName: string;
  commissionType: "percent" | "flat";
  commissionValue: number;
  enabled: boolean;
  clicks: number;
  conversions: number;
  createdAt: string;
}

let _links: AffiliateLink[] = [];

function genId() {
  return `aff-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

function genCode(name: string): string {
  const base = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "AFF";
  for (let i = 0; i < 100; i++) {
    const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
    const code = `${base}${suffix}`;
    if (!codeExists(code)) return code;
  }
  // Deterministic fallback: append a counter suffix that is guaranteed unique
  let n = 0;
  let fallback: string;
  do {
    fallback = `${base}${(n++).toString(36).toUpperCase().padStart(3, "0")}`;
  } while (codeExists(fallback));
  return fallback;
}

export function createAffiliateLink(
  data: Omit<AffiliateLink, "id" | "code" | "clicks" | "conversions" | "createdAt">,
  customCode?: string,
): AffiliateLink {
  const link: AffiliateLink = {
    ...data,
    id: genId(),
    code: customCode?.trim().toUpperCase() || genCode(data.affiliateName || data.affiliateEmail),
    clicks: 0,
    conversions: 0,
    createdAt: new Date().toISOString(),
  };
  _links = [..._links, link];
  return link;
}

export function listAffiliateLinks(): AffiliateLink[] {
  return _links;
}

export function updateAffiliateLink(id: string, patch: Partial<AffiliateLink>): void {
  _links = _links.map((l) => (l.id === id ? { ...l, ...patch } : l));
}

export function deleteAffiliateLink(id: string): void {
  _links = _links.filter((l) => l.id !== id);
}

export function codeExists(code: string): boolean {
  return _links.some((l) => l.code === code.trim().toUpperCase());
}
