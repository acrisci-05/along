import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { ImagePlus, Star, X } from 'lucide-react'
import { cropToDataUrl, loadImage, PHOTO_MAX, PHOTO_MIN } from '../lib/photos'
import { cn } from '../lib/utils'
import { Button, Sheet } from './ui'

const FRAME_W = 280
const FRAME_H = 350

/** 4:5 cropper: drag to position, slider to zoom. */
export function Cropper({ file, onCancel, onDone }: { file: File | null; onCancel: () => void; onDone: (dataUrl: string) => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null)

  useEffect(() => {
    setImg(null)
    setError('')
    setZoom(1)
    if (!file) return
    loadImage(file)
      .then((i) => {
        setImg(i)
        const base = Math.max(FRAME_W / i.width, FRAME_H / i.height)
        setPos({ x: (FRAME_W - i.width * base) / 2, y: (FRAME_H - i.height * base) / 2 })
      })
      .catch(() => setError('Non riesco a leggere questa immagine. Prova con un’altra.'))
  }, [file])

  const base = img ? Math.max(FRAME_W / img.width, FRAME_H / img.height) : 1
  const scale = base * zoom
  const dw = img ? img.width * scale : 0
  const dh = img ? img.height * scale : 0
  const clamp = (x: number, y: number) => ({ x: Math.min(0, Math.max(FRAME_W - dw, x)), y: Math.min(0, Math.max(FRAME_H - dh, y)) })

  // keep the image covering the frame when zoom changes (zoom around centre)
  const setZoomCentered = (z: number) => {
    if (!img) return
    const cx = (FRAME_W / 2 - pos.x) / scale
    const cy = (FRAME_H / 2 - pos.y) / scale
    const ns = base * z
    const nw = img.width * ns
    const nh = img.height * ns
    setZoom(z)
    setPos({ x: Math.min(0, Math.max(FRAME_W - nw, FRAME_W / 2 - cx * ns)), y: Math.min(0, Math.max(FRAME_H - nh, FRAME_H / 2 - cy * ns)) })
  }

  const onDown = (e: RPointerEvent) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y }
  }
  const onMove = (e: RPointerEvent) => {
    if (!drag.current) return
    setPos(clamp(drag.current.x + e.clientX - drag.current.px, drag.current.y + e.clientY - drag.current.py))
  }
  const onUp = () => (drag.current = null)

  const confirm = () => {
    if (!img) return
    onDone(cropToDataUrl(img, -pos.x / scale, -pos.y / scale, FRAME_W / scale, FRAME_H / scale))
  }

  const host = typeof document !== 'undefined' ? document.getElementById('phone-root') : null
  const sheet = (
    <Sheet open={!!file} onClose={onCancel} title="Ritaglia la foto">
      {error ? (
        <p className="text-sm text-alarm">{error}</p>
      ) : (
        <div className="flex flex-col items-center">
          <p className="self-start text-sm text-muted">Trascina per centrare, usa il cursore per ingrandire.</p>
          <div
            className="relative mt-3 touch-none select-none overflow-hidden rounded-2xl bg-surface"
            style={{ width: FRAME_W, height: FRAME_H }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            role="img"
            aria-label="Anteprima del ritaglio"
          >
            {img && <img src={img.src} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ left: pos.x, top: pos.y, width: dw, height: dh }} />}
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-cream/30" />
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className="border border-cream/10" />
              ))}
            </div>
          </div>
          <label className="mt-4 flex w-full items-center gap-3 text-sm text-muted">
            Zoom
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoomCentered(Number(e.target.value))} className="flex-1" aria-label="Zoom" />
          </label>
          <div className="mt-5 grid w-full grid-cols-2 gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Annulla
            </Button>
            <Button onClick={confirm} disabled={!img}>
              Usa foto
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
  // above the onboarding overlay (z-90) and every other sheet
  return host ? createPortal(<div className="pointer-events-none absolute inset-0 z-[95] [&>*]:pointer-events-auto">{sheet}</div>, host) : sheet
}

