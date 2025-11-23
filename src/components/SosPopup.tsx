'use client'

import { Phone, MapPin, Users, AlertCircle, Clock } from 'lucide-react'
import type { SosReport } from './MapView'

interface SosPopupProps {
  report: SosReport
  onClose: () => void
}

type SosStatus = 'new' | 'processing' | 'rescued'
type SosUrgency = 'high' | 'medium' | 'low'

export function SosPopup({ report, onClose }: SosPopupProps) {
  const urgencyLabels: Record<SosUrgency, string> = {
    high: 'Cao',
    medium: 'Trung bình',
    low: 'Thấp',
  }

  const statusLabels: Record<SosStatus, string> = {
    new: 'Mới',
    processing: 'Đang xử lý',
    rescued: 'Đã cứu',
  }

  const statusColors: Record<SosStatus, string> = {
    new: 'text-error-600',
    processing: 'text-warning-600',
    rescued: 'text-success-600',
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins} phút trước`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} giờ trước`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} ngày trước`
  }

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`
  }

  const handleDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${report.lat},${report.lon}`
    window.open(url, '_blank')
  }

  return (
    <div className="p-2 max-w-[300px] w-full">
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🆘</span>
          <span
            className={`font-bold text-sm ${
              statusColors[report.status as SosStatus]
            }`}
          >
            {statusLabels[report.status as SosStatus]}
          </span>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="size-3" />
          {formatTime(report.createdAt)}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-card-foreground">
            <strong>{report.peopleCount}</strong> người cần cứu
          </span>
        </div>

        <div className="flex items-center gap-2">
          <AlertCircle className="size-4 text-muted-foreground" />
          <span className="text-card-foreground">
            Mức khẩn cấp:{' '}
            <strong>{urgencyLabels[report.urgency as SosUrgency]}</strong>
          </span>
        </div>

        {report.hasVulnerable && (
          <div className="bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300 rounded-md px-2 py-1 text-xs">
            ⚠️ Có người già/trẻ em/khuyết tật
          </div>
        )}

        {report.description && (
          <div className="text-card-foreground text-xs border-t border-border pt-2">
            <strong>Mô tả:</strong> {report.description}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="size-3" />
          {report.lat.toFixed(4)}, {report.lon.toFixed(4)}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleCall('113')}
            className="bg-error-600 hover:bg-error-700 text-white rounded-md px-2 py-1.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <Phone className="size-3" />
            113
          </button>
          <button
            onClick={() => handleCall('114')}
            className="bg-error-600 hover:bg-error-700 text-white rounded-md px-2 py-1.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <Phone className="size-3" />
            114
          </button>
          <button
            onClick={() => handleCall('115')}
            className="bg-error-600 hover:bg-error-700 text-white rounded-md px-2 py-1.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <Phone className="size-3" />
            115
          </button>
        </div>
        <button
          onClick={handleDirections}
          className="w-full bg-primary hover:bg-primary-700 text-primary-foreground rounded-md px-3 py-2 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <MapPin className="size-4" />
          Chỉ đường
        </button>
      </div>
    </div>
  )
}
