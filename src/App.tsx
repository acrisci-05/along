import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Flame, Heart, Map as MapIcon, MessagesSquare, Monitor, Plus, Smartphone, Sparkles, X } from 'lucide-react'
import type { Mode } from './types'
import { NavCtx, type Nav, type Tab } from './nav'
import { useStore } from './store/store'
import { cn } from './lib/utils'
import { Discover } from './views/Discover'
import { Likes } from './views/Likes'
import { MatchOverlay } from './components/MatchOverlay'
import { SafetySheet, type SafetyMode } from './components/Safety'
import { Onboarding } from './components/Onboarding'
import { Radar } from './views/Radar'
import { MyPlans } from './views/MyPlans'
import { Crew } from './views/Crew'
import { Profile } from './views/Profile'
import { ChatRoom } from './views/ChatRoom'
import { PlanDetailSheet, UserSheet } from './components/Overlays'
import { GatekeeperSheet } from './components/Gatekeeper'
import { QuickCreate } from './components/QuickCreate'
import { Paywall } from './components/Paywall'
import { Avatar, RevolutTip } from './components/ui'

const TABS: Array<{ id: Tab | 'create'; label: string; icon: typeof Flame }> = [
  { id: 'explore', label: 'Scopri', icon: Flame },
  { id: 'radar', label: 'Mappa', icon: MapIcon },
  { id: 'create', label: 'Proponi', icon: Plus },
  { id: 'likes', label: 'Like', icon: Heart },
  { id: 'crew', label: 'Chat', icon: MessagesSquare },
]

function readPref<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback
  } catch {
    return fallback
  }
}

