/**
 * textStyles — all style-type definitions, defaults, and lookup constants.
 *
 * HEADLINE : big italic serif, white, 64–80 px  ("Not an insult.")
 * SUBTITLE : clean sans-serif, off-white, 28–36 px ("Just a truth most people…")
 * MIXED    : bold word(s) + lighter rest, same line, ~48 px
 * SPLIT    : two separate text blocks pinned to different corners
 */

// ─── enum ─────────────────────────────────────────────────────────────────────

export const STYLE_TYPES = {
  HEADLINE: 'HEADLINE',
  SUBTITLE: 'SUBTITLE',
  MIXED:    'MIXED',
  SPLIT:    'SPLIT',
}

// ─── preset schema field list ─────────────────────────────────────────────────

export const PRESET_FIELDS = [
  'headlineFont',
  'headlineSize',
  'headlineStyle',
  'subtitleFont',
  'subtitleSize',
  'overlayOpacity',
  'overlayType',
  'overlayColor',
  'grainAmount',
  'textColor',
  'textPosition',
  'letterSpacing',
  'lineHeight',
  'textTransform',
  'textShadow',
  'shadowBlur',
  'imgBrightness',
  'imgContrast',
  'imgSaturation',
  'imgBlur',
  'bgType',
  'bgColor',
  'bgGradientStart',
  'bgGradientEnd',
]

// ─── per-type defaults ─────────────────────────────────────────────────────────

export const defaultStyles = {
  HEADLINE: {
    headlineFont:     'Playfair Display',
    headlineSize:     72,
    headlineStyle:    'italic',
    subtitleFont:     'Inter',
    subtitleSize:     32,
    overlayOpacity:   0.45,
    overlayType:      'flat',
    overlayColor:     '#000000',
    grainAmount:      0,
    textColor:        '#ffffff',
    textPosition:     'center',
    subtitlePosition: 'bottom-center',
    letterSpacing:    0,
    lineHeight:       1.3,
    textTransform:    'none',
    textShadow:       false,
    shadowBlur:       10,
    imgBrightness:    100,
    imgContrast:      100,
    imgSaturation:    100,
    imgBlur:          0,
    bgType:           'image',
    bgColor:          '#111111',
    bgGradientStart:  '#1a1a2e',
    bgGradientEnd:    '#0d0d0d',
  },

  SUBTITLE: {
    headlineFont:     'Inter',
    headlineSize:     34,
    headlineStyle:    'normal',
    subtitleFont:     'Inter',
    subtitleSize:     26,
    overlayOpacity:   0.35,
    overlayType:      'flat',
    overlayColor:     '#000000',
    grainAmount:      0,
    textColor:        '#f0ede8',
    textPosition:     'center',
    subtitlePosition: 'bottom-center',
    letterSpacing:    1,
    lineHeight:       1.5,
    textTransform:    'none',
    textShadow:       false,
    shadowBlur:       10,
    imgBrightness:    100,
    imgContrast:      100,
    imgSaturation:    100,
    imgBlur:          0,
    bgType:           'image',
    bgColor:          '#111111',
    bgGradientStart:  '#1a1a2e',
    bgGradientEnd:    '#0d0d0d',
  },

  MIXED: {
    headlineFont:     'Playfair Display',
    headlineSize:     52,
    headlineStyle:    'normal',
    subtitleFont:     'Inter',
    subtitleSize:     48,
    overlayOpacity:   0.45,
    overlayType:      'flat',
    overlayColor:     '#000000',
    grainAmount:      0,
    textColor:        '#ffffff',
    textPosition:     'center',
    subtitlePosition: 'center',
    letterSpacing:    0,
    lineHeight:       1.3,
    textTransform:    'none',
    textShadow:       false,
    shadowBlur:       10,
    imgBrightness:    100,
    imgContrast:      100,
    imgSaturation:    100,
    imgBlur:          0,
    bgType:           'image',
    bgColor:          '#111111',
    bgGradientStart:  '#1a1a2e',
    bgGradientEnd:    '#0d0d0d',
  },

  SPLIT: {
    headlineFont:     'Playfair Display',
    headlineSize:     68,
    headlineStyle:    'italic',
    subtitleFont:     'Inter',
    subtitleSize:     28,
    overlayOpacity:   0.50,
    overlayType:      'flat',
    overlayColor:     '#000000',
    grainAmount:      0,
    textColor:        '#ffffff',
    textPosition:     'top-left',
    subtitlePosition: 'bottom-left',
    letterSpacing:    0,
    lineHeight:       1.3,
    textTransform:    'none',
    textShadow:       false,
    shadowBlur:       10,
    imgBrightness:    100,
    imgContrast:      100,
    imgSaturation:    100,
    imgBlur:          0,
    bgType:           'image',
    bgColor:          '#111111',
    bgGradientStart:  '#1a1a2e',
    bgGradientEnd:    '#0d0d0d',
  },
}

