'use client'

import { WeatherLayer, getOWMEnabled } from '@/lib/weather'

interface LayerMenuProps {
  active: WeatherLayer
  onChange: (layer: WeatherLayer) => void
  playing: boolean
  onTogglePlay: () => void
}

export function LayerMenu({
  active,
  onChange,
  playing,
  onTogglePlay,
}: LayerMenuProps) {
  const hasOWM = getOWMEnabled()

  const Item = ({
    v,
    label,
    icon,
  }: {
    v: WeatherLayer
    label: string
    icon: string
  }) => (
    <button
      onClick={() => onChange(v)}
      className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
        active === v
          ? 'bg-white text-black'
          : 'bg-black/60 text-white hover:bg-black/80'
      } backdrop-blur`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )

  return (
    <div className="space-y-2 pointer-events-auto">
      <Item
        v="rain"
        label="Lượng mưa"
        icon="🌧️"
      />
      {hasOWM && (
        <>
          <Item
            v="temp"
            label="Nhiệt độ"
            icon="🌡️"
          />
          <Item
            v="wind"
            label="Gió"
            icon="💨"
          />
          <Item
            v="aqi"
            label="Chất lượng không khí"
            icon="🌫️"
          />
        </>
      )}

      {!hasOWM && (
        <div className="text-[11px] text-white/80 px-3 py-2">
          (*) Thêm <b>NEXT_PUBLIC_OWM_KEY</b> để bật Temp/Wind/AQI
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-white/20">
        <button
          onClick={onTogglePlay}
          className="px-3 py-2 rounded-lg bg-black/60 text-white backdrop-blur hover:bg-black/80 transition-colors text-sm w-full flex items-center justify-center gap-2"
        >
          {playing ? (
            <>
              <span>⏸</span>
              <span>Tạm dừng radar</span>
            </>
          ) : (
            <>
              <span>▶️</span>
              <span>Phát radar</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
