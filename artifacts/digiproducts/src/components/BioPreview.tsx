import {
  Instagram,
  Twitter,
  Youtube,
  Facebook,
  Linkedin,
  Globe,
  MessageCircle,
  Music2,
  ShoppingBag,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface BioPreviewLink {
  id: string;
  title: string;
  url: string;
}

export interface BioPreviewProduct {
  id: string;
  title: string;
  slug?: string | null;
  priceCents?: number | null;
  pricingMode?: string | null;
  currency?: string | null;
  coverImageUrl?: string | null;
  saleShortDescription?: string | null;
}

export interface BioPreviewData {
  displayName: string;
  bio: string;
  avatarUrl?: string | null;
  theme: string;
  socialLinks: { platform: string; url: string }[];
  links: BioPreviewLink[];
  products: BioPreviewProduct[];
}

export const BIO_THEMES: Record<
  string,
  {
    label: string;
    page: string;
    card: string;
    cardHover: string;
    text: string;
    subtext: string;
    accent: string;
    swatch: string;
  }
> = {
  noir: {
    label: "Noir",
    page: "bg-[#14161C]",
    card: "bg-[#1F2330] border border-[#2E3342] text-white",
    cardHover: "hover:bg-[#2A2F3F]",
    text: "text-white",
    subtext: "text-[#9AA1B4]",
    accent: "text-[#D8A85B]",
    swatch: "bg-[#14161C]",
  },
  cream: {
    label: "Cream",
    page: "bg-[#FAF6EE]",
    card: "bg-white border border-[#E7DFCF] text-[#20242E] shadow-sm",
    cardHover: "hover:bg-[#F4EDDF]",
    text: "text-[#20242E]",
    subtext: "text-[#6B7284]",
    accent: "text-[#B8863B]",
    swatch: "bg-[#FAF6EE] border border-[#E7DFCF]",
  },
  ocean: {
    label: "Ocean",
    page: "bg-gradient-to-b from-[#0B2A4A] to-[#123C63]",
    card: "bg-white/10 border border-white/15 text-white backdrop-blur",
    cardHover: "hover:bg-white/20",
    text: "text-white",
    subtext: "text-[#A8C3DD]",
    accent: "text-[#6FC3FF]",
    swatch: "bg-gradient-to-b from-[#0B2A4A] to-[#123C63]",
  },
  sunset: {
    label: "Sunset",
    page: "bg-gradient-to-b from-[#3B1535] via-[#7A2E45] to-[#C96F3B]",
    card: "bg-white/10 border border-white/15 text-white backdrop-blur",
    cardHover: "hover:bg-white/20",
    text: "text-white",
    subtext: "text-[#EEC9B0]",
    accent: "text-[#FFD9A0]",
    swatch: "bg-gradient-to-b from-[#3B1535] to-[#C96F3B]",
  },
};

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  twitter: Twitter,
  x: Twitter,
  youtube: Youtube,
  facebook: Facebook,
  linkedin: Linkedin,
  tiktok: Music2,
  whatsapp: MessageCircle,
  website: Globe,
};

export function socialIconFor(platform: string) {
  return SOCIAL_ICONS[platform.toLowerCase()] ?? Globe;
}

