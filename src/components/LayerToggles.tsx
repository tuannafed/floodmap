'use client'

interface LayerTogglesProps {
  showRadar: boolean
  showDEM: boolean
  showRisk: boolean
  onToggleRadar: (show: boolean) => void
  onToggleDEM: (show: boolean) => void
  onToggleRisk: (show: boolean) => void
}

export function LayerToggles({
  showRadar,
  showDEM,
  showRisk,
  onToggleRadar,
  onToggleDEM,
  onToggleRisk,
}: LayerTogglesProps) {
  return (
    <div className="bg-card shadow-md rounded-md p-3 border border-border">
      <h3 className="text-sm font-bold mb-2 text-card-foreground">
        Lớp Bản đồ
      </h3>
      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2 cursor-pointer opacity-60">
          <input
            type="checkbox"
            checked={showRadar}
            onChange={(e) => onToggleRadar(e.target.checked)}
            className="rounded border-border"
            disabled
          />
          <span className="text-card-foreground">
            Radar Mưa{' '}
            <span className="text-xs text-muted-foreground">
              (Tạm thời không khả dụng)
            </span>
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showDEM}
            onChange={(e) => onToggleDEM(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-card-foreground">Độ Cao (DEM)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showRisk}
            onChange={(e) => onToggleRisk(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-card-foreground">Vùng Nguy Cơ</span>
        </label>
      </div>
    </div>
  )
}
