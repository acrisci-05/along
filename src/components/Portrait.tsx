import { useId, useState } from 'react'
import type { Look } from '../types'

const SKIN = ['#f6d7c3', '#eec1a0', '#d9a07a', '#b97a52', '#8d5a3b', '#5e3a26']

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)))
  const r = c((n >> 16) & 255)
  const g = c((n >> 8) & 255)
  const b = c(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/**
 * Procedural, faceless editorial portrait. `crop="card"` shows head and shoulders
 * (portrait 4:5), `crop="avatar"` zooms on the head for circular avatars.
 */
export function Portrait({ look, hue, crop = 'card', className }: { look: Look; hue: number; crop?: 'card' | 'avatar'; className?: string }) {
  const id = useId().replace(/:/g, '')
  const skin = SKIN[look.skin] ?? SKIN[1]
  const hair = look.hairColor
  const viewBox = crop === 'avatar' ? '16 14 68 68' : '0 0 100 125'

  const backHair = {
    long: <path d="M30 50 C 28 30, 72 30, 70 50 L 74 98 C 62 104, 38 104, 26 98 Z" fill={hair} />,
    wavy: <path d="M31 50 C 29 30, 71 30, 69 50 C 73 62, 68 70, 72 80 C 62 88, 38 88, 28 80 C 32 70, 27 62, 31 50 Z" fill={hair} />,
    bob: <path d="M31 48 C 29 28, 71 28, 69 48 L 70 72 C 60 76, 40 76, 30 72 Z" fill={hair} />,
    curly: (
      <g fill={hair}>
        {[
          [32, 46, 9], [38, 36, 9], [48, 31, 10], [59, 33, 9], [67, 41, 9], [69, 52, 8], [31, 56, 8], [35, 64, 7], [66, 63, 7],
        ].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    ),
    short: null,
    buzz: null,
    bun: <circle cx="50" cy="24" r="8.5" fill={hair} />,
  }[look.hair]

  const frontHair = {
    long: <path d="M33 47 C 33 31, 67 31, 67 47 C 60 39, 44 38, 33 47 Z" fill={hair} />,
    wavy: <path d="M33 48 C 32 31, 68 31, 67 48 C 62 40, 52 42, 46 38 C 42 42, 37 43, 33 48 Z" fill={hair} />,
    bob: <path d="M33 46 C 33 30, 67 30, 67 46 L 66 48 C 58 42, 42 42, 34 48 Z" fill={hair} />,
    curly: null,
    short: <path d="M33 47 C 31 31, 69 29, 67 46 C 63 40, 55 37, 47 39 C 41 40, 36 43, 33 47 Z" fill={hair} />,
    buzz: <path d="M34 45 C 34 32, 66 32, 66 45 C 60 40, 40 40, 34 45 Z" fill={hair} opacity="0.9" />,
    bun: <path d="M33 47 C 33 31, 67 31, 67 47 C 60 41, 40 41, 33 47 Z" fill={hair} />,
  }[look.hair]

  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <radialGradient id={`bg${id}`} cx="30%" cy="20%" r="95%">
          <stop offset="0" stopColor={`hsl(${hue} 85% 72%)`} />
          <stop offset="0.55" stopColor={`hsl(${(hue + 30) % 360} 60% 45%)`} />
          <stop offset="1" stopColor={`hsl(${(hue + 200) % 360} 45% 16%)`} />
        </radialGradient>
        <linearGradient id={`face${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(skin, 0.05)} />
          <stop offset="1" stopColor={shade(skin, -0.1)} />
        </linearGradient>
        <linearGradient id={`shirt${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.shirt} />
          <stop offset="1" stopColor={shade(look.shirt, -0.25)} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="125" fill={`url(#bg${id})`} />
      <circle cx="82" cy="18" r="22" fill={`hsl(${(hue + 60) % 360} 90% 70%)`} opacity="0.35" />
      {backHair}
      {/* shoulders */}
      <path d="M14 125 C 14 96, 30 84, 50 84 C 70 84, 86 96, 86 125 Z" fill={`url(#shirt${id})`} />
      {/* neck */}
      <path d="M43 66 L 43 82 C 46 88, 54 88, 57 82 L 57 66 Z" fill={shade(skin, -0.14)} />
      {/* head */}
      <ellipse cx="50" cy="51" rx="16.5" ry="20" fill={`url(#face${id})`} />
      <ellipse cx="33.5" cy="53" rx="2.6" ry="4" fill={shade(skin, -0.08)} />
      <ellipse cx="66.5" cy="53" rx="2.6" ry="4" fill={shade(skin, -0.08)} />
      {look.beard && <path d="M35 55 C 36 70, 44 73, 50 73 C 56 73, 64 70, 65 55 C 62 64, 38 64, 35 55 Z" fill={hair} opacity="0.85" />}
      {frontHair}
      {look.glasses && (
        <g fill="none" stroke="#1c1612" strokeWidth="1.6" opacity="0.85">
          <circle cx="43.5" cy="52" r="5.2" />
          <circle cx="56.5" cy="52" r="5.2" />
          <path d="M48.7 52 h2.6" />
        </g>
      )}
      {look.earring && <circle cx="33.5" cy="59" r="1.6" fill="#F5C451" />}
    </svg>
  )
}

/** Real uploaded photo if present, otherwise the illustrated portrait. */
export function UserPicture({ user, crop = 'card', className }: { user: { look: Look; hue: number; photos?: string[]; name?: string }; crop?: 'card' | 'avatar'; className?: string }) {
  const src = user.photos?.[0]
  if (src) return <img src={src} alt="" className={`${className ?? ''} object-cover`} draggable={false} />
  return <Portrait look={user.look} hue={user.hue} crop={crop} className={className} />
}

const SHIRT_ALT = ['#24473a', '#7a3b2e', '#c9a227', '#2f5d8a', '#6b4f7a', '#f2ebdf']

/** Gallery for a profile: real photos if any, otherwise 3 illustrated variants (demo stand-ins). */
export function galleryItems(user: { look: Look; hue: number; photos?: string[] }): Array<{ src: string } | { look: Look; hue: number }> {
  if (user.photos?.length) return user.photos.map((src) => ({ src }))
  return [0, 1, 2].map((i) => ({
    look: i === 0 ? user.look : { ...user.look, shirt: SHIRT_ALT[(user.hue + i * 2) % SHIRT_ALT.length] },
    hue: (user.hue + i * 47) % 360,
  }))
}

export function PhotoCarousel({ user }: { user: { look: Look; hue: number; photos?: string[]; name: string } }) {
  const items = galleryItems(user)
  const [i, setI] = useState(0)
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface">
      <div
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => {
          const el = e.currentTarget
          setI(Math.round(el.scrollLeft / el.clientWidth))
        }}
        aria-label={`Foto di ${user.name}`}
        role="group"
      >
        {items.map((it, k) => (
          <div key={k} className="aspect-[4/5] w-full shrink-0 snap-center">
            {'src' in it ? <img src={it.src} alt={`Foto ${k + 1} di ${user.name}`} className="h-full w-full object-cover" /> : <Portrait look={it.look} hue={it.hue} className="h-full w-full" />}
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center gap-1.5" aria-hidden>
          {items.map((_, k) => (
            <span key={k} className={`h-1 rounded-full transition-all ${k === i ? 'w-5 bg-cream' : 'w-2.5 bg-cream/40'}`} />
          ))}
        </div>
      )}
    </div>
  )
}
