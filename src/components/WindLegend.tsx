'use client'

interface WindLegendProps {
  isPlaying?: boolean
}

export function WindLegend({ isPlaying = false }: WindLegendProps) {
  return (
    <div
      className={`pointer-events-auto rounded-xl bg-linear-to-br from-black/80 to-black/60 text-white px-4 py-3 backdrop-blur-md transition-all border ${
        isPlaying
          ? 'ring-2 ring-blue-400/60 shadow-xl shadow-blue-400/40 border-blue-400/30'
          : 'border-white/20'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xs font-bold">Tốc độ gió</div>
        {isPlaying && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
            <span
              className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
              style={{ animationDelay: '0.15s' }}
            ></span>
            <span
              className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
              style={{ animationDelay: '0.3s' }}
            ></span>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {/* Wind speed scale */}
        <div className="flex items-center gap-2 text-[10px]">
          <div className="w-8 h-1 bg-blue-200 rounded"></div>
          <span className="opacity-80">0-20 km/h</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <div className="w-8 h-1 bg-blue-400 rounded"></div>
          <span className="opacity-80">20-40 km/h</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <div className="w-8 h-1 bg-blue-600 rounded"></div>
          <span className="opacity-80">40-60 km/h</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <div className="w-8 h-1 bg-yellow-500 rounded"></div>
          <span className="opacity-80">60-80 km/h</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <div className="w-8 h-1 bg-orange-500 rounded"></div>
          <span className="opacity-80">80-100 km/h</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <div className="w-8 h-1 bg-red-500 rounded"></div>
          <span className="opacity-80">100+ km/h</span>
        </div>
      </div>
    </div>
  )
}
