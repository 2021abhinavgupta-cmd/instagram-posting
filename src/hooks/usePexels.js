/**
 * usePexels — search Pexels photos for card backgrounds.
 *
 * API endpoint:
 *   GET https://api.pexels.com/v1/search?query={keyword}&per_page=12&orientation=square
 *   Authorization: <VITE_PEXELS_API_KEY>   (no "Client-ID" prefix unlike Unsplash)
 *
 * Each photo object returned includes:
 *   src.large2x   — ~1880px wide, used for export (full quality, sane file size)
 *   src.medium    — ~350px, used for picker thumbnails
 *   photographer  — credit name (attribution)
 */

import { useState, useCallback, useRef } from 'react'

const API_BASE = 'https://api.pexels.com/v1'
const PER_PAGE = 12
const API_KEY  = import.meta.env.VITE_PEXELS_API_KEY

export function usePexels() {
  const [photos,  setPhotos]  = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const abortRef = useRef(null)

  const search = useCallback(async (query) => {
    const trimmed = query?.trim()
    if (!trimmed) return

    if (!API_KEY || API_KEY === 'your_pexels_key_here') {
      setError('Add VITE_PEXELS_API_KEY to .env — free key at pexels.com/api')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setPhotos([])

    try {
      const url = new URL(`${API_BASE}/search`)
      url.searchParams.set('query',       trimmed)
      url.searchParams.set('per_page',    String(PER_PAGE))
      url.searchParams.set('orientation', 'square')

      const res = await fetch(url.toString(), {
        headers: { Authorization: API_KEY },
        signal:  controller.signal,
      })

      if (!res.ok) {
        const msg = {
          401: 'Invalid Pexels API key — check VITE_PEXELS_API_KEY in .env',
          403: 'Pexels API access denied',
          429: 'Pexels rate limit reached — try again later',
        }[res.status] ?? `Pexels API error ${res.status}`
        throw new Error(msg)
      }

      const data    = await res.json()
      const results = data.photos ?? []

      if (results.length === 0) {
        setError(`No photos found for "${trimmed}" — try different keywords`)
      }

      setPhotos(results)
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message)
      setPhotos([])
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setPhotos([])
    setError(null)
    setLoading(false)
  }, [])

  return { photos, loading, error, search, clear }
}
