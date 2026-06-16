'use client'

interface LegendProps {
  isPlaying?: boolean
  currentFrame?: number
  totalFrames?: number
}

export function Legend({
  isPlaying = false,
  currentFrame,
  totalFrames,
}: LegendProps) {
  const progress =
    totalFrames && currentFrame !== undefined
      ? ((currentFrame + 1) / totalFrames) * 100
      : 0

  return (
    <div className="pointer-events-auto rounded-xl bg-black/70 text-white px-4 py-3 backdrop-blur-md border border-white/20">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-bold">Lượng mưa</div>
        {isPlaying && totalFrames && currentFrame !== undefined && (
          <div className="text-xs opacity-70">
            {currentFrame + 1}/{totalFrames}
          </div>
        )}
      </div>
      <div className="relative">
        <div
          className="h-4 w-full rounded-lg shadow-inner"
          style={{
            background:
              'linear-gradient(90deg, #00B4DB 0%, #0083B0 20%, #00D4FF 40%, #FFEB3B 60%, #FF9800 80%, #F44336 100%)',
          }}
        />
        {isPlaying && progress > 0 && (
          <div
            className="absolute top-0 left-0 h-4 bg-white/20 rounded-lg transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs mt-2 opacity-90 font-medium">
        <span>Nhỏ</span>
        <span>Vừa</span>
        <span>Lớn</span>
        <span>Rất lớn</span>
      </div>
    </div>
  )
}
