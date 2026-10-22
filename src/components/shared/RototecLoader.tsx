import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'

/* ─── Helpers ─── */

/** Posición absoluta de un punto sobre la circunferencia a `angleDeg` (0° = arriba, sentido horario). */
function dotStyle(angleDeg: number, dotPx: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return {
    position: 'absolute' as const,
    left: `calc(50% + 50% * ${Math.cos(rad).toFixed(6)})`,
    top: `calc(50% + 50% * ${Math.sin(rad).toFixed(6)})`,
    width: dotPx,
    height: dotPx,
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
  }
}

/* ─── Ring ─── */

interface DotSpec {
  angle: number
  size: number
  color: string
  glow?: string
}
interface RingProps {
  radius: number
  duration: number
  reverse?: boolean
  borderColor: string
  borderWidth?: number
  dots?: DotSpec[]
}

function Ring({ radius, duration, reverse = false, borderColor, borderWidth = 1, dots = [] }: RingProps) {
  const size = radius * 2
  return (
    <motion.div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        top: '50%',
        left: '50%',
        marginTop: -radius,
        marginLeft: -radius,
        borderRadius: '50%',
        border: `${borderWidth}px dashed ${borderColor}`,
      }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
    >
      {dots.map(({ angle, size: ds, color, glow }, i) => (
        <div
          key={i}
          style={{
            ...dotStyle(angle, ds),
            backgroundColor: color,
            boxShadow: glow ? `0 0 8px 3px ${glow}` : undefined,
          }}
        />
      ))}
    </motion.div>
  )
}

/* ─── Public ─── */

interface RototecLoaderProps {
  /** Texto bajo el logo */
  message?: string
  /** true = pantalla completa (default); false = componente inline */
  fullscreen?: boolean
}

export function RototecLoader({ message = 'Iniciando sistema...', fullscreen = true }: RototecLoaderProps) {
  const animation = (
    <div className="flex select-none flex-col items-center gap-10">
      <div className="relative" style={{ width: 240, height: 240 }}>
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.14) 0%, transparent 68%)' }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <Ring
          radius={108}
          duration={30}
          reverse
          borderColor="rgba(14,165,233,0.15)"
          dots={[
            { angle: 0, size: 5, color: 'rgba(14,165,233,0.5)' },
            { angle: 120, size: 4, color: 'rgba(6,182,212,0.5)' },
            { angle: 240, size: 5, color: 'rgba(14,165,233,0.5)' },
          ]}
        />
        <Ring
          radius={78}
          duration={20}
          borderColor="rgba(14,165,233,0.30)"
          borderWidth={1.5}
          dots={[
            { angle: 50, size: 7, color: '#38bdf8', glow: 'rgba(56,189,248,0.4)' },
            { angle: 200, size: 6, color: '#22d3ee', glow: 'rgba(34,211,238,0.4)' },
            { angle: 320, size: 7, color: '#38bdf8', glow: 'rgba(56,189,248,0.4)' },
          ]}
        />
        <Ring
          radius={50}
          duration={13}
          reverse
          borderColor="rgba(14,165,233,0.50)"
          borderWidth={2}
          dots={[
            { angle: 30, size: 9, color: '#0ea5e9', glow: 'rgba(14,165,233,0.6)' },
            { angle: 210, size: 9, color: '#06b6d4', glow: 'rgba(6,182,212,0.6)' },
          ]}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div animate={{ scale: [1, 1.07, 1] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}>
            <div
              className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
                boxShadow: '0 12px 36px rgba(14,165,233,0.40)',
              }}
            >
              <Icon icon="solar:users-group-rounded-bold" className="text-white" width={36} />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="space-y-1.5 text-center">
        <motion.p
          className="text-lg font-bold tracking-tight text-slate-900"
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          Rototec · Recursos Humanos
        </motion.p>
        <p className="text-sm text-slate-400">{message}</p>
      </div>
    </div>
  )

  if (!fullscreen) return animation

  return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">{animation}</div>
}
