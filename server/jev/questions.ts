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
    instructions: 'Inspect the opening frame and cite its timestamp; identify the visible product or problem cue.',
    evidenceKind: 'shot',
    prevalenceThreshold: 0.7,
  },
  {
    id: 'hook_early_speech_or_text',
    dimensionId: 'hook_strength',
    prompt: 'Do speech or on-screen text appear within the first second?',
    window: 'hook',
    instructions: 'Inspect audio and visible text from 0 through 1 second; cite the observed cue and time.',
    evidenceKind: 'on_screen_text',
    prevalenceThreshold: 0.7,
  },
  {
    id: 'hook_claim_before_brand',
    dimensionId: 'hook_strength',
    prompt: 'Is a claim or conflict stated before any brand name appears?',
    window: 'hook',
    instructions: 'Compare the first claim/conflict with the first brand mention in speech or text; cite both spans.',
    evidenceKind: 'on_screen_text',
    prevalenceThreshold: 0.7,
  },
  {
    id: 'hook_no_logo_intro',
    dimensionId: 'hook_strength',
    prompt: 'Is the first three seconds free of a logo or intro card?',
    window: 'hook',
    instructions: 'Inspect frames from 0 through 3 seconds for a logo or intro card; cite the inspected frame(s).',
    evidenceKind: 'shot',
    prevalenceThreshold: 0.7,
  },
  {
    id: 'hook_end_result',
    dimensionId: 'hook_strength',
    prompt: 'Does the opening show the end result rather than the setup?',
    window: 'hook',
    instructions: 'Identify the opening visual and later result, and cite the opening span used for the judgment.',
    evidenceKind: 'shot',
    prevalenceThreshold: 0.7,
  },

  // Proof.
  {
    id: 'proof_product_used',
    dimensionId: 'product_clarity',
    prompt: 'Is the product physically used on camera, not merely held?',
    window: 'proof',
    instructions: 'Cite a timestamp showing an observable product-use action, not a static hold.',
    evidenceKind: 'action',
    prevalenceThreshold: 0.7,
  },
  {
    id: 'proof_before_after',
    dimensionId: 'product_clarity',
    prompt: 'Is a before/after or side-by-side comparison visible?',
    window: 'proof',
    instructions: 'Cite the frame or shot showing both comparison states together or in sequence.',
    evidenceKind: 'shot',
    prevalenceThreshold: 0.7,
  },
  {
    id: 'proof_demonstrated_claim',
    dimensionId: 'product_clarity',
    prompt: 'Is at least one claim demonstrated rather than only narrated?',
    window: 'proof',
    instructions: 'Cite the visible action or result that demonstrates a stated claim.',
    evidenceKind: 'action',
    prevalenceThreshold: 0.7,
  },
  {
    id: 'proof_specific_number',
    dimensionId: 'product_clarity',
    prompt: 'Does the creative state a specific number (price, percent, quantity or duration)?',
    window: 'proof',
    instructions: 'Quote the exact visible or spoken number and cite its timestamp; do not infer missing values.',
    evidenceKind: 'on_screen_text',
    prevalenceThreshold: 0.7,
  },
  {
    id: 'proof_human_reaction',
    dimensionId: 'product_clarity',
    prompt: 'Is a human face or reaction visible?',
    window: 'proof',
    instructions: 'Cite a frame with a visible human face or reaction.',
    evidenceKind: 'subject',
    prevalenceThreshold: 0.7,
  },

  // Structure and craft.
  {
    id: 'craft_loop_shot',
    dimensionId: 'hook_strength',
    prompt: 'Does the last shot match the opening shot so the video loops cleanly?',
    window: 'craft',
    instructions: 'Compare opening and closing shots and cite the closing frame/shot used for comparison.',
    evidenceKind: 'shot',
    prevalenceThreshold: 0.7,
  },
  {
    id: 'craft_visual_change',
    dimensionId: 'hook_strength',
    prompt: 'Does the image change at least every two seconds?',
    window: 'craft',
    instructions: 'Inspect successive shots across the creative and cite a representative transition interval.',
    evidenceKind: 'shot',
    prevalenceThreshold: 0.7,
  },
  {
    id: 'craft_text_density',
    dimensionId: 'brand_safety',
    prompt: 'Is each on-screen text block five words or fewer?',
    window: 'craft',
    instructions: 'Transcribe visible text blocks and cite a representative block; count whitespace-separated words.',
    evidenceKind: 'on_screen_text',
    prevalenceThreshold: 0.7,
  },

  // Call to action.
  {
    id: 'cta_benefit',
    dimensionId: 'call_to_action',
    prompt: 'Does the call to action name a benefit ("tap for 20% off") rather than only "link in bio"?',
    window: 'cta',
    instructions: 'Quote the closing call to action and cite its visible or spoken span; do not infer a benefit.',
    evidenceKind: 'on_screen_text',
    prevalenceThreshold: 0.7,
  },
])

const QUESTIONS_BY_ID = new Map(JEV_QUESTIONS.map((question) => [question.id, question]))

export function getJevQuestion(questionId: string): JevQuestion | undefined {
  return QUESTIONS_BY_ID.get(questionId)
}
