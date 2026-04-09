import { z } from 'zod'

const productionServerSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET should be at least 32 characters')
})

/**
 * Validates secrets required for a real production deployment.
 * Skips during Next.js production *build* so `next build` can run in CI with injected env.
 * Runs when the Node server/runtime loads in production (e.g. `next start`).
 */
export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') {
    return
  }
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return
  }

  const result = productionServerSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET
  })

  if (!result.success) {
    const msg = result.error.flatten().fieldErrors
    console.error('[env] Invalid production configuration:', msg)
    throw new Error('Invalid production environment configuration')
  }
}
