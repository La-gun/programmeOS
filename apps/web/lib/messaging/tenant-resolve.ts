import { prisma } from '@programmeos/prisma'

/**
 * Resolves tenant for inbound webhooks: explicit env, header, or demo tenant by domain.
 */
export async function resolveInboundTenantId(headerTenantId: string | null): Promise<string | null> {
  const fromEnv = process.env.MESSAGING_DEFAULT_TENANT_ID?.trim()
  if (fromEnv) {
    return fromEnv
  }
  const fromHeader = headerTenantId?.trim()
  if (fromHeader) {
    const row = await prisma.tenant.findFirst({
      where: { id: fromHeader },
      select: { id: true }
    })
    if (row) return row.id
  }
  const demo = await prisma.tenant.findFirst({
    where: { domain: 'demo.programmeos.com' },
    select: { id: true }
  })
  return demo?.id ?? null
}
