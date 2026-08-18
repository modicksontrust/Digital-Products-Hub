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
} from "@workspace/api-zod";

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
) => {
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
