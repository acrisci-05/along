export const PHOTO_MIN = 2
export const PHOTO_MAX = 6
export const OUT_W = 720
export const OUT_H = 900

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('bad image'))
    }
    img.src = url
  })
}

/** Renders the visible 4:5 window of the image (in source pixels) into a compact JPEG. */
export function cropToDataUrl(img: HTMLImageElement, sx: number, sy: number, sw: number, sh: number): string {
  const c = document.createElement('canvas')
  c.width = OUT_W
  c.height = OUT_H
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H)
  return c.toDataURL('image/jpeg', 0.78)
}

export function mainPhoto(u: { photos?: string[] }) {
  return u.photos?.[0]
}
