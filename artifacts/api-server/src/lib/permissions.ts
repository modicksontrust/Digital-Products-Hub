export type Role = "admin" | "manager" | "creator" | "uploader" | "marketer";

const PERMISSION_KEYS = [
  "canCreateProduct",
  "canUploadProduct",
  "canViewAllProducts",
  "canReview",
  "canManageSalesCopy",
  "canManageLeadMagnets",
  "canGrantCredits",
  "canManageUsers",
  "canManageLearn",
  "canManageSettings",
  "canViewAuditLog",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

const ROLE_PERMISSIONS: Record<Role, PermissionKey[]> = {
  admin: [...PERMISSION_KEYS],
  manager: [
    "canCreateProduct",
    "canUploadProduct",
    "canViewAllProducts",
    "canReview",
    "canManageSalesCopy",
    "canManageLeadMagnets",
    "canGrantCredits",
  ],
  creator: ["canCreateProduct", "canManageSalesCopy", "canManageLeadMagnets"],
  uploader: ["canUploadProduct"],
  marketer: ["canManageSalesCopy", "canManageLeadMagnets", "canViewAllProducts"],
};

export function permissionsFor(role: string): Record<string, boolean> {
  const granted = ROLE_PERMISSIONS[role as Role] ?? [];
  const map: Record<string, boolean> = {};
  for (const key of PERMISSION_KEYS) {
    map[key] = granted.includes(key);
  }
  return map;
}

export function hasPermission(role: string, key: PermissionKey): boolean {
  return (ROLE_PERMISSIONS[role as Role] ?? []).includes(key);
}
