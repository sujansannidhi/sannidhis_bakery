import type { CSSProperties } from 'react'
import type { Product } from '@/lib/products'

const FORMATS = [
  { type: 'image/avif', ext: 'avif' },
  { type: 'image/webp', ext: 'webp' },
] as const

type Props = {
  product: Product
  /** The `sizes` attribute. Get this right — it is what picks the derivative. */
  sizes: string
  /** True for the hero only. Everything else lazy-loads. */
  priority?: boolean
  className?: string
  /**
   * Where to anchor the image if a fixed ratio is unavoidable. Ignored when the
   * photo renders at its native ratio, which is the default everywhere.
   */
  focal?: string
  /** Force a container ratio. Omit to use the photograph's own. */
  ratio?: number
}

/**
 * A photograph, served from the pre-generated derivative set.
 *
 * Native <picture> rather than next/image: the derivatives already exist, so
 * re-optimising is wasted work, and this ships no JavaScript at all. The LQIP
 * sits behind the image as a background so there is never a blank box, and the
 * wrapper reserves the exact aspect ratio so nothing shifts (CLS).
 */
export function Photo({
  product,
  sizes,
  priority = false,
  className,
  focal,
  ratio,
}: Props) {
  const { image, widths, alt, width, height, lqip, aspectRatio } = product

  const srcSet = (ext: string) =>
    widths.map((w) => `${image}-${w}.${ext} ${w}w`).join(', ')

  // The widest derivative is the <img> fallback, so a browser with no srcset
  // support still gets a real file rather than a broken reference.
  const fallbackWidth = widths[widths.length - 1]

  const style: CSSProperties = {
    aspectRatio: String(ratio ?? aspectRatio),
    backgroundImage: `url("${lqip}")`,
    backgroundSize: 'cover',
    backgroundPosition: focal ?? 'center',
  }

  return (
    <picture className={className} style={style}>
      {FORMATS.map(({ type, ext }) => (
        <source key={ext} type={type} srcSet={srcSet(ext)} sizes={sizes} />
      ))}
      <img
        src={`${image}-${fallbackWidth}.jpg`}
        srcSet={srcSet('jpg')}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: focal ?? 'center',
        }}
      />
    </picture>
  )
}
