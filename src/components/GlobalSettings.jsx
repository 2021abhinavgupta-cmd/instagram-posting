/**
 * GlobalSettings — watermark/logo and slide indicator controls.
 *
 * These settings apply globally to all cards (not per-card like StylePanel).
 *
 * Props:
 *   watermark                  — { url, position, size, opacity } | null
 *   onWatermarkChange          — (wm | null) => void
 *   showSlideIndicator         — boolean
 *   onShowSlideIndicatorChange — (bool) => void
 *   indicatorPosition          — string (one of 9 position keys)
 *   onIndicatorPositionChange  — (pos) => void
 */

import { useRef } from 'react'
import { Upload } from 'lucide-react'
import { POSITION_GRID } from '../utils/textStyles'

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
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">{label}</span>
        <span className="text-xs text-neutral-400 tabular-nums font-mono">{display}{unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="
          w-full h-[3px] rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:-mt-[6.5px]
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer
        "
        style={{
          background: `linear-gradient(to right, #e5e5e5 0%, #e5e5e5 ${pct}%, #2a2a2a ${pct}%, #2a2a2a 100%)`,
        }}
      />
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">{label}</span>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`
          relative inline-flex h-[22px] w-10 items-center rounded-full shrink-0
          transition-colors duration-200 focus:outline-none
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

function PositionPicker({ value, onChange, label }) {
  return (
    <div>
      {label && <SectionLabel>{label}</SectionLabel>}
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

// ─── GlobalSettings ───────────────────────────────────────────────────────────

export default function GlobalSettings({
  watermark,
  onWatermarkChange,
  showSlideIndicator,
  onShowSlideIndicatorChange,
  indicatorPosition,
  onIndicatorPositionChange,
}) {
  const fileRef = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      onWatermarkChange({
        url:      e.target.result,
        position: watermark?.position ?? 'bottom-right',
        size:     watermark?.size     ?? 80,
        opacity:  watermark?.opacity  ?? 0.8,
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-5 pb-2">

      {/* ── Watermark / Logo ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <SectionLabel>Watermark / Logo</SectionLabel>

        {watermark?.url ? (
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center p-1 shrink-0">
              <img
                src={watermark.url}
                alt="Watermark"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors text-left"
              >
                Change logo
              </button>
              <button
                onClick={() => onWatermarkChange(null)}
                className="text-xs text-red-600/70 hover:text-red-400 transition-colors text-left"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="
              flex items-center justify-center gap-2 h-14 rounded-lg
              border-2 border-dashed border-neutral-800
              hover:border-neutral-600 transition-colors
              text-neutral-600 hover:text-neutral-400
            "
          >
            <Upload size={14} />
            <span className="text-xs">Upload logo (PNG)</span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.svg"
          className="hidden"
          onChange={(e) => { handleFile(e.target.files[0]); e.target.value = '' }}
        />

        {watermark?.url && (
          <>
            <PositionPicker
              value={watermark.position ?? 'bottom-right'}
              onChange={(p) => onWatermarkChange({ ...watermark, position: p })}
              label="Logo Position"
            />
            <Slider
              label="Size"
              value={watermark.size ?? 80}
              min={20}
              max={200}
              step={5}
              unit="px"
              onChange={(v) => onWatermarkChange({ ...watermark, size: v })}
            />
            <Slider
              label="Opacity"
              value={watermark.opacity ?? 0.8}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => onWatermarkChange({ ...watermark, opacity: v })}
            />
          </>
        )}
      </div>

      <Divider />

      {/* ── Slide Indicator ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <SectionLabel>Slide Indicator</SectionLabel>
        <Toggle
          label="Show Indicator"
          value={showSlideIndicator}
          onChange={onShowSlideIndicatorChange}
        />
        {showSlideIndicator && (
          <PositionPicker
            value={indicatorPosition ?? 'bottom-right'}
            onChange={onIndicatorPositionChange}
            label="Indicator Position"
          />
        )}
      </div>

    </div>
  )
}
