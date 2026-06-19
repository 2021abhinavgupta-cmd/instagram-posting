/**
 * ImagePicker — three-tab panel for choosing a card background.
 *
 * Tabs:
 *   Unsplash — keyword search via Unsplash API
 *   Pexels   — keyword search via Pexels API
 *   Upload   — drag-and-drop / click-to-browse local file
 *
 * Props:
 *   onSelect(url)  — called with a full-res URL or base64 data-URL
 *   currentUrl     — currently selected image URL (highlights active thumb)
 */

import { useState, useRef, useCallback } from 'react'
import {
  Search,
  Upload,
  Loader2,
  AlertCircle,
  X,
  ImageIcon,
  KeyRound,
} from 'lucide-react'
import { useUnsplash } from '../hooks/useUnsplash'
import { usePexels }   from '../hooks/usePexels'
import { usePixabay }  from '../hooks/usePixabay'

// ─── API key checks ───────────────────────────────────────────────────────────

const UNSPLASH_KEY         = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
const UNSPLASH_KEY_MISSING = !UNSPLASH_KEY || UNSPLASH_KEY === 'your_key_here'

const PEXELS_KEY           = import.meta.env.VITE_PEXELS_API_KEY
const PEXELS_KEY_MISSING   = !PEXELS_KEY || PEXELS_KEY === 'your_pexels_key_here'

const PIXABAY_KEY          = import.meta.env.VITE_PIXABAY_API_KEY
const PIXABAY_KEY_MISSING  = !PIXABAY_KEY || PIXABAY_KEY === 'your_pixabay_key_here'

// ─── constants ────────────────────────────────────────────────────────────────

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPT_ATTR   = '.jpg,.jpeg,.png,.webp'

