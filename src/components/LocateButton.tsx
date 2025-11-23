'use client'

import { useState } from 'react'
import { LocateFixed, LoaderCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

interface LocateButtonProps {
  onLocationChange: (location: { lat: number; lon: number }) => void
  onUserLocationChange?: (location: { lat: number; lon: number } | null) => void
  onClearSelectedSos?: () => void
}

export function LocateButton({
  onLocationChange,
  onUserLocationChange,
  onClearSelectedSos,
}: LocateButtonProps) {
  const [isLocatingUser, setIsLocatingUser] = useState(false)

  async function handleLocateUser() {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ định vị')
      return
    }

    setIsLocatingUser(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        }
        // Update location via callback
        onLocationChange(location)
        // Set user location to trigger flyTo with higher zoom in MapView
        onUserLocationChange?.(location)
        // Clear selected SOS when locating user
        onClearSelectedSos?.()
        setIsLocatingUser(false)
        // Reset userLocation after animation completes to allow future locates
        setTimeout(() => {
          onUserLocationChange?.(null)
        }, 2000)
      },
      (err) => {
        setIsLocatingUser(false)
        console.error('Geolocation error:', err)
        toast.error('Không thể lấy vị trí. Vui lòng bật định vị.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  return (
    <button
      onClick={handleLocateUser}
      disabled={isLocatingUser}
      className="absolute bottom-38 right-7 z-50 bg-card hover:bg-card/90 text-card-foreground rounded-md p-2.5 shadow-xl border border-border backdrop-blur-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      aria-label="Định vị vị trí của bạn"
      title="Định vị vị trí của bạn"
    >
      {isLocatingUser ? (
        <LoaderCircleIcon className="animate-spin size-5" />
      ) : (
        <LocateFixed className="size-5" />
      )}
    </button>
  )
}
