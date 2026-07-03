export type AccessMode = "edit";

export type PermissionAction = "list" | "preview" | "download" | "upload" | "delete";

export type SharePermissions = Record<PermissionAction, boolean>;

const permissionByMode: Record<AccessMode, SharePermissions> = {
  edit: {
    list: true,
    preview: true,
    download: true,
    upload: true,
    delete: true
  }
};

export function normalizeAccessMode(value: unknown): AccessMode {
  void value;
  return "edit";
}

export function permissionsForMode(mode: AccessMode): SharePermissions {
  return { ...permissionByMode[mode] };
}

export function canAccess(mode: AccessMode, action: PermissionAction): boolean {
  return permissionByMode[mode][action];
}
