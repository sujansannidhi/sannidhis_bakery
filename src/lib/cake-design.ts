/**
 * The shape of a customer-designed cake, and the words that describe it.
 *
 * This is the single source of truth used by the designer UI, the preview, the
 * email to the owner and the admin view — so the options a customer can pick,
 * the labels they see, and the sentence the owner reads are all defined once.
 *
 * Deliberately plain data with no React or SVG in it, so it can be imported on
 * the server (email, validation) as freely as in the browser.
 */

export type Diameter = 6 | 8 | 10
export type Tiers = 1 | 2
export type Finish = 'smooth' | 'piped' | 'ganache'
export type WritingPlacement = 'none' | 'top' | 'side'

export type ColourId =
  | 'white'
  | 'blush'
  | 'pink'
  | 'lavender'
  | 'blue'
  | 'mint'
  | 'yellow'
  | 'chocolate'

export type DecorationId =
  | 'goldLeaf'
  | 'macarons'
  | 'spheres'
  | 'flowers'
  | 'fruit'
  | 'sprinkles'
  | 'pearls'
  | 'bear'

export type CakeDesign = {
  diameter: Diameter
  tiers: Tiers
  colour: ColourId
  finish: Finish
  basePiping: boolean
  writing: string
  writingPlacement: WritingPlacement
  decorations: DecorationId[]
}

export const DEFAULT_DESIGN: CakeDesign = {
  diameter: 8,
  tiers: 1,
  colour: 'white',
  finish: 'smooth',
  basePiping: true,
  writing: '',
  writingPlacement: 'none',
  decorations: [],
}

/* ── Option lists (drive the UI and the summary) ──────────────────────────── */

export const DIAMETERS: { value: Diameter; label: string; serves: string }[] = [
  { value: 6, label: '6 inch', serves: 'serves ~8' },
  { value: 8, label: '8 inch', serves: 'serves ~12' },
  { value: 10, label: '10 inch', serves: 'serves ~20' },
]

/**
 * Each colour carries the palette the preview shades with. Kept here rather than
 * in the SVG component so the swatch and the drawing can never drift apart.
 * base = lit top, mid = body, dark = shadowed base, ink = legible writing colour.
 */
export const COLOURS: Record<
  ColourId,
  { label: string; base: string; mid: string; dark: string; ink: string }
> = {
  white: { label: 'White', base: '#fff8ee', mid: '#f4e6cf', dark: '#e2cba6', ink: '#5a3820' },
  blush: { label: 'Blush', base: '#fbe6e6', mid: '#f3cfcf', dark: '#dcaeae', ink: '#7a3b3b' },
  pink: { label: 'Pink', base: '#ffdfe6', mid: '#ffb6c8', dark: '#e88ea6', ink: '#7a1f38' },
  lavender: { label: 'Lavender', base: '#efe8ff', mid: '#cbb8f2', dark: '#a98fdb', ink: '#3a2168' },
  blue: { label: 'Blue', base: '#dcecff', mid: '#a9cdf2', dark: '#78a6da', ink: '#123156' },
  mint: { label: 'Mint', base: '#dcf6e6', mid: '#a9e3c2', dark: '#79c79c', ink: '#0d4a2c' },
  yellow: { label: 'Yellow', base: '#fdf6cf', mid: '#f6e59a', dark: '#e6c657', ink: '#5a4400' },
  chocolate: { label: 'Chocolate', base: '#c98a5a', mid: '#9a5a34', dark: '#6f3c1e', ink: '#fff0e0' },
}

export const FINISHES: { value: Finish; label: string }[] = [
  { value: 'smooth', label: 'Smooth' },
  { value: 'piped', label: 'Vertical piping' },
  { value: 'ganache', label: 'Ganache drip' },
]

export const WRITING_PLACEMENTS: { value: WritingPlacement; label: string }[] = [
  { value: 'none', label: 'No writing' },
  { value: 'top', label: 'On top' },
  { value: 'side', label: 'On the side' },
]

export const DECORATIONS: { value: DecorationId; label: string }[] = [
  { value: 'goldLeaf', label: 'Gold leaf' },
  { value: 'macarons', label: 'Macarons' },
  { value: 'spheres', label: 'Pastel spheres' },
  { value: 'flowers', label: 'Fresh flowers' },
  { value: 'fruit', label: 'Fresh fruit' },
  { value: 'sprinkles', label: 'Sprinkles' },
  { value: 'pearls', label: 'Sugar pearls' },
  { value: 'bear', label: 'Fondant bear' },
]

/* ── Summary ──────────────────────────────────────────────────────────────── */

/** True when the customer has actually engaged with the designer. */
export function isDesigned(design: CakeDesign): boolean {
  return (
    design.tiers !== DEFAULT_DESIGN.tiers ||
    design.colour !== DEFAULT_DESIGN.colour ||
    design.finish !== DEFAULT_DESIGN.finish ||
    design.basePiping !== DEFAULT_DESIGN.basePiping ||
    design.writing.trim() !== '' ||
    design.decorations.length > 0 ||
    design.diameter !== DEFAULT_DESIGN.diameter
  )
}

/**
 * One readable sentence. Goes in the email the owner reads and the admin view,
 * and rides along in the Formspree fallback, so the design is legible even where
 * the picture cannot be shown.
 */
export function summarise(design: CakeDesign): string {
  const parts: string[] = []

  const diameter = DIAMETERS.find((d) => d.value === design.diameter)
  parts.push(`${diameter?.label ?? `${design.diameter} inch`} (${diameter?.serves ?? ''})`.trim())
  parts.push(design.tiers === 2 ? 'two tiers' : 'single tier')
  parts.push(`${COLOURS[design.colour].label.toLowerCase()} icing`)

  if (design.finish === 'ganache') parts.push('ganache drip')
  else if (design.finish === 'piped') parts.push('vertical piping')

  if (design.basePiping) parts.push('piped base border')

  if (design.decorations.length > 0) {
    parts.push(
      design.decorations
        .map((d) => DECORATIONS.find((x) => x.value === d)?.label.toLowerCase())
        .filter(Boolean)
        .join(', ')
    )
  }

  if (design.writing.trim() && design.writingPlacement !== 'none') {
    const where = design.writingPlacement === 'top' ? 'on top' : 'on the side'
    parts.push(`"${design.writing.trim()}" ${where}`)
  }

  return parts.join(' · ')
}
