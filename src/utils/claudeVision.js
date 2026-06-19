/**
 * claudeVision — uses Claude vision to find the best text placement region.
 *
 * Uses claude-sonnet-4-6 (much better spatial reasoning than Haiku).
 * Falls back to pixel-sampling analyzeImagePlacement() if the key is absent
 * or the API call fails.
 *
 * Stores result in sessionStorage so re-selecting the same image is instant.
 */

import { analyzeImagePlacement } from './canvasHelpers'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

const VALID_POSITIONS = new Set([
  'top-left', 'top-center', 'top-right',
  'center-left', 'center', 'center-right',
  'bottom-left', 'bottom-center', 'bottom-right',
])

const OPPOSITE = {
  'top-left':      'bottom-right',
  'top-center':    'bottom-center',
  'top-right':     'bottom-left',
  'center-left':   'center-right',
  'center':        'bottom-left',
  'center-right':  'center-left',
  'bottom-left':   'top-right',
  'bottom-center': 'top-center',
  'bottom-right':  'top-left',
}

function validPos(val) {
  return VALID_POSITIONS.has(val) ? val : null
}

function buildImageSource(imageUrl) {
  if (imageUrl.startsWith('data:image/')) {
    const comma   = imageUrl.indexOf(',')
    const header  = imageUrl.slice(0, comma)
    const data    = imageUrl.slice(comma + 1)
    const type    = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg'
    return { type: 'base64', media_type: type, data }
  }
  return { type: 'url', url: imageUrl }
}

function cacheKey(imageUrl, styleType) {
  return `cv:${styleType}:${imageUrl.slice(0, 120)}`
}

function buildPrompt(isSplit, needsSubtitle) {
  const grid = `
The image is divided into a 3×3 grid of equal cells — use these exact names:

  top-left    | top-center    | top-right
  center-left | center        | center-right
  bottom-left | bottom-center | bottom-right`

  const goodCriteria = `
✅ IDEAL text regions:
  - Uniform dark tones: dark sky, shadowed walls, deep backgrounds
  - Out-of-focus / blurred zones: bokeh backgrounds, depth-of-field blur
  - Plain solid surfaces: concrete, matte walls, still water, floor
  - Visual negative space: open sky, empty foreground, uncluttered areas
  - Bottom-fade or vignette zones (corners / edges often work well)`

  const badCriteria = `
❌ AVOID placing text over:
  - Faces, eyes, hands, or the main subject of the photo
  - Busy or high-frequency textures: foliage, fabric patterns, crowds
  - Bright or overexposed regions (text becomes invisible)
  - Strong edges or high-contrast borders
  - Any existing text, logos, or watermarks in the photo`

  if (isSplit) {
    return `You are a professional Instagram carousel designer. This square photo will be used as a card background. Two white text blocks will be placed on it: one near the top of the image and one near the bottom.
${grid}
${goodCriteria}
${badCriteria}

Task: Find the best cell for EACH text block.
  - textPosition  → best cell in the TOP half of the image (top row preferred, center row if needed)
  - subtitlePosition → best cell in the BOTTOM half of the image (bottom row preferred)
  They must be in DIFFERENT columns so the two blocks don't overlap visually.

Respond with ONLY valid JSON on a single line — no markdown, no explanation:
{"textPosition":"<cell>","subtitlePosition":"<cell>"}`
  }

  if (needsSubtitle) {
    return `You are a professional Instagram carousel designer. This square photo will be used as a card background. A headline text block and a smaller subtitle text block will be placed on it.
${grid}
${goodCriteria}
${badCriteria}

Task: Find the two best cells.
  - textPosition     → best single cell for the HEADLINE (primary, most important)
  - subtitlePosition → best cell for the SUBTITLE (secondary; must be DIFFERENT from textPosition;
                        ideally in the same visual region but a different row, or the opposite corner)

Respond with ONLY valid JSON on a single line — no markdown, no explanation:
{"textPosition":"<cell>","subtitlePosition":"<cell>"}`
  }

  return `You are a professional Instagram carousel designer. This square photo will be used as a card background. A single white text block will be placed on it.
${grid}
${goodCriteria}
${badCriteria}

Task: Choose the SINGLE best grid cell where white text will look most professional and readable — dark, uncluttered, and away from the main subject.

Respond with ONLY valid JSON on a single line — no markdown, no explanation:
{"textPosition":"<cell>","subtitlePosition":null}`
}

/**
 * Analyzes the image with Claude vision and returns optimal text positions.
 * Falls back to analyzeImagePlacement() if Claude is unavailable.
 *
 * @param {string} imageUrl
 * @param {'HEADLINE'|'SUBTITLE'|'MIXED'|'SPLIT'} styleType
 * @returns {Promise<{ textPosition: string, subtitlePosition: string|null }>}
 */
export async function analyzeImageWithClaude(imageUrl, styleType = 'HEADLINE') {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!key || !imageUrl) {
    return analyzeImagePlacement(imageUrl, styleType)
  }

  // Return cached result for the same image + style combination
  const ck = cacheKey(imageUrl, styleType)
  try {
    const cached = sessionStorage.getItem(ck)
    if (cached) return JSON.parse(cached)
  } catch { /* ignore */ }

  try {
    const isSplit      = styleType === 'SPLIT'
    const needsSubtitle = styleType === 'HEADLINE' || styleType === 'SUBTITLE'
    const prompt       = buildPrompt(isSplit, needsSubtitle)

    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key':                            key,
        'anthropic-version':                    '2023-06-01',
        'content-type':                         'application/json',
        'anthropic-dangerous-client-side-keys': 'true',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: buildImageSource(imageUrl) },
            { type: 'text',  text: prompt },
          ],
        }],
      }),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''

    // Extract the JSON object (handles markdown code fences or extra prose)
    const match = text.match(/\{[^{}]+\}/)
    if (!match) throw new Error('no JSON in response')

    const parsed      = JSON.parse(match[0])
    const textPos     = validPos(parsed.textPosition) ?? 'bottom-left'
    let   subPos      = validPos(parsed.subtitlePosition) ?? null

    // If Claude returned same position for both, pick the opposite
    if (subPos && subPos === textPos) subPos = OPPOSITE[textPos] ?? null

    const result = {
      textPosition:     textPos,
      subtitlePosition: (isSplit || needsSubtitle) ? subPos : null,
    }

    // Cache for this session so re-selecting the same image is free
    try { sessionStorage.setItem(ck, JSON.stringify(result)) } catch { /* ignore */ }

    return result
  } catch {
    return analyzeImagePlacement(imageUrl, styleType)
  }
}
