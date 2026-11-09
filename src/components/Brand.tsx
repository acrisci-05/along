import { cn } from '../lib/utils'

export type ClapMode = 'intro' | 'clap' | 'loop' | 'static'

const CREAM = '#f2ebdf'
const SAGE = '#9cc5a1'

function Stickman({ x, color, side }: { x: number; color: string; side: 'L' | 'R' }) {
  return (
    <g className={`walk-${side}`}>
      <g stroke={color} className={side}>
        <circle cx={x} cy={52} r={12} fill={color} stroke="none" />
        <line x1={x} y1={68} x2={x} y2={122} />
        <line className="pv leg1" x1={x} y1={122} x2={x} y2={166} />
        <line className="pv leg2" x1={x} y1={122} x2={x} y2={166} />
        <line className="pv ao" x1={x} y1={82} x2={x} y2={114} />
        <line className="pv ai" x1={x} y1={82} x2={x} y2={122} />
      </g>
    </g>
  )
}

/**
 * The ALONG mark: two people meet and give each other a high five.
 * intro = they walk in and clap · clap = only the high five · loop = keeps clapping (loading) · static = final pose (icon).
 * Honors “reduce motion” (falls back to the final pose).
 */
export function ClapMark({ mode = 'static', size = 120, className, title = 'ALONG' }: { mode?: ClapMode; size?: number; className?: string; title?: string }) {
  return (
    <svg
      viewBox="40 0 160 190"
      width={size}
      height={(size * 190) / 160}
      className={cn('clap', `clap--${mode}`, className)}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={size < 48 ? 11 : 8}
      role="img"
      aria-label={title}
      style={{ overflow: 'visible' }}
    >
      <Stickman x={95} color={CREAM} side="L" />
      <Stickman x={145} color={SAGE} side="R" />
      <g className="burst" stroke={CREAM} strokeWidth={size < 48 ? 7 : 5}>
        <line className="b1" x1={120} y1={34} x2={120} y2={20} />
        <line className="b2" x1={108} y1={36} x2={100} y2={26} />
        <line className="b3" x1={132} y1={36} x2={140} y2={26} />
      </g>
    </svg>
  )
}
