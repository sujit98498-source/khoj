export type AdminAllowedRole = 'admin' | 'founder' | 'ceo'

interface RoleSource {
  role?: unknown
  isAdmin?: unknown
}

export function normalizeAdminRole(role: unknown): string {
  return typeof role === 'string' ? role.trim().toLowerCase() : ''
}

export function resolveAdminRole(source: RoleSource | null | undefined): AdminAllowedRole | null {
  if (source?.isAdmin === true) return 'admin'

  const role = normalizeAdminRole(source?.role)
  if (role === 'admin' || role === 'founder' || role === 'ceo') return role

  return null
}

export function hasAllowedAdminRole(
  source: RoleSource | null | undefined,
  allowedRoles: AdminAllowedRole[]
): boolean {
  const role = resolveAdminRole(source)
  return Boolean(role && allowedRoles.includes(role))
}
