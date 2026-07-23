import type { CSSProperties } from 'react'
import type { ProductImage } from '@/lib/content'

type Props = {
  image: ProductImage
  alt: string
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
 * A photograph.
 *
 * Native <picture> rather than next/image: the derivatives already exist, so
 * re-optimising is wasted work, and this ships no JavaScript at all. The LQIP
 * sits behind the image as a background so there is never a blank box, and the
 * wrapper reserves the exact aspect ratio so nothing shifts (CLS).
 *
 * Sources are now explicit URLs on the image record rather than built from a
 * filename convention. The original photographs live in public/img and uploaded
 * ones live in Firebase Storage, whose URLs carry access tokens and cannot be
 * derived from a stem — so the record carries them and this component just
 * renders what it is given.
 */
export function Photo({
  image,
  alt,
  sizes,
  priority = false,
  className,
  focal,
  ratio,
}: Props) {
  const variants = [...(image.variants ?? [])].sort((a, b) => a.width - b.width)

  if (variants.length === 0) {
    // A product with no usable image should be visibly absent, not a broken icon.
    return null
  }

  const srcSetFor = (format: 'avif' | 'webp' | 'jpg') => {
    const usable = variants.filter((v) => v[format])
    if (usable.length === 0) return null
    return usable.map((v) => `${v[format]} ${v.width}w`).join(', ')
  }

  const avif = srcSetFor('avif')
  const webp = srcSetFor('webp')
  const jpg = srcSetFor('jpg')
  const widest = variants[variants.length - 1]

  const style: CSSProperties = {
    aspectRatio: String(ratio ?? image.aspectRatio),
    backgroundImage: image.lqip ? `url("${image.lqip}")` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: focal ?? 'center',
  }

  return (
    <picture className={className} style={style}>
      {/*
        For the one priority image per page, tell the browser about it in the
        head rather than letting it wait for the picture element to be parsed.
        React hoists this link. It carries the same srcset and sizes as the
        <source> below, or the browser would preload one file then download
        a different one.
      */}
      {priority && (
        <link
          rel="preload"
          as="image"
          type={avif ? 'image/avif' : 'image/jpeg'}
          // eslint-disable-next-line react/no-unknown-property
          imageSrcSet={avif ?? jpg ?? undefined}
          // eslint-disable-next-line react/no-unknown-property
          imageSizes={sizes}
          fetchPriority="high"
        />
      )}

      {avif && <source type="image/avif" srcSet={avif} sizes={sizes} />}
      {webp && <source type="image/webp" srcSet={webp} sizes={sizes} />}

      <img
        src={widest.jpg}
        srcSet={jpg ?? undefined}
        sizes={sizes}
        alt={alt}
        width={image.width}
        height={image.height}
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
