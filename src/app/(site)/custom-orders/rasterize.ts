/**
 * Turn the live SVG cake into a PNG the owner can be emailed.
 *
 * The SVG is drawn with inline attributes and no external references — no web
 * font, no <image>, no CSS custom properties in the exported copy — so the
 * canvas never becomes "tainted" and toDataURL is allowed. That is why
 * CakePreview takes a `forExport` flag: it swaps the CSS-variable font for a
 * literal serif stack before this runs.
 */

export async function svgElementToPngDataUrl(
  svg: SVGSVGElement,
  scale = 2
): Promise<string> {
  const serialized = new XMLSerializer().serializeToString(svg)
  const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  try {
    const img = await loadImage(url)
    const vbWidth = svg.viewBox.baseVal.width || img.width || 360
    const vbHeight = svg.viewBox.baseVal.height || img.height || 340

    const canvas = document.createElement('canvas')
    canvas.width = vbWidth * scale
    canvas.height = vbHeight * scale

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is unavailable.')

    // A warm paper ground so the PNG is not transparent in an email client.
    ctx.fillStyle = '#fcfaf6'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not render the cake image.'))
    img.src = src
  })
}
