/**
 * Manually defined Zod schemas for endpoints not yet in the OpenAPI spec.
 * Add schemas here when a route imports a type from @workspace/api-zod that
 * orval hasn't generated yet.
 */
import * as zod from "zod/v4";

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
