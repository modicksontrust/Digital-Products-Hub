/**
 * Manually written React-Query hooks for endpoints not yet in the OpenAPI spec.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseQueryOptions,
  MutationFunction,
  QueryKey,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { z } from "zod/v4";
import type {
  UpdateSellSettingsBody,
  DiscountCodeItem,
  CreateDiscountCodeBody,
  UpdateDiscountCodeBody,
  GeneratePreviewTokenResponse,
} from "@workspace/api-zod";

export type GeneratePreviewTokenResult = z.infer<typeof GeneratePreviewTokenResponse>;

// ---------------------------------------------------------------------------
// Generate preview token
// ---------------------------------------------------------------------------

export const generatePreviewToken = (
  productId: string,
  options?: Parameters<typeof customFetch>[1],
) =>
  customFetch<GeneratePreviewTokenResult>(
    `/api/products/${productId}/preview-token`,
    { method: "POST", ...options },
  );

export const useGeneratePreviewToken = <TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<
      GeneratePreviewTokenResult,
      TError,
      { productId: string },
      TContext
    >;
  },
) =>
  useMutation({
    mutationFn: ({ productId }: { productId: string }) =>
      generatePreviewToken(productId),
    ...options?.mutation,
  });

export type SellSettingsUpdate = z.infer<typeof UpdateSellSettingsBody>;
export type DiscountCode = z.infer<typeof DiscountCodeItem>;
export type CreateDiscountCodeInput = z.infer<typeof CreateDiscountCodeBody>;
export type UpdateDiscountCodeInput = z.infer<typeof UpdateDiscountCodeBody>;

// ---------------------------------------------------------------------------
// Update sell settings
// ---------------------------------------------------------------------------

export const getUpdateSellSettingsUrl = (productId: string) =>
  `/api/products/${productId}/sell-settings`;

export const updateSellSettings = (
  productId: string,
  data: SellSettingsUpdate,
  options?: Parameters<typeof customFetch>[1],
) =>
  customFetch<Record<string, unknown>>(getUpdateSellSettingsUrl(productId), {
    method: "PUT",
    body: JSON.stringify(data),
    ...options,
  });

export const getUpdateSellSettingsMutationOptions = <
  TError = unknown,
  TContext = unknown,
>(
  options?: {
    mutation?: UseMutationOptions<
      Awaited<ReturnType<typeof updateSellSettings>>,
      TError,
      { productId: string; data: SellSettingsUpdate },
      TContext
    >;
  },
): UseMutationOptions<
  Awaited<ReturnType<typeof updateSellSettings>>,
  TError,
  { productId: string; data: SellSettingsUpdate },
  TContext
> => {
  const mutationFn: MutationFunction<
    Awaited<ReturnType<typeof updateSellSettings>>,
    { productId: string; data: SellSettingsUpdate }
  > = ({ productId, data }) => updateSellSettings(productId, data);
  return { mutationFn, ...options?.mutation };
};

export const useUpdateSellSettings = <TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<
      Awaited<ReturnType<typeof updateSellSettings>>,
      TError,
      { productId: string; data: SellSettingsUpdate },
      TContext
    >;
  },
) => useMutation(getUpdateSellSettingsMutationOptions(options));

// ---------------------------------------------------------------------------
// Discount Codes
// ---------------------------------------------------------------------------

export const getDiscountCodesUrl = () => `/api/sell/discounts`;
export const createDiscountCodeUrl = () => `/api/sell/discounts`;
export const updateDiscountCodeUrl = (id: string) => `/api/sell/discounts/${id}`;
export const deleteDiscountCodeUrl = (id: string) => `/api/sell/discounts/${id}`;

export const getDiscountCodes = (options?: Parameters<typeof customFetch>[1]) =>
  customFetch<DiscountCode[]>(getDiscountCodesUrl(), { ...options });

export const getGetDiscountCodesQueryKey = (): QueryKey => ["discountCodes"];

export const useGetDiscountCodes = <TData = DiscountCode[], TError = unknown>(
  options?: {
    query?: UseQueryOptions<DiscountCode[], TError, TData>;
  },
) => {
  const queryKey = getGetDiscountCodesQueryKey();
  const queryFn = ({ signal }: { signal?: AbortSignal }) =>
    getDiscountCodes({ signal });
  return useQuery({ queryKey, queryFn, ...options?.query });
};

export const createDiscountCode = (
  data: CreateDiscountCodeInput,
  options?: Parameters<typeof customFetch>[1],
) =>
  customFetch<DiscountCode>(createDiscountCodeUrl(), {
    method: "POST",
    body: JSON.stringify(data),
    ...options,
  });

export const useCreateDiscountCode = <TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<
      DiscountCode,
      TError,
      CreateDiscountCodeInput,
      TContext
    >;
  },
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDiscountCodeInput) => createDiscountCode(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: getGetDiscountCodesQueryKey() }),
    ...options?.mutation,
  });
};

export const updateDiscountCode = (
  id: string,
  data: UpdateDiscountCodeInput,
  options?: Parameters<typeof customFetch>[1],
) =>
  customFetch<DiscountCode>(updateDiscountCodeUrl(id), {
    method: "PATCH",
    body: JSON.stringify(data),
    ...options,
  });

export const useUpdateDiscountCode = <TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<
      DiscountCode,
      TError,
      { id: string; data: UpdateDiscountCodeInput },
      TContext
    >;
  },
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDiscountCodeInput }) =>
      updateDiscountCode(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: getGetDiscountCodesQueryKey() }),
    ...options?.mutation,
  });
};

export const deleteDiscountCode = (
  id: string,
  options?: Parameters<typeof customFetch>[1],
) =>
  customFetch<{ ok: boolean }>(deleteDiscountCodeUrl(id), {
    method: "DELETE",
    ...options,
  });

export const useDeleteDiscountCode = <TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<{ ok: boolean }, TError, string, TContext>;
  },
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDiscountCode(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: getGetDiscountCodesQueryKey() }),
    ...options?.mutation,
  });
};

// ---------------------------------------------------------------------------
// Link in Bio
// ---------------------------------------------------------------------------

import type {
  GetBioResponse,
  UpdateBioSettingsBody,
  BioLinkItem,
  CreateBioLinkBody,
  UpdateBioLinkBody,
  GetPublicBioResponse,
  GetBioAnalyticsResponse,
} from "@workspace/api-zod";

export type BioData = z.infer<typeof GetBioResponse>;
export type BioSettingsUpdate = z.infer<typeof UpdateBioSettingsBody>;
export type BioLink = z.infer<typeof BioLinkItem>;
export type CreateBioLinkInput = z.infer<typeof CreateBioLinkBody>;
export type UpdateBioLinkInput = z.infer<typeof UpdateBioLinkBody>;
export type PublicBio = z.infer<typeof GetPublicBioResponse>;
export type BioAnalytics = z.infer<typeof GetBioAnalyticsResponse>;

export const getGetBioQueryKey = () => ["/api/bio"] as const;

export const getBio = (options?: Parameters<typeof customFetch>[1]) =>
  customFetch<BioData>("/api/bio", options);

export const useGetBio = <TError = unknown>(options?: {
  query?: Partial<UseQueryOptions<BioData, TError>>;
}) =>
  useQuery({
    queryKey: getGetBioQueryKey(),
    queryFn: () => getBio(),
    ...options?.query,
  });

export const getGetBioAnalyticsQueryKey = () => ["/api/bio/analytics"] as const;

export const getBioAnalytics = (options?: Parameters<typeof customFetch>[1]) =>
  customFetch<BioAnalytics>("/api/bio/analytics", options);

export const useGetBioAnalytics = <TError = unknown>(options?: {
  query?: Partial<UseQueryOptions<BioAnalytics, TError>>;
}) =>
  useQuery({
    queryKey: getGetBioAnalyticsQueryKey(),
    queryFn: () => getBioAnalytics(),
    ...options?.query,
  });

export const updateBioSettings = (
  data: BioSettingsUpdate,
  options?: Parameters<typeof customFetch>[1],
) =>
  customFetch<{ settings: BioData["settings"] }>("/api/bio/settings", {
    method: "PUT",
    body: JSON.stringify(data),
    ...options,
  });

export const useUpdateBioSettings = <TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<
      { settings: BioData["settings"] },
      TError,
      BioSettingsUpdate,
      TContext
    >;
  },
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BioSettingsUpdate) => updateBioSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: getGetBioQueryKey() }),
    ...options?.mutation,
  });
};

export const createBioLink = (
  data: CreateBioLinkInput,
  options?: Parameters<typeof customFetch>[1],
) =>
  customFetch<BioLink>("/api/bio/links", {
    method: "POST",
    body: JSON.stringify(data),
    ...options,
  });

export const useCreateBioLink = <TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<BioLink, TError, CreateBioLinkInput, TContext>;
  },
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBioLinkInput) => createBioLink(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: getGetBioQueryKey() }),
    ...options?.mutation,
  });
};

export const updateBioLink = (
  id: string,
  data: UpdateBioLinkInput,
  options?: Parameters<typeof customFetch>[1],
) =>
  customFetch<BioLink>(`/api/bio/links/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    ...options,
  });

export const useUpdateBioLink = <TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<
      BioLink,
      TError,
      { id: string; data: UpdateBioLinkInput },
      TContext
    >;
  },
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBioLinkInput }) =>
      updateBioLink(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: getGetBioQueryKey() }),
    ...options?.mutation,
  });
};

export const deleteBioLink = (
  id: string,
  options?: Parameters<typeof customFetch>[1],
) =>
  customFetch<{ ok: boolean }>(`/api/bio/links/${id}`, {
    method: "DELETE",
    ...options,
  });

export const useDeleteBioLink = <TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<{ ok: boolean }, TError, string, TContext>;
  },
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBioLink(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: getGetBioQueryKey() }),
    ...options?.mutation,
  });
};

export const reorderBioLinks = (
  ids: string[],
  options?: Parameters<typeof customFetch>[1],
) =>
  customFetch<{ links: BioLink[] }>("/api/bio/links/reorder", {
    method: "PUT",
    body: JSON.stringify({ ids }),
    ...options,
  });

export const useReorderBioLinks = <TError = unknown, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<{ links: BioLink[] }, TError, string[], TContext>;
  },
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => reorderBioLinks(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: getGetBioQueryKey() }),
    ...options?.mutation,
  });
};

export const getGetPublicBioQueryKey = (slug: string) =>
  [`/api/public/bio/${slug}`] as const;

export const getPublicBio = (
  slug: string,
  options?: Parameters<typeof customFetch>[1],
) => customFetch<PublicBio>(`/api/public/bio/${slug}`, options);

export const trackPublicBioLinkClick = (
  slug: string,
  linkId: string,
  options?: Parameters<typeof customFetch>[1],
) =>
  customFetch<void>(`/api/public/bio/${slug}/links/${linkId}/click`, {
    method: "POST",
    ...options,
  });

export const useGetPublicBio = <TError = unknown>(
  slug: string,
  options?: { query?: Partial<UseQueryOptions<PublicBio, TError>> },
) =>
  useQuery({
    queryKey: getGetPublicBioQueryKey(slug),
    queryFn: () => getPublicBio(slug),
    retry: false,
    ...options?.query,
  });
