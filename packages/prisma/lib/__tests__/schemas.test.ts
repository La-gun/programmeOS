import { idSchema, programmeCreateSchema } from '../services/schemas'

describe('idSchema', () => {
  it('accepts a non-empty id', () => {
    expect(idSchema.parse('clxyz123')).toBe('clxyz123')
  })

  it('rejects empty string', () => {
    expect(() => idSchema.parse('')).toThrow()
  })
})

describe('programmeCreateSchema', () => {
  it('accepts minimal valid payload', () => {
    const out = programmeCreateSchema.parse({ name: '  Pilot  ' })
    expect(out.name).toBe('Pilot')
  })

  it('rejects empty name', () => {
    expect(() => programmeCreateSchema.parse({ name: '' })).toThrow()
  })
})
