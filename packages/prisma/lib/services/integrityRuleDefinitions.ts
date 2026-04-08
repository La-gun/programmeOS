import { IntegrityRuleCode } from '@prisma/client'

/** Rolling window for counting submitted evidence (hours). */
export const SUBMISSION_VELOCITY_WINDOW_HOURS = 24

/**
 * Flag when this many or more submissions (including the current one) land in the window.
 * Rule: count >= threshold triggers a case line.
 */
export const SUBMISSION_VELOCITY_THRESHOLD = 5

export type IntegrityRuleDefinition = {
  code: IntegrityRuleCode
  /** Short name for UI and summaries */
  title: string
  /**
   * Baseline explanation of the rule (no live data).
   * Shown in the integrity UI so staff understand what automated checks do.
   */
  plainEnglish: string
}

export const INTEGRITY_RULE_DEFINITIONS: IntegrityRuleDefinition[] = [
  {
    code: IntegrityRuleCode.DUPLICATE_PHONE,
    title: 'Shared phone number',
    plainEnglish:
      'If this participant has a WhatsApp number on file, we compare it to every other participant in your workspace. ' +
      'When the same normalised number appears on more than one profile, we flag it because one phone usually belongs to one person — ' +
      'duplicates can mean a mistaken enrolment or someone joining twice.'
  },
  {
    code: IntegrityRuleCode.SUBMISSION_VELOCITY,
    title: 'High submission rate',
    plainEnglish:
      `We count how many evidence packages this participant has submitted in the last ${SUBMISSION_VELOCITY_WINDOW_HOURS} hours ` +
      `(not drafts — only items that reached submitted status). ` +
      `If the count reaches ${SUBMISSION_VELOCITY_THRESHOLD} or more, we flag it because that pace is unusual for most programmes ` +
      'and can indicate duplicate accounts, bulk uploads, or a workflow issue worth a quick human check.'
  }
]

export function getIntegrityRuleDefinition(code: IntegrityRuleCode): IntegrityRuleDefinition | undefined {
  return INTEGRITY_RULE_DEFINITIONS.find((d) => d.code === code)
}