/** 3×2 photo grid: add (with crop), remove, drag or arrow keys to reorder. First photo = main. */
export function PhotoGallery({ photos, onChange, compact }: { photos: string[]; onChange: (p: string[]) => void; compact?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const tiles = useRef<Array<HTMLDivElement | null>>([])
  const start = useRef<{ x: number; y: number; idx: number; moved: boolean } | null>(null)

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= photos.length) return
    const next = [...photos]
    const [it] = next.splice(from, 1)
    next.splice(to, 0, it)
    onChange(next)
  }

  const indexAt = (x: number, y: number) =>
    tiles.current.findIndex((el, i) => {
      if (!el || i >= photos.length) return false
      const r = el.getBoundingClientRect()
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    })

  const onDown = (e: RPointerEvent, idx: number) => {
    if ((e.target as HTMLElement).closest('button')) return
    start.current = { x: e.clientX, y: e.clientY, idx, moved: false }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: RPointerEvent) => {
    const s = start.current
    if (!s) return
    if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6) {
      s.moved = true
      setDragIdx(s.idx)
    }
    if (s.moved) {
      const i = indexAt(e.clientX, e.clientY)
      setOverIdx(i >= 0 ? i : null)
    }
  }
  const onUp = () => {
    const s = start.current
    if (s?.moved && overIdx !== null) move(s.idx, overIdx)
    start.current = null
    setDragIdx(null)
    setOverIdx(null)
  }

  const canRemove = photos.length !== PHOTO_MIN
  const slots = Array.from({ length: PHOTO_MAX })

  return (
    <div>
      <div className={cn('grid grid-cols-3', compact ? 'gap-2' : 'gap-2.5')} role="list" aria-label="Le tue foto">
        {slots.map((_, i) => {
          const src = photos[i]
          if (!src)
            return (
              <button
                key={`empty-${i}`}
                ref={(el) => {
                  tiles.current[i] = el as unknown as HTMLDivElement
                }}
                onClick={() => fileRef.current?.click()}
                disabled={i !== photos.length}
                className="grid aspect-[4/5] place-items-center rounded-xl border border-dashed border-line text-muted enabled:hover:border-cream/40 enabled:hover:text-cream disabled:opacity-40"
                aria-label={i === photos.length ? 'Aggiungi una foto' : 'Spazio vuoto'}
              >
                <ImagePlus size={22} />
              </button>
            )
          return (
            <motion.div
              key={src.slice(-24) + i}
              layout
              ref={(el) => {
                tiles.current[i] = el
              }}
              role="listitem"
              tabIndex={0}
              aria-label={`Foto ${i + 1}${i === 0 ? ', principale' : ''}. Usa le frecce per spostarla.`}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(i, i - 1)
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(i, i + 1)
              }}
              onPointerDown={(e) => onDown(e, i)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              className={cn(
                'relative aspect-[4/5] touch-none select-none overflow-hidden rounded-xl bg-surface',
                dragIdx === i && 'opacity-50',
                overIdx === i && dragIdx !== i && 'ring-2 ring-brand',
              )}
            >
              <img src={src} alt="" draggable={false} className="pointer-events-none h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md bg-ink/75 px-1.5 py-0.5 text-[10px] font-bold">
                  <Star size={10} fill="currentColor" /> Principale
                </span>
              )}
              <button
                onClick={() => canRemove && onChange(photos.filter((_, k) => k !== i))}
                disabled={!canRemove}
                title={canRemove ? 'Rimuovi' : `Servono almeno ${PHOTO_MIN} foto`}
                className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-ink/75 disabled:opacity-40"
                aria-label={canRemove ? `Rimuovi foto ${i + 1}` : `Non puoi rimuovere: servono almeno ${PHOTO_MIN} foto`}
              >
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Aggiungi una foto"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) setFile(f)
          e.target.value = ''
        }}
      />
      <p className="mt-2.5 text-xs leading-relaxed text-muted">
        <span className="font-semibold text-cream/80">La principale:</span> solo tu, volto visibile, luce naturale. <span className="font-semibold text-cream/80">Le altre:</span> cosa ti piace fare. Niente foto di gruppo come principale. Trascina per riordinare.
      </p>
      <Cropper
        file={file}
        onCancel={() => setFile(null)}
        onDone={(url) => {
          onChange([...photos, url].slice(0, PHOTO_MAX))
          setFile(null)
        }}
      />
    </div>
  )
}
