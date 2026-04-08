import {
  INTEGRITY_RULE_DEFINITIONS,
  SUBMISSION_VELOCITY_THRESHOLD,
  SUBMISSION_VELOCITY_WINDOW_HOURS
} from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { requireIntegrityQueueAccess } from '@/lib/api-auth'

/** Static rule catalog for UI: thresholds + plain-English descriptions. */
export async function GET() {
  const auth = await requireIntegrityQueueAccess()
  if (!auth.ok) {
    return auth.response
  }

  return NextResponse.json({
    rules: INTEGRITY_RULE_DEFINITIONS.map((r) => ({
      code: r.code,
      title: r.title,
      plainEnglish: r.plainEnglish
    })),
    parameters: {
      submissionVelocity: {
        windowHours: SUBMISSION_VELOCITY_WINDOW_HOURS,
        flagWhenSubmissionCountAtLeast: SUBMISSION_VELOCITY_THRESHOLD
      }
    }
  })
}
