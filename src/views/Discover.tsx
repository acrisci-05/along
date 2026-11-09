import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform, type Variants } from 'motion/react'
import { ChevronUp, Heart, MoreHorizontal, RotateCcw, X } from 'lucide-react'
import type { User } from '../types'
import { useNav } from '../nav'
import { useNow, useStore } from '../store/store'
import { DAILY_LIMIT, todayKey } from '../data/mock'
import { isMinor } from '../lib/age'
import { affinity, cn, sharedInterests } from '../lib/utils'
import { galleryItems } from '../components/Portrait'
import { Portrait } from '../components/Portrait'
import { Button, Chip, Sheet, Toggle } from '../components/ui'
import { useNeedsVerification, VerifiedBadge } from '../components/Verify'
import { InfoRows } from '../components/ProfileInfo'
import { Scene } from '../components/Brand'
import { isVerified } from '../lib/verify'

/** like = the card glides up and away; pass = it drops to the side */
const CARD_EXIT: Variants = {
  exit: (dir: 'left' | 'right') =>
    dir === 'right'
      ? { x: 360, y: -60, rotate: 14, opacity: 0, transition: { duration: 0.35, ease: [0.3, 0, 0.2, 1] as const } }
      : { x: -360, y: 40, rotate: -14, opacity: 0, transition: { duration: 0.35, ease: [0.3, 0, 0.2, 1] as const } },
}

const intentLabel = (u: User) => u.intent.map((i) => (i === 'date' ? 'Date' : 'Amici')).join(' · ')