function formatPrice(p: BioPreviewProduct): string {
  if (p.pricingMode === "free") return "Free";
  if (p.priceCents == null) return "";
  const amount = (p.priceCents / 100).toLocaleString(undefined, {
    minimumFractionDigits: p.priceCents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const cur = p.currency ?? "USD";
  return `${cur === "USD" ? "$" : `${cur} `}${amount}`;
}

/**
 * Renders the bio page content. Used both inside the editor's phone preview
 * (compact) and on the full public page.
 */
export function BioPreview({
  data,
  productHref,
  compact = false,
}: {
  data: BioPreviewData;
  /** Builds the href for a product card given its slug. */
  productHref?: (slug: string) => string;
  compact?: boolean;
}) {
  const theme = BIO_THEMES[data.theme] ?? BIO_THEMES["noir"]!;
  const initials =
    data.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div className={cn(compact ? "min-h-full" : "min-h-[100dvh]", "w-full", theme.page)}>
      <div
        className={cn(
          "mx-auto flex flex-col items-center px-5 pb-10",
          compact ? "max-w-full pt-8" : "max-w-md pt-14",
        )}
      >
        <Avatar className={cn(compact ? "w-16 h-16" : "w-24 h-24", "mb-3")}>
          {data.avatarUrl ? <AvatarImage src={data.avatarUrl} alt={data.displayName} /> : null}
          <AvatarFallback className="bg-[#B8863B] text-white text-xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <h1
          className={cn(
            "font-semibold text-center",
            compact ? "text-base" : "text-2xl",
            theme.text,
          )}
          data-testid="text-bio-display-name"
        >
          {data.displayName || "Your name"}
        </h1>
        {data.bio ? (
          <p
            className={cn(
              "text-center mt-1.5 whitespace-pre-line",
              compact ? "text-xs" : "text-sm",
              theme.subtext,
            )}
            data-testid="text-bio-description"
          >
            {data.bio}
          </p>
        ) : null}

        {data.socialLinks.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            {data.socialLinks.map((s, i) => {
              const Icon = socialIconFor(s.platform);
              return (
                <a
                  key={`${s.platform}-${i}`}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(theme.text, "opacity-80 hover:opacity-100 transition-opacity")}
                  aria-label={s.platform}
                  data-testid={`link-social-${s.platform}`}
                >
                  <Icon className={compact ? "w-4 h-4" : "w-5 h-5"} />
                </a>
              );
            })}
          </div>
        ) : null}

        <div className="w-full mt-6 space-y-3">
          {data.links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "block w-full rounded-xl text-center font-medium transition-colors",
                compact ? "px-3 py-2.5 text-xs" : "px-4 py-3.5 text-sm",
                theme.card,
                theme.cardHover,
              )}
              data-testid={`link-bio-${link.id}`}
            >
              {link.title}
            </a>
          ))}
        </div>

        {data.products.length > 0 ? (
          <div className="w-full mt-8">
            <div
              className={cn(
                "flex items-center gap-2 mb-3",
                compact ? "text-[11px]" : "text-xs",
                theme.subtext,
              )}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider font-semibold">Products</span>
            </div>
            <div className="space-y-3">
              {data.products.map((p) => {
                const href = p.slug && productHref ? productHref(p.slug) : undefined;
                const inner = (
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-xl transition-colors",
                      compact ? "p-2.5" : "p-3",
                      theme.card,
                      href ? theme.cardHover : "",
                    )}
                  >
                    {p.coverImageUrl ? (
                      <img
                        src={p.coverImageUrl}
                        alt={p.title}
                        className={cn(
                          "rounded-md object-cover flex-shrink-0",
                          compact ? "w-10 h-14" : "w-14 h-20",
                        )}
                      />
                    ) : (
                      <div
                        className={cn(
                          "rounded-md bg-[#B8863B]/20 flex items-center justify-center flex-shrink-0",
                          compact ? "w-10 h-14" : "w-14 h-20",
                        )}
                      >
                        <ShoppingBag className={cn("text-[#B8863B]", compact ? "w-4 h-4" : "w-5 h-5")} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-left">
                      <p className={cn("font-medium truncate", compact ? "text-xs" : "text-sm")}>
                        {p.title}
                      </p>
                      {p.saleShortDescription ? (
                        <p className={cn("truncate mt-0.5", compact ? "text-[10px]" : "text-xs", theme.subtext)}>
                          {p.saleShortDescription}
                        </p>
                      ) : null}
                      <p className={cn("mt-0.5 font-semibold", compact ? "text-[11px]" : "text-xs", theme.accent)}>
                        {formatPrice(p)}
                      </p>
                    </div>
                  </div>
                );
                return href ? (
                  <a
                    key={p.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                    data-testid={`link-bio-product-${p.id}`}
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={p.id} data-testid={`card-bio-product-${p.id}`}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <p className={cn("mt-10 text-[10px] uppercase tracking-widest", theme.subtext)}>
          Powered by PokiPoki
        </p>
      </div>
    </div>
  );
}
