/**
 * canvasHelpers — pure layout utilities for text-on-image compositing.
 *
 * None of the functions have side effects — they only compute and return values.
 */

const BASE_PADDING = 60
const BASE_SIZE    = 1080

// ─── getTextPosition ──────────────────────────────────────────────────────────

/**
 * Returns {x, y, textAlign} for a text block.
 * All 9 grid positions supported.
 * x / y are anchor points; callers use resolveY() to shift by block height.
 *
 * @param {'top-left'|'top-center'|'top-right'|
 *          'center-left'|'center'|'center-right'|
 *          'bottom-left'|'bottom-center'|'bottom-right'} position
 */
export function getTextPosition(position, canvasWidth = 1080, canvasHeight = 1080) {
  const pad = BASE_PADDING * (canvasWidth / BASE_SIZE)
  const cx  = canvasWidth  / 2
  const cy  = canvasHeight / 2

  switch (position) {
    // ── top row ──
    case 'top-left':      return { x: pad,           y: pad,               textAlign: 'left'   }
    case 'top-center':    return { x: cx,             y: pad,               textAlign: 'center' }
    case 'top-right':     return { x: canvasWidth-pad, y: pad,              textAlign: 'right'  }
    // ── middle row ──
    case 'center-left':   return { x: pad,            y: cy,                textAlign: 'left'   }
    case 'center':        return { x: cx,             y: cy,                textAlign: 'center' }
    case 'center-right':  return { x: canvasWidth-pad, y: cy,               textAlign: 'right'  }
    // ── bottom row ──
    case 'bottom-left':   return { x: pad,            y: canvasHeight - pad, textAlign: 'left'  }
    case 'bottom-center': return { x: cx,             y: canvasHeight - pad, textAlign: 'center'}
    case 'bottom-right':  return { x: canvasWidth-pad, y: canvasHeight - pad, textAlign: 'right'}
    default:              return { x: pad,            y: pad,               textAlign: 'left'   }
  }
}

// ─── analyzeImagePlacement ────────────────────────────────────────────────────

/**
 * Samples a 48×48 thumbnail of the image and finds the darkest 3×3 grid region.
 * Returns the position key(s) for the best text placement.
 *
 * For SPLIT style, returns separate positions for the top and bottom halves.
 *
 * @param {string} imageUrl
 * @param {'HEADLINE'|'SUBTITLE'|'MIXED'|'SPLIT'} styleType
 * @returns {Promise<{ textPosition: string, subtitlePosition: string|null }>}
 */
export function analyzeImagePlacement(imageUrl, styleType = 'HEADLINE') {
  return new Promise((resolve) => {
    const fallback = { textPosition: 'bottom-left', subtitlePosition: 'bottom-right' }
    if (!imageUrl) { resolve(fallback); return }

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const S = 48  // small sample for speed
        const canvas = document.createElement('canvas')
        canvas.width = S
        canvas.height = S
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, S, S)

        const t = Math.floor(S / 3)

        // Compute average brightness (perceived luminance) for each 3×3 cell
        const bright = Array.from({ length: 3 }, (_, row) =>
          Array.from({ length: 3 }, (_, col) => {
            const x = col * t
            const y = row * t
            const w = col === 2 ? S - x : t
            const h = row === 2 ? S - y : t
            const px = ctx.getImageData(x, y, w, h).data
            let sum = 0
            for (let i = 0; i < px.length; i += 4) {
              sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
            }
            return sum / (w * h)
          })
        )

        // Map (row, col) → position key
        const posKey = (row, col) => {
          const r = ['top', 'center', 'bottom'][row]
          const c = ['left', 'center', 'right'][col]
          if (r === 'center' && c === 'center') return 'center'
          if (c === 'center') return `${r}-center`
          return `${r}-${c}`
        }

        if (styleType === 'SPLIT') {
          // Headline → darkest cell in top row
          // Subtitle → darkest cell in bottom row (opposite column for visual balance)
          let topPos = 'top-left', topB = Infinity
          let botPos = 'bottom-right', botB = Infinity
          for (let col = 0; col < 3; col++) {
            if (bright[0][col] < topB) { topB = bright[0][col]; topPos = posKey(0, col) }
            if (bright[2][col] < botB) { botB = bright[2][col]; botPos = posKey(2, col) }
          }
          // If both end up on the same side, force opposite alignment
          if (topPos === botPos || topPos.split('-')[1] === botPos.split('-')[1]) {
            botPos = topPos.startsWith('top-left') ? 'bottom-right'
              : topPos.startsWith('top-right') ? 'bottom-left'
              : 'bottom-right'
          }
          resolve({ textPosition: topPos, subtitlePosition: botPos })
        } else {
          // Single block → darkest of all 9
          let best = 'bottom-left', bestB = Infinity
          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
              if (bright[row][col] < bestB) {
                bestB = bright[row][col]
                best  = posKey(row, col)
              }
            }
          }
          resolve({ textPosition: best, subtitlePosition: null })
        }
      } catch {
        resolve(fallback)
      }
    }

    img.onerror = () => resolve(fallback)
    img.src = imageUrl
  })
}