export function Discover({ filters, setFilters }: { filters: boolean; setFilters: (v: boolean) => void }) {
  const store = useStore()
  const { state, setPrefs, passUser, likeUser, undoSwipe, resetDeck, toast, newDay, allowed, demo } = store
  const minor = isMinor(state.me)
  const needsVerify = useNeedsVerification()
  const [dir, setDir] = useState<'left' | 'right'>('left')
  const daily = state.daily.day === todayKey() ? state.daily : { day: todayKey(), seen: 0, liked: 0, matches: 0 }
  const dayOver = daily.seen >= DAILY_LIMIT
  const nav = useNav()
  const { prefs, me } = state

  const deck = useMemo(() => {
    const busy = new Set(state.chats.filter((c) => c.status === 'active' || c.status === 'waiting').flatMap((c) => c.peerIds))
    const pending = new Set(state.likesIn.filter((l) => l.status === 'new').map((l) => l.userId))
    return Object.values(state.users)
      .filter((u) => allowed(u.id) && !state.swipes[u.id] && !busy.has(u.id) && !pending.has(u.id))
      .filter((u) => u.intent.includes(prefs.intent))
      .filter((u) => prefs.show === 'all' || u.gender === prefs.show)
      .filter((u) => u.age >= prefs.ageMin && u.age <= prefs.ageMax)
      .filter((u) => !prefs.verifiedOnly || isVerified(u))
      .sort((a, b) => Number(b.city === me.city) - Number(a.city === me.city) || affinity(me, b) - affinity(me, a))
  }, [state.users, state.swipes, state.chats, state.likesIn, prefs, me, allowed])

  const top = dayOver ? undefined : deck[0]
  const next = dayOver ? undefined : deck[1]
  const nobodyYet = !demo && Object.values(state.users).filter((u) => allowed(u.id)).length === 0

  const undo = () => {
    const id = undoSwipe()
    if (!id) toast({ tone: 'coral', title: 'Niente da annullare', body: 'Puoi riportare indietro solo l’ultimo profilo saltato.' })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative grid flex-1 grid-cols-2 rounded-2xl bg-surface p-1" role="radiogroup" aria-label="Cosa cerchi">
          {(
            [
              ['date', 'Date'],
              ['friends', 'Amici'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              role="radio"
              aria-checked={prefs.intent === k}
              disabled={minor && k === 'date'}
              title={minor && k === 'date' ? 'Disponibile dai 18 anni' : undefined}
              onClick={() => setPrefs({ intent: k })}
              className={cn('relative h-9 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40', prefs.intent === k ? 'text-ink' : 'text-cream/60')}
            >
              {prefs.intent === k && <motion.span layoutId="intent-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} className="absolute inset-0 rounded-xl bg-brand" />}
              <span className="relative">{l}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3" aria-label={`Selezione di oggi: ${Math.min(daily.seen, DAILY_LIMIT)} su ${DAILY_LIMIT}`}>
        <span className="text-sm font-semibold text-muted">Selezione di oggi</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
          <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${(Math.min(daily.seen, DAILY_LIMIT) / DAILY_LIMIT) * 100}%` }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
        </div>
        <span className="text-sm font-bold tabular-nums">
          {Math.min(daily.seen, DAILY_LIMIT)}/{DAILY_LIMIT}
        </span>
      </div>

      <div className="relative min-h-[460px] flex-1">
        <AnimatePresence custom={dir}>
          {next && <SwipeCard key={next.id + '-behind'} user={next} me={me} behind />}
          {top && (
            <SwipeCard
              key={top.id}
              user={top}
              me={me}
              onPass={() => {
                setDir('left')
                passUser(top.id)
              }}
              onLike={(pick) => {
                if (needsVerify) {
                  nav.openVerify('Sotto i 18 anni devi verificare il profilo prima di mettere like.')
                  return
                }
                setDir('right')
                likeUser(top.id, pick)
              }}
              onInfo={() => nav.openUser(top.id)}
              onMore={() => nav.openSafety(top.id)}
              onUndo={undo}
            />
          )}
        </AnimatePresence>
        {dayOver && <DayOver daily={daily} onNewDay={demo ? newDay : undefined} />}
        {!top && !dayOver && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="absolute inset-0 grid place-items-center rounded-2xl border border-dashed border-line p-6 text-center">
            <div>
              <Scene kind={nobodyYet ? 'waiting' : 'search'} size={110} />
              <p className="mt-3 text-xl font-bold">{nobodyYet ? `Sei tra i primi a ${me.city}` : 'Per ora è tutto, qui'}</p>
              <p className="mt-1 text-sm text-muted">
                {nobodyYet
                  ? 'ALONG è appena partita. Invita chi vorresti trovare qui: ogni persona in più rende Scopri più ricco.'
                  : 'Hai visto tutti i profili con questi filtri. Allarga l’età o torna più tardi.'}
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <Button onClick={() => void invite(toast)}>Invita amici</Button>
                {!nobodyYet && (
                  <Button variant="outline" onClick={() => setFilters(true)}>
                    Cambia i filtri
                  </Button>
                )}
                {demo && (
                  <button onClick={resetDeck} className="mt-1 text-sm font-semibold text-cream/50 hover:text-cream">
                    Rivedi i profili saltati
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <Sheet open={filters} onClose={() => setFilters(false)} title="Filtri">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold">Mostrami</p>
            <div className="flex gap-2">
              {(
                [
                  ['all', 'Tutti'],
                  ['f', 'Donne'],
                  ['m', 'Uomini'],
                ] as const
              ).map(([k, l]) => (
                <Chip key={k} active={prefs.show === k} onClick={() => setPrefs({ show: k })}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">
              Età: {prefs.ageMin}–{prefs.ageMax}
            </p>
            <label className="flex items-center gap-3 text-sm text-cream/55">
              min
              <input type="range" min={minor ? 16 : 18} max={prefs.ageMax} value={prefs.ageMin} onChange={(e) => setPrefs({ ageMin: Number(e.target.value) })} className="flex-1" />
            </label>
            <label className="mt-2 flex items-center gap-3 text-sm text-cream/55">
              max
              <input type="range" min={prefs.ageMin} max={minor ? 17 : 60} value={prefs.ageMax} onChange={(e) => setPrefs({ ageMax: Number(e.target.value) })} className="flex-1" />
            </label>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
            <div>
              <p className="text-sm font-semibold">Solo profili verificati</p>
              <p className="text-xs text-muted">Persone che hanno fatto il selfie di verifica</p>
            </div>
            <Toggle checked={!!prefs.verifiedOnly} onChange={(v) => setPrefs({ verifiedOnly: v })} label="Solo profili verificati" />
          </div>
          <Button className="w-full" onClick={() => setFilters(false)}>
            Mostra {deck.length} profil{deck.length === 1 ? 'o' : 'i'}
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

/** “Questo o quello”: tap one answer; it travels with your like. */
export function ThisOrThatPicker({ q, value, onChange, disabled, compact }: { q: NonNullable<User['thisOrThat']>; value?: string; onChange?: (v: string | undefined) => void; disabled?: boolean; compact?: boolean }) {
  return (
    <div className={cn('rounded-xl bg-ink/55 backdrop-blur-sm', compact ? 'p-2.5' : 'p-3')}>
      <p className="text-xs font-semibold text-cream/70">Questo o quello</p>
      <p className="mt-0.5 text-base font-semibold leading-snug">{q.question}</p>
      <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label={q.question}>
        {[q.a, q.b].map((opt) => {
          const on = value === opt
          return (
            <motion.button
              key={opt}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation()
                onChange?.(on ? undefined : opt)
              }}
              className={cn('relative h-10 overflow-hidden rounded-lg border text-sm font-semibold transition-colors', on ? 'border-brand text-ink' : 'border-cream/20 text-cream hover:border-cream/40')}
            >
              {on && <motion.span layoutId={`tot-${q.question}`} transition={{ type: 'spring', stiffness: 500, damping: 36 }} className="absolute inset-0 bg-brand" />}
              <span className="relative">{opt}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export function SwipeCard({
  preview,
  user,
  me,
  behind,
  onPass,
  onLike,
  onInfo,
  onUndo,
  onMore,
}: {
  user: User
  me: User
  behind?: boolean
  /** read-only card for 'Come ti vedono gli altri' */
  preview?: boolean
  onPass?: () => void
  onLike?: (pick?: string) => void
  onInfo?: () => void
  onUndo?: () => void
  onMore?: () => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-10, 10])
  const passOpacity = useTransform(x, [-120, -30], [1, 0])
  const likeOpacity = useTransform(x, [30, 120], [0, 1])
  const [photo, setPhoto] = useState(0)
  const [pick, setPick] = useState<string | undefined>()
  const [scrolled, setScrolled] = useState(false)
  const dragged = useRef(false)
  const items = galleryItems(user)
  const common = sharedInterests(me, user)

  useEffect(() => {
    if (behind || preview) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, [role=dialog]')) return
      if (e.key === 'ArrowLeft') onPass?.()
      if (e.key === 'ArrowRight') onLike?.(pick)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [behind, preview, onPass, onLike, pick])

  if (behind)
    return (
      <motion.div
        key="behind"
        className="absolute inset-x-0 top-0 bottom-[76px] z-0 overflow-hidden rounded-2xl bg-surface"
        initial={{ scale: 0.9, y: 16, opacity: 0 }}
        animate={{ scale: 0.95, y: 10, opacity: 0.55 }}
        exit={{ opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        aria-hidden
      >
        <CardImage item={items[0]} />
      </motion.div>
    )

  const goPhoto = (d: 1 | -1) => setPhoto((p) => Math.max(0, Math.min(items.length - 1, p + d)))

  return (
    <motion.div key="front" className="absolute inset-0 z-10" variants={CARD_EXIT} initial={false} exit="exit">
      <motion.div
        className="absolute inset-0 flex flex-col"
        style={{ x, rotate }}
        initial={{ scale: 0.95, y: 10, opacity: 0.6 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        drag={preview ? false : 'x'}
        dragSnapToOrigin
        dragElastic={0.85}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={(_, info) => {
          window.setTimeout(() => (dragged.current = false), 60)
          if (info.offset.x < -110 || info.velocity.x < -700) onPass?.()
          else if (info.offset.x > 110 || info.velocity.x > 700) onLike?.(pick)
        }}
      >
        <article className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-surface text-cream shadow-[0_20px_50px_-20px_rgb(0_0_0/0.8)]" aria-label={`${user.name}, ${user.age}`}>
          <div className="no-scrollbar h-full overflow-y-auto overscroll-contain" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 24)}>
            {/* the photo, free: only name, age and city on top */}
            <section className="relative h-full">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div key={photo} className="absolute inset-0" initial={{ opacity: 0.4, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <CardImage item={items[photo]} />
                </motion.div>
              </AnimatePresence>
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(28_22_18/0.35)_0%,transparent_20%,transparent_62%,rgb(28_22_18/0.9)_100%)]" />
              {items.length > 1 && (
                <div className="absolute inset-x-3 top-2.5 z-10 flex gap-1.5" aria-hidden>
                  {items.map((_, i) => (
                    <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-cream/30">
                      {i === photo && <motion.span layoutId={`bar-${user.id}`} className="block h-full w-full bg-cream" />}
                    </span>
                  ))}
                </div>
              )}
              {items.length > 1 && (
                <>
                  <button className="absolute left-0 top-0 bottom-[30%] z-0 w-2/5" onClick={() => !dragged.current && goPhoto(-1)} aria-label="Foto precedente" disabled={photo === 0} />
                  <button className="absolute right-0 top-0 bottom-[30%] z-0 w-3/5" onClick={() => !dragged.current && goPhoto(1)} aria-label="Foto successiva" disabled={photo === items.length - 1} />
                </>
              )}
              <button onClick={() => !dragged.current && onInfo?.()} className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 text-left" aria-label={`Profilo completo di ${user.name}`}>
                <span className="block text-[30px] font-extrabold leading-none tracking-[-0.03em]">
                  {user.name} <span className="font-medium">{user.age}</span> <VerifiedBadge user={user} size={20} />
                </span>
                <span className="mt-1.5 block truncate text-sm text-cream/85">
                  {user.city === me.city ? `A ${user.city}` : user.city} · {intentLabel(user)}
                </span>
                <motion.span animate={{ opacity: scrolled ? 0 : 1, y: [0, -3, 0] }} transition={{ y: { repeat: Infinity, duration: 1.8 } }} className="mt-2 flex items-center gap-1 text-xs font-semibold text-cream/70">
                  <ChevronUp size={14} /> Scorri: {user.thisOrThat ? 'bio e Questo o quello' : 'bio e passioni'}
                </motion.span>
              </button>
            </section>

            {/* below the photo: the rest of the profile */}
            <section className="space-y-4 px-4 pb-6 pt-4">
              {user.bio && <p className="text-base leading-snug text-cream/90">{user.bio}</p>}
              {user.thisOrThat && <ThisOrThatPicker q={user.thisOrThat} value={pick} onChange={setPick} disabled={preview} />}
              {user.interests.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted">Passioni{common.length ? ` · ${common.length} in comune` : ''}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {user.interests.map((i) => (
                      <span key={i} className={cn('rounded-full border px-2.5 py-1 text-sm', common.includes(i) ? 'border-brand/50 bg-brand/15' : 'border-line text-cream/75')}>
                        {i}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <InfoRows user={user} />
            </section>
          </div>

          {onMore && !scrolled && (
            <button onClick={() => !dragged.current && onMore()} className="absolute right-2 top-5 z-20 grid size-9 place-items-center rounded-full bg-ink/40 text-cream hover:bg-ink/60" aria-label={`Altre opzioni per ${user.name}: blocca o segnala`}>
              <MoreHorizontal size={18} />
            </button>
          )}
          <motion.span style={{ opacity: likeOpacity }} className="pointer-events-none absolute left-4 top-14 z-20 -rotate-12 rounded-md border-2 border-love px-3 py-1 text-2xl font-extrabold tracking-wide text-love">
            MI PIACE
          </motion.span>
          <motion.span style={{ opacity: passOpacity }} className="pointer-events-none absolute right-4 top-14 z-20 rotate-12 rounded-md border-2 border-cream px-3 py-1 text-2xl font-extrabold tracking-wide text-cream">
            PASSO
          </motion.span>
        </article>

        {!preview && (
          <div className="flex items-center justify-center gap-4 pt-3">
            <motion.button whileTap={{ scale: 0.88 }} onClick={onUndo} className="grid size-11 place-items-center rounded-full border border-line text-muted hover:text-cream" aria-label="Annulla ultimo passo">
              <RotateCcw size={17} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.88 }} onClick={onPass} className="grid size-14 place-items-center rounded-full border border-line text-cream/80 hover:border-cream/40" aria-label={`Passa ${user.name}`}>
              <X size={24} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => onLike?.(pick)}
              className="flex h-14 items-center gap-2 whitespace-nowrap rounded-full bg-love px-8 text-base font-bold text-cream hover:brightness-110"
              aria-label={`Mi piace ${user.name}`}
            >
              <Heart size={20} fill="currentColor" />
              Mi piace
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function CardImage({ item }: { item: ReturnType<typeof galleryItems>[number] }) {
  return 'src' in item ? (
    <img src={item.src} alt="" className="h-full w-full object-cover" draggable={false} />
  ) : (
    <Portrait look={item.look} hue={item.hue} className="h-full w-full" />
  )
}

async function invite(toast: (t: { tone: 'lime' | 'coral'; title: string; body?: string }) => void) {
  const url = window.location.origin
  const text = 'Ti aspetto su ALONG: persone vere, vicine. Like con un tocco e nessun trucco a pagamento.'
  try {
    if (navigator.share) {
      await navigator.share({ title: 'ALONG', text, url })
      return
    }
    await navigator.clipboard.writeText(`${text} ${url}`)
    toast({ tone: 'lime', title: 'Link copiato', body: 'Incollalo dove vuoi: WhatsApp, Instagram, email.' })
  } catch (e) {
    if ((e as Error)?.name !== 'AbortError') toast({ tone: 'coral', title: 'Non riesco a condividere', body: url })
  }
}

function DayOver({ daily, onNewDay }: { daily: { seen: number; liked: number; matches: number }; onNewDay?: () => void }) {
  const { state } = useStore()
  const nav = useNav()
  const now = useNow(1000)
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const left = midnight.getTime() - now
  const hh = String(Math.floor(left / 3_600_000)).padStart(2, '0')
  const mm = String(Math.floor((left % 3_600_000) / 60_000)).padStart(2, '0')
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0')
  const newLikes = state.likesIn.filter((l) => l.status === 'new').length
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      className="no-scrollbar absolute inset-0 flex flex-col overflow-y-auto rounded-2xl border border-line bg-surface p-5 text-cream"
      aria-label="Selezione di oggi terminata"
    >
      <p className="text-sm font-semibold text-muted">Selezione finita</p>
      <h2 className="mt-1 text-[clamp(30px,9vw,44px)] leading-[0.95]">Per oggi è tutto.</h2>
      <p className="mt-2 text-sm text-cream/70">Domani altri {DAILY_LIMIT} profili. Intanto rispondi a chi ti ha già notato.</p>
      <dl className="mt-4 grid grid-cols-3 border-y border-line">
        {(
          [
            ['visti', daily.seen],
            ['mi piace', daily.liked],
            ['match', daily.matches],
          ] as const
        ).map(([k, v], i) => (
          <div key={k} className={cn('py-2 text-center', i > 0 && 'border-l border-line')}>
            <dd className="text-2xl font-extrabold tabular-nums">{v}</dd>
            <dt className="text-xs font-semibold text-muted">{k}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm font-semibold text-muted">Nuova selezione tra</p>
      <p className="text-2xl font-extrabold tabular-nums tracking-[-0.04em]" aria-live="off">
        {hh}:{mm}:{ss}
      </p>
      <div className="mt-auto grid gap-2 pt-3">
        <Button onClick={() => nav.setTab('likes')} disabled={!newLikes}>
          {newLikes ? `Vedi i tuoi like (${newLikes})` : 'Nessun like in attesa'}
        </Button>
        {onNewDay && (
          <button onClick={onNewDay} className="text-xs font-semibold text-cream/50 underline-offset-2 hover:underline">
            Demo: inizia un nuovo giorno
          </button>
        )}
      </div>
    </motion.section>
  )
}
