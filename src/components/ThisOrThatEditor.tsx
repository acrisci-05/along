import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, PenLine } from 'lucide-react'
import type { ThisOrThat } from '../types'
import { THIS_OR_THAT } from '../data/mock'
import { cn } from '../lib/utils'

const same = (a?: ThisOrThat, b?: ThisOrThat) => !!a && !!b && a.question === b.question && a.a === b.a && a.b === b.b

export const validThisOrThat = (t?: ThisOrThat) => !!t && t.question.trim().length >= 3 && t.a.trim().length >= 1 && t.b.trim().length >= 1

/** Choose your one “Questo o quello”: from a curated list, or write your own. */
export function ThisOrThatEditor({ value, onChange }: { value?: ThisOrThat; onChange: (t: ThisOrThat) => void }) {
  const custom = !!value && !THIS_OR_THAT.some((t) => same(t, value))
  const [mode, setMode] = useState<'list' | 'own'>(custom ? 'own' : 'list')
  const [own, setOwn] = useState<ThisOrThat>(custom && value ? value : { question: '', a: '', b: '' })

  const setOwnField = (k: keyof ThisOrThat, v: string) => {
    const next = { ...own, [k]: v }
    setOwn(next)
    onChange(next)
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1" role="radiogroup" aria-label="Da dove prendi la domanda">
        {(
          [
            ['list', 'Dalla lista'],
            ['own', 'Scrivila tu'],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={mode === k}
            onClick={() => {
              setMode(k)
              if (k === 'own' && validThisOrThat(own)) onChange(own)
            }}
            className={cn('relative h-9 rounded-lg text-sm font-semibold', mode === k ? 'text-ink' : 'text-cream/70')}
          >
            {mode === k && <motion.span layoutId="tot-mode" className="absolute inset-0 rounded-lg bg-cream" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span className="relative">{l}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === 'list' ? (
          <motion.ul key="list" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="mt-3 grid gap-2" role="radiogroup" aria-label="Scegli una domanda">
            {THIS_OR_THAT.map((t) => {
              const on = same(t, value)
              return (
                <li key={t.question}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => onChange(t)}
                    className={cn('flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors', on ? 'border-brand bg-brand/10' : 'border-line bg-surface hover:border-cream/30')}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold">{t.question}</span>
                      <span className="block text-sm text-muted">
                        {t.a} · {t.b}
                      </span>
                    </span>
                    {on && <Check size={18} className="shrink-0 text-brand" />}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        ) : (
          <motion.div key="own" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="mt-3 space-y-3">
            <label className="block">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <PenLine size={14} /> La domanda
              </span>
              <input
                value={own.question}
                onChange={(e) => setOwnField('question', e.target.value)}
                maxLength={80}
                placeholder="Es. Spritz o birra?"
                className="mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base placeholder:text-cream/30 focus:border-brand focus:outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['a', 'b'] as const).map((k, i) => (
                <label key={k} className="block">
                  <span className="text-sm font-semibold">Risposta {i + 1}</span>
                  <input
                    value={own[k]}
                    onChange={(e) => setOwnField(k, e.target.value)}
                    maxLength={30}
                    placeholder={i ? 'Birra' : 'Spritz'}
                    className="mt-1.5 h-12 w-full rounded-xl border border-line bg-surface px-4 text-base placeholder:text-cream/30 focus:border-brand focus:outline-none"
                  />
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
