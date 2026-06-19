/**
 * useExport — PNG and ZIP export using CardPreview's exportPNG() method.
 *
 * Each CardPreview exposes { exportPNG() } via forwardRef + useImperativeHandle.
 * exportPNG() calls Konva's stage.toDataURL with the correct pixelRatio so
 * the output is always 1080×1080 regardless of the thumbnail display size.
 *
 * Export filenames:
 *   Single card  → card_01.png  (1-indexed, zero-padded to 2 digits)
 *   All cards    → carousel_YYYY-MM-DD.zip
 */

import { useCallback } from 'react'
import JSZip      from 'jszip'
import { saveAs } from 'file-saver'

// ─── helpers ──────────────────────────────────────────────────────────────────

function padIndex(i) {
  return String(i + 1).padStart(2, '0')
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function dataURLtoBlob(dataURL) {
  const [header, base64] = dataURL.split(',')
  const mime   = header.match(/:(.*?);/)[1]
  const binary = atob(base64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

// ─── hook ─────────────────────────────────────────────────────────────────────

/**
 * @returns {{
 *   exportCard:    (ref, cardIndex: number) => Promise<void>
 *   exportAll:     (refs, cards, onProgress?: (pct: number) => void) => Promise<{ skipped: number }>
 *   clipboardCopy: (ref) => Promise<void>
 * }}
 *
 * Each `ref` must be a React ref whose `.current` exposes `exportPNG() → string`.
 * This matches the CardPreview forwardRef contract.
 */
export function useExport() {
  const exportCard = useCallback(async (ref, cardIndex) => {
    const dataURL = ref?.current?.exportPNG?.()
    if (!dataURL) throw new Error('exportCard: exportPNG() returned null — is the ref attached?')
    saveAs(dataURLtoBlob(dataURL), `card_${padIndex(cardIndex)}.png`)
  }, [])

  /**
   * @param {Array}    refs        — CardPreview refs in carousel order
   * @param {Array}    cards       — card data objects in the same order
   * @param {Function} onProgress  — called with 0–100
   * @returns {{ skipped: number }}
   */
  const exportAll = useCallback(async (refs, cards, onProgress) => {
    if (!refs?.length) return { skipped: 0 }
    const zip = new JSZip()
    let skipped = 0

    for (let i = 0; i < refs.length; i++) {
      onProgress?.(Math.round((i / refs.length) * 90))
      // Skip cards with no background image
      if (!cards?.[i]?.data?.imageUrl) {
        skipped++
        continue
      }
      const dataURL = refs[i]?.current?.exportPNG?.()
      if (!dataURL) { skipped++; continue }
      zip.file(`card_${padIndex(i)}.png`, dataURLtoBlob(dataURL))
    }

    onProgress?.(95)
    const zipBlob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      ({ percent }) => onProgress?.(95 + Math.round(percent * 0.05)),
    )
    saveAs(zipBlob, `carousel_${todayISO()}.zip`)
    onProgress?.(100)
    return { skipped }
  }, [])

  const clipboardCopy = useCallback(async (ref) => {
    // Clipboard API write requires a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      throw new Error('HTTPS_REQUIRED')
    }
    const dataURL = ref?.current?.exportPNG?.()
    if (!dataURL) throw new Error('clipboardCopy: exportPNG() returned null')
    if (!navigator?.clipboard?.write) throw new Error('Clipboard API not supported in this browser')
    const blob = dataURLtoBlob(dataURL)
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  }, [])

  return { exportCard, exportAll, clipboardCopy }
}
