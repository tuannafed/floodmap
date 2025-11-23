'use client'

interface LayerTogglesProps {
  showRisk: boolean
  onToggleRisk: (show: boolean) => void
}

export function LayerToggles({
  showRisk,
  onToggleRisk,
}: LayerTogglesProps) {
  return (
    <div className="bg-card shadow-md rounded-md p-3 border border-border">
      <h3 className="text-sm font-bold mb-2 text-card-foreground">
        Lớp Bản đồ
      </h3>
      <div className="space-y-2 text-sm">
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
