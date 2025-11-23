'use client'

import { useEffect, useState, useRef } from 'react'
import MapView from '@/components/MapView'
import { WeatherPanel } from '@/components/WeatherPanel'
import { LayerToggles } from '@/components/LayerToggles'
import { SosButton } from '@/components/SosButton'
import { SosListPanel } from '@/components/SosListPanel'
import { geocodeProvince } from '@/lib/datasources'
import {
  fetchNowcast,
  fetchTide,
  type NowcastData,
  type TideData,
} from '@/lib/datasources'
import { LoaderCircleIcon, SearchIcon } from 'lucide-react'
import { ToastContainer, type ToastType } from '@/components/Toast'

export default function Page() {
  const [q, setQ] = useState('')
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(
    null
  )
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(true)

  // Map data states
  const [nowcast, setNowcast] = useState<NowcastData | null>(null)
  const [tide, setTide] = useState<TideData | null>(null)
  const [iso, setIso] = useState<any | null>(null)
  const [riskZones, setRiskZones] = useState<any | null>(null)
  const [sosReports, setSosReports] = useState<any[]>([])
  const [selectedSos, setSelectedSos] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string; type: ToastType }>
  >([])

  // Layer visibility states
  // Note: Radar temporarily disabled due to CORS restrictions from RainViewer
  const [showRadar, setShowRadar] = useState(false)
  const [showDEM, setShowDEM] = useState(false)
  const [showRisk, setShowRisk] = useState(true)

  // Refs to prevent loop calls
  const centerRef = useRef(center)
  const centerKeyRef = useRef<string>('')

  useEffect(() => {
    centerRef.current = center
  }, [center])

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

  // Fetch map data when center changes
  useEffect(() => {
    if (!center) return

    const centerKey = `${center.lat.toFixed(4)}-${center.lon.toFixed(4)}`
    if (centerKeyRef.current === centerKey) return
    centerKeyRef.current = centerKey

    let active = true
    setIsLoading(true)
    setError(null)

    async function pull() {
      try {
        const currentCenter = centerRef.current
        if (!currentCenter) return

        const [nc, td, isoRes, riskRes, sosRes] = await Promise.allSettled([
          fetchNowcast(currentCenter.lat, currentCenter.lon),
          fetchTide(currentCenter.lat, currentCenter.lon),
          fetch(
            `/api/isobands?lat=${currentCenter.lat}&lon=${currentCenter.lon}&radiusKm=10&cellKm=1`
          )
            .then((r) => r.json())
            .catch(() => ({ type: 'FeatureCollection', features: [] })),
          fetch(`/api/risk?lat=${currentCenter.lat}&lon=${currentCenter.lon}`)
            .then((r) => r.json())
            .catch(() => ({ type: 'FeatureCollection', features: [] })),
          fetch(
            `/api/sos/report?lat=${currentCenter.lat}&lon=${currentCenter.lon}&radius=50`
          )
            .then((r) => r.json())
            .catch(() => ({ reports: [] })),
        ])

        if (!active) return

        // Extract values from Promise.allSettled results
        const nowcastValue = nc.status === 'fulfilled' ? nc.value : null
        const tideValue = td.status === 'fulfilled' ? td.value : null
        const isoValue =
          isoRes.status === 'fulfilled'
            ? isoRes.value
            : { type: 'FeatureCollection', features: [] }
        const riskZonesValue =
          riskRes.status === 'fulfilled'
            ? riskRes.value
            : { type: 'FeatureCollection', features: [] }
        const sosDataValue =
          sosRes.status === 'fulfilled' ? sosRes.value : { reports: [] }

        setNowcast(nowcastValue)
        setTide(tideValue)
        setIso(isoValue)
        setRiskZones(riskZonesValue)

        // Debug: Log SOS reports
        const reports = sosDataValue?.reports || []
        console.log('📋 SOS Reports fetched:', reports.length, reports)
        setSosReports(reports)
        setIsLoading(false)
      } catch (err) {
        if (!active) return
        setError('Không thể tải dữ liệu. Vui lòng thử lại.')
        setIsLoading(false)
        console.error('Error fetching data:', err)
      }
    }

    pull()
    const id = setInterval(pull, 5 * 60 * 1000) // Refresh every 5 minutes
    return () => {
      active = false
      clearInterval(id)
    }
  }, [center])

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
      {/* Search Bar */}
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

      {/* Error Message */}
      {searchError && (
        <div className="absolute top-20 left-3 z-2000 bg-error-50 dark:bg-error-900 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-800 rounded-lg px-4 py-1 shadow-lg max-w-md">
          <p className="text-sm font-medium">{searchError}</p>
        </div>
      )}

      {/* Map View */}
      {center ? (
        <>
          <MapView
            center={center}
            iso={iso}
            riskZones={riskZones}
            sosReports={sosReports}
            selectedSos={selectedSos}
            showRadar={showRadar}
            showDEM={showDEM}
            showRisk={showRisk}
            onMove={(viewState) => {
              // Optional: handle map movement
            }}
            onSosSelect={setSelectedSos}
          />

          {/* Sidebar Left - Desktop */}
          <div className="hidden md:block absolute top-6 right-3 z-1000 space-y-3 max-w-xs">
            <LayerToggles
              showRadar={showRadar}
              showDEM={showDEM}
              showRisk={showRisk}
              onToggleRadar={setShowRadar}
              onToggleDEM={setShowDEM}
              onToggleRisk={setShowRisk}
            />
            <WeatherPanel
              nowcast={nowcast}
              tide={tide}
              isLoading={isLoading}
            />
          </div>

          {/* Mobile Bottom Sheet */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 z-1000 bg-card border-t border-border rounded-t-lg shadow-lg max-h-[50vh] overflow-y-auto">
            <div className="p-4 space-y-3">
              <LayerToggles
                showRadar={showRadar}
                showDEM={showDEM}
                showRisk={showRisk}
                onToggleRadar={setShowRadar}
                onToggleDEM={setShowDEM}
                onToggleRisk={setShowRisk}
              />
              <WeatherPanel
                nowcast={nowcast}
                tide={tide}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="absolute top-20 right-3 bg-error-50 dark:bg-error-900 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-800 rounded-lg px-4 py-2 shadow-lg z-1000 max-w-sm">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-screen bg-background flex items-center justify-center">
          <div className="text-center flex items-center gap-2">
            <LoaderCircleIcon className="animate-spin size-6 text-primary" />
            <p className="text-foreground">Đang tải...</p>
          </div>
        </div>
      )}

      {/* SOS Button */}
      <SosButton
        onSosSubmitted={() => {
          const id = Date.now().toString()
          setToasts([
            ...toasts,
            { id, message: '🆘 SOS đã được gửi thành công!', type: 'success' },
          ])
          // Refresh SOS reports after 1 second
          setTimeout(() => {
            if (center) {
              fetch(
                `/api/sos/report?lat=${center.lat}&lon=${center.lon}&radius=50`
              )
                .then((r) => r.json())
                .then((data) => setSosReports(data?.reports || []))
                .catch(() => {})
            }
          }, 1000)
        }}
      />

      {/* SOS List Panel */}
      <SosListPanel
        sosReports={sosReports}
        onSelectSos={(report) => {
          setSelectedSos(report)
          // Update center to trigger map movement
          setCenter({ lat: report.lat, lon: report.lon })
          // Update center ref immediately for smooth transition
          centerRef.current = { lat: report.lat, lon: report.lon }
        }}
      />

      {/* Toast Container */}
      <ToastContainer
        toasts={toasts}
        onRemove={(id) => setToasts(toasts.filter((t) => t.id !== id))}
      />
    </div>
  )
}
