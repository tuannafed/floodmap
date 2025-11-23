'use client'

import { useState } from 'react'
import {
  X,
  List,
  Phone,
  MapPin,
  Users,
  AlertCircle,
  Clock,
  Filter,
} from 'lucide-react'

interface SosListPanelProps {
  sosReports: any[]
  onSelectSos?: (report: any) => void
}

export function SosListPanel({ sosReports, onSelectSos }: SosListPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Debug: Log SOS reports
  console.log(
    '📋 SosListPanel: Received',
    sosReports?.length || 0,
    'reports',
    sosReports
  )
  const [filterUrgency, setFilterUrgency] = useState<
    'all' | 'high' | 'medium' | 'low'
  >('all')
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'new' | 'processing' | 'rescued'
  >('all')

  const urgencyLabels = {
    high: 'Cao',
    medium: 'Trung bình',
    low: 'Thấp',
  }

  const statusLabels = {
    new: 'Mới',
    processing: 'Đang xử lý',
    rescued: 'Đã cứu',
  }

  const statusColors = {
    new: 'bg-error-600',
    processing: 'bg-warning-600',
    rescued: 'bg-success-600',
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

  const filteredReports = sosReports.filter((report) => {
    if (filterUrgency !== 'all' && report.urgency !== filterUrgency)
      return false
    if (filterStatus !== 'all' && report.status !== filterStatus) return false
    return true
  })

  // Sort by urgency and time
  const sortedReports = [...filteredReports].sort((a, b) => {
    const urgencyOrder = { high: 3, medium: 2, low: 1 }
    if (
      urgencyOrder[a.urgency as keyof typeof urgencyOrder] !==
      urgencyOrder[b.urgency as keyof typeof urgencyOrder]
    ) {
      return (
        urgencyOrder[b.urgency as keyof typeof urgencyOrder] -
        urgencyOrder[a.urgency as keyof typeof urgencyOrder]
      )
    }
    return b.createdAt - a.createdAt
  })

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-26 right-7 z-2000 bg-card hover:bg-card/90 text-card-foreground rounded-lg px-4 py-2 shadow-lg border border-border flex items-center gap-2 transition-colors"
        aria-label="Danh sách SOS"
      >
        <List className="size-5" />
        <span className="hidden sm:inline">Danh sách SOS</span>
        {sosReports.length > 0 && (
          <span className="bg-error-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
            {sosReports.length}
          </span>
        )}
      </button>

      {/* Sidebar */}
      {isOpen && (
        <div
          className="fixed inset-0 z-3000 bg-black/50 flex items-center justify-start animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-card w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-left-5 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <List className="size-5" />
                Danh sách SOS ({sortedReports.length})
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-border space-y-3">
              <div>
                <label className="text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
                  <Filter className="size-4" />
                  Mức khẩn cấp
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['all', 'high', 'medium', 'low'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setFilterUrgency(level)}
                      className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        filterUrgency === level
                          ? level === 'all'
                            ? 'bg-primary text-primary-foreground'
                            : level === 'high'
                            ? 'bg-error-600 text-white'
                            : level === 'medium'
                            ? 'bg-warning-600 text-white'
                            : 'bg-info-600 text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {level === 'all' ? 'Tất cả' : urgencyLabels[level]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground mb-2 block">
                  Trạng thái
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['all', 'new', 'processing', 'rescued'] as const).map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          filterStatus === status
                            ? status === 'all'
                              ? 'bg-primary text-primary-foreground'
                              : statusColors[status] + ' text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {status === 'all' ? 'Tất cả' : statusLabels[status]}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {sortedReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="size-12 mx-auto mb-2 opacity-50" />
                  <p>Không có SOS nào</p>
                </div>
              ) : (
                sortedReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => {
                      onSelectSos?.(report)
                      setIsOpen(false)
                    }}
                    className="bg-background hover:bg-muted/50 border border-border rounded-lg p-3 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🆘</span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            statusColors[
                              report.status as keyof typeof statusColors
                            ]
                          } text-white`}
                        >
                          {
                            statusLabels[
                              report.status as keyof typeof statusLabels
                            ]
                          }
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatTime(report.createdAt)}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-muted-foreground" />
                        <span className="text-card-foreground">
                          <strong>{report.peopleCount}</strong> người
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            report.urgency === 'high'
                              ? 'bg-error-600 text-white'
                              : report.urgency === 'medium'
                              ? 'bg-warning-600 text-white'
                              : 'bg-info-600 text-white'
                          }`}
                        >
                          {
                            urgencyLabels[
                              report.urgency as keyof typeof urgencyLabels
                            ]
                          }
                        </span>
                      </div>

                      {report.hasVulnerable && (
                        <div className="text-xs text-warning-700 dark:text-warning-300">
                          ⚠️ Có người già/trẻ em/khuyết tật
                        </div>
                      )}

                      {report.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {report.description}
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {report.lat.toFixed(4)}, {report.lon.toFixed(4)}
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-border flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          window.location.href = 'tel:113'
                        }}
                        className="flex-1 bg-error-600 hover:bg-error-700 text-white rounded-md px-2 py-1 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        <Phone className="size-3" />
                        113
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          window.location.href = 'tel:114'
                        }}
                        className="flex-1 bg-error-600 hover:bg-error-700 text-white rounded-md px-2 py-1 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        <Phone className="size-3" />
                        114
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          window.location.href = 'tel:115'
                        }}
                        className="flex-1 bg-error-600 hover:bg-error-700 text-white rounded-md px-2 py-1 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        <Phone className="size-3" />
                        115
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
