/**
 * Manually defined Zod schemas for endpoints not yet in the OpenAPI spec.
 * Add schemas here when a route imports a type from @workspace/api-zod that
 * orval hasn't generated yet.
 */
import * as zod from "zod/v4";

// ---------------------------------------------------------------------------
// Sell settings – shared product sell fields appended to every serialized product
// ---------------------------------------------------------------------------

export const SellSettingsFields = {
  productSaleType: zod.string().optional(),
  pricingMode: zod.string().optional(),
  currency: zod.string().optional(),
  saleShortDescription: zod.string().nullish(),
  saleFullDescription: zod.string().nullish(),
  saleTheme: zod.string().optional(),
  deliveryMethod: zod.string().nullish(),
  deliveryUrl: zod.string().nullish(),
  deliveryWhatsappNumber: zod.string().nullish(),
  deliveryWhatsappMessage: zod.string().nullish(),
  deliveryAccessKeys: zod.string().nullish(),
  deliveryDuration: zod.string().optional(),
  deliveryDurationDays: zod.number().int().nullish(),
  limitedQuantityEnabled: zod.boolean().optional(),
  limitedQuantity: zod.number().int().nullish(),
  earlyBirdEnabled: zod.boolean().optional(),
  testimonials: zod.array(zod.object({ name: zod.string(), text: zod.string(), rating: zod.number() })).nullish(),
  contractEnabled: zod.boolean().optional(),
  orderCount: zod.number().int().optional(),
  showOnBio: zod.boolean().optional(),
};

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);
const emptyToNull = (v: unknown) => (v === "" ? null : v);

export const UpdateSellSettingsBody = zod.object({
  productSaleType: zod.string().optional(),
  pricingMode: zod.preprocess(emptyToUndefined, zod.enum(["free", "fixed", "pwyw", "tiered"]).optional()),
  priceCents: zod.number().int().nullish(),
  currency: zod.string().optional(),
  saleShortDescription: zod.string().nullish(),
  saleFullDescription: zod.string().nullish(),
  saleTheme: zod.preprocess(emptyToUndefined, zod.enum(["dark", "light"]).optional()),
  deliveryMethod: zod.preprocess(emptyToNull, zod.enum(["link", "whatsapp", "access_key"]).nullish()),
  deliveryUrl: zod.string().nullish(),
  deliveryWhatsappNumber: zod.string().nullish(),
  deliveryWhatsappMessage: zod.string().nullish(),
  deliveryAccessKeys: zod.string().nullish(),
  deliveryDuration: zod.preprocess(emptyToUndefined, zod.enum(["lifetime", "limited"]).optional()),
  deliveryDurationDays: zod.number().int().nullish(),
  limitedQuantityEnabled: zod.boolean().optional(),
  limitedQuantity: zod.number().int().nullish(),
  earlyBirdEnabled: zod.boolean().optional(),
  testimonials: zod.array(zod.object({ name: zod.string(), text: zod.string(), rating: zod.number() })).nullish(),
  contractEnabled: zod.boolean().optional(),
  showOnBio: zod.boolean().optional(),
  slug: zod.string().nullish(),
});

export const UpdateSellSettingsParams = zod.object({ productId: zod.coerce.string() });

// Discount Codes
export const DiscountCodeItem = zod.object({
  id: zod.string(),
  ownerId: zod.string(),
  productId: zod.string().nullish(),
  code: zod.string(),
  discountType: zod.string(),
  discountValue: zod.number().int(),
  maxUses: zod.number().int().nullish(),
  useCount: zod.number().int(),
  active: zod.boolean(),
  expiresAt: zod.string().nullish(),
  createdAt: zod.string(),
  updatedAt: zod.string(),
});

export const GetDiscountCodesResponse = zod.array(DiscountCodeItem);

export const CreateDiscountCodeBody = zod.object({
  productId: zod.string().nullish(),
  code: zod.string().min(1),
  discountType: zod.enum(["percent", "fixed_cents"]),
  discountValue: zod.number().int().min(1),
  maxUses: zod.number().int().min(1).nullish(),
  expiresAt: zod.string().nullish(),
});

export const CreateDiscountCodeResponse = DiscountCodeItem;

export const UpdateDiscountCodeBody = zod.object({
  active: zod.boolean().optional(),
  maxUses: zod.number().int().nullish(),
  expiresAt: zod.string().nullish(),
});

export const UpdateDiscountCodeResponse = DiscountCodeItem;

// ---------------------------------------------------------------------------
// Products – generate preview token
// ---------------------------------------------------------------------------

export const GeneratePreviewTokenResponse = zod.object({
  token: zod.string(),
  slug: zod.string(),
  expiresAt: zod.string(),
});

// ---------------------------------------------------------------------------
// Generation – ad copy
// ---------------------------------------------------------------------------

export const GenerateAdCopyBody = zod.object({
  bookTitle: zod.string(),
  painPoint: zod.string().optional(),
  audience: zod.string().optional(),
  country: zod.string().optional(),
  price: zod.string().optional(),
  benefits: zod.array(zod.string()).optional(),
  adType: zod.enum(["ad_copy", "image_ads", "video_scripts", "full_package"]),
  platforms: zod.array(zod.string()),
  objective: zod.enum(["traffic", "engagement", "conversions"]),
});

const AdCopyItem = zod.object({
  hook: zod.string(),
  body: zod.string(),
  cta: zod.string(),
});

const ImageAdItem = zod.object({
  headline: zod.string(),
  subtext: zod.string(),
  visual: zod.string(),
});

const VideoScriptItem = zod.object({
  title: zod.string(),
  type: zod.string(),
  hook: zod.string(),
  body: zod.string(),
  cta: zod.string(),
});

export const GenerateAdCopyResponse = zod.object({
  adCopy: zod.array(AdCopyItem).optional(),
  imageAds: zod.array(ImageAdItem).optional(),
  videoScripts: zod.array(VideoScriptItem).optional(),
});
