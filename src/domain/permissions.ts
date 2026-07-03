export type AccessMode = "readonly" | "upload" | "edit";

export type PermissionAction = "list" | "preview" | "download" | "upload" | "delete";

export type SharePermissions = Record<PermissionAction, boolean>;

const permissionByMode: Record<AccessMode, SharePermissions> = {
  readonly: {
    list: true,
    preview: true,
    download: true,
    upload: false,
    delete: false
  },
  upload: {
    list: true,
    preview: true,
    download: true,
    upload: true,
    delete: false
  },
  edit: {
    list: true,
    preview: true,
    download: true,
    upload: true,
    delete: true
  }
};

export function normalizeAccessMode(value: unknown): AccessMode {
  if (value === "readonly" || value === "upload" || value === "edit") {
    return value;
  }

  return "upload";
}

export function permissionsForMode(mode: AccessMode): SharePermissions {
  return { ...permissionByMode[mode] };
}

export function canAccess(mode: AccessMode, action: PermissionAction): boolean {
  return permissionByMode[mode][action];
}
