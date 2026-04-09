import { tenantWhere } from '../tenant-scope'

describe('tenantWhere', () => {
  it('returns a Prisma-compatible tenant filter', () => {
    expect(tenantWhere('tenant_abc')).toEqual({ tenantId: 'tenant_abc' })
  })
})
