/**
 * PresetManager — save, load, and delete named style presets.
 *
 * Props:
 *   currentStyle {object}   — the active card style; used to determine what to save
 *   onLoad       {function} — called with the full preset object when user clicks Load
 *
 * The component owns the usePresets hook directly — the parent only needs to
 * handle onLoad to apply the preset to the active card.
 */

import { useState } from 'react'
import { Check, Trash2, ArrowDownToLine, BookMarked } from 'lucide-react'
import { usePresets } from '../hooks/usePresets'
import { PRESET_FIELDS } from '../utils/textStyles'

// ─── PresetManager ────────────────────────────────────────────────────────────

export default function PresetManager({ currentStyle = {}, onLoad }) {
  const { presets, savePreset, deletePreset } = usePresets()

  const [name,      setName]      = useState('')
  const [flash,     setFlash]     = useState(null)  // name of last saved — shown briefly
  const [confirmDel, setConfirmDel] = useState(null) // name pending delete confirmation

  // ── save ──────────────────────────────────────────────────────────────────

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return

    // Pick only the fields that belong in a preset (CLAUDE.md schema).
    const styleData = Object.fromEntries(
      PRESET_FIELDS.map(k => [k, currentStyle[k]])
    )

    savePreset(trimmed, styleData)
    setName('')
    setFlash(trimmed)
    setTimeout(() => setFlash(null), 1800)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
  }

  // ── load ──────────────────────────────────────────────────────────────────

  const handleLoad = (preset) => {
    onLoad?.(preset)
  }

  // ── delete (with one-click confirm) ───────────────────────────────────────

  const handleDeleteClick = (presetName) => {
    if (confirmDel === presetName) {
      // Second click — confirmed
      deletePreset(presetName)
      setConfirmDel(null)
    } else {
      // First click — arm the confirm state, auto-cancel after 2 s
      setConfirmDel(presetName)
      setTimeout(() => setConfirmDel(c => (c === presetName ? null : c)), 2000)
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 pb-2">

      {/* ── Save section ─────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2.5">
          Save Current Style
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Name this preset…"
            maxLength={48}
            className="
              flex-1 px-3 py-2 rounded-lg
              bg-neutral-900 border border-neutral-800
              text-sm text-neutral-200 placeholder-neutral-600
              focus:outline-none focus:border-neutral-600
              transition-colors
            "
          />

          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="
              flex items-center gap-1.5 px-3 py-2 rounded-lg shrink-0
              bg-neutral-800 hover:bg-neutral-700
              disabled:opacity-40 disabled:cursor-not-allowed
              text-sm text-neutral-200 font-medium
              transition-colors
            "
          >
            {flash ? <Check size={14} className="text-green-400" /> : 'Save'}
          </button>
        </div>

        {/* Saved confirmation */}
        {flash && (
          <p className="text-xs text-green-500 mt-1.5 pl-0.5">
            "{flash}" saved
          </p>
        )}
      </div>

      {/* ── Preset list ──────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-2.5">
          Saved Presets
        </p>

        {presets.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center gap-2.5 py-10 text-neutral-700 select-none">
            <BookMarked size={22} />
            <p className="text-xs text-center leading-relaxed">
              No presets yet.<br />
              Style a card and save it above.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {presets.map(preset => {
              const pendingDelete = confirmDel === preset.name
              return (
                <li
                  key={preset.name}
                  className={`
                    group flex items-center gap-2 px-3 py-2.5 rounded-lg
                    border transition-all duration-150
                    ${pendingDelete
                      ? 'border-red-900/60 bg-red-950/30'
                      : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                    }
                  `}
                >
                  {/* Preset name */}
                  <span className="flex-1 text-sm text-neutral-300 truncate min-w-0">
                    {preset.name}
                  </span>

                  {/* Style hint pills */}
                  <span className="hidden group-hover:flex items-center gap-1 shrink-0">
                    <StyleHint preset={preset} />
                  </span>

                  {/* Load button */}
                  <button
                    onClick={() => handleLoad(preset)}
                    className="
                      flex items-center gap-1 px-2 py-1 rounded-md shrink-0
                      text-xs text-neutral-500
                      hover:text-white hover:bg-neutral-700
                      opacity-0 group-hover:opacity-100
                      transition-all duration-100
                    "
                  >
                    <ArrowDownToLine size={11} />
                    Load
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteClick(preset.name)}
                    aria-label={
                      pendingDelete
                        ? `Confirm delete "${preset.name}"`
                        : `Delete "${preset.name}"`
                    }
                    className={`
                      flex items-center gap-1 px-2 py-1 rounded-md shrink-0
                      text-xs transition-all duration-100
                      opacity-0 group-hover:opacity-100
                      ${pendingDelete
                        ? 'text-red-400 bg-red-950/60 opacity-100'
                        : 'text-neutral-700 hover:text-red-400 hover:bg-red-950/40'
                      }
                    `}
                  >
                    <Trash2 size={11} />
                    {pendingDelete ? 'Sure?' : ''}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── tiny preset metadata hints ───────────────────────────────────────────────

/**
 * Shows two small pills — font family abbreviation + text position —
 * as a quick visual summary of what the preset looks like.
 * Appears on row hover only.
 */
function StyleHint({ preset }) {
  const fontShort = preset.headlineFont?.split(' ')[0] ?? '—'
  const posShort  = {
    'top-left':      'TL',
    'top-center':    'TC',
    'center':        'C',
    'bottom-left':   'BL',
    'bottom-center': 'BC',
  }[preset.textPosition] ?? '—'

  return (
    <>
      <span className="px-1.5 py-0.5 rounded text-[9px] bg-neutral-800 text-neutral-500 leading-none">
        {fontShort}
      </span>
      <span className="px-1.5 py-0.5 rounded text-[9px] bg-neutral-800 text-neutral-500 leading-none">
        {posShort}
      </span>
    </>
  )
}
