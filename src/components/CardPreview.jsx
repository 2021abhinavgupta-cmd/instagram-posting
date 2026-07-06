/**
 * CardPreview — live Konva canvas preview of a single carousel card.
 *
 * Layers (bottom → top):
 *   1. Solid base rect (#111111)
 *   2. Background fill  (image / solid color / gradient)
 *   3. Overlay          (flat / directional fade / vignette, colored)
 *   4. Grain texture
 *   5. Headline text (or MIXED bold+regular pair)
 *   6. Subtitle text
 *   7. Watermark image
 *   8. Slide indicator pill
 *
 * Props (beyond cardData / size):
 *   watermark          — { url, position, size, opacity } | null
 *   showSlideIndicator — boolean
 *   slideIndex         — 1-based card index
 *   totalSlides        — total card count
 *   indicatorPosition  — one of 9 position keys
 *   draggableText      — when true, headline + subtitle can be dragged to reposition
 *   onTextDrag         — (patch) => void — called with { textDragX, textDragY } or
 *                        { subtitleDragX, subtitleDragY } on drag end (1080-scale px)
 */

import { forwardRef, useImperativeHandle, useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { Stage, Layer, Rect, Image as KonvaImage, Text, Group } from 'react-konva'
import Konva from 'konva'
import { getTextPosition, wrapText, generateGrainCanvas, generatePaperCanvas } from '../utils/canvasHelpers'
import { defaultStyles } from '../utils/textStyles'

// ─── constants ────────────────────────────────────────────────────────────────

const PREVIEW_SIZE = 360
const EXPORT_SIZE  = 1080
const LINE_HEIGHT  = 1.3

// ─── helpers ──────────────────────────────────────────────────────────────────

function useKonvaImage(url) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    if (!url) { setImg(null); return }
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.onload  = () => setImg(image)
    image.onerror = () => setImg(null)
    image.src = url
    return () => { image.onload = null; image.onerror = null }
  }, [url])
  return img
}

function coverFit(imgEl, size) {
  if (!imgEl) return null
  const scale = Math.max(size / imgEl.width, size / imgEl.height)
  const w = imgEl.width  * scale
  const h = imgEl.height * scale
  return { x: (size - w) / 2, y: (size - h) / 2, width: w, height: h }
}

function measureTextWidth(text, fontSize, fontFamily, bold = false) {
  try {
    const ctx = document.createElement('canvas').getContext('2d')
    ctx.font = `${bold ? 'bold ' : ''}${Math.round(fontSize)}px "${fontFamily}"`
    return ctx.measureText(text).width
  } catch {
    return text.length * fontSize * (bold ? 0.6 : 0.52)
  }
}

function fitFontSize(text, maxWidth, fontSize, fontFamily) {
  if (!text?.trim() || maxWidth <= 0 || fontSize <= 0) return fontSize
  const widest = text.split(/\s+/).reduce((max, word) => {
    const w = measureTextWidth(word, fontSize, fontFamily, false)
    return w > max ? w : max
  }, 0)
  if (widest <= maxWidth) return fontSize
  return Math.max(fontSize * 0.5, Math.floor(fontSize * (maxWidth / widest)))
}

function estimateTextHeight(text, fontSize, availableWidth, fontFamily, lh = LINE_HEIGHT) {
  if (!text?.trim()) return 0
  const lines = wrapText(text, availableWidth, fontSize, fontFamily)
  return lines.length * fontSize * lh
}

function resolveY(position, anchorY, blockHeight) {
  if (position === 'center' ||
      position === 'center-left' ||
      position === 'center-right')      return anchorY - blockHeight / 2
  if (position?.startsWith('bottom-')) return anchorY - blockHeight
  return anchorY
}

function parseMixed(text = '') {
  const match = text.match(/^\*\*(.+?)\*\*\s*(.*)$/s)
  return match
    ? { boldPart: match[1], regularPart: match[2] }
    : { boldPart: text, regularPart: '' }
}

function konvaFontStyle(italic, bold = false) {
  if (italic && bold) return 'bold italic'
  if (bold)           return 'bold'
  if (italic)         return 'italic'
  return 'normal'
}

