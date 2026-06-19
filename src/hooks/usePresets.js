/**
 * usePresets — CRUD for style presets stored in localStorage.
 *
 * Preset schema (from CLAUDE.md):
 * {
 *   name:           string
 *   headlineFont:   string
 *   headlineSize:   number
 *   headlineStyle:  'italic' | 'normal'
 *   subtitleFont:   string
 *   subtitleSize:   number
 *   overlayOpacity: number          (0–0.7)
 *   textColor:      string          (CSS hex)
 *   textPosition:   'top-left' | 'top-center' | 'center' | 'bottom-left' | 'bottom-center'
 * }
 */

import { useState, useCallback } from 'react'

const STORAGE_KEY = 'carouselcraft_presets'

// ─── storage helpers ───────────────────────────────────────────────────────────

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    // Guard against corrupt data
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStorage(presets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  } catch {
    // Quota exceeded or private-mode block — fail silently.
    console.warn('[usePresets] localStorage write failed.')
  }
}

// ─── hook ─────────────────────────────────────────────────────────────────────

/**
 * @returns {{
 *   presets:      object[]
 *   savePreset:   (name: string, styleData: object) => void
 *   deletePreset: (name: string) => void
 * }}
 */
export function usePresets() {
  // Lazy-initialise from localStorage so reads happen once at mount.
  const [presets, setPresets] = useState(readStorage)

  /**
   * Upsert a preset by name.
   * If a preset with the same name exists it is overwritten (preserves order);
   * otherwise the new preset is appended.
   *
   * @param {string} name
   * @param {object} styleData — the fields listed in the preset schema
   */
  const savePreset = useCallback((name, styleData) => {
    if (!name?.trim()) return

    const preset = { name: name.trim(), ...styleData }

    setPresets(prev => {
      const existingIndex = prev.findIndex(p => p.name === preset.name)
      const next =
        existingIndex >= 0
          ? prev.map((p, i) => (i === existingIndex ? preset : p))
          : [...prev, preset]

      writeStorage(next)
      return next
    })
  }, [])

  /**
   * Remove a preset by name. No-op if the name doesn't exist.
   *
   * @param {string} name
   */
  const deletePreset = useCallback((name) => {
    setPresets(prev => {
      const next = prev.filter(p => p.name !== name)
      writeStorage(next)
      return next
    })
  }, [])

  return { presets, savePreset, deletePreset }
}