// ─── wrapText ─────────────────────────────────────────────────────────────────

/**
 * Wraps `text` into an array of lines so no line exceeds `maxWidth` pixels.
 *
 * @param {string} text
 * @param {number} maxWidth
 * @param {number} fontSize
 * @param {string} [fontFamily]
 * @returns {string[]}
 */
export function wrapText(text, maxWidth, fontSize, fontFamily = 'Inter') {
  if (!text?.trim()) return []

  let measure
  try {
    const ctx = document.createElement('canvas').getContext('2d')
    ctx.font = `${fontSize}px "${fontFamily}"`
    measure = (str) => ctx.measureText(str).width
  } catch {
    const avgCharWidth = fontSize * 0.52
    measure = (str) => str.length * avgCharWidth
  }

  const words = text.trim().split(/\s+/)
  const lines = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (measure(candidate) <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines
}

// ─── applyOverlay ─────────────────────────────────────────────────────────────

/**
 * Returns the CSS `rgba(…)` color string for the dark overlay layer.
 * Opacity is clamped to 0–0.7.
 *
 * @param {number} opacity
 * @returns {string}
 */
export function applyOverlay(opacity) {
  const clamped = Math.max(0, Math.min(0.7, Number(opacity) || 0))
  return `rgba(0, 0, 0, ${clamped})`
}

// ─── generateGrainCanvas ──────────────────────────────────────────────────────

/**
 * Generates a 256×256 canvas filled with random luminance noise.
 * Alpha-channel controls intensity; canvas is tiled/stretched by Konva
 * to fill the card at any display size.
 *
 * @param {number} intensity  0–1  (opacity of each grain pixel)
 * @returns {HTMLCanvasElement}
 */
/**
 * Generates a warm cream paper texture canvas for the OneFounder brand.
 * Returns a 1024×1024 HTMLCanvasElement with subtle random noise over a cream base.
 */
export function generatePaperCanvas() {
  const S = 1024
  const canvas = document.createElement('canvas')
  canvas.width  = S
  canvas.height = S
  const ctx = canvas.getContext('2d')

  // Warm cream base
  ctx.fillStyle = '#f2ece0'
  ctx.fillRect(0, 0, S, S)

  // Subtle warm noise for paper texture
  const imageData = ctx.getImageData(0, 0, S, S)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 14
    data[i]     = Math.min(255, Math.max(0, data[i]     + noise))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.85))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.6))
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

export function generateGrainCanvas(intensity = 0.25) {
  const S = 256
  const canvas = document.createElement('canvas')
  canvas.width  = S
  canvas.height = S
  const ctx       = canvas.getContext('2d')
  const imageData = ctx.createImageData(S, S)
  const data      = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.floor(Math.random() * 255)
    data[i]     = noise
    data[i + 1] = noise
    data[i + 2] = noise
    data[i + 3] = Math.round(intensity * 255)
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}
