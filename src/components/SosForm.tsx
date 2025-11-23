'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X,
  MapPin,
  Users,
  AlertCircle,
  Upload,
  Send,
  Navigation,
} from 'lucide-react'
import { toast } from 'sonner'
import { addToQueue } from '@/lib/sos-queue'
import { LocationPicker } from './LocationPicker'

interface SosFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function SosForm({ isOpen, onClose, onSuccess }: SosFormProps) {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(
    null
  )
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false)
  const [peopleCount, setPeopleCount] = useState(1)
  const [urgency, setUrgency] = useState<'high' | 'medium' | 'low'>('high')
  const [description, setDescription] = useState('')
  const [hasVulnerable, setHasVulnerable] = useState(false)
  const [image, setImage] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-get location on mount
  useEffect(() => {
    if (!isOpen) return

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          })
        },
        (err) => {
          console.error('Geolocation error:', err)
          toast.error('Không thể lấy vị trí. Vui lòng bật định vị.')
        }
      )
    } else {
      toast.error('Trình duyệt không hỗ trợ định vị.')
    }
  }, [isOpen])

  // One-tap send if location is available and urgency is high
  const canOneTap = location && urgency === 'high'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!location) {
      toast.error('Vui lòng đợi lấy vị trí...')
      return
    }

    setIsSubmitting(true)

    const sosData = {
      lat: location.lat,
      lon: location.lon,
      peopleCount,
      urgency,
      description,
      hasVulnerable,
      image: image || undefined,
    }

    try {
      // Try to send SOS
      const formData = new FormData()
      formData.append('lat', String(sosData.lat))
      formData.append('lon', String(sosData.lon))
      formData.append('peopleCount', String(sosData.peopleCount))
      formData.append('urgency', sosData.urgency)
      formData.append('description', sosData.description)
      formData.append('hasVulnerable', String(sosData.hasVulnerable))
      if (sosData.image) {
        formData.append('image', sosData.image)
      }

      const response = await fetch('/api/sos/report', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Không thể gửi SOS. Vui lòng thử lại.')
      }

      // Success feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200])
      }

      // Flash screen (visual feedback)
      if (document.body) {
        document.body.style.transition = 'background-color 0.3s'
        const originalBg = document.body.style.backgroundColor
        document.body.style.backgroundColor = 'rgba(34, 197, 94, 0.3)'
        setTimeout(() => {
          document.body.style.backgroundColor = originalBg
        }, 300)
      }

      // Queue to localStorage for retry if needed
      addToQueue(sosData)

      // Reset form and close
      setPeopleCount(1)
      setUrgency('high')
      setDescription('')
      setHasVulnerable(false)
      setImage(null)

      // Show success toast
      toast.success('🆘 SOS đã được gửi thành công!')

      // Call onSuccess callback to trigger refresh
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Error sending SOS:', err)
      const errorMessage =
        err instanceof Error ? err.message : 'Không thể gửi SOS'
      toast.error(errorMessage)

      // Queue for retry
      addToQueue(sosData)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-3000 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-card-foreground">
            🆘 Gửi SOS Cứu Nạn
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 space-y-4"
        >
          {/* Location Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="size-4 text-muted-foreground" />
                {location ? (
                  <span className="text-success-600">
                    Đã lấy vị trí: {location.lat.toFixed(4)},{' '}
                    {location.lon.toFixed(4)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Đang lấy vị trí...
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsLocationPickerOpen(true)}
                className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary-700 transition-colors flex items-center gap-1.5 font-medium"
              >
                <Navigation className="size-3" />
                Chọn trên bản đồ
              </button>
            </div>
            {location && (
              <p className="text-xs text-muted-foreground">
                💡 Dùng nút "Chọn trên bản đồ" để chọn vị trí cho người khác
              </p>
            )}
          </div>

          {/* People Count */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-card-foreground mb-2">
              <Users className="size-4" />
              Số người cần cứu
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={peopleCount}
              onChange={(e) => setPeopleCount(parseInt(e.target.value) || 1)}
              className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
              required
            />
          </div>

          {/* Urgency Level */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-card-foreground mb-2">
              <AlertCircle className="size-4" />
              Mức khẩn cấp
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['high', 'medium', 'low'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setUrgency(level)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    urgency === level
                      ? level === 'high'
                        ? 'bg-error-600 text-white'
                        : level === 'medium'
                        ? 'bg-warning-600 text-white'
                        : 'bg-info-600 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {level === 'high'
                    ? 'Cao'
                    : level === 'medium'
                    ? 'Trung bình'
                    : 'Thấp'}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-card-foreground mb-2 block">
              Mô tả ngắn (tùy chọn)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ví dụ: Ngập nước cao 1m, không thể di chuyển..."
              rows={3}
              className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground resize-none"
              maxLength={200}
            />
          </div>

          {/* Vulnerable People */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasVulnerable}
              onChange={(e) => setHasVulnerable(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm text-card-foreground">
              Có người già/trẻ em/khuyết tật
            </span>
          </label>

          {/* Image Upload */}
          <div>
            <label className="text-sm font-medium text-card-foreground mb-2 block">
              Ảnh (tùy chọn)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-input rounded-md px-4 py-3 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
            >
              <Upload className="size-5" />
              {image ? image.name : 'Chọn ảnh'}
            </button>
            {image && (
              <button
                type="button"
                onClick={() => setImage(null)}
                className="mt-2 text-xs text-error-600 hover:text-error-700"
              >
                Xóa ảnh
              </button>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-input rounded-md px-4 py-2 text-sm font-medium text-card-foreground hover:bg-muted transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!location || isSubmitting}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-bold text-white transition-colors ${
                urgency === 'high'
                  ? 'bg-error-600 hover:bg-error-700'
                  : urgency === 'medium'
                  ? 'bg-warning-600 hover:bg-warning-700'
                  : 'bg-info-600 hover:bg-info-700'
              } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {isSubmitting ? (
                <>
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  {canOneTap ? 'Gửi ngay' : 'Gửi SOS'}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Location Picker Modal */}
        <LocationPicker
          isOpen={isLocationPickerOpen}
          onClose={() => setIsLocationPickerOpen(false)}
          initialLocation={location}
          onSelect={(selectedLocation) => {
            setLocation(selectedLocation)
            setIsLocationPickerOpen(false)
          }}
        />
      </div>
    </div>
  )
}
