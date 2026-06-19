/**
 * usePixabay — search Pixabay photos for card backgrounds.
 *
 * API endpoint:
 *   GET https://pixabay.com/api/?key=KEY&q=QUERY&per_page=12&image_type=photo&safesearch=true
 *   Auth via `key` query parameter (not a header)
 *
 * Each hit returned includes:
 *   largeImageURL  — ~1280px, used for export
 *   webformatURL   — ~640px,  used for picker thumbnails
 *   user           — photographer username (attribution)
 */

import { useState, useCallback, useRef } from 'react'

const API_BASE = 'https://pixabay.com/api/'
const PER_PAGE = 12
const API_KEY  = import.meta.env.VITE_PIXABAY_API_KEY

export function usePixabay() {
  const [photos,  setPhotos]  = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const abortRef = useRef(null)

  const search = useCallback(async (query) => {
    const trimmed = query?.trim()
    if (!trimmed) return

    if (!API_KEY || API_KEY === 'your_pixabay_key_here') {
      setError('Add VITE_PIXABAY_API_KEY to .env — free key at pixabay.com/api/docs/')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setPhotos([])

    try {
      const url = new URL(API_BASE)
      url.searchParams.set('key',        API_KEY)
      url.searchParams.set('q',          trimmed)
      url.searchParams.set('per_page',   String(PER_PAGE))
      url.searchParams.set('image_type', 'photo')
      url.searchParams.set('safesearch', 'true')

      const res = await fetch(url.toString(), { signal: controller.signal })

      if (!res.ok) {
        const msg = {
          400: 'Invalid Pixabay request',
          429: 'Pixabay rate limit reached — try again later',
        }[res.status] ?? `Pixabay API error ${res.status}`
        throw new Error(msg)
      }

      const data    = await res.json()
      const results = data.hits ?? []

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