// ─── shared sub-components ────────────────────────────────────────────────────

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
        active
          ? 'bg-neutral-700 text-white shadow-sm'
          : 'text-neutral-500 hover:text-neutral-300'
      }`}
    >
      {children}
    </button>
  )
}

function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-950/40 border border-red-900/30 text-xs text-red-400 leading-snug">
      <AlertCircle size={13} className="shrink-0 mt-px" />
      <span>{message}</span>
    </div>
  )
}

function KeyMissingBanner({ envVar, label, docsUrl }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 px-2 text-center">
      <div className="w-10 h-10 rounded-full bg-amber-950/30 border border-amber-900/30 flex items-center justify-center">
        <KeyRound size={16} className="text-amber-500" />
      </div>
      <div>
        <p className="text-xs text-neutral-300 font-medium mb-1">
          {label} key not configured
        </p>
        <p className="text-xs text-neutral-600 leading-relaxed">
          Add your free key to{' '}
          <code className="text-neutral-400 bg-neutral-800 px-1 py-0.5 rounded text-[10px]">.env</code>{' '}
          to enable image search
        </p>
      </div>
      <code className="text-[10px] text-neutral-600 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg">
        {envVar}=your_key
      </code>
      <a
        href={docsUrl}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-neutral-600 underline hover:text-neutral-400 transition-colors"
      >
        Get a free key →
      </a>
    </div>
  )
}

/** Reusable search bar + photo grid used by both Unsplash and Pexels tabs. */
function PhotoSearchGrid({
  placeholder,
  photos,
  loading,
  error,
  onSearch,
  onSelect,
  currentUrl,
  getThumbUrl,
  getFullUrl,
  getAttribution,
  emptyLabel,
}) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) onSearch(query.trim())
  }

  const hasResults = photos.length > 0
  const isEmpty    = !loading && !hasResults && !error

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="
            flex-1 px-3 py-2 rounded-lg bg-neutral-900
            border border-neutral-800 text-sm text-neutral-200
            placeholder-neutral-600
            focus:outline-none focus:border-neutral-600
            transition-colors
          "
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="
            px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700
            disabled:opacity-40 disabled:cursor-not-allowed
            text-white transition-colors shrink-0
          "
          aria-label="Search"
        >
          {loading
            ? <Loader2 size={14} className="animate-spin" />
            : <Search size={14} />
          }
        </button>
      </form>

      {error && <ErrorBanner message={error} />}

      {isEmpty && (
        <div className="flex flex-col items-center gap-2 py-10 text-neutral-700 select-none">
          <ImageIcon size={22} />
          <span className="text-xs">{emptyLabel}</span>
        </div>
      )}

      {hasResults && (
        <div className="grid grid-cols-2 gap-1.5 max-h-80 overflow-y-auto pr-0.5">
          {photos.map((photo, i) => {
            const thumbUrl = getThumbUrl(photo)
            const fullUrl  = getFullUrl(photo)
            const credit   = getAttribution(photo)
            const isActive = currentUrl === fullUrl

            return (
              <button
                key={photo.id ?? i}
                onClick={() => onSelect?.(fullUrl)}
                title={`Photo by ${credit}`}
                className={`
                  relative aspect-square overflow-hidden rounded-lg
                  transition-all duration-150
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
                  ${isActive
                    ? 'ring-2 ring-white scale-95'
                    : 'hover:scale-95 hover:ring-2 hover:ring-white/30'
                  }
                `}
              >
                <img
                  src={thumbUrl}
                  alt={credit}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  crossOrigin="anonymous"
                />

                <span className="
                  absolute bottom-0 inset-x-0 px-1.5 py-1
                  bg-gradient-to-t from-black/70 to-transparent
                  text-[9px] text-neutral-300 truncate
                  opacity-0 hover:opacity-100 transition-opacity
                  pointer-events-none
                ">
                  {credit}
                </span>

                {isActive && (
                  <span className="
                    absolute top-1.5 right-1.5 w-4 h-4 rounded-full
                    bg-white text-black text-[9px] font-bold
                    flex items-center justify-center
                  ">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Unsplash tab ─────────────────────────────────────────────────────────────

function UnsplashTab({ onSelect, currentUrl }) {
  const { images, loading, error, search } = useUnsplash()

  if (UNSPLASH_KEY_MISSING) {
    return (
      <KeyMissingBanner
        label="Unsplash"
        envVar="VITE_UNSPLASH_ACCESS_KEY"
        docsUrl="https://unsplash.com/developers"
      />
    )
  }

  return (
    <PhotoSearchGrid
      placeholder="fire, dark city, mirror…"
      photos={images}
      loading={loading}
      error={error}
      onSearch={search}
      onSelect={onSelect}
      currentUrl={currentUrl}
      getThumbUrl={p => p.urls.small}
      getFullUrl={p => p.urls.full}
      getAttribution={p => p.user.name}
      emptyLabel="Search Unsplash for a background"
    />
  )
}

// ─── Pexels tab ───────────────────────────────────────────────────────────────

function PexelsTab({ onSelect, currentUrl }) {
  const { photos, loading, error, search } = usePexels()

  if (PEXELS_KEY_MISSING) {
    return (
      <KeyMissingBanner
        label="Pexels"
        envVar="VITE_PEXELS_API_KEY"
        docsUrl="https://www.pexels.com/api/"
      />
    )
  }

  return (
    <PhotoSearchGrid
      placeholder="ocean, forest, neon city…"
      photos={photos}
      loading={loading}
      error={error}
      onSearch={search}
      onSelect={onSelect}
      currentUrl={currentUrl}
      getThumbUrl={p => p.src.medium}
      getFullUrl={p => p.src.large2x}
      getAttribution={p => p.photographer}
      emptyLabel="Search Pexels for a background"
    />
  )
}

// ─── Pixabay tab ─────────────────────────────────────────────────────────────

function PixabayTab({ onSelect, currentUrl }) {
  const { photos, loading, error, search } = usePixabay()

  if (PIXABAY_KEY_MISSING) {
    return (
      <KeyMissingBanner
        label="Pixabay"
        envVar="VITE_PIXABAY_API_KEY"
        docsUrl="https://pixabay.com/api/docs/"
      />
    )
  }

  return (
    <PhotoSearchGrid
      placeholder="mountains, abstract, dark…"
      photos={photos}
      loading={loading}
      error={error}
      onSearch={search}
      onSelect={onSelect}
      currentUrl={currentUrl}
      getThumbUrl={p => p.webformatURL}
      getFullUrl={p => p.largeImageURL}
      getAttribution={p => p.user}
      emptyLabel="Search Pixabay for a background"
    />
  )
}

// ─── Upload tab ───────────────────────────────────────────────────────────────

function UploadTab({ onSelect }) {
  const [preview,    setPreview]    = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileError,  setFileError]  = useState(null)
  const inputRef = useRef(null)

  const processFile = useCallback((file) => {
    if (!file) return
    if (!ACCEPTED_MIME.includes(file.type)) {
      setFileError(`"${file.name}" isn't a supported format — use JPG, PNG, or WEBP.`)
      return
    }
    setFileError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target.result
      setPreview(base64)
      onSelect?.(base64)
    }
    reader.readAsDataURL(file)
  }, [onSelect])

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false) }
  const handleDrop      = (e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]) }
  const handleInput     = (e) => { processFile(e.target.files[0]); e.target.value = '' }
  const clearPreview    = () => { setPreview(null); setFileError(null) }

  return (
    <div className="flex flex-col gap-3">
      {!preview && (
        <div
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-3
            h-48 rounded-xl border-2 border-dashed cursor-pointer
            select-none transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30
            ${isDragging
              ? 'border-neutral-400 bg-neutral-800/60'
              : 'border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/60'
            }
          `}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDragging ? 'bg-neutral-600' : 'bg-neutral-800'}`}>
            <Upload size={17} className={isDragging ? 'text-white' : 'text-neutral-400'} />
          </div>
          <div className="text-center space-y-0.5 pointer-events-none">
            <p className="text-xs text-neutral-400">
              {isDragging ? 'Drop image here' : 'Drag & drop or click to browse'}
            </p>
            <p className="text-[10px] text-neutral-600">JPG · PNG · WEBP</p>
          </div>
        </div>
      )}

      {preview && (
        <div className="relative rounded-xl overflow-hidden aspect-square bg-neutral-900">
          <img src={preview} alt="Uploaded preview" className="w-full h-full object-cover" />
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
            aria-label="Remove image"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {preview && (
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors text-center"
        >
          Choose a different image
        </button>
      )}

      {fileError && <ErrorBanner message={fileError} />}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={handleInput}
      />
    </div>
  )
}