export default function App() {
  const store = useStore()
  const { state, activeChats, waitingChats, user, joinPlan, limits, toasts, dismissToast } = store
  const [tab, setTabState] = useState<Tab>(() => readPref<Tab>('along:tab', 'explore'))
  const [mode, setMode] = useState<Mode>('local')
  const [planId, setPlanId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [chatId, setChatId] = useState<string | null>(null)
  const [gate, setGate] = useState<{ kind: 'plan' | 'user'; id: string } | null>(null)
  const [creating, setCreating] = useState(false)
  const [paywall, setPaywall] = useState<{ open: boolean; reason?: string }>({ open: false })
  const [safety, setSafety] = useState<{ userId: string; mode: SafetyMode } | null>(null)
  const [frame, setFrame] = useState<'phone' | 'wide'>(() => readPref('along:frame', 'phone'))
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem('along:tab', tab)
      localStorage.setItem('along:frame', frame)
    } catch {
      /* ignore */
    }
  }, [tab, frame])

  const closeSheets = () => {
    setPlanId(null)
    setUserId(null)
    setGate(null)
  }

  const setTab = useCallback((t: Tab) => {
    setTabState(t)
    setChatId(null)
    setPlanId(null)
    setUserId(null)
    scrollRef.current?.scrollTo({ top: 0 })
  }, [])

  const nav: Nav = useMemo(
    () => ({
      tab,
      setTab,
      openPlan: (id) => {
        setUserId(null)
        setPlanId(id)
      },
      openUser: (id) => {
        if (id === 'me') return setTab('profile')
        setPlanId(null)
        setUserId(id)
      },
      openChat: (id) => {
        setPlanId(null)
        setUserId(null)
        setGate(null)
        setChatId(id)
      },
      openCreate: () => setCreating(true),
      openPaywall: (reason) => setPaywall({ open: true, reason }),
      openSafety: (userId, mode = 'menu') => setSafety({ userId, mode }),
      openGatekeeperForUser: (id) => {
        setUserId(null)
        setGate({ kind: 'user', id })
      },
    }),
    [tab, setTab],
  )

  const gatePlan = gate?.kind === 'plan' ? state.plans.find((p) => p.id === gate.id) : undefined
  const gateUser = gate ? (gate.kind === 'plan' ? (gatePlan ? user(gatePlan.hostId) : undefined) : user(gate.id)) : undefined
  const crewBadge = activeChats.reduce((n, c) => n + (c.unread ? 1 : 0), 0) + waitingChats.length
  const likesBadge = state.likesIn.filter((l) => l.status === 'new').length
  const badgeFor = (id: string) => (id === 'crew' ? crewBadge : id === 'likes' ? likesBadge : 0)

  const views: Record<Tab, ReactElement> = {
    explore: <Discover mode={mode} setMode={setMode} />,
    likes: <Likes />,
    radar: <Radar />,
    plans: <MyPlans />,
    crew: <Crew />,
    profile: <Profile />,
  }

  const wide = frame === 'wide'
  const overlayOpen = !!(planId || userId || gate || creating || paywall.open || chatId || !state.onboarded || store.match || safety)

  return (
    <MotionConfig reducedMotion="user">
      <NavCtx.Provider value={nav}>
        <div className="relative min-h-dvh overflow-hidden bg-[#15100d] md:flex md:items-center md:justify-center md:gap-14 md:p-6">
          {/* desktop ambient */}
          <div className="pointer-events-none fixed inset-0 hidden md:block" aria-hidden>
            <div className="absolute -left-40 top-10 size-[520px] rounded-full bg-brand/10 blur-3xl" />
          </div>

          {/* desktop side panel */}
          <aside className={cn('relative z-10 hidden max-w-sm flex-col gap-6 lg:flex', wide && 'lg:hidden')}>
            <Logo big />
            <p className="font-display text-3xl font-bold leading-[0.98] text-cream">
              Less scrolling.
              <br />
              <span className="text-brand">More doing.</span>
              <br />
              <span className="text-gradient-neon">Find your people.</span>
            </p>
            <p className="text-base leading-relaxed text-cream/60">
              L’app d’incontri dove fai match su qualcosa da fare. Swipe = rispondi a un dilemma, foto svelate solo al match, 48 ore per vedersi davvero. Date o amici, decidi tu.
            </p>
            <FrameSwitch frame={frame} setFrame={setFrame} />
            <div className="w-fit">
              <RevolutTip compact />
            </div>
          </aside>

          {/* device */}
          <div
            className={cn(
              'relative z-10 mx-auto flex h-dvh w-full flex-col overflow-hidden bg-ink',
              !wide && 'md:h-[min(880px,calc(100dvh-48px))] md:w-[402px] md:rounded-[54px] md:border-[11px] md:border-[#2a221c] md:shadow-[0_0_0_1px_rgb(255_255_255/0.06),0_40px_120px_-20px_rgb(0_0_0/0.9),0_0_80px_-30px_rgb(139_92_246/0.5)]',
              wide && 'md:h-dvh md:max-w-[720px] md:border-x md:border-cream/5',
            )}
          >
            {/* quiet backdrop: a single warm light, no animated mesh */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgb(156_197_161/0.10),transparent_70%)]" aria-hidden />

            {!wide && <div className="absolute left-1/2 top-2 z-[60] hidden h-[26px] w-[110px] -translate-x-1/2 rounded-full bg-black md:block" aria-hidden />}

            {/* top bar */}
            <header inert={overlayOpen} className={cn('relative z-20 flex items-center justify-between px-4 pb-2', !wide ? 'pt-[max(12px,env(safe-area-inset-top))] md:pt-11' : 'pt-4')}>
              <button onClick={() => setTab('explore')} aria-label="ALONG home">
                <Logo />
              </button>
              {wide && (
                <nav className="hidden items-center gap-1 md:flex" aria-label="Navigazione principale">
                  {TABS.map((t) =>
                    t.id === 'create' ? (
                      <button key={t.id} onClick={() => setCreating(true)} className="ml-1 inline-flex h-9 items-center gap-1 rounded-md bg-brand px-3 text-sm font-semibold text-ink">
                        <Plus size={15} /> Crea
                      </button>
                    ) : (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id as Tab)}
                        aria-current={tab === t.id ? 'page' : undefined}
                        className={cn('h-9 rounded-md px-3 text-sm font-medium', tab === t.id ? 'bg-cream/10 text-cream' : 'text-cream/55 hover:text-cream')}
                      >
                        {t.label}
                      </button>
                    ),
                  )}
                </nav>
              )}
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-line px-2.5 py-1 font-display text-sm font-bold tabular-nums text-cream/85" aria-label={`Karma ${state.me.karma}`}>
                  ⚡ {state.me.karma}
                </span>
                {!state.lifetime && (
                  <button onClick={() => setPaywall({ open: true })} className="grid size-9 place-items-center rounded-full border border-line text-brand" aria-label="ALONG Forever">
                    <Sparkles size={15} />
                  </button>
                )}
                <button
                  onClick={() => setTab('profile')}
                  className={cn('rounded-full p-[2px]', state.lifetime || tab === 'profile' ? 'bg-brand' : 'bg-line')}
                  aria-label="Il mio profilo"
                >
                  <span className="block rounded-full bg-ink p-[2px]">
                    <Avatar user={state.me} size={30} />
                  </span>
                </button>
              </div>
            </header>

            {/* content */}
            <main ref={scrollRef} inert={overlayOpen} className="no-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pt-2">
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className={cn('flex min-h-full flex-col', tab === 'explore' ? 'pb-[76px]' : 'pb-24', wide && 'md:pb-8')}>
                  {views[tab]}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* bottom nav */}
            <nav
              inert={overlayOpen}
              className={cn('absolute inset-x-0 bottom-0 z-30 border-t border-line bg-ink px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5', wide && 'md:hidden', !wide && 'md:pb-5')}
              aria-label="Navigazione principale"
            >
              <div className="flex items-center justify-between">
                {TABS.map((t) => {
                  if (t.id === 'create')
                    return (
                      <motion.button
                        key={t.id}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setCreating(true)}
                        className="grid h-11 w-14 place-items-center rounded-md bg-brand text-ink"
                        aria-label="Proponi un piano"
                      >
                        <Plus size={24} strokeWidth={2.8} />
                      </motion.button>
                    )
                  const active = tab === t.id
                  const Icon = t.icon
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id as Tab)}
                      className="relative flex w-16 flex-col items-center gap-0.5 py-1.5"
                      aria-current={active ? 'page' : undefined}
                      aria-label={badgeFor(t.id) > 0 ? `${t.label} (${badgeFor(t.id)} novità)` : t.label}
                    >
                      {active && <motion.span layoutId="nav-dot" className="absolute -top-1.5 h-[3px] w-8 bg-brand" />}
                      <span className="relative">
                        <Icon size={21} className={active ? 'text-cream' : 'text-cream/45'} strokeWidth={active ? 2.4 : 2} />
                        {badgeFor(t.id) > 0 && (
                          <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-ink">{badgeFor(t.id)}</span>
                        )}
                      </span>
                      <span className={cn('font-display text-[10px] font-bold uppercase tracking-wide', active ? 'text-cream' : 'text-cream/40')}>{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </nav>

            {/* toasts */}
            <div className={cn('pointer-events-none absolute inset-x-0 z-[70] flex flex-col items-center gap-2 px-4', !wide ? 'top-14 md:top-20' : 'top-16')} aria-live="polite">
              <AnimatePresence>
                {toasts.map((t) => (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: -16, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className={cn(
                      'glass-strong pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl p-3 shadow-2xl',
                      { lime: 'border-brand/40', coral: 'border-brand/40', violet: 'border-violet/50', cyan: 'border-cyan/40', gold: 'border-gold/50' }[t.tone],
                    )}
                  >
                    <span className={cn('mt-1 size-2.5 shrink-0 rounded-full', { lime: 'bg-brand', coral: 'bg-brand', violet: 'bg-violet', cyan: 'bg-cyan', gold: 'bg-gold' }[t.tone])} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{t.title}</p>
                      {t.body && <p className="text-sm text-cream/60">{t.body}</p>}
                    </div>
                    <button onClick={() => dismissToast(t.id)} aria-label="Chiudi notifica" className="text-cream/40 hover:text-cream">
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* overlays */}
            <AnimatePresence>{chatId && <ChatRoom key={chatId} chatId={chatId} onClose={() => setChatId(null)} />}</AnimatePresence>

            <PlanDetailSheet
              planId={planId}
              onClose={() => setPlanId(null)}
              onJoin={(id) => {
                setPlanId(null)
                setGate({ kind: 'plan', id })
              }}
            />
            <UserSheet userId={userId} onClose={() => setUserId(null)} />
            <GatekeeperSheet
              open={!!gate}
              onClose={() => setGate(null)}
              dilemma={gate?.kind === 'plan' ? gatePlan?.dilemma : gateUser?.dilemma}
              host={gateUser}
              context={gate?.kind === 'plan' ? `“${gatePlan?.title}”` : `una chat con ${gateUser?.name}`}
              onSubmit={(answer) => {
                if (gate!.kind === 'plan') return joinPlan(gate!.id, answer)
                store.likeUser(gate!.id, answer)
                store.toast({ tone: 'coral', title: `Risposta inviata a ${gateUser?.name} 💌`, body: 'Se le/gli piace, è match e le foto si svelano.' })
                return { ok: true, chatId: '' }
              }}
              onGoChat={(id) => (id ? nav.openChat(id) : setGate(null))}
              onManageSlots={() => {
                closeSheets()
                setTab('crew')
              }}
              onUpgrade={() => {
                setGate(null)
                setPaywall({ open: true, reason: 'Espandi a 5 slot chat attivi in contemporanea. Una volta, per sempre.' })
              }}
              slotLimit={limits.slots}
              lifetime={state.lifetime}
            />
            <QuickCreate
              open={creating}
              onClose={() => setCreating(false)}
              onPaywall={(reason) => {
                setCreating(false)
                setPaywall({ open: true, reason })
              }}
              onCreated={() => setTab('plans')}
            />
            <Paywall open={paywall.open} reason={paywall.reason} onClose={() => setPaywall({ open: false })} />
            <SafetySheet
              target={safety}
              onClose={() => setSafety(null)}
              onViewProfile={(id) => {
                setPlanId(null)
                setUserId(id)
              }}
            />
            <MatchOverlay />
            <Onboarding />
          </div>

          {/* tablet/desktop frame switch when side panel hidden */}
          <div className={cn('fixed bottom-4 right-4 z-20 hidden md:block', !wide && 'lg:hidden')}>
            <FrameSwitch frame={frame} setFrame={setFrame} />
          </div>
        </div>
      </NavCtx.Provider>
    </MotionConfig>
  )
}

function Logo({ big }: { big?: boolean }) {
  return (
    <span className={cn('font-display font-extrabold tracking-[-0.05em] text-brand', big ? 'text-3xl' : 'text-2xl')}>along</span>
  )
}

function FrameSwitch({ frame, setFrame }: { frame: 'phone' | 'wide'; setFrame: (f: 'phone' | 'wide') => void }) {
  return (
    <div className="glass inline-flex w-fit rounded-2xl p-1" role="radiogroup" aria-label="Modalità di visualizzazione">
      {(
        [
          ['phone', Smartphone, 'Cornice smartphone'],
          ['wide', Monitor, 'Vista estesa'],
        ] as const
      ).map(([k, Icon, l]) => (
        <button key={k} role="radio" aria-checked={frame === k} onClick={() => setFrame(k)} className={cn('flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold', frame === k ? 'bg-cream text-ink' : 'text-cream/60')}>
          <Icon size={15} /> {l}
        </button>
      ))}
    </div>
  )
}