function applyTextTransform(text, transform) {
  if (!text) return ''
  if (transform === 'uppercase') return text.toUpperCase()
  if (transform === 'lowercase') return text.toLowerCase()
  return text
}

/** Convert #rrggbb hex to `rgba(r,g,b,a)` string. */
function hexRgba(hex, alpha) {
  const h = (hex || '#000000').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── text prop builder ────────────────────────────────────────────────────────

function textProps({
  text, position, stageSize, fontSize, fontFamily, fontStyle, fill,
  lineHeight, letterSpacing, shadowEnabled, shadowColor, shadowBlur, shadowOffset,
}) {
  const lh       = lineHeight ?? LINE_HEIGHT
  const pad      = 20 * (stageSize / PREVIEW_SIZE)
  const maxWidth = stageSize - 2 * pad
  const { textAlign } = getTextPosition(position, stageSize, stageSize)

  const blockH     = estimateTextHeight(text, fontSize, maxWidth, fontFamily, lh)
  const { y: anchorY } = getTextPosition(position, stageSize, stageSize)
  const y = resolveY(position, anchorY, blockH)

  const props = {
    x: pad, y: Math.max(pad, y),
    width: maxWidth,
    text, fontSize, fontFamily, fontStyle, fill,
    align: textAlign,
    wrap: 'word',
    lineHeight: lh,
    letterSpacing: letterSpacing ?? 0,
    listening: false,
  }

  if (shadowEnabled) {
    props.shadowEnabled = true
    props.shadowColor   = shadowColor ?? 'rgba(0,0,0,0.85)'
    props.shadowBlur    = shadowBlur  ?? 8
    props.shadowOffsetX = 0
    props.shadowOffsetY = shadowOffset ?? 2
  }

  return props
}

// ─── DraggableTextGroup ───────────────────────────────────────────────────────

/**
 * Wraps a Konva text block in a draggable Group with:
 *   - Transparent hit area (so the full block is draggable, not just glyph pixels)
 *   - Dashed selection border on hover
 *   - Cursor feedback (grab / grabbing)
 */
function DraggableTextGroup({ x, y, width, height, onDragEnd, dragBound, children }) {
  const [hovered, setHovered] = useState(false)
  const blockH = Math.max(height, 16)

  const getContainer = (e) => e.target.getStage()?.container()

  return (
    <Group
      x={x} y={y}
      draggable
      dragBoundFunc={dragBound}
      onMouseEnter={(e) => {
        setHovered(true)
        const c = getContainer(e)
        if (c) c.style.cursor = 'grab'
      }}
      onMouseLeave={(e) => {
        setHovered(false)
        const c = getContainer(e)
        if (c) c.style.cursor = 'default'
      }}
      onDragStart={(e) => {
        const c = getContainer(e)
        if (c) c.style.cursor = 'grabbing'
      }}
      onDragEnd={(e) => {
        onDragEnd(e)
        const c = getContainer(e)
        if (c) c.style.cursor = 'grab'
      }}
    >
      {/* Transparent hit area over the full text block */}
      <Rect x={0} y={0} width={width} height={blockH} fill="rgba(0,0,0,0)" />

      {/* Dashed hover border */}
      {hovered && (
        <Rect
          x={-4} y={-4} width={width + 8} height={blockH + 8}
          stroke="rgba(255,255,255,0.35)" strokeWidth={1}
          dash={[5, 3]} fill="transparent" cornerRadius={3}
          listening={false}
        />
      )}

      {children}
    </Group>
  )
}

// ─── OverlayRect ─────────────────────────────────────────────────────────────

function OverlayRect({ overlayType, overlayOpacity, overlayColor, size }) {
  const op  = Math.min(0.95, overlayOpacity)
  const col = overlayColor || '#000000'
  const base = { x: 0, y: 0, width: size, height: size, listening: false }

  if (overlayType === 'bottom-fade') {
    return (
      <Rect
        {...base}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: size }}
        fillLinearGradientColorStops={[
          0, hexRgba(col, 0),
          0.45, hexRgba(col, 0),
          1, hexRgba(col, Math.min(0.95, op * 1.5)),
        ]}
      />
    )
  }
  if (overlayType === 'top-fade') {
    return (
      <Rect
        {...base}
        fillLinearGradientStartPoint={{ x: 0, y: size }}
        fillLinearGradientEndPoint={{ x: 0, y: 0 }}
        fillLinearGradientColorStops={[
          0, hexRgba(col, 0),
          0.45, hexRgba(col, 0),
          1, hexRgba(col, Math.min(0.95, op * 1.5)),
        ]}
      />
    )
  }
  if (overlayType === 'vignette') {
    return (
      <Rect
        {...base}
        fillRadialGradientStartPoint={{ x: size / 2, y: size / 2 }}
        fillRadialGradientEndPoint={{ x: size / 2, y: size / 2 }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndRadius={size * 0.75}
        fillRadialGradientColorStops={[
          0, hexRgba(col, 0),
          0.5, hexRgba(col, 0),
          1, hexRgba(col, Math.min(0.95, op * 1.7)),
        ]}
      />
    )
  }
  return <Rect {...base} fill={hexRgba(col, op)} />
}