// ─── OneFounder brand style ───────────────────────────────────────────────────

export const OF_STYLE = {
  styleType:       'MIXED',
  headlineFont:    'Courier Prime',
  headlineSize:    52,
  headlineStyle:   'normal',
  subtitleFont:    'Courier Prime',
  subtitleSize:    28,
  overlayOpacity:  0,
  overlayType:     'flat',
  overlayColor:    '#000000',
  grainAmount:     0,
  textColor:       '#2a2a2a',
  textPosition:    'center',
  subtitlePosition:'bottom-center',
  letterSpacing:   0.5,
  lineHeight:      1.6,
  textTransform:   'none',
  textShadow:      false,
  shadowBlur:      0,
  imgBrightness:   100,
  imgContrast:     100,
  imgSaturation:   100,
  imgBlur:         0,
  bgType:          'paper',
  bgColor:         '#f2ece0',
  bgGradientStart: '#f2ece0',
  bgGradientEnd:   '#e8e0d0',
}

// ─── font menu ─────────────────────────────────────────────────────────────────
// Must match the @font-face families loaded in index.html.

export const FONTS = [
  // Serif / Display serif
  'Playfair Display',
  'DM Serif Display',
  'Cormorant Garamond',
  'EB Garamond',
  'Lora',
  'Crimson Text',
  // Sans-serif
  'Inter',
  'Montserrat',
  'Raleway',
  'Josefin Sans',
  'Work Sans',
  // Display / Headline
  'Bebas Neue',
  // Monospace / Typewriter
  'Courier Prime',
  // System fallbacks
  'Georgia',
  'Arial',
]

// ─── position menu ────────────────────────────────────────────────────────────

export const POSITIONS = [
  { value: 'top-left',      label: 'Top Left'      },
  { value: 'top-center',    label: 'Top Center'    },
  { value: 'top-right',     label: 'Top Right'     },
  { value: 'center-left',   label: 'Center Left'   },
  { value: 'center',        label: 'Center'        },
  { value: 'center-right',  label: 'Center Right'  },
  { value: 'bottom-left',   label: 'Bottom Left'   },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right',  label: 'Bottom Right'  },
]

// 3×3 grid layout for the visual position picker
export const POSITION_GRID = [
  ['top-left',    'top-center',    'top-right'   ],
  ['center-left', 'center',        'center-right' ],
  ['bottom-left', 'bottom-center', 'bottom-right' ],
]

// ─── overlay types ────────────────────────────────────────────────────────────

export const OVERLAY_TYPES = [
  { value: 'flat',        label: 'Flat'     },
  { value: 'bottom-fade', label: 'Bottom'   },
  { value: 'top-fade',    label: 'Top'      },
  { value: 'vignette',    label: 'Vignette' },
]

// ─── background types ─────────────────────────────────────────────────────────

export const BG_TYPES = [
  { value: 'image',    label: 'Image'    },
  { value: 'solid',    label: 'Color'    },
  { value: 'gradient', label: 'Gradient' },
]
