/**
 * CardEditor — per-card editing panel.
 *
 * Props:
 *   cardIndex  {number}   0-based index of this card
 *   totalCards {number}   total cards in the carousel
 *   onUpdate   {function} called with the full cardData object on every change
 *
 * cardData shape:
 *   { headline, subtitle, imageUrl, style }
 *   style matches the preset schema + styleType + subtitlePosition
 */

import { useState } from 'react'
import { ChevronDown, Wand2 } from 'lucide-react'
import ImagePicker from './ImagePicker'
import StylePanel  from './StylePanel'
import { defaultStyles } from '../utils/textStyles'
import { analyzeImageWithClaude } from '../utils/claudeVision'

// ─── helpers ──────────────────────────────────────────────────────────────────

const INITIAL_STYLE = { ...defaultStyles.HEADLINE, styleType: 'HEADLINE' }

const INITIAL_CARD = {
  headline:  '',
  subtitle:  '',
  imageUrl:  null,
  style:     INITIAL_STYLE,
}

/** Parse **bold** rest-of-text from MIXED headline. */
function parseMixed(text = '') {
  const match = text.match(/^\*\*(.+?)\*\*\s*(.*)$/s)
  return match
    ? { boldPart: match[1], regularPart: match[2] }
    : { boldPart: text, regularPart: '' }
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
      {children}
    </p>
  )
}

/** Controlled textarea that hard-caps newlines at `maxLines`. */
function LimitedTextarea({ value, onChange, maxLines, placeholder, rows }) {
  const lineCount = (value || '').split('\n').length

  const handleChange = (e) => {
    const next = e.target.value
    if (next.split('\n').length > maxLines) return
    onChange(next)
  }

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        className="
          w-full px-3 py-2.5 rounded-lg resize-none
          bg-neutral-900 border border-neutral-800
          text-sm text-neutral-200 placeholder-neutral-700
          focus:outline-none focus:border-neutral-600
          transition-colors leading-relaxed
        "
      />
      {/* Line counter — only visible when near the limit */}
      {lineCount >= maxLines && (
        <span className="absolute bottom-2 right-2.5 text-[9px] text-neutral-700 select-none">
          {lineCount}/{maxLines}
        </span>
      )}
    </div>
  )
}

/** MIXED style input with **bold** syntax support and a live preview row. */
function MixedInput({ value, onChange, headlineFont, subtitleFont }) {
  const { boldPart, regularPart } = parseMixed(value)

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder='**Bold word** regular continuation…'
        rows={2}
        className="
          w-full px-3 py-2.5 rounded-lg resize-none
          bg-neutral-900 border border-neutral-800
          text-sm text-neutral-200 placeholder-neutral-700 font-mono
          focus:outline-none focus:border-neutral-600
          transition-colors leading-relaxed
        "
      />

      {/* Live preview */}
      <div className="flex items-baseline flex-wrap gap-1.5 px-3 py-2 rounded-lg bg-neutral-900/50 border border-neutral-800/50 min-h-[36px]">
        {value.trim() ? (
          <>
            {boldPart && (
              <span
                className="text-sm text-white font-bold"
                style={{ fontFamily: headlineFont }}
              >
                {boldPart}
              </span>
            )}
            {regularPart && (
              <span
                className="text-sm text-neutral-300"
                style={{ fontFamily: subtitleFont }}
              >
                {regularPart}
              </span>
            )}
          </>
        ) : (
          <span className="text-xs text-neutral-700 italic">preview appears here</span>
        )}
      </div>

      <p className="text-[10px] text-neutral-700 leading-relaxed pl-0.5">
        Wrap bold words with <code className="text-neutral-500 bg-neutral-900 px-1 py-0.5 rounded">**word**</code>
        {' '}— the rest renders in the lighter subtitle font.
      </p>
    </div>
  )
}