// ─── ImagePicker ──────────────────────────────────────────────────────────────

export default function ImagePicker({ onSelect, currentUrl }) {
  const [tab, setTab] = useState('unsplash')

  return (
    <div className="flex flex-col gap-3">
      {/* Tab switcher */}
      <div className="flex bg-neutral-900 rounded-lg p-0.5 gap-0.5">
        <TabButton active={tab === 'unsplash'} onClick={() => setTab('unsplash')}>
          Unsplash
        </TabButton>
        <TabButton active={tab === 'pexels'} onClick={() => setTab('pexels')}>
          Pexels
        </TabButton>
        <TabButton active={tab === 'pixabay'} onClick={() => setTab('pixabay')}>
          Pixabay
        </TabButton>
        <TabButton active={tab === 'upload'} onClick={() => setTab('upload')}>
          Upload
        </TabButton>
      </div>

      {/* Tab content */}
      {tab === 'unsplash' && <UnsplashTab onSelect={onSelect} currentUrl={currentUrl} />}
      {tab === 'pexels'   && <PexelsTab   onSelect={onSelect} currentUrl={currentUrl} />}
      {tab === 'pixabay'  && <PixabayTab  onSelect={onSelect} currentUrl={currentUrl} />}
      {tab === 'upload'   && <UploadTab   onSelect={onSelect} />}
    </div>
  )
}