// ─── WatermarkLayer ───────────────────────────────────────────────────────────

function WatermarkLayer({ watermark, size, displayScale }) {
  const wmImage = useKonvaImage(watermark?.url ?? null)
  if (!wmImage || !watermark?.url) return null

  const wBase = (watermark.size ?? 80) * displayScale
  const aspect = wmImage.width / (wmImage.height || 1)
  const wW = wBase
  const wH = wBase / aspect
  const pad = 20 * displayScale

  const pos = watermark.position ?? 'bottom-right'
  let x, y
  if (pos.endsWith('right'))       x = size - pad - wW
  else if (pos.endsWith('left'))   x = pad
  else                             x = (size - wW) / 2
  if (pos.startsWith('bottom'))    y = size - pad - wH
  else if (pos.startsWith('top'))  y = pad
  else                             y = (size - wH) / 2

  return (
    <KonvaImage
      image={wmImage}
      x={x} y={y}
      width={wW} height={wH}
      opacity={watermark.opacity ?? 0.8}
      listening={false}
    />
  )
}

// ─── SlideIndicator ───────────────────────────────────────────────────────────

function SlideIndicator({ slideIndex, totalSlides, size, displayScale, position }) {
  const text     = `${String(slideIndex).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}`
  const fontSize = Math.max(8, Math.round(13 * displayScale))
  const pp       = Math.round(5 * displayScale)
  const textW    = measureTextWidth(text, fontSize, 'Inter', false)
  const pillW    = textW + pp * 2
  const pillH    = fontSize + pp * 2
  const pad      = Math.round(16 * displayScale)
  const pos      = position ?? 'bottom-right'

  let x, y
  if (pos.endsWith('right'))       x = size - pad - pillW
  else if (pos.endsWith('left'))   x = pad
  else                             x = (size - pillW) / 2
  if (pos.startsWith('bottom'))    y = size - pad - pillH
  else if (pos.startsWith('top')) y = pad
  else                             y = (size - pillH) / 2

  return (
    <Group x={x} y={y} listening={false}>
      <Rect
        width={pillW} height={pillH}
        fill="rgba(0,0,0,0.5)"
        cornerRadius={pillH / 2}
      />
      <Text
        x={pp} y={pp}
        text={text}
        fontSize={fontSize}
        fontFamily="Inter"
        fontStyle="normal"
        fill="rgba(255,255,255,0.85)"
        listening={false}
      />
    </Group>
  )
}

// ─── CardPreview ──────────────────────────────────────────────────────────────

