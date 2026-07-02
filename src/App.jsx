/**
 * App — root orchestrator.
 *
 * State owned here:
 *   cards[]       — ordered card objects { id, isCover, data: { headline, subtitle, imageUrl, style } }
 *   activeCardId  — ID of the currently selected card
 *   globalStyle   — style shown in the left sidebar StylePanel; synced to the active card
 *   applyAll      — true when the debounced "apply to all" prompt should be visible
 *   helpOpen      — true when the How-to-use modal is open
 *   isDark        — true = dark editor shell (default), false = light
 *
 * Layout (desktop):
 *   ┌──────── Navbar ──────────────────────────────────────────────┐
 *   │ Left sidebar │  Center: CarouselPanel  │  Right sidebar      │
 *   │ StylePanel   │  thumbnail row          │  CardPreview (220)  │
 *   │ ApplyBar     │  + active editor        │  ExportPanel        │
 *   │ PresetMgr    │                         │                     │
 *   └──────────────┴─────────────────────────┴─────────────────────┘
 *
 * Mobile (<768 px):
 *   Navbar → CarouselPanel (full width) → ExportPanel (bottom bar)
 *   Sidebars are hidden on mobile.
 *
 * Keyboard shortcuts:
 *   Cmd/Ctrl + E          → export current card as PNG
 *   Cmd/Ctrl + Z          → undo
 *   Cmd/Ctrl + Shift + Z  → redo
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { HelpCircle, X, Layers, RotateCcw, RotateCw, Sun, Moon } from 'lucide-react'

import CarouselPanel  from './components/CarouselPanel'
import CardPreview    from './components/CardPreview'
import StylePanel     from './components/StylePanel'
import GlobalSettings from './components/GlobalSettings'
import PresetManager  from './components/PresetManager'
import ExportPanel    from './components/ExportPanel'
import { defaultStyles, OF_STYLE, BOLD_STYLE } from './utils/textStyles'
import { useExport }  from './hooks/useExport'

// ─── constants & initial state ────────────────────────────────────────────────

const INITIAL_STYLE   = { ...defaultStyles.HEADLINE, styleType: 'HEADLINE' }
const COVER_STYLE     = { ...INITIAL_STYLE, overlayOpacity: 0 }
const OF_COVER_STYLE  = { ...OF_STYLE }
const BOLD_COVER_STYLE = { ...BOLD_STYLE }

let _uid = 0
function uid() { return `card-${++_uid}-${Math.random().toString(36).slice(2, 6)}` }

function makeCoverCard() {
  return {
    id: 'cover',
    isCover: true,
    data: { headline: '', subtitle: '', imageUrl: null, style: COVER_STYLE },
  }
}

function makeOFCoverCard() {
  return {
    id: 'cover',
    isCover: true,
    data: { headline: '', subtitle: '', imageUrl: '/paper-texture.jpeg', style: OF_COVER_STYLE },
  }
}

function makeOFCard() {
  return {
    id: uid(),
    isCover: false,
    data: { headline: '', subtitle: '', imageUrl: '/paper-texture.jpeg', style: { ...OF_STYLE } },
  }
}

function makeCard() {
  return {
    id: uid(),
    isCover: false,
    data: { headline: '', subtitle: '', imageUrl: null, style: { ...INITIAL_STYLE } },
  }
}

function makeBoldCoverCard() {
  return {
    id: 'cover',
    isCover: true,
    data: { headline: '', subtitle: '', imageUrl: null, style: BOLD_COVER_STYLE },
  }
}

function makeBoldCard() {
  return {
    id: uid(),
    isCover: false,
    data: { headline: '', subtitle: '', imageUrl: null, style: { ...BOLD_STYLE } },
  }
}

// ─── HelpModal ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: '01',
    title: 'Add your cover photo',
    body: 'Select the Cover slot and upload your own image or search Unsplash. This is the first thing your audience sees.',
  },
  {
    n: '02',
    title: 'Write your cards',
    body: 'Click any numbered slot to open its editor. Add a headline, subtitle, or mixed bold + regular text. Up to 10 cards — use the copy button in the thumbnail row to duplicate a card instantly.',
  },
  {
    n: '03',
    title: 'Pick a background',
    body: 'Each card can use a photo (Unsplash search or upload), a solid color, or a custom gradient — set in the Background section of the Style panel.',
  },
  {
    n: '04',
    title: 'Style it',
    body: 'Choose from 14 fonts, set sizes, letter spacing, and line height. Overlay options: flat, bottom-fade, top-fade, or vignette. Add film grain for a cinematic texture. Enable text shadow to make type pop on bright images. Save any look as a preset.',
  },
  {
    n: '05',
    title: 'Smart text placement',
    body: 'When you pick a photo, the text auto-moves to the darkest region so it\'s always readable. Fine-tune with the 3×3 position grid in the Style panel.',
  },
  {
    n: '06',
    title: 'Export',
    body: 'Download a single card as PNG, export all cards as a ZIP, or copy the active card to your clipboard — all at 1080 × 1080 px. Keyboard: Cmd/Ctrl+E exports, Cmd/Ctrl+Z undoes.',
  },
]

function HelpModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="
            absolute top-4 right-4 w-7 h-7 rounded-full
            flex items-center justify-center
            text-neutral-600 hover:text-white hover:bg-neutral-800
            transition-colors
          "
        >
          <X size={14} />
        </button>

        <h2 className="text-base font-semibold text-white mb-6">How to use CarouselCraft</h2>

        <ol className="flex flex-col gap-5">
          {STEPS.map(({ n, title, body }) => (
            <li key={n} className="flex gap-4">
              <span className="text-[11px] font-mono text-neutral-700 mt-0.5 shrink-0 w-5">{n}</span>
              <div>
                <p className="text-sm font-medium text-neutral-200 mb-1">{title}</p>
                <p className="text-xs text-neutral-500 leading-relaxed">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <button
          onClick={onClose}
          className="
            mt-8 w-full py-2.5 rounded-xl
            bg-neutral-800 hover:bg-neutral-700
            text-sm font-medium text-white
            transition-colors
          "
        >
          Got it
        </button>
      </div>
    </div>
  )
}

// ─── ApplyBar — inline prompt after a style change ───────────────────────────

function ApplyBar({ onApplyAll, onDismiss }) {
  return (
    <div className="
      mx-0 mt-1 px-4 py-3 rounded-xl
      bg-neutral-800 border border-neutral-700
    ">
      <p className="text-[11px] text-neutral-400 mb-2.5">
        Apply this style to:
      </p>
      <div className="flex gap-2">
        <button
          onClick={onApplyAll}
          className="
            flex-1 py-1.5 rounded-lg text-xs font-medium
            bg-neutral-700 hover:bg-neutral-600
            text-white transition-colors
          "
        >
          All cards
        </button>
        <button
          onClick={onDismiss}
          className="
            flex-1 py-1.5 rounded-lg text-xs font-medium
            bg-neutral-900 border border-neutral-700
            text-neutral-400 hover:text-white
            transition-colors
          "
        >
          Just this one
        </button>
      </div>
    </div>
  )
}

// ─── SidebarLabel / SidebarDivider ───────────────────────────────────────────

function SidebarLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 mb-3">
      {children}
    </p>
  )
}

function SidebarDivider() {
  return <div className="border-t border-neutral-800/80 my-1" />
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  // ── state ──────────────────────────────────────────────────────────────────

  const [cards,               setCards]               = useState(() => [makeCoverCard(), makeCard()])
  const [activeCardId,        setActiveCardId]        = useState('cover')
  const [globalStyle,         setGlobalStyle]         = useState(INITIAL_STYLE)
  const [applyAll,            setApplyAll]            = useState(false)
  const [helpOpen,            setHelpOpen]            = useState(false)
  const [isDark,              setIsDark]              = useState(true)
  const [watermark,           setWatermark]           = useState(null)
  const [showSlideIndicator,  setShowSlideIndicator]  = useState(false)
  const [indicatorPosition,   setIndicatorPosition]   = useState('bottom-right')
  const [activeBrand,         setActiveBrand]         = useState('kshitij')

  // Saved state for each brand so switching preserves work
  const savedBrandRef = useRef({
    kshitij:    null,
    onefounder: null,
    bold:       null,
  })

  const applyTimerRef  = useRef(null)
  const previewRefsMap = useRef(new Map())
  const sidebarPrevRef = useRef(null)

  // ── undo / redo ────────────────────────────────────────────────────────────

  const historyRef    = useRef({ past: [], future: [] })
  const histTimerRef  = useRef(null)
  const histPendingRef = useRef(null)  // snapshot of cards before current change burst

  // ── stable refs for keyboard handler (avoids stale closures) ───────────────

  const cardsRef        = useRef(cards)
  const activeCardIdRef = useRef(activeCardId)
  const activeIndexRef  = useRef(0)
  const orderedRefsRef  = useRef([])

  // ── derived ────────────────────────────────────────────────────────────────

  const activeIndex = Math.max(0, cards.findIndex(c => c.id === activeCardId))
  const activeCard  = cards[activeIndex] ?? cards[0]

  const getRef = useCallback((cardId) => {
    if (!previewRefsMap.current.has(cardId)) {
      previewRefsMap.current.set(cardId, { current: null })
    }
    return previewRefsMap.current.get(cardId)
  }, [])

  const orderedRefs = cards.map(c => getRef(c.id))

  // ── keep refs in sync ──────────────────────────────────────────────────────

  useEffect(() => { cardsRef.current        = cards        }, [cards])
  useEffect(() => { activeCardIdRef.current = activeCardId }, [activeCardId])
  useEffect(() => { activeIndexRef.current  = activeIndex  }, [activeIndex])
  useEffect(() => { orderedRefsRef.current  = orderedRefs  }) // intentionally no deps — always latest

  // ── dark / light mode ──────────────────────────────────────────────────────

  useEffect(() => {
    document.body.classList.toggle('light', !isDark)
  }, [isDark])

  // ── sync globalStyle when active card changes ──────────────────────────────

  useEffect(() => {
    const card = cards.find(c => c.id === activeCardId)
    if (card?.data?.style) setGlobalStyle(card.data.style)
    setApplyAll(false)
    clearTimeout(applyTimerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCardId])

  // ── history helpers ────────────────────────────────────────────────────────

  const scheduleHistory = useCallback(() => {
    if (!histPendingRef.current) histPendingRef.current = cardsRef.current
    clearTimeout(histTimerRef.current)
    histTimerRef.current = setTimeout(() => {
      const snap = histPendingRef.current
      if (snap) {
        historyRef.current.past.push(snap)
        if (historyRef.current.past.length > 50) historyRef.current.past.shift()
        historyRef.current.future = []
        histPendingRef.current = null
      }
    }, 700)
  }, [])

  const undo = useCallback(() => {
    const { past, future } = historyRef.current
    if (!past.length) return
    clearTimeout(histTimerRef.current)
    histPendingRef.current = null
    const snapshot = past.pop()
    future.push(cardsRef.current)
    if (future.length > 50) future.shift()
    setCards(snapshot)
    const card = snapshot.find(c => c.id === activeCardIdRef.current) ?? snapshot[0]
    if (card?.data?.style) setGlobalStyle(card.data.style)
  }, [])

  const redo = useCallback(() => {
    const { past, future } = historyRef.current
    if (!future.length) return
    clearTimeout(histTimerRef.current)
    histPendingRef.current = null
    const snapshot = future.pop()
    past.push(cardsRef.current)
    if (past.length > 50) past.shift()
    setCards(snapshot)
    const card = snapshot.find(c => c.id === activeCardIdRef.current) ?? snapshot[0]
    if (card?.data?.style) setGlobalStyle(card.data.style)
  }, [])

  // ── export (used by keyboard shortcut) ────────────────────────────────────

  const { exportCard } = useExport()

  // ── keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = async (e) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return

      if (e.key === 'e' && !e.shiftKey) {
        e.preventDefault()
        const ref = orderedRefsRef.current[activeIndexRef.current]
        if (!ref) return
        try { await exportCard(ref, activeIndexRef.current) } catch { /* silent */ }
        return
      }
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if (e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [undo, redo, exportCard])

  // ── brand switching ────────────────────────────────────────────────────────

  const switchBrand = useCallback((brand) => {
    if (brand === activeBrand) return

    // Save current brand's state
    savedBrandRef.current[activeBrand] = {
      cards:       cardsRef.current,
      activeCardId: activeCardIdRef.current,
      globalStyle, // captured from closure — latest via useCallback dep
    }

    // Clear undo history on brand switch
    clearTimeout(histTimerRef.current)
    histPendingRef.current = null
    historyRef.current = { past: [], future: [] }

    // Load target brand's saved state (or fresh defaults)
    const saved = savedBrandRef.current[brand]
    if (saved) {
      setCards(saved.cards)
      setActiveCardId(saved.activeCardId)
      setGlobalStyle(saved.globalStyle)
    } else if (brand === 'onefounder') {
      const initialOFCards = [makeOFCoverCard(), makeOFCard()]
      setCards(initialOFCards)
      setActiveCardId('cover')
      setGlobalStyle({ ...OF_STYLE })
    } else if (brand === 'bold') {
      const initialBoldCards = [makeBoldCoverCard(), makeBoldCard()]
      setCards(initialBoldCards)
      setActiveCardId('cover')
      setGlobalStyle({ ...BOLD_STYLE })
    } else {
      const initialCards = [makeCoverCard(), makeCard()]
      setCards(initialCards)
      setActiveCardId('cover')
      setGlobalStyle(INITIAL_STYLE)
    }

    setApplyAll(false)
    setActiveBrand(brand)
  }, [activeBrand, globalStyle])

  // ── card CRUD ──────────────────────────────────────────────────────────────

  const handleActiveChange = useCallback((cardId) => {
    setActiveCardId(cardId)
  }, [])

  const handleCardUpdate = useCallback((cardId, data) => {
    scheduleHistory()
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, data } : c))
    if (cardId === activeCardId) {
      setGlobalStyle(data.style)
      setApplyAll(false)
      clearTimeout(applyTimerRef.current)
    }
  }, [activeCardId, scheduleHistory])

  const handleAddCard = useCallback(() => {
    if (cards.length >= 10) return
    const newCard = activeBrand === 'onefounder' ? makeOFCard() : activeBrand === 'bold' ? makeBoldCard() : makeCard()
    newCard.data.style = { ...globalStyle }
    scheduleHistory()
    setCards(prev => [...prev, newCard])
    setActiveCardId(newCard.id)
  }, [cards.length, globalStyle, scheduleHistory, activeBrand])

  const handleRemoveCard = useCallback((cardId) => {
    if (cardId === 'cover' || cards.length <= 2) return
    scheduleHistory()
    setCards(prev => {
      const removedAt = prev.findIndex(c => c.id === cardId)
      const next = prev.filter(c => c.id !== cardId)
      const nextActive = next[Math.max(1, removedAt - 1)]
      setActiveCardId(nextActive?.id ?? 'cover')
      return next
    })
    previewRefsMap.current.delete(cardId)
  }, [cards, scheduleHistory])

  const handleReorder = useCallback((newCards) => {
    scheduleHistory()
    setCards(newCards)
  }, [scheduleHistory])

  const handleDuplicateCard = useCallback((cardId) => {
    if (cards.length >= 10) return
    const source = cards.find(c => c.id === cardId)
    if (!source || source.isCover) return
    const newCard = {
      id:      uid(),
      isCover: false,
      data:    { ...source.data, style: { ...source.data.style } },
    }
    scheduleHistory()
    setCards(prev => {
      const idx  = prev.findIndex(c => c.id === cardId)
      const next = [...prev]
      next.splice(idx + 1, 0, newCard)
      return next
    })
    setActiveCardId(newCard.id)
  }, [cards, scheduleHistory])

  // ── global style changes (left sidebar StylePanel) ─────────────────────────

  const handleGlobalStyleChange = useCallback((newStyle) => {
    setGlobalStyle(newStyle)
    scheduleHistory()
    setCards(prev =>
      prev.map(c => c.id === activeCardId ? { ...c, data: { ...c.data, style: newStyle } } : c)
    )
    clearTimeout(applyTimerRef.current)
    setApplyAll(false)
    if (cards.length > 1) {
      applyTimerRef.current = setTimeout(() => setApplyAll(true), 700)
    }
  }, [activeCardId, cards.length, scheduleHistory])

  const handleApplyToAll = useCallback(() => {
    setCards(prev => prev.map(c => ({ ...c, data: { ...c.data, style: globalStyle } })))
    setApplyAll(false)
    clearTimeout(applyTimerRef.current)
  }, [globalStyle])

  // ── text drag (sidebar preview) — no applyAll, no trigger for other cards ──

  const handleTextDrag = useCallback((patch) => {
    const newStyle = { ...globalStyle, ...patch }
    setGlobalStyle(newStyle)
    scheduleHistory()
    setCards(prev =>
      prev.map(c => c.id === activeCardId ? { ...c, data: { ...c.data, style: newStyle } } : c)
    )
  }, [activeCardId, globalStyle, scheduleHistory])

  // ── preset load ────────────────────────────────────────────────────────────

  const handlePresetLoad = useCallback((preset) => {
    const { name: _ignore, ...presetStyle } = preset
    const newStyle = { ...globalStyle, ...presetStyle }
    setGlobalStyle(newStyle)
    setCards(prev =>
      prev.map(c => c.id === activeCardId ? { ...c, data: { ...c.data, style: newStyle } } : c)
    )
    if (cards.length > 1) setApplyAll(true)
  }, [globalStyle, activeCardId, cards.length])

  // ── shell theme tokens ─────────────────────────────────────────────────────

  const navCls   = isDark
    ? 'bg-neutral-950 border-neutral-800 text-neutral-200'
    : 'bg-white border-gray-200 text-gray-900'
  const rootCls  = isDark ? 'bg-neutral-950 text-neutral-200' : 'bg-gray-50 text-gray-900'
  const asideCls = isDark
    ? 'border-neutral-800 bg-neutral-950'
    : 'border-gray-200 bg-white'
  const previewBg = isDark ? 'bg-neutral-900/20' : 'bg-gray-100'
  const iconCls   = isDark
    ? 'text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800'
    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
  const dividerCls = isDark ? 'bg-neutral-800' : 'bg-gray-200'
  const cardCountCls = isDark ? 'text-neutral-700' : 'text-gray-400'
  const previewLabelCls = isDark ? 'text-neutral-700' : 'text-gray-400'

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${rootCls}`}>

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className={`flex items-center justify-between px-5 py-3 border-b shrink-0 ${navCls}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-white/[0.08] border border-white/10 flex items-center justify-center">
            <Layers size={12} className="text-neutral-300" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            CarouselCraft
          </span>
          <span className={`text-[10px] font-mono ml-1 hidden sm:inline ${cardCountCls}`}>
            {cards.length} card{cards.length !== 1 ? 's' : ''}
          </span>

          {/* Brand switcher */}
          <div className={`
            ml-3 flex items-center rounded-lg p-0.5 gap-0.5
            ${isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-gray-100 border border-gray-200'}
          `}>
            {['kshitij', 'onefounder', 'bold'].map(brand => (
              <button
                key={brand}
                onClick={() => switchBrand(brand)}
                className={`
                  px-3 py-1 rounded-md text-xs font-medium transition-all
                  ${activeBrand === brand
                    ? brand === 'bold'
                      ? 'bg-[#c8f135] text-black shadow-sm'
                      : isDark
                        ? 'bg-neutral-700 text-white shadow-sm'
                        : 'bg-white text-gray-900 shadow-sm'
                    : isDark
                      ? 'text-neutral-500 hover:text-neutral-300'
                      : 'text-gray-400 hover:text-gray-600'
                  }
                `}
              >
                {brand === 'kshitij' ? 'Kshitij' : brand === 'onefounder' ? 'OneFounder' : 'Bold Dark'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Undo */}
          <button
            onClick={undo}
            title="Undo (Ctrl/Cmd+Z)"
            aria-label="Undo"
            className={`p-1.5 rounded-lg transition-colors ${iconCls}`}
          >
            <RotateCcw size={13} />
          </button>

          {/* Redo */}
          <button
            onClick={redo}
            title="Redo (Ctrl/Cmd+Shift+Z)"
            aria-label="Redo"
            className={`p-1.5 rounded-lg transition-colors ${iconCls}`}
          >
            <RotateCw size={13} />
          </button>

          {/* Dark / light toggle */}
          <button
            onClick={() => setIsDark(d => !d)}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`p-1.5 rounded-lg transition-colors ${iconCls}`}
          >
            {isDark ? <Sun size={13} /> : <Moon size={13} />}
          </button>

          <div className={`w-px h-4 mx-1 ${dividerCls}`} />

          <button
            onClick={() => setHelpOpen(true)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-xs transition-colors
              ${isDark
                ? 'bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:text-white text-neutral-500'
                : 'bg-gray-100 border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <HelpCircle size={12} />
            How to use
          </button>
        </div>
      </nav>

      {/* ── 3-column body (sidebars hidden on mobile) ───────────────────── */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

        {/* ── Left sidebar: style + presets ─────────────────────────── */}
        <aside className={`hidden md:flex w-72 shrink-0 border-r flex-col overflow-hidden ${asideCls}`}>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">

            <>
              <div>
                <SidebarLabel>Text Style</SidebarLabel>
                <StylePanel style={globalStyle} onChange={handleGlobalStyleChange} />
              </div>

              {applyAll && cards.length > 1 && (
                <ApplyBar
                  onApplyAll={handleApplyToAll}
                  onDismiss={() => { setApplyAll(false); clearTimeout(applyTimerRef.current) }}
                />
              )}

              <SidebarDivider />

              <div>
                <SidebarLabel>Presets</SidebarLabel>
                <PresetManager currentStyle={globalStyle} onLoad={handlePresetLoad} />
              </div>
            </>

            <SidebarDivider />

            <div>
              <SidebarLabel>Global Settings</SidebarLabel>
              <GlobalSettings
                watermark={watermark}
                onWatermarkChange={setWatermark}
                showSlideIndicator={showSlideIndicator}
                onShowSlideIndicatorChange={setShowSlideIndicator}
                indicatorPosition={indicatorPosition}
                onIndicatorPositionChange={setIndicatorPosition}
              />
            </div>
          </div>
        </aside>

        {/* ── Center: carousel thumbnails + editor ──────────────────── */}
        <main className="flex-1 overflow-hidden min-w-0">
          <CarouselPanel
            cards={cards}
            activeCardId={activeCardId}
            onActiveChange={handleActiveChange}
            onCardUpdate={handleCardUpdate}
            onAddCard={handleAddCard}
            onRemoveCard={handleRemoveCard}
            onDuplicateCard={handleDuplicateCard}
            onReorder={handleReorder}
            getRef={getRef}
            watermark={watermark}
            showSlideIndicator={showSlideIndicator}
            indicatorPosition={indicatorPosition}
            brand={activeBrand}
          />
        </main>

        {/* ── Right sidebar: preview + export ───────────────────────── */}
        <aside className={`hidden md:flex w-72 shrink-0 border-l flex-col overflow-hidden ${asideCls}`}>
          <div className={`flex-1 flex items-center justify-center p-5 overflow-hidden ${previewBg}`}>
            {activeCard && (
              <div className="flex flex-col items-center gap-3">
                <CardPreview
                  ref={sidebarPrevRef}
                  cardData={activeCard.data}
                  size={220}
                  watermark={watermark}
                  showSlideIndicator={showSlideIndicator}
                  slideIndex={activeIndex + 1}
                  totalSlides={cards.length}
                  indicatorPosition={indicatorPosition}
                  draggableText={!activeCard.isCover}
                  onTextDrag={handleTextDrag}
                />
                <span className={`text-[10px] select-none ${previewLabelCls}`}>
                  {activeCard.isCover ? 'Cover' : `Card ${activeIndex + 1}`} · 1080 × 1080 px
                </span>
              </div>
            )}
          </div>

          <ExportPanel
            activeIndex={activeIndex}
            totalCards={cards.length}
            orderedRefs={orderedRefs}
            cards={cards}
          />
        </aside>
      </div>

      {/* ── Mobile-only export bar ──────────────────────────────────────── */}
      <div className="md:hidden shrink-0">
        <ExportPanel
          activeIndex={activeIndex}
          totalCards={cards.length}
          orderedRefs={orderedRefs}
          cards={cards}
        />
      </div>

      {/* ── Help modal ──────────────────────────────────────────────────── */}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  )
}
