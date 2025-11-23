'use client'

import { useEffect, useState } from 'react'
import FloodMap from '@/components/FloodMap'
import { geocodeProvince } from '@/lib/datasources'
import { LoaderCircleIcon, SearchIcon } from 'lucide-react'

export default function Page() {
  const [q, setQ] = useState('')
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(
    null
  )
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(true)

  useEffect(() => {
    // Try to get user location first, fallback to default
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setCenter({ lat: latitude, lon: longitude })
          setIsLocating(false)
        },
        () => {
          // Geolocation failed, use default and fill input
          setQ('Đà Nẵng')
          setIsSearching(true)
          geocodeProvince('Đà Nẵng')
            .then((c) => {
              if (c) setCenter(c)
              setIsSearching(false)
              setIsLocating(false)
            })
            .catch(() => {
              setSearchError('Không thể tải vị trí mặc định')
              setIsSearching(false)
              setIsLocating(false)
            })
        }
      )
    } else {
      // Geolocation not supported, use default and fill input
      setQ('Đà Nẵng')
      setIsSearching(true)
      geocodeProvince('Đà Nẵng')
        .then((c) => {
          if (c) setCenter(c)
          setIsSearching(false)
          setIsLocating(false)
        })
        .catch(() => {
          setSearchError('Không thể tải vị trí mặc định')
          setIsSearching(false)
          setIsLocating(false)
        })
    }
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
        className="absolute top-3 left-1/2 -translate-x-1/2 z-2000 bg-card shadow-xl rounded-md px-4 py-3 flex gap-2 border border-border backdrop-blur-sm"
      >
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setSearchError(null)
          }}
          placeholder="Nhập tỉnh/thành phố..."
          disabled={isSearching}
          className="border border-input rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground disabled:opacity-50 min-w-[200px] md:min-w-[300px]"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="bg-primary text-primary-foreground rounded-md px-2.5 py-1 hover:bg-primary-700 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isSearching ? (
            <span className="flex items-center gap-2">
              <LoaderCircleIcon className="animate-spin size-4 text-primary-foreground" />
            </span>
          ) : (
            <SearchIcon className="size-4 text-primary-foreground" />
          )}
        </button>
      </form>

      {searchError && (
        <div className="absolute top-20 left-3 z-2000 bg-error-50 dark:bg-error-900 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-800 rounded-lg px-4 py-1 shadow-lg max-w-md">
          <p className="text-sm font-medium">{searchError}</p>
        </div>
      )}

      {center ? (
        <FloodMap
          center={center}
          onLocationChange={(lat: number, lon: number) => {
            setCenter({ lat, lon })
          }}
        />
      ) : (
        <div className="w-full h-screen bg-background flex items-center justify-center">
          <div className="text-center flex items-center gap-2">
            <LoaderCircleIcon className="animate-spin size-6 text-primary" />
            <p className="text-foreground">Đang tải...</p>
          </div>
        </div>
      )}
    </div>
  )
}