const CardPreview = forwardRef(function CardPreview(
  {
    cardData = {},
    size = PREVIEW_SIZE,
    watermark = null,
    showSlideIndicator = false,
    slideIndex = 1,
    totalSlides = 1,
    indicatorPosition = 'bottom-right',
    draggableText = false,
    onTextDrag,
  },
  ref,
) {
  const stageRef  = useRef(null)
  const bgImgRef  = useRef(null)

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      const stage = stageRef.current
      if (!stage) return null
      return stage.toDataURL({ mimeType: 'image/png', pixelRatio: EXPORT_SIZE / stage.width() })
    },
  }), [])

  // ── destructure ──────────────────────────────────────────────────────────
  const {
    headline   = '',
    subtitle   = '',
    salutation = '',
    imageUrl   = null,
    style      = defaultStyles.HEADLINE,
  } = cardData

  const {
    styleType        = 'HEADLINE',
    textPosition     = 'center',
    subtitlePosition = 'bottom-center',
    textDragX        = null,
    textDragY        = null,
    subtitleDragX    = null,
    subtitleDragY    = null,
    overlayOpacity   = 0.45,
    overlayType      = 'flat',
    overlayColor     = '#000000',
    grainAmount      = 0,
    headlineFont     = 'Playfair Display',
    headlineSize     = 72,
    headlineStyle    = 'italic',
    subtitleFont     = 'Inter',
    subtitleSize     = 32,
    salutationSize   = null,
    salutationDragX  = null,
    salutationDragY  = null,
    textColor        = '#ffffff',
    letterSpacing    = 0,
    lineHeight       = 1.3,
    textTransform    = 'none',
    textShadow       = false,
    shadowBlur       = 10,
    imgBrightness    = 100,
    imgContrast      = 100,
    imgSaturation    = 100,
    imgBlur          = 0,
    bgType           = 'image',
    bgColor          = '#111111',
    bgGradientStart  = '#1a1a2e',
    bgGradientEnd    = '#0d0d0d',
    accentColor      = null,
  } = style

  const displayScale        = size / EXPORT_SIZE
  const _pad                = 20 * (size / PREVIEW_SIZE)
  const _maxW               = size - 2 * _pad
  const scaledShadowBlur    = shadowBlur * displayScale
  const scaledShadowOffset  = 2 * displayScale
  const scaledLetterSpacing = letterSpacing * displayScale

  // Apply text transform before rendering
  const rawHeadline    = applyTextTransform(headline, textTransform)
  const rawSubtitle    = applyTextTransform(subtitle, textTransform)
  const rawSalutation  = applyTextTransform(salutation, textTransform)

  const hSize  = fitFontSize(rawHeadline, _maxW, headlineSize * displayScale, headlineFont)
  const sSize  = fitFontSize(rawSubtitle, _maxW, subtitleSize * displayScale, subtitleFont)
  const salSize = fitFontSize(rawSalutation, _maxW, (salutationSize ?? subtitleSize) * displayScale, subtitleFont)

  // ── image loading ─────────────────────────────────────────────────────────
  const bgImage = useKonvaImage(bgType === 'image' || !bgType ? imageUrl : null)
  const imgFit  = coverFit(bgImage, size)

  // ── Konva image filters ───────────────────────────────────────────────────
  const bgFilters = [
    ...(imgBrightness !== 100 ? [Konva.Filters.Brighten]  : []),
    ...(imgContrast   !== 100 ? [Konva.Filters.Contrast]  : []),
    ...(imgSaturation !== 100 ? [Konva.Filters.HSL]       : []),
    ...(imgBlur       >  0    ? [Konva.Filters.Blur]      : []),
  ]
  const hasFilters = bgFilters.length > 0

  useEffect(() => {
    const node = bgImgRef.current
    if (!node) return
    if (hasFilters) {
      node.cache({ pixelRatio: EXPORT_SIZE / size })
    } else {
      node.clearCache()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgImage, imgBrightness, imgContrast, imgSaturation, imgBlur])

  // ── grain ─────────────────────────────────────────────────────────────────
  const grainCanvas = useMemo(() => {
    if (!grainAmount || grainAmount <= 0) return null
    return generateGrainCanvas((grainAmount / 100) * 0.5)
  }, [grainAmount])

  // ── paper texture (OneFounder) ────────────────────────────────────────────
  const paperCanvas = useMemo(() => {
    if (bgType !== 'paper') return null
    return generatePaperCanvas()
  // regenerate when bgType switches to paper; stable otherwise
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgType])

  const isMixed = styleType === 'MIXED'

  // ── shadow props ──────────────────────────────────────────────────────────
  const shadowProps = textShadow ? {
    shadowEnabled: true,
    shadowColor:   'rgba(0,0,0,0.85)',
    shadowBlur:    scaledShadowBlur,
    shadowOffsetX: 0,
    shadowOffsetY: scaledShadowOffset,
  } : {}

  // ── MIXED layout ──────────────────────────────────────────────────────────
  let mixedNodes = null
  if (isMixed && rawHeadline) {
    const { boldPart, regularPart } = parseMixed(rawHeadline)
    let mixedHSize = hSize
    const gap    = 6 * displayScale
    const boldW0 = measureTextWidth(boldPart, mixedHSize, headlineFont, true)
    const regW0  = regularPart ? measureTextWidth(regularPart, mixedHSize, subtitleFont, false) : 0
    const totalW0 = boldW0 + (regularPart ? gap + regW0 : 0)
    if (totalW0 > _maxW) {
      mixedHSize = Math.max(mixedHSize * 0.5, Math.floor(mixedHSize * (_maxW / totalW0)))
    }
    const boldW  = measureTextWidth(boldPart, mixedHSize, headlineFont, true)
    const regW   = regularPart ? measureTextWidth(regularPart, mixedHSize, subtitleFont, false) : 0
    const totalW = boldW + (regularPart ? gap + regW : 0)
    const { textAlign } = getTextPosition(textPosition, size, size)
    const startX =
      textAlign === 'center' ? Math.max(_pad, (size - totalW) / 2) :
      textAlign === 'right'  ? Math.max(_pad, size - _pad - totalW) :
      _pad
    const { y: anchorY } = getTextPosition(textPosition, size, size)
    const y = Math.max(_pad, resolveY(textPosition, anchorY, mixedHSize * lineHeight))

    mixedNodes = (
      <>
        <Text x={startX} y={y} text={boldPart} fontSize={mixedHSize} fontFamily={headlineFont}
          fontStyle="bold" fill={textColor} letterSpacing={scaledLetterSpacing} listening={false} {...shadowProps} />
        {regularPart && (
          <Text x={startX + boldW + gap} y={y} text={regularPart} fontSize={mixedHSize}
            fontFamily={subtitleFont} fontStyle="normal" fill={textColor} opacity={0.85}
            letterSpacing={scaledLetterSpacing} listening={false} {...shadowProps} />
        )}
      </>
    )
  }

  // ── standard headline ─────────────────────────────────────────────────────
  const headlineTP = !isMixed && rawHeadline
    ? textProps({
        text: rawHeadline, position: textPosition, stageSize: size,
        fontSize: hSize, fontFamily: headlineFont,
        fontStyle: konvaFontStyle(headlineStyle === 'italic' || headlineStyle === 'bold italic', headlineStyle === 'bold' || headlineStyle === 'bold italic'),
        fill: textColor, lineHeight, letterSpacing: scaledLetterSpacing,
        shadowEnabled: textShadow, shadowColor: 'rgba(0,0,0,0.85)',
        shadowBlur: scaledShadowBlur, shadowOffset: scaledShadowOffset,
      })
    : null

  // ── subtitle ─────────────────────────────────────────────────────────────
  const showSubtitle    = rawSubtitle && styleType !== 'MIXED'
  const subtitleTP = showSubtitle
    ? textProps({
        text: rawSubtitle, position: subtitlePosition, stageSize: size,
        fontSize: sSize, fontFamily: subtitleFont, fontStyle: 'normal',
        fill: accentColor ?? textColor, lineHeight: lineHeight * 1.05, letterSpacing: scaledLetterSpacing,
        shadowEnabled: textShadow, shadowColor: 'rgba(0,0,0,0.85)',
        shadowBlur: scaledShadowBlur, shadowOffset: scaledShadowOffset,
      })
    : null

  // ── salutation — independent size + position, same font/color as subtitle ─
  const showSalutation = rawSalutation && styleType !== 'MIXED'
  const salutationTP = showSalutation
    ? textProps({
        text: rawSalutation, position: subtitlePosition, stageSize: size,
        fontSize: salSize, fontFamily: subtitleFont, fontStyle: 'normal',
        fill: accentColor ?? textColor, lineHeight: lineHeight * 1.05, letterSpacing: scaledLetterSpacing,
        shadowEnabled: textShadow, shadowColor: 'rgba(0,0,0,0.85)',
        shadowBlur: scaledShadowBlur, shadowOffset: scaledShadowOffset,
      })
    : null

  // ── draggable text positioning ────────────────────────────────────────────
  // Split x/y from text attrs so Group handles position independently.
  // Drag overrides (textDragX/Y) replace the grid-computed position.
  // Applied for ALL render modes (thumbnails + export too) so position is consistent.
  let headlineGX = 0, headlineGY = 0, headlineTextAttrs = null
  if (headlineTP) {
    const { x: hx, y: hy, ...hAttrs } = headlineTP
    headlineGX = textDragX != null ? textDragX * displayScale : hx
    headlineGY = textDragY != null ? textDragY * displayScale : hy
    headlineTextAttrs = hAttrs
  }

  let subtitleGX = 0, subtitleGY = 0, subtitleTextAttrs = null
  if (subtitleTP) {
    const { x: sx, y: sy, ...sAttrs } = subtitleTP
    subtitleGX = subtitleDragX != null ? subtitleDragX * displayScale : sx
    subtitleGY = subtitleDragY != null ? subtitleDragY * displayScale : sy
    subtitleTextAttrs = sAttrs
  }

  // Estimated block heights for drag hit areas
  const headlineBlockH = headlineTextAttrs
    ? Math.max(estimateTextHeight(rawHeadline, hSize, _maxW, headlineFont, lineHeight), hSize)
    : 0
  const subtitleBlockH = subtitleTextAttrs
    ? Math.max(estimateTextHeight(rawSubtitle, sSize, _maxW, subtitleFont, lineHeight * 1.05), sSize)
    : 0

  const salutationBlockH = salutationTP
    ? Math.max(estimateTextHeight(rawSalutation, salSize, _maxW, subtitleFont, lineHeight * 1.05), salSize)
    : 0

  // Salutation is independently draggable. Before the user ever drags it,
  // default to stacking directly below the rendered subtitle block.
  let salutationGX = 0, salutationGY = 0, salutationTextAttrs = null
  if (salutationTP) {
    const { x: sax, y: say, ...saAttrs } = salutationTP
    salutationTextAttrs = saAttrs
    const defaultX = subtitleTextAttrs ? subtitleGX : sax
    const defaultY = subtitleTextAttrs ? subtitleGY + subtitleBlockH + 8 * displayScale : say
    salutationGX = salutationDragX != null ? salutationDragX * displayScale : defaultX
    salutationGY = salutationDragY != null ? salutationDragY * displayScale : defaultY
  }

  // ── drag handlers ─────────────────────────────────────────────────────────
  const dragBound = useCallback((pos) => ({
    x: Math.max(0, Math.min(size - _pad, pos.x)),
    y: Math.max(0, Math.min(size - _pad, pos.y)),
  }), [size, _pad])

  const handleHeadlineDragEnd = useCallback((e) => {
    onTextDrag?.({
      textDragX: e.target.x() / displayScale,
      textDragY: e.target.y() / displayScale,
    })
  }, [onTextDrag, displayScale])

  const handleSubtitleDragEnd = useCallback((e) => {
    onTextDrag?.({
      subtitleDragX: e.target.x() / displayScale,
      subtitleDragY: e.target.y() / displayScale,
    })
  }, [onTextDrag, displayScale])

  const handleSalutationDragEnd = useCallback((e) => {
    onTextDrag?.({
      salutationDragX: e.target.x() / displayScale,
      salutationDragY: e.target.y() / displayScale,
    })
  }, [onTextDrag, displayScale])

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <Stage ref={stageRef} width={size} height={size} listening={draggableText}>
      <Layer>

        {/* 1. Base */}
        <Rect x={0} y={0} width={size} height={size} fill="#111111" listening={false} />

        {/* 2. Background */}
        {bgType === 'paper' ? (
          paperCanvas ? (
            <KonvaImage
              image={paperCanvas}
              x={0} y={0}
              width={size} height={size}
              listening={false}
            />
          ) : (
            <Rect x={0} y={0} width={size} height={size} fill="#f2ece0" listening={false} />
          )
        ) : bgType === 'solid' ? (
          <Rect x={0} y={0} width={size} height={size} fill={bgColor} listening={false} />
        ) : bgType === 'gradient' ? (
          <Rect
            x={0} y={0} width={size} height={size}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: size, y: size }}
            fillLinearGradientColorStops={[0, bgGradientStart, 1, bgGradientEnd]}
            listening={false}
          />
        ) : (
          <>
            {bgImage && imgFit && (
              <KonvaImage
                ref={bgImgRef}
                image={bgImage} {...imgFit} listening={false}
                filters={bgFilters}
                brightness={(imgBrightness - 100) / 200}
                contrast={imgContrast - 100}
                saturation={(imgSaturation - 100) / 100}
                blurRadius={imgBlur}
              />
            )}
            {!bgImage && (
              <Rect
                x={0} y={0} width={size} height={size}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: size, y: size }}
                fillLinearGradientColorStops={[0, '#1a1a1a', 1, '#0d0d0d']}
                listening={false}
              />
            )}
          </>
        )}

        {/* 3. Overlay */}
        <OverlayRect
          overlayType={overlayType}
          overlayOpacity={overlayOpacity}
          overlayColor={overlayColor}
          size={size}
        />

        {/* 4. Grain */}
        {grainCanvas && (
          <KonvaImage image={grainCanvas} x={0} y={0} width={size} height={size} listening={false} />
        )}

        {/* 5. Text */}
        {isMixed && mixedNodes}

        {headlineTextAttrs && (
          draggableText ? (
            <DraggableTextGroup
              x={headlineGX} y={headlineGY}
              width={_maxW} height={headlineBlockH}
              onDragEnd={handleHeadlineDragEnd}
              dragBound={dragBound}
            >
              <Text {...headlineTextAttrs} x={0} y={0} listening={false} />
            </DraggableTextGroup>
          ) : (
            <Text {...headlineTextAttrs} x={headlineGX} y={headlineGY} />
          )
        )}

        {subtitleTextAttrs && (
          draggableText ? (
            <DraggableTextGroup
              x={subtitleGX} y={subtitleGY}
              width={_maxW} height={subtitleBlockH}
              onDragEnd={handleSubtitleDragEnd}
              dragBound={dragBound}
            >
              <Text {...subtitleTextAttrs} x={0} y={0} opacity={0.85} listening={false} />
            </DraggableTextGroup>
          ) : (
            <Text {...subtitleTextAttrs} x={subtitleGX} y={subtitleGY} opacity={0.85} />
          )
        )}

        {salutationTextAttrs && (
          draggableText ? (
            <DraggableTextGroup
              x={salutationGX} y={salutationGY}
              width={_maxW} height={salutationBlockH}
              onDragEnd={handleSalutationDragEnd}
              dragBound={dragBound}
            >
              <Text {...salutationTextAttrs} x={0} y={0} opacity={0.85} listening={false} />
            </DraggableTextGroup>
          ) : (
            <Text {...salutationTextAttrs} x={salutationGX} y={salutationGY} opacity={0.85} />
          )
        )}

        {/* 7. Watermark */}
        <WatermarkLayer watermark={watermark} size={size} displayScale={displayScale} />

        {/* 8. Slide indicator */}
        {showSlideIndicator && slideIndex > 0 && (
          <SlideIndicator
            slideIndex={slideIndex}
            totalSlides={totalSlides}
            size={size}
            displayScale={displayScale}
            position={indicatorPosition}
          />
        )}

      </Layer>
    </Stage>
  )
})

export default CardPreview
