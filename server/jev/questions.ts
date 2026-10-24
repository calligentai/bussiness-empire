import type { JevQuestion } from '../../types/jev'

/**
 * The frozen atomic question set. A question is answerable from facts that carry a
 * timestamp or shot id, returns a 0..1 probability rather than a boolean, and is
 * bound to exactly one rubric dimension so a low answer can be reported as a
 * concrete fix.
 *
 * Changing a prompt, id or dimension mapping is a question-set version change:
 * update this constant, the docs and the tests together. A baseline built from a
 * different version is refused rather than compared silently.
 */
export const JEV_QUESTION_SET_VERSION = '1.0.0'

export const JEV_QUESTIONS: readonly JevQuestion[] = Object.freeze([
  // Hook, 0-3 s.
  {
    id: 'hook_product_or_problem',
    dimensionId: 'hook_strength',
    prompt: 'Does the first frame show the product or the problem it solves?',
    window: 'hook',
  },
  {
    id: 'hook_early_speech_or_text',
    dimensionId: 'hook_strength',
    prompt: 'Do speech or on-screen text appear within the first second?',
    window: 'hook',
  },
  {
    id: 'hook_claim_before_brand',
    dimensionId: 'hook_strength',
    prompt: 'Is a claim or conflict stated before any brand name appears?',
    window: 'hook',
  },
  {
    id: 'hook_no_logo_intro',
    dimensionId: 'hook_strength',
    prompt: 'Is the first three seconds free of a logo or intro card?',
    window: 'hook',
  },
  {
    id: 'hook_end_result',
    dimensionId: 'hook_strength',
    prompt: 'Does the opening show the end result rather than the setup?',
    window: 'hook',
  },

  // Proof.
  {
    id: 'proof_product_used',
    dimensionId: 'product_clarity',
    prompt: 'Is the product physically used on camera, not merely held?',
    window: 'proof',
  },
  {
    id: 'proof_before_after',
    dimensionId: 'product_clarity',
    prompt: 'Is a before/after or side-by-side comparison visible?',
    window: 'proof',
  },
  {
    id: 'proof_demonstrated_claim',
    dimensionId: 'product_clarity',
    prompt: 'Is at least one claim demonstrated rather than only narrated?',
    window: 'proof',
  },
  {
    id: 'proof_specific_number',
    dimensionId: 'product_clarity',
    prompt: 'Does the creative state a specific number (price, percent, quantity or duration)?',
    window: 'proof',
  },
  {
    id: 'proof_human_reaction',
    dimensionId: 'product_clarity',
    prompt: 'Is a human face or reaction visible?',
    window: 'proof',
  },

  // Structure and craft.
  {
    id: 'craft_loop_shot',
    dimensionId: 'hook_strength',
    prompt: 'Does the last shot match the opening shot so the video loops cleanly?',
    window: 'craft',
  },
  {
    id: 'craft_visual_change',
    dimensionId: 'hook_strength',
    prompt: 'Does the image change at least every two seconds?',
    window: 'craft',
  },
  {
    id: 'craft_text_density',
    dimensionId: 'brand_safety',
    prompt: 'Is each on-screen text block five words or fewer?',
    window: 'craft',
  },

  // Call to action.
  {
    id: 'cta_benefit',
    dimensionId: 'call_to_action',
    prompt: 'Does the call to action name a benefit ("tap for 20% off") rather than only "link in bio"?',
    window: 'cta',
  },
])

const QUESTIONS_BY_ID = new Map(JEV_QUESTIONS.map((question) => [question.id, question]))

export function getJevQuestion(questionId: string): JevQuestion | undefined {
  return QUESTIONS_BY_ID.get(questionId)
}
