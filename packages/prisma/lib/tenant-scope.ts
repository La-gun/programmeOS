/**
 * Standard Prisma `where` fragment for models with a direct `tenantId` column.
 * Nested resources (e.g. Participant) still need relation filters or `assertParticipantInTenant`.
 */
export function tenantWhere(tenantId: string) {
  return { tenantId } as const
}
