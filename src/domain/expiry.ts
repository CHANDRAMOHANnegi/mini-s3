export type Expirable = {
  expiresAt: string | null;
  revokedAt?: string | null;
  deletedAt?: string | null;
};

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function isExpired(entity: Expirable, now = new Date()): boolean {
  if (!entity.expiresAt) return false;
  return now.getTime() > new Date(entity.expiresAt).getTime();
}

export function isRevoked(entity: Expirable): boolean {
  return Boolean(entity.revokedAt);
}

export function isDeleted(entity: Expirable): boolean {
  return Boolean(entity.deletedAt);
}

export function isInactive(entity: Expirable, now = new Date()): boolean {
  return isExpired(entity, now) || isRevoked(entity) || isDeleted(entity);
}
