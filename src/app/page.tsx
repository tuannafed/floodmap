'use client'

import { useEffect, useState } from 'react'
import FloodMap from '@/components/FloodMap'
import { geocodeProvince } from '@/lib/datasources'

export default function Page() {
  const [q, setQ] = useState('Đà Nẵng')
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(
    null
  )
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  useEffect(() => {
    setIsSearching(true)
    geocodeProvince('Đà Nẵng')
      .then((c) => {
        if (c) setCenter(c)
        setIsSearching(false)
      })
      .catch(() => {
        setSearchError('Không thể tải vị trí mặc định')
        setIsSearching(false)
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) {
      setSearchError('Vui lòng nhập tên tỉnh/thành phố')
      return
    }
    setIsSearching(true)
    setSearchError(null)
    try {
      const c = await geocodeProvince(q)
      if (c) {
        setCenter(c)
      } else {
        setSearchError('Không tìm thấy địa điểm. Vui lòng thử lại.')
      }
    } catch (err) {
      setSearchError('Có lỗi xảy ra khi tìm kiếm')
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <form
        onSubmit={handleSubmit}
        className="absolute top-3 left-3 z-2000 bg-card shadow-xl rounded-2xl px-4 py-3 flex gap-2 border border-border backdrop-blur-sm"
      >
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setSearchError(null)
          }}
          placeholder="Nhập tỉnh/thành phố..."
          disabled={isSearching}
          className="border border-input rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground disabled:opacity-50 min-w-[200px] md:min-w-[300px]"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="bg-primary text-primary-foreground rounded-xl px-6 py-2 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isSearching ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></span>
              Đang tìm...
            </span>
          ) : (
            'Tìm'
          )}
        </button>
      </form>

      {searchError && (
        <div className="absolute top-20 left-3 z-2000 bg-error-50 dark:bg-error-900 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-800 rounded-lg px-4 py-2 shadow-lg max-w-md">
          <p className="text-sm font-medium">{searchError}</p>
        </div>
      )}

      {center ? (
        <FloodMap center={center} />
      ) : (
        <div className="w-full h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-foreground">Đang tải...</p>
          </div>
        </div>
      )}
    </div>
  )
}
