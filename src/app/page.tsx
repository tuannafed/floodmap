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
import { toast } from 'sonner'
import { BottomNavigator, type TabType } from '@/components/BottomNavigator'
import { LocateButton } from '@/components/LocateButton'

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [q, setQ] = useState('')
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(
    null
  )
  const [isSearching, setIsSearching] = useState(false)
  const [isLocating, setIsLocating] = useState(true)

  // Map data states
  const [nowcast, setNowcast] = useState<NowcastData | null>(null)
  const [tide, setTide] = useState<TideData | null>(null)
  const [iso, setIso] = useState<any | null>(null)
  const [riskZones, setRiskZones] = useState<any | null>(null)
  const [sosReports, setSosReports] = useState<any[]>([])
  const [selectedSos, setSelectedSos] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{
    lat: number
    lon: number
  } | null>(null)

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

  // Prevent body scroll on mobile when panels are open
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isMobile = window.innerWidth < 768 // md breakpoint
    const hasOpenPanel = activeTab === 'sos' || activeTab === 'weather'

    if (isMobile && hasOpenPanel) {
      // Save current scroll position
      const scrollY = window.scrollY

      // Lock body scroll
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.documentElement.style.overflow = 'hidden'

      return () => {
        // Restore scroll position when unlocking
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.documentElement.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    } else {
      // Unlock body scroll
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.documentElement.style.overflow = ''
    }
  }, [activeTab])

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
              toast.error('Không thể tải vị trí mặc định')
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
          toast.error('Không thể tải vị trí mặc định')
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
          fetch(`/api/sos/report`)
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
        toast.error('Không thể tải dữ liệu. Vui lòng thử lại.')
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
      toast.error('Vui lòng nhập tên tỉnh/thành phố')
      return
    }
    setIsSearching(true)
    try {
      const c = await geocodeProvince(q)
      if (c) {
        // Update center ref immediately for smooth transition
        centerRef.current = c
        setCenter(c)
        // Clear selected SOS when searching new location
        setSelectedSos(null)
        toast.success('Đã tìm thấy địa điểm')
      } else {
        toast.error('Không tìm thấy địa điểm. Vui lòng thử lại.')
      }
    } catch (err) {
      toast.error('Có lỗi xảy ra khi tìm kiếm')
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Search Bar - Always visible on desktop, only on search tab on mobile */}
      <form
        onSubmit={handleSubmit}
        className={`absolute top-3 left-1/2 -translate-x-1/2 z-2000 bg-card shadow-xl rounded-md px-4 py-3 flex gap-2 border border-border backdrop-blur-sm ${
          activeTab === 'search' ? 'block' : 'hidden md:flex'
        }`}
      >
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
          }}
          placeholder="Nhập tỉnh/thành phố..."
          disabled={isSearching}
          className="border border-input rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground disabled:opacity-50 min-w-[300px] md:min-w-[400px]"
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

      {/* Locate User Button */}
      <LocateButton
        onLocationChange={(location) => {
          centerRef.current = location
          setCenter(location)
        }}
        onUserLocationChange={setUserLocation}
        onClearSelectedSos={() => setSelectedSos(null)}
      />

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
            userLocation={userLocation}
            onMove={(viewState) => {
              // Optional: handle map movement
            }}
            onSosSelect={setSelectedSos}
          />

          {/* Desktop Sidebar - Always visible on desktop */}
          <div className="hidden md:block absolute top-6 right-6 z-50 space-y-3 max-w-xs">
            <WeatherPanel
              nowcast={nowcast}
              tide={tide}
              isLoading={isLoading}
            />
            <LayerToggles
              showRadar={showRadar}
              showDEM={showDEM}
              showRisk={showRisk}
              onToggleRadar={setShowRadar}
              onToggleDEM={setShowDEM}
              onToggleRisk={setShowRisk}
            />
          </div>

          {activeTab === 'weather' && (
            <div className="md:hidden fixed inset-0 top-0 bottom-16 z-1000 bg-card overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-3">
                  <WeatherPanel
                    nowcast={nowcast}
                    tide={tide}
                    isLoading={isLoading}
                  />
                  {/* Lớp bản đồ */}
                  <LayerToggles
                    showRadar={showRadar}
                    showDEM={showDEM}
                    showRisk={showRisk}
                    onToggleRadar={setShowRadar}
                    onToggleDEM={setShowDEM}
                    onToggleRisk={setShowRisk}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sos' && (
            <div className="md:hidden fixed inset-0 top-0 bottom-16 z-1000 bg-card overflow-hidden flex flex-col">
              <div className="shrink-0 p-4 border-b border-border">
                <h2 className="text-lg font-bold text-card-foreground">
                  Danh sách SOS ({sosReports.length})
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="p-4 relative">
                  <SosListPanel
                    inline={true}
                    sosReports={sosReports}
                    onSelectSos={(report) => {
                      setSelectedSos(report)
                      // Update center to trigger map movement
                      setCenter({ lat: report.lat, lon: report.lon })
                      // Update center ref immediately for smooth transition
                      centerRef.current = { lat: report.lat, lon: report.lon }
                      // Switch to search tab to see the map
                      setActiveTab('search')
                    }}
                  />
                </div>
              </div>
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
          // Refresh SOS reports immediately
          fetch(`/api/sos/report`)
            .then((r) => r.json())
            .then((data) => setSosReports(data?.reports || []))
            .catch(() => {})
          // Switch to SOS tab to see the new report
          setActiveTab('sos')
        }}
      />

      {/* Bottom Navigator - Mobile only */}
      <div className="md:hidden">
        <BottomNavigator
          activeTab={activeTab}
          onTabChange={setActiveTab}
          sosCount={sosReports.length}
        />
      </div>

      {/* Desktop SOS List Panel */}
      <div className="hidden md:block">
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
      </div>
    </div>
  )
}
