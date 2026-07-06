/**
 * StylePanel — all per-card typography, overlay, and background controls.
 *
 * Props:
 *   style    {object}   — current style state
 *   onChange {function} — called with the full updated style object on every change
 */

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { POSITION_GRID, OVERLAY_TYPES, BG_TYPES, FONTS, defaultStyles } from '../utils/textStyles'

// ─── primitive controls ───────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2.5">
      {children}
    </p>
  )
}

function Divider() {
  return <div className="border-t border-neutral-800/80" />
}

function Slider({ label, value, min, max, step, unit = '', onChange }) {
  const pct     = ((value - min) / (max - min)) * 100
  const display = step < 1 ? parseFloat(value.toFixed(2)) : Math.round(value)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
          {label}
        </span>
        <span className="text-xs text-neutral-400 tabular-nums font-mono">
          {display}{unit}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="
          w-full h-[3px] rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:-mt-[6.5px]
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer
        "
        style={{
          background: `linear-gradient(
            to right,
            #e5e5e5 0%, #e5e5e5 ${pct}%,
            #2a2a2a ${pct}%, #2a2a2a 100%
          )`,
        }}
      />
    </div>
  )
}

function ColorPicker({ value, onChange }) {
  const handleText = (raw) => {
    if (/^#[0-9a-fA-F]{0,6}$/.test(raw)) onChange(raw)
  }

  return (
    <div className="flex items-center gap-3">
      <label className="relative cursor-pointer shrink-0 group">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer rounded-lg"
        />
        <div
          className="w-9 h-9 rounded-lg border-2 border-neutral-700 group-hover:border-neutral-500 transition-colors shadow-inner"
          style={{ background: value }}
        />
      </label>

      <input
        type="text"
        value={value.toUpperCase()}
        onChange={e => handleText(e.target.value)}
        className="
          w-28 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800
          text-sm text-neutral-300 font-mono tracking-wider
          focus:outline-none focus:border-neutral-600 transition-colors
        "
        maxLength={7}
        spellCheck={false}
      />

      <div className="flex gap-1.5 ml-auto">
        {['#ffffff', '#f0ede8', '#000000'].map(c => (
          <button
            key={c}
            title={c}
            onClick={() => onChange(c)}
            className={`
              w-5 h-5 rounded-full transition-transform hover:scale-125 shrink-0
              ${value.toLowerCase() === c ? 'ring-2 ring-offset-1 ring-offset-neutral-900 ring-white' : ''}
            `}
            style={{ background: c, border: c === '#000000' ? '1px solid #444' : 'none' }}
          />
        ))}
      </div>
    </div>
  )
}

/** Compact single-swatch color picker for gradient or overlay color. */
function MiniColorPicker({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-neutral-700">{label}</span>
      <label className="relative cursor-pointer group flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer rounded-lg"
        />
        <div
          className="w-8 h-8 rounded-lg border border-neutral-700 group-hover:border-neutral-500 transition-colors shrink-0"
          style={{ background: value }}
        />
        <span className="text-xs text-neutral-400 font-mono tracking-wider truncate">
          {value.toUpperCase()}
        </span>
      </label>
    </div>
  )
}

/** Font dropdown — each option rendered in its own typeface. */
function FontPicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="
            w-full flex items-center justify-between px-3 py-2 rounded-lg
            bg-neutral-900 border border-neutral-800 hover:border-neutral-600
            transition-colors focus:outline-none
          "
        >
          <span
            className="text-sm text-neutral-200 truncate"
            style={{ fontFamily: `"${value}", serif` }}
          >
            {value}
          </span>
          <ChevronDown
            size={12}
            className={`text-neutral-600 shrink-0 ml-2 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div className="mt-1 rounded-lg border border-neutral-700 bg-neutral-950 overflow-y-auto max-h-52 z-10">
            {FONTS.map(f => (
              <button
                key={f}
                onClick={() => { onChange(f); setOpen(false) }}
                className={`
                  w-full px-3 py-2.5 text-left text-sm transition-colors
                  ${f === value
                    ? 'text-white bg-white/10'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }
                `}
                style={{ fontFamily: `"${f}", serif` }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ItalicToggle({ value, onChange }) {
  const on = value === 'italic'

  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
        Headline Italic
      </span>

      <div className="flex items-center gap-2.5">
        <span className={`text-xs transition-colors ${on ? 'text-neutral-600' : 'text-neutral-300'}`}>Off</span>

        <button
          role="switch"
          aria-checked={on}
          onClick={() => onChange(on ? 'normal' : 'italic')}
          className={`
            relative inline-flex h-[22px] w-10 items-center rounded-full shrink-0
            transition-colors duration-200
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
            ${on ? 'bg-neutral-300' : 'bg-neutral-700'}
          `}
        >
          <span
            className={`
              inline-block h-[16px] w-[16px] rounded-full bg-neutral-950 shadow-sm
              transform transition-transform duration-200
              ${on ? 'translate-x-[21px]' : 'translate-x-[3px]'}
            `}
          />
        </button>

        <span className={`text-xs italic transition-colors ${on ? 'text-neutral-300' : 'text-neutral-600'}`}>On</span>
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
        {label}
      </span>

      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`
          relative inline-flex h-[22px] w-10 items-center rounded-full shrink-0
          transition-colors duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
          ${value ? 'bg-neutral-300' : 'bg-neutral-700'}
        `}
      >
        <span
          className={`
            inline-block h-[16px] w-[16px] rounded-full bg-neutral-950 shadow-sm
            transform transition-transform duration-200
            ${value ? 'translate-x-[21px]' : 'translate-x-[3px]'}
          `}
        />
      </button>
    </div>
  )
}

function ButtonGroup({ value, options, onChange }) {
  return (
    <div className="flex gap-1">
      {options.map(opt => {
        const val      = opt.value ?? opt
        const lbl      = opt.label ?? opt
        const isActive = value === val
        return (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={`
              flex-1 py-1.5 px-1 rounded-lg text-[11px] font-medium transition-all
              ${isActive
                ? 'bg-white/15 border border-white/25 text-white'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700'
              }
            `}
          >
            {lbl}
          </button>
        )
      })}
    </div>
  )
}

// ─── PositionPicker — 3×3 visual grid ────────────────────────────────────────

const DOT_ALIGN = {
  'top-left':      'items-start justify-start',
  'top-center':    'items-start justify-center',
  'top-right':     'items-start justify-end',
  'center-left':   'items-center justify-start',
  'center':        'items-center justify-center',
  'center-right':  'items-center justify-end',
  'bottom-left':   'items-end justify-start',
  'bottom-center': 'items-end justify-center',
  'bottom-right':  'items-end justify-end',
}

function PositionPicker({ value, onChange, label = 'Text Position' }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="grid grid-cols-3 gap-1.5">
        {POSITION_GRID.flat().map(pos => {
          const active = value === pos
          return (
            <button
              key={pos}
              onClick={() => onChange(pos)}
              title={pos.replace(/-/g, ' ')}
              className={`
                relative h-9 rounded-lg border transition-all duration-100
                ${active
                  ? 'bg-white/10 border-white/40'
                  : 'bg-neutral-900 border-neutral-800 hover:border-neutral-600'
                }
              `}
            >
              <span className={`absolute inset-1.5 flex ${DOT_ALIGN[pos] ?? 'items-center justify-center'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-neutral-600'}`} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── style-type options ───────────────────────────────────────────────────────

const STYLE_TYPE_OPTIONS = [
  { value: 'HEADLINE', label: 'Headline — big italic serif'        },
  { value: 'SUBTITLE', label: 'Subtitle — clean light quote'       },
  { value: 'MIXED',    label: 'Mixed — bold + regular continuation' },
  { value: 'SPLIT',    label: 'Split — two pinned text blocks'     },
]

const TEXT_TRANSFORM_OPTIONS = [
  { value: 'none',      label: 'Aa' },
  { value: 'uppercase', label: 'AA' },
  { value: 'lowercase', label: 'aa' },
]

// ─── StylePanel ───────────────────────────────────────────────────────────────

export default function StylePanel({ style = {}, onChange }) {
  const emit = (field, value) => onChange?.({ ...style, [field]: value })

  const handleTypeChange = (type) => {
    onChange?.({
      ...defaultStyles[type],
      styleType:       type,
      textColor:       style.textColor       ?? '#ffffff',
      bgType:          style.bgType          ?? 'image',
      bgColor:         style.bgColor         ?? '#111111',
      bgGradientStart: style.bgGradientStart ?? '#1a1a2e',
      bgGradientEnd:   style.bgGradientEnd   ?? '#0d0d0d',
    })
  }

  const isMixed   = style.styleType === 'MIXED'
  const isSplit   = style.styleType === 'SPLIT'
  const bgType    = style.bgType ?? 'image'
  const overlayTy = style.overlayType ?? 'flat'

  return (
    <div className="flex flex-col gap-5 pb-2">

      {/* ── Text Style type ─────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Text Style</SectionLabel>
        <div className="relative">
          <select
            value={style.styleType ?? 'HEADLINE'}
            onChange={e => handleTypeChange(e.target.value)}
            className="
              w-full appearance-none px-3 py-2 pr-8 rounded-lg
              bg-neutral-900 border border-neutral-800
              text-sm text-neutral-200
              focus:outline-none focus:border-neutral-600
              transition-colors cursor-pointer
            "
          >
            {STYLE_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-600">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>

      {/* ── Text position ────────────────────────────────────────────────── */}
      <PositionPicker
        value={style.textPosition ?? 'center'}
        onChange={v => onChange?.({ ...style, textPosition: v, textDragX: null, textDragY: null })}
        label={isSplit ? 'Headline Position' : 'Text Position'}
      />

      {!isMixed && (
        <PositionPicker
          value={style.subtitlePosition ?? 'bottom-center'}
          onChange={v => onChange?.({ ...style, subtitlePosition: v, subtitleDragX: null, subtitleDragY: null })}
          label="Subtitle Position"
        />
      )}

      <Divider />

      {/* ── Background ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <SectionLabel>Background</SectionLabel>
        <ButtonGroup
          value={bgType}
          options={BG_TYPES}
          onChange={v => emit('bgType', v)}
        />

        {bgType === 'solid' && (
          <ColorPicker
            value={style.bgColor ?? '#111111'}
            onChange={v => emit('bgColor', v)}
          />
        )}

        {bgType === 'gradient' && (
          <div className="flex gap-3">
            <MiniColorPicker
              label="From"
              value={style.bgGradientStart ?? '#1a1a2e'}
              onChange={v => emit('bgGradientStart', v)}
            />
            <MiniColorPicker
              label="To"
              value={style.bgGradientEnd ?? '#0d0d0d'}
              onChange={v => emit('bgGradientEnd', v)}
            />
          </div>
        )}
      </div>

      {/* ── Image adjustments (only when bgType==='image') ───────────────── */}
      {bgType === 'image' && (
        <>
          <Divider />
          <div className="flex flex-col gap-3">
            <SectionLabel>Image Adjustments</SectionLabel>
            <Slider
              label="Brightness"
              value={style.imgBrightness ?? 100}
              min={0}
              max={200}
              step={1}
              unit="%"
              onChange={v => emit('imgBrightness', v)}
            />
            <Slider
              label="Contrast"
              value={style.imgContrast ?? 100}
              min={0}
              max={200}
              step={1}
              unit="%"
              onChange={v => emit('imgContrast', v)}
            />
            <Slider
              label="Saturation"
              value={style.imgSaturation ?? 100}
              min={0}
              max={200}
              step={1}
              unit="%"
              onChange={v => emit('imgSaturation', v)}
            />
            <Slider
              label="Blur"
              value={style.imgBlur ?? 0}
              min={0}
              max={30}
              step={0.5}
              unit="px"
              onChange={v => emit('imgBlur', v)}
            />
          </div>
        </>
      )}

      <Divider />

      {/* ── Overlay ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <SectionLabel>Overlay</SectionLabel>
        <ButtonGroup
          value={overlayTy}
          options={OVERLAY_TYPES}
          onChange={v => emit('overlayType', v)}
        />
        <Slider
          label="Intensity"
          value={style.overlayOpacity ?? 0.45}
          min={0}
          max={0.7}
          step={0.05}
          onChange={v => emit('overlayOpacity', v)}
        />
        <div className="flex gap-3">
          <MiniColorPicker
            label="Overlay Color"
            value={style.overlayColor ?? '#000000'}
            onChange={v => emit('overlayColor', v)}
          />
          <div className="flex-1" />
        </div>
        <Slider
          label="Film Grain"
          value={style.grainAmount ?? 0}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={v => emit('grainAmount', v)}
        />
      </div>

      <Divider />

      {/* ── Fonts ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <FontPicker
          label="Headline Font"
          value={style.headlineFont ?? 'Playfair Display'}
          onChange={v => emit('headlineFont', v)}
        />
        <FontPicker
          label="Subtitle Font"
          value={style.subtitleFont ?? 'Inter'}
          onChange={v => emit('subtitleFont', v)}
        />
      </div>

      <Divider />

      {/* ── Font sizes + spacing ─────────────────────────────────────────── */}
      <Slider
        label="Headline Size"
        value={style.headlineSize ?? 72}
        min={48}
        max={96}
        step={1}
        unit="px"
        onChange={v => emit('headlineSize', v)}
      />
      <Slider
        label="Subtitle Size"
        value={style.subtitleSize ?? 32}
        min={24}
        max={96}
        step={1}
        unit="px"
        onChange={v => emit('subtitleSize', v)}
      />
      <Slider
        label="Letter Spacing"
        value={style.letterSpacing ?? 0}
        min={-2}
        max={20}
        step={0.5}
        unit="px"
        onChange={v => emit('letterSpacing', v)}
      />
      <Slider
        label="Line Height"
        value={style.lineHeight ?? 1.3}
        min={1.0}
        max={2.2}
        step={0.05}
        onChange={v => emit('lineHeight', v)}
      />

      <Divider />

      {/* ── Text color ───────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Text Color</SectionLabel>
        <ColorPicker
          value={style.textColor ?? '#ffffff'}
          onChange={v => emit('textColor', v)}
        />
      </div>

      <Divider />

      {/* ── Text effects ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <SectionLabel>Effects</SectionLabel>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2">
            Text Case
          </p>
          <ButtonGroup
            value={style.textTransform ?? 'none'}
            options={TEXT_TRANSFORM_OPTIONS}
            onChange={v => emit('textTransform', v)}
          />
        </div>

        <ItalicToggle
          value={style.headlineStyle ?? 'italic'}
          onChange={v => emit('headlineStyle', v)}
        />
        <Toggle
          label="Text Shadow"
          value={style.textShadow ?? false}
          onChange={v => emit('textShadow', v)}
        />
        {style.textShadow && (
          <Slider
            label="Shadow Blur"
            value={style.shadowBlur ?? 10}
            min={0}
            max={40}
            step={1}
            unit="px"
            onChange={v => emit('shadowBlur', v)}
          />
        )}
      </div>

    </div>
  )
}
