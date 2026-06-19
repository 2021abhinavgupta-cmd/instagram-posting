/**
 * ExportPanel — sticky bottom export bar.
 *
 * Props:
 *   activeIndex  {number}   — 0-based index of the active card
 *   totalCards   {number}   — total card count (for ZIP label)
 *   orderedRefs  {Array}    — array of CardPreview refs in carousel order;
 *                             each ref.current exposes exportPNG() → PNG data-URL
 *   cards        {Array}    — card data objects in carousel order (for ZIP skip logic)
 *
 * Buttons:
 *   Download Card   → exports the active card as card_0N.png
 *   Download All    → exports cards that have an image; skips the rest; shows skip count
 *   Copy to Clipboard → writes the active card PNG to navigator.clipboard (HTTPS only)
 *
 * Progress bar appears during ZIP export.
 * A toast appears briefly after any action.
 */

import { useState, useCallback, useEffect } from 'react'
import { Download, Archive, Clipboard, Loader2 } from 'lucide-react'
import { useExport } from '../hooks/useExport'

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      role="status"
      aria-live="polite"
      className="
        fixed bottom-20 left-1/2 -translate-x-1/2 z-50
        px-4 py-2 rounded-full shadow-lg
        bg-neutral-100 text-neutral-900
        text-sm font-medium
        pointer-events-none select-none
      "
    >
      {message}
    </div>
  )
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct }) {
  return (
    <div className="absolute inset-x-0 top-0 h-[2px] bg-neutral-800 overflow-hidden">
      <div
        className="h-full bg-white transition-all duration-200 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── ExportButton ─────────────────────────────────────────────────────────────

function ExportButton({ icon, label, loading, disabled, onClick, title, subtle }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        flex items-center gap-1.5 px-3 py-2 rounded-lg
        text-xs font-medium transition-all duration-150
        disabled:cursor-not-allowed
        ${subtle
          ? `bg-neutral-900 border border-neutral-800
             text-neutral-500 hover:text-neutral-300 hover:border-neutral-700
             disabled:opacity-30`
          : `bg-neutral-800 hover:bg-neutral-700
             text-neutral-200 hover:text-white
             disabled:opacity-40`
        }
      `}
    >
      {loading
        ? <Loader2 size={13} className="animate-spin shrink-0" />
        : <span className="shrink-0">{icon}</span>
      }
      <span>{label}</span>
    </button>
  )
}

// ─── ExportPanel ──────────────────────────────────────────────────────────────

export default function ExportPanel({
  activeIndex = 0,
  totalCards  = 1,
  orderedRefs = [],
  cards       = [],
}) {
  const { exportCard, exportAll, clipboardCopy } = useExport()

  const [busy,     setBusy]     = useState(null)   // 'card' | 'all' | 'clip' | null
  const [progress, setProgress] = useState(0)
  const [toast,    setToast]    = useState(null)

  const showToast    = useCallback((msg) => setToast(msg), [])
  const dismissToast = useCallback(() => setToast(null), [])

  const handleDownloadCard = async () => {
    if (busy) return
    const ref = orderedRefs[activeIndex]
    if (!ref) return
    setBusy('card')
    try {
      await exportCard(ref, activeIndex)
      showToast(`card_${String(activeIndex + 1).padStart(2, '0')}.png saved`)
    } catch (err) {
      showToast(`Export failed: ${err.message}`)
    } finally {
      setBusy(null)
    }
  }

  const handleDownloadAll = async () => {
    if (busy) return
    if (!orderedRefs.length) return
    setBusy('all')
    setProgress(0)
    try {
      const { skipped } = await exportAll(orderedRefs, cards, (pct) => setProgress(pct))
      const exported = totalCards - skipped
      const msg = skipped > 0
        ? `${exported} card${exported !== 1 ? 's' : ''} saved · ${skipped} skipped (no image)`
        : `${totalCards} card${totalCards !== 1 ? 's' : ''} saved as ZIP`
      showToast(msg)
    } catch (err) {
      showToast(`Export failed: ${err.message}`)
    } finally {
      setBusy(null)
      setProgress(0)
    }
  }

  const handleClipboard = async () => {
    if (busy) return
    const ref = orderedRefs[activeIndex]
    if (!ref) return
    setBusy('clip')
    try {
      await clipboardCopy(ref)
      showToast('Copied to clipboard')
    } catch (err) {
      if (err.message === 'HTTPS_REQUIRED') {
        showToast('Right-click the preview to save (requires HTTPS)')
      } else if (err.message.includes('not supported')) {
        showToast('Clipboard not supported in this browser')
      } else {
        showToast(`Copy failed: ${err.message}`)
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      {toast && <Toast message={toast} onDone={dismissToast} />}

      <div className="relative shrink-0 flex items-center gap-2 px-4 py-3 border-t border-neutral-800 bg-neutral-950">
        {busy === 'all' && <ProgressBar pct={progress} />}

        <ExportButton
          icon={<Download size={13} />}
          label="Download Card"
          loading={busy === 'card'}
          disabled={!!busy}
          onClick={handleDownloadCard}
          title={`Export card ${activeIndex + 1} as PNG`}
        />

        <ExportButton
          icon={<Archive size={13} />}
          label={`Download All (${totalCards})`}
          loading={busy === 'all'}
          disabled={!!busy}
          onClick={handleDownloadAll}
          title={`Export all ${totalCards} cards as ZIP`}
        />

        <ExportButton
          icon={<Clipboard size={13} />}
          label="Copy"
          loading={busy === 'clip'}
          disabled={!!busy}
          onClick={handleClipboard}
          title="Copy active card to clipboard as PNG"
          subtle
        />

        {busy === 'all' && progress > 0 && (
          <span className="ml-auto text-xs text-neutral-600 tabular-nums">
            {progress}%
          </span>
        )}
      </div>
    </>
  )
}