/** Collapsible section with animated height. */
function Collapsible({ label, open, onToggle, children }) {
  return (
    <div className="border border-neutral-800 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="
          w-full flex items-center justify-between px-3.5 py-3
          text-sm text-neutral-400 hover:text-neutral-200
          hover:bg-neutral-800/40 transition-colors
        "
      >
        <span className="flex items-center gap-2">
          <Wand2 size={13} />
          {label}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`
          overflow-hidden transition-all duration-200 ease-in-out
          ${open ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-3.5 pb-4 pt-1 border-t border-neutral-800">
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── CardEditor ───────────────────────────────────────────────────────────────

export default function CardEditor({ cardIndex = 0, totalCards = 1, onUpdate, cardData = INITIAL_CARD, brand = 'kshitij' }) {
  const [styleOpen, setStyleOpen] = useState(false)
  const isOF   = brand === 'onefounder'
  const isBold = brand === 'bold'

  /** Emit a partial patch, merging with current cardData. */
  const update = (patch) => onUpdate?.({ ...cardData, ...patch })

  const updateStyle = (newStyle) => update({ style: newStyle })

  // When an image is picked, auto-detect the darkest region and
  // move the text there so it always lands on a readable dark area.
  const updateImage = async (url) => {
    const { textPosition, subtitlePosition } = await analyzeImageWithClaude(url, style.styleType)
    const newStyle = { ...style, textPosition }
    if (subtitlePosition) newStyle.subtitlePosition = subtitlePosition
    update({ imageUrl: url, style: newStyle })
  }

  const { style, headline, subtitle, salutation, imageUrl } = cardData
  const isMixed    = style.styleType === 'MIXED'
  const isSubtitle = style.styleType === 'SUBTITLE'

  return (
    <div className="flex flex-col gap-5">

      {/* ── Card badge ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="
          inline-flex items-center px-2.5 py-1 rounded-full
          bg-neutral-800 text-xs text-neutral-400 font-medium tabular-nums
        ">
          Card {cardIndex + 1} of {totalCards}
        </span>

        {style.styleType && (
          <span className="text-[10px] uppercase tracking-widest text-neutral-700 font-semibold">
            {style.styleType}
          </span>
        )}
      </div>

      {/* ── Text inputs ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">

        {/* Headline / MIXED input */}
        <div>
          <SectionLabel>
            {isMixed ? 'Mixed Text' : 'Headline'}
          </SectionLabel>

          {isMixed ? (
            <MixedInput
              value={headline}
              onChange={v => update({ headline: v })}
              headlineFont={style.headlineFont}
              subtitleFont={style.subtitleFont}
            />
          ) : (
            <LimitedTextarea
              value={headline}
              onChange={v => update({ headline: v })}
              maxLines={3}
              rows={3}
              placeholder={
                style.styleType === 'SPLIT'
                  ? 'Top block…'
                  : 'Your headline…'
              }
            />
          )}
        </div>

        {/* Subtitle — hidden for MIXED (subtitle is embedded) and SUBTITLE (no second block) */}
        {!isMixed && !isSubtitle && (
          <div>
            <SectionLabel>
              {style.styleType === 'SPLIT' ? 'Bottom Block' : 'Subtitle'}
            </SectionLabel>
            <LimitedTextarea
              value={subtitle}
              onChange={v => update({ subtitle: v })}
              maxLines={2}
              rows={2}
              placeholder={
                style.styleType === 'SPLIT'
                  ? 'Bottom block…'
                  : 'Supporting text…'
              }
            />
          </div>
        )}

        {/* Subtitle for SUBTITLE type (single text block, treated as the main text) */}
        {isSubtitle && (
          <div>
            <SectionLabel>Body Text</SectionLabel>
            <LimitedTextarea
              value={subtitle}
              onChange={v => update({ subtitle: v })}
              maxLines={3}
              rows={3}
              placeholder='A truth most people try to avoid…'
            />
          </div>
        )}

        {/* Salutation — extra line below subtitle, OneFounder + Bold Dark only */}
        {(isOF || isBold) && (
          <div>
            <SectionLabel>Salutation</SectionLabel>
            <LimitedTextarea
              value={salutation || ''}
              onChange={v => update({ salutation: v })}
              maxLines={1}
              rows={1}
              placeholder='e.g. — Kshitij'
            />
          </div>
        )}
      </div>

      {/* ── Image picker — hidden for OF (paper) and Bold (solid black bg) ── */}
      {!isOF && !isBold && (
        <div>
          <SectionLabel>Background Image</SectionLabel>
          <ImagePicker
            onSelect={updateImage}
            currentUrl={imageUrl}
          />
        </div>
      )}

      {/* ── Style collapsible ──── */}
      {!isOF && (
        <Collapsible
          label="Style Settings"
          open={styleOpen}
          onToggle={() => setStyleOpen(o => !o)}
        >
          <StylePanel style={style} onChange={updateStyle} />
        </Collapsible>
      )}

    </div>
  )
}
