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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface SosListPanelProps {
  sosReports: any[]
  onSelectSos?: (report: any) => void
  inline?: boolean // If true, render inline content without sidebar
}

export function SosListPanel({
  sosReports,
  onSelectSos,
  inline = false,
}: SosListPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  const [filterUrgency, setFilterUrgency] = useState<
    'all' | 'high' | 'medium' | 'low'
  >('all')
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'new' | 'processing' | 'rescued'
  >('all')

  const urgencyLabels: Record<'all' | 'high' | 'medium' | 'low', string> = {
    all: 'Tất cả mức độ',
    high: 'Cao',
    medium: 'Trung bình',
    low: 'Thấp',
  }

  const statusLabels: Record<'all' | 'new' | 'processing' | 'rescued', string> =
    {
      all: 'Tất cả trạng thái',
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

  // Inline content (for bottom navigator)
  if (inline) {
    return (
      <div className="space-y-3 relative z-0">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap relative z-10">
          <Select
            value={filterUrgency}
            onValueChange={(value) => {
              setFilterUrgency(value as 'all' | 'high' | 'medium' | 'low')
            }}
          >
            <SelectTrigger className="flex-1 min-w-[140px] pointer-events-auto">
              <SelectValue>{urgencyLabels[filterUrgency]}</SelectValue>
            </SelectTrigger>
            <SelectContent className="z-2000">
              <SelectItem value="all">Tất cả mức độ</SelectItem>
              <SelectItem value="high">Cao</SelectItem>
              <SelectItem value="medium">Trung bình</SelectItem>
              <SelectItem value="low">Thấp</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterStatus}
            onValueChange={(value) => {
              setFilterStatus(value as 'all' | 'new' | 'processing' | 'rescued')
            }}
          >
            <SelectTrigger className="flex-1 min-w-[140px] pointer-events-auto">
              <SelectValue>{statusLabels[filterStatus]}</SelectValue>
            </SelectTrigger>
            <SelectContent className="z-2000">
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="new">Mới</SelectItem>
              <SelectItem value="processing">Đang xử lý</SelectItem>
              <SelectItem value="rescued">Đã cứu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {sortedReports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Không có SOS nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedReports.map((report) => (
              <div
                key={report.id}
                onClick={() => onSelectSos?.(report)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  report.urgency === 'high'
                    ? 'border-error-500 bg-error-50 dark:bg-error-900/20'
                    : report.urgency === 'medium'
                    ? 'border-warning-500 bg-warning-50 dark:bg-warning-900/20'
                    : 'border-success-500 bg-success-50 dark:bg-success-900/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🆘</span>
                      <span
                        className={`font-bold text-sm ${
                          statusColors[
                            report.status as keyof typeof statusColors
                          ]
                        } text-white px-2 py-0.5 rounded`}
                      >
                        {
                          statusLabels[
                            report.status as keyof typeof statusLabels
                          ]
                        }
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          report.urgency === 'high'
                            ? 'bg-error-600 text-white'
                            : report.urgency === 'medium'
                            ? 'bg-warning-600 text-white'
                            : 'bg-success-600 text-white'
                        }`}
                      >
                        {
                          urgencyLabels[
                            report.urgency as keyof typeof urgencyLabels
                          ]
                        }
                      </span>
                    </div>
                    <div className="text-sm text-card-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <Users className="size-3 text-muted-foreground" />
                        <span>{report.peopleCount} người</span>
                      </div>
                      {report.hasVulnerable && (
                        <div className="text-xs text-warning-600 dark:text-warning-400">
                          ⚠️ Có người già/trẻ em/khuyết tật
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {formatTime(report.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.location.href = 'tel:113'
                      }}
                      className="bg-error-600 hover:bg-error-700 text-white rounded-md px-2 py-1 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <Phone className="size-3" />
                      113
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.location.href = 'tel:114'
                      }}
                      className="bg-error-600 hover:bg-error-700 text-white rounded-md px-2 py-1 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <Phone className="size-3" />
                      114
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.location.href = 'tel:115'
                      }}
                      className="bg-error-600 hover:bg-error-700 text-white rounded-md px-2 py-1 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <Phone className="size-3" />
                      115
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Sheet version for desktop
  return (
    <Sheet
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SheetTrigger asChild>
        <button
          className="fixed bottom-24 right-7 z-2000 bg-card hover:bg-card/90 text-card-foreground rounded-lg px-4 py-2 shadow-lg border border-border flex items-center gap-2 transition-colors"
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
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-full max-w-md sm:max-w-md flex flex-col p-0"
      >
        <SheetHeader className="sticky top-0 bg-card z-50 border-b border-border p-4 shrink-0">
          <SheetTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
            <List className="size-5" />
            Danh sách SOS ({sortedReports.length})
          </SheetTitle>
        </SheetHeader>

        {/* Filters */}
        <div className="px-4 flex gap-4 border-b border-border pb-4 shrink-0">
          <div className="flex-1">
            <label className="text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
              <Filter className="size-4" />
              Mức khẩn cấp
            </label>
            <Select
              value={filterUrgency}
              onValueChange={(value) => {
                setFilterUrgency(value as 'all' | 'high' | 'medium' | 'low')
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{urgencyLabels[filterUrgency]}</SelectValue>
              </SelectTrigger>
              <SelectContent className="z-3000">
                <SelectItem value="all">Tất cả mức độ</SelectItem>
                <SelectItem value="high">Cao</SelectItem>
                <SelectItem value="medium">Trung bình</SelectItem>
                <SelectItem value="low">Thấp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium text-card-foreground mb-2 block">
              Trạng thái
            </label>
            <Select
              value={filterStatus}
              onValueChange={(value) => {
                setFilterStatus(
                  value as 'all' | 'new' | 'processing' | 'rescued'
                )
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{statusLabels[filterStatus]}</SelectValue>
              </SelectTrigger>
              <SelectContent className="z-3000">
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="new">Mới</SelectItem>
                <SelectItem value="processing">Đang xử lý</SelectItem>
                <SelectItem value="rescued">Đã cứu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
          {sortedReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="size-12 mx-auto mb-2 opacity-50" />
              <p>Không có SOS nào</p>
            </div>
          ) : (
            sortedReports.map((report) => {
              // Urgency colors: High (red), Medium (orange), Low (green)
              const urgencyBorderColor =
                report.urgency === 'high'
                  ? 'border-l-error-600'
                  : report.urgency === 'medium'
                  ? 'border-l-warning-600'
                  : 'border-l-success-600'

              const urgencyBgColor =
                report.urgency === 'high'
                  ? 'bg-error-50 dark:bg-error-950/20'
                  : report.urgency === 'medium'
                  ? 'bg-warning-50 dark:bg-warning-950/20'
                  : 'bg-success-50 dark:bg-success-950/20'

              return (
                <div
                  key={report.id}
                  onClick={() => {
                    onSelectSos?.(report)
                    setIsOpen(false)
                  }}
                  className={`bg-background hover:bg-muted/50 border-l-4 ${urgencyBorderColor} border-r border-t border-b border-border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${urgencyBgColor}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🆘</span>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
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
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          report.urgency === 'high'
                            ? 'bg-error-600 text-white'
                            : report.urgency === 'medium'
                            ? 'bg-warning-600 text-white'
                            : 'bg-success-600 text-white'
                        }`}
                      >
                        {
                          urgencyLabels[
                            report.urgency as keyof typeof urgencyLabels
                          ]
                        }
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                      <Clock className="size-3" />
                      {formatTime(report.createdAt)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-card-foreground font-medium">
                        <strong>{report.peopleCount}</strong> người cần cứu
                      </span>
                    </div>

                    {report.hasVulnerable && (
                      <div className="bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-200 rounded-md px-2 py-1 text-xs font-medium">
                        ⚠️ Có người già/trẻ em/khuyết tật
                      </div>
                    )}

                    {report.description && (
                      <div className="text-sm text-card-foreground line-clamp-2">
                        {report.description}
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      <span className="font-mono">
                        {report.lat.toFixed(4)}, {report.lon.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-border flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.location.href = 'tel:113'
                      }}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white rounded-md px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Phone className="size-3.5" />
                      113
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.location.href = 'tel:114'
                      }}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white rounded-md px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Phone className="size-3.5" />
                      114
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.location.href = 'tel:115'
                      }}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white rounded-md px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Phone className="size-3.5" />
                      115
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
