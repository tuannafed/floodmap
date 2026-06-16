'use client'

interface TemperatureLegendProps {
  isPlaying?: boolean
}

export function TemperatureLegend({ isPlaying = false }: TemperatureLegendProps) {
  return (
    <div className="pointer-events-auto rounded-xl bg-black/70 text-white px-4 py-3 backdrop-blur-md border border-white/20">
      <div className="text-sm font-bold mb-3">Nhiệt độ</div>
      {/* Vertical temperature gradient */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-1.5 text-xs opacity-90 font-medium">
          <span>55°</span>
          <span>30°</span>
          <span>20°</span>
          <span>10°</span>
          <span>0°</span>
          <span>-20°</span>
          <span>-40°</span>
        </div>
        <div
          className="w-8 h-52 rounded-lg shadow-inner"
          style={{
            background:
              'linear-gradient(180deg, #F44336 0%, #FF5722 10%, #FF9800 20%, #FFC107 30%, #8BC34A 40%, #4CAF50 50%, #2196F3 60%, #03A9F4 70%, #00BCD4 80%, #0097A7 90%, #006064 100%)',
          }}
        />
        <div className="flex flex-col items-center justify-between h-52 text-xs opacity-90 font-medium">
          <span className="text-red-400">Nóng</span>
          <span className="text-orange-400">Ấm</span>
          <span className="text-yellow-400">Mát</span>
          <span className="text-green-400">Lạnh</span>
          <span className="text-blue-400">Rất lạnh</span>
        </div>
      </div>
    </div>
  )
}
