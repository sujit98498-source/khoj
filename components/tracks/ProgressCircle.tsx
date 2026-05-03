// components/tracks/ProgressCircle.tsx
// SVG circular progress indicator used on the track detail page.

interface Props {
  percent: number
  size?: number
  strokeWidth?: number
  label?: string
}

export function ProgressCircle({ percent, size = 120, strokeWidth = 9, label = 'Completed' }: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - Math.min(Math.max(percent, 0), 100) / 100 * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke="#1e1e2e"
            fill="none"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke="#ff5a00"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-white leading-none">{percent}%</span>
          <span className="text-[10px] text-zinc-500 font-medium mt-0.5">{label}</span>
        </div>
      </div>
    </div>
  )
}
