/**
 * useUnsplash — search Unsplash photos and surface them for card backgrounds.
 *
 * API endpoint (CLAUDE.md):
 *   GET https://api.unsplash.com/search/photos?query={keyword}&per_page=10
 *   Authorization: Client-ID <VITE_UNSPLASH_ACCESS_KEY>
 *
 * Each image object returned by Unsplash includes:
 *   urls.full      — full resolution, used for export
 *   urls.regular   — ~1080px wide, used for previews
 *   urls.small     — thumbnail, used for the picker grid
 *   urls.thumb     — tiny thumbnail
 *   user.name      — photographer name (required for attribution)
 *   links.html     — photographer's Unsplash profile URL
 */

import { useState, useCallback, useRef } from 'react'

const API_BASE   = 'https://api.unsplash.com'
const PER_PAGE   = 10
const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY

// ─── hook ─────────────────────────────────────────────────────────────────────

/**
 * @returns {{
 *   images:  object[]   — Unsplash photo objects (see shape above)
 *   loading: boolean
 *   error:   string | null
 *   search:  (query: string) => void
 *   clear:   () => void
 * }}
 */
export function useUnsplash() {
  const [images,  setImages]  = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // Abort controller so a new search cancels an in-flight request.
  const abortRef = useRef(null)

  /**
   * Run a keyword search. Ignores empty / whitespace-only queries.
   * Silently validates the API key before hitting the network.
   */
  const search = useCallback(async (query) => {
    const trimmed = query?.trim()
    if (!trimmed) return

    // Guard: key not configured
    if (!ACCESS_KEY || ACCESS_KEY === 'your_key_here') {
      setError('Add VITE_UNSPLASH_ACCESS_KEY to .env — free key at unsplash.com/developers')
      return
    }

    // Cancel any previous in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setImages([])

    try {
      const url = new URL(`${API_BASE}/search/photos`)
      url.searchParams.set('query',    trimmed)
      url.searchParams.set('per_page', String(PER_PAGE))
      // Prefer square crops so they fill 1080×1080 with minimal letterboxing.
      url.searchParams.set('orientation', 'squarish')

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
        signal: controller.signal,
      })

      if (!res.ok) {
        // 401 = bad key, 403 = rate-limited, 429 = hourly limit exceeded
        const msg = {
          401: 'Invalid Unsplash API key — check VITE_UNSPLASH_ACCESS_KEY in .env',
          403: 'Unsplash API access denied',
          429: 'Unsplash rate limit reached — try again in an hour',
        }[res.status] ?? `Unsplash API error ${res.status}`
        throw new Error(msg)
      }

      const data = await res.json()
      const results = data.results ?? []

      if (results.length === 0) {
        setError(`No photos found for "${trimmed}" — try different keywords`)
      }

      setImages(results)
    } catch (err) {
      if (err.name === 'AbortError') return // user triggered a new search
      setError(err.message)
      setImages([])
    } finally {
      setLoading(false)
    }
  }, [])

  /** Reset results and any error message. */
  const clear = useCallback(() => {
    abortRef.current?.abort()
    setImages([])
    setError(null)
    setLoading(false)
  }, [])

  return { images, loading, error, search, clear }
}
