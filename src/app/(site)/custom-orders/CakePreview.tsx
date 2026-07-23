import {
  COLOURS,
  summarise,
  type CakeDesign,
  type DecorationId,
} from '@/lib/cake-design'

/**
 * A cake, drawn from a design.
 *
 * Pure and deterministic: the same design always draws the same SVG, which is
 * what lets it be rasterised to a stable PNG for the owner's email. No
 * animation, no library, no randomness — decoration positions come from fixed
 * angle tables so the picture never jitters between renders.
 *
 * The 2.5D look is one trick repeated: every tier is a rectangle with a
 * horizontal gradient (light on the left, shadowed on the right) capped by an
 * ellipse top and bottom. That reads as a lit cylinder without any 3D machinery.
 *
 * `forExport` inlines the font-family as a system serif so a rasterised copy
 * does not depend on a web font having loaded.
 */

const W = 360
const H = 340

export function CakePreview({
  design,
  forExport = false,
  idPrefix = 'cake',
}: {
  design: CakeDesign
  forExport?: boolean
  idPrefix?: string
}) {
  const pal = COLOURS[design.colour]
  const cx = W / 2
  const plateY = H - 30

  // Tier geometry, bottom → top. Two tiers taper; a single tier is taller.
  const tiers =
    design.tiers === 2
      ? [
          { halfW: tierWidth(design.diameter, 1.0), height: 74 },
          { halfW: tierWidth(design.diameter, 0.72), height: 62 },
        ]
      : [{ halfW: tierWidth(design.diameter, 1.0), height: 116 }]

  const eRatio = 0.14
  let baseY = plateY
  const placed = tiers.map((t) => {
    const p = { ...t, botY: baseY, topY: baseY - t.height }
    baseY = p.topY
    return p
  })
  const top = placed[placed.length - 1]

  const gradId = `${idPrefix}-body`
  const dripId = `${idPrefix}-drip`

  const serifStack = forExport
    ? 'Georgia, "Times New Roman", serif'
    : 'var(--display), Georgia, serif'

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Preview: ${summarise(design)}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={pal.base} />
          <stop offset="0.5" stopColor={pal.mid} />
          <stop offset="1" stopColor={pal.dark} />
        </linearGradient>
        <linearGradient id={dripId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6b4a2a" />
          <stop offset="0.5" stopColor="#4a2f16" />
          <stop offset="1" stopColor="#37220f" />
        </linearGradient>
      </defs>

      {/* Plate */}
      <ellipse cx={cx} cy={plateY + 6} rx={148} ry={16} fill="#e7ddcf" />
      <ellipse cx={cx} cy={plateY + 2} rx={148} ry={14} fill="#f3ece0" />

      {placed.map((tier, i) => {
        const ry = Math.round(tier.halfW * eRatio)
        const isTop = i === placed.length - 1
        return (
          <g key={i}>
            {/* Body */}
            <rect
              x={cx - tier.halfW}
              y={tier.topY}
              width={tier.halfW * 2}
              height={tier.height}
              fill={`url(#${gradId})`}
            />
            {/* Base ellipse (front lip) */}
            <ellipse cx={cx} cy={tier.botY} rx={tier.halfW} ry={ry} fill={pal.dark} />
            {/* Vertical piping */}
            {design.finish === 'piped' &&
              pipeLines(cx, tier).map((x, j) => (
                <line
                  key={j}
                  x1={x}
                  y1={tier.topY + ry}
                  x2={x}
                  y2={tier.botY}
                  stroke={pal.base}
                  strokeWidth={2}
                  opacity={0.5}
                />
              ))}
            {/* Ganache drip from this tier's top edge */}
            {design.finish === 'ganache' && (
              <DripRow cx={cx} tier={tier} ry={ry} fill={`url(#${dripId})`} />
            )}
            {/* Top surface */}
            <ellipse cx={cx} cy={tier.topY} rx={tier.halfW} ry={ry} fill={pal.base} />
            {/* Base piping — shell border */}
            {design.basePiping && (
              <ShellBorder cx={cx} y={tier.botY} halfW={tier.halfW} ry={ry} fill={pal.base} />
            )}
            {/* Decorations sit on the top tier's crown and up its side. When a
                ganache band covers the crown, seat them a little lower so they
                are not buried under it. */}
            {isTop &&
              design.decorations.map((d) => (
                <Decoration
                  key={d}
                  id={d}
                  cx={cx}
                  tier={tier}
                  ry={ry}
                  pal={pal}
                  dripOffset={design.finish === 'ganache' ? ry + 8 : 0}
                />
              ))}
          </g>
        )
      })}

      {/* Writing */}
      {design.writing.trim() && design.writingPlacement !== 'none' && (
        <Writing
          design={design}
          cx={cx}
          top={top}
          ry={Math.round(top.halfW * eRatio)}
          hasDrip={design.finish === 'ganache'}
          font={serifStack}
          ink={pal.ink}
        />
      )}
    </svg>
  )
}

/* ── Geometry helpers ─────────────────────────────────────────────────────── */

function tierWidth(diameter: number, factor: number): number {
  // 6/8/10 inch map to visibly different footprints without leaving the frame.
  const base = { 6: 96, 8: 116, 10: 134 }[diameter] ?? 116
  return Math.round(base * factor)
}

function pipeLines(cx: number, tier: { halfW: number }): number[] {
  const out: number[] = []
  const step = 12
  for (let x = cx - tier.halfW + 6; x <= cx + tier.halfW - 6; x += step) out.push(x)
  return out
}

/* ── Sub-marks ────────────────────────────────────────────────────────────── */

function DripRow({
  cx,
  tier,
  ry,
  fill,
}: {
  cx: number
  tier: { halfW: number; topY: number }
  ry: number
  fill: string
}) {
  // Deterministic drip lengths so the picture is identical every render.
  const lens = [16, 26, 12, 30, 18, 24, 14, 28, 20, 22, 15, 27]
  const drips = []
  const count = Math.max(6, Math.floor((tier.halfW * 2) / 22))
  const gap = (tier.halfW * 2 - 16) / (count - 1)
  for (let i = 0; i < count; i++) {
    const x = cx - tier.halfW + 8 + i * gap
    const len = lens[i % lens.length] * (tier.halfW / 120)
    drips.push(
      <ellipse key={i} cx={x} cy={tier.topY + ry + len * 0.4} rx={6} ry={len * 0.5 + 4} fill={fill} />
    )
  }
  // A pooled band across the top edge ties the drips together.
  return (
    <g>
      <rect x={cx - tier.halfW} y={tier.topY} width={tier.halfW * 2} height={ry + 6} fill={fill} />
      {drips}
    </g>
  )
}

function ShellBorder({
  cx,
  y,
  halfW,
  ry,
  fill,
}: {
  cx: number
  y: number
  halfW: number
  ry: number
  fill: string
}) {
  const shells = []
  const count = Math.max(8, Math.floor((halfW * 2) / 14))
  for (let i = 0; i <= count; i++) {
    const t = i / count
    const x = cx - halfW + t * halfW * 2
    // Sit the shells on the front arc of the base ellipse.
    const yy = y + Math.sin(t * Math.PI) * ry * 0.6
    shells.push(<circle key={i} cx={x} cy={yy} r={4} fill={fill} opacity={0.85} />)
  }
  return <g>{shells}</g>
}

function Writing({
  design,
  cx,
  top,
  ry,
  hasDrip,
  font,
  ink,
}: {
  design: CakeDesign
  cx: number
  top: { halfW: number; topY: number; botY: number }
  ry: number
  hasDrip: boolean
  font: string
  ink: string
}) {
  const text = design.writing.trim().slice(0, 30)
  const onTop = design.writingPlacement === 'top'
  // On top, sit just below the crown — and below the ganache band if there is
  // one — rather than on the crown line where the band would cover it.
  const topY = top.topY + (hasDrip ? ry + 22 : ry + 6)
  const y = onTop ? topY : top.topY + (top.botY - top.topY) * 0.5
  const size = text.length > 16 ? 13 : 16
  return (
    <text
      x={cx}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontFamily={font}
      fontSize={size}
      fontStyle="italic"
      fontWeight={600}
      fill={ink}
    >
      {text}
    </text>
  )
}

function Decoration({
  id,
  cx,
  tier,
  ry,
  pal,
  dripOffset = 0,
}: {
  id: DecorationId
  cx: number
  tier: { halfW: number; topY: number; botY: number }
  ry: number
  pal: { base: string; mid: string; dark: string }
  dripOffset?: number
}) {
  const crownY = tier.topY + dripOffset
  // Fixed angle tables — no randomness, so export is stable.
  const angles = [200, 240, 280, 320, 340]

  switch (id) {
    case 'goldLeaf': {
      const flecks = [
        [0.2, 0.3], [0.35, 0.5], [0.28, 0.7], [0.45, 0.4], [0.6, 0.6], [0.7, 0.35],
      ]
      return (
        <g>
          {flecks.map(([fx, fy], i) => (
            <rect
              key={i}
              x={cx - tier.halfW + fx * tier.halfW * 2}
              y={tier.topY + fy * (tier.botY - tier.topY)}
              width={5}
              height={6}
              fill="#c79a3a"
              transform={`rotate(${i * 25} ${cx} ${crownY})`}
              opacity={0.9}
            />
          ))}
        </g>
      )
    }
    case 'macarons': {
      const cols = ['#f3cfcf', '#cbb8f2', '#f6e59a', '#a9e3c2']
      return (
        <g>
          {angles.slice(0, 4).map((deg, i) => {
            const rad = (deg * Math.PI) / 180
            const x = cx + Math.cos(rad) * tier.halfW * 0.82
            const y = crownY + Math.sin(rad) * ry * 0.9 - 2
            return <ellipse key={i} cx={x} cy={y} rx={8} ry={5} fill={cols[i % cols.length]} />
          })}
        </g>
      )
    }
    case 'spheres': {
      const cols = ['#e8c15a', '#f3cfcf', '#a9cdf2', '#ffffff']
      return (
        <g>
          {[0, 40, 80, 300, 330].map((deg, i) => {
            const rad = (deg * Math.PI) / 180
            const x = cx + Math.cos(rad) * tier.halfW * 0.88
            const y = crownY + Math.sin(rad) * ry * 0.9 - 2
            return <circle key={i} cx={x} cy={y} r={6} fill={cols[i % cols.length]} />
          })}
        </g>
      )
    }
    case 'flowers':
      return (
        <g>
          {[cx - tier.halfW * 0.6, cx + tier.halfW * 0.55].map((x, i) => (
            <g key={i}>
              {[0, 72, 144, 216, 288].map((deg) => {
                const rad = (deg * Math.PI) / 180
                return (
                  <ellipse
                    key={deg}
                    cx={x + Math.cos(rad) * 7}
                    cy={crownY + 6 + Math.sin(rad) * 7}
                    rx={5}
                    ry={7}
                    fill="#e88ea6"
                    transform={`rotate(${deg} ${x + Math.cos(rad) * 7} ${crownY + 6 + Math.sin(rad) * 7})`}
                  />
                )
              })}
              <circle cx={x} cy={crownY + 6} r={4} fill="#f6e59a" />
            </g>
          ))}
        </g>
      )
    case 'fruit': {
      const cols = ['#c8324b', '#8fbf3f', '#e8c15a', '#c8324b']
      return (
        <g>
          {angles.map((deg, i) => {
            const rad = (deg * Math.PI) / 180
            const x = cx + Math.cos(rad) * tier.halfW * 0.72
            const y = crownY + Math.sin(rad) * ry * 0.9 - 1
            return <circle key={i} cx={x} cy={y} r={5} fill={cols[i % cols.length]} />
          })}
        </g>
      )
    }
    case 'sprinkles': {
      const cols = ['#e88ea6', '#a9cdf2', '#a9e3c2', '#f6e59a', '#cbb8f2']
      const dots = []
      for (let i = 0; i < 16; i++) {
        const x = cx - tier.halfW + (i / 15) * tier.halfW * 2
        const y = tier.topY + ry + ((i * 37) % 40) * ((tier.botY - tier.topY) / 60)
        dots.push(
          <rect key={i} x={x} y={y} width={4} height={2} fill={cols[i % cols.length]} transform={`rotate(${i * 40} ${x} ${y})`} />
        )
      }
      return <g>{dots}</g>
    }
    case 'pearls':
      return (
        <g>
          {Array.from({ length: 14 }).map((_, i) => {
            const t = i / 13
            const x = cx - tier.halfW + t * tier.halfW * 2
            const y = crownY + Math.sin(t * Math.PI) * ry
            return <circle key={i} cx={x} cy={y} r={2.5} fill="#fff" stroke={pal.dark} strokeWidth={0.5} />
          })}
        </g>
      )
    case 'bear':
      return (
        <g transform={`translate(${cx - tier.halfW * 0.5} ${crownY - 6})`}>
          <circle cx={0} cy={0} r={9} fill="#b98a5a" />
          <circle cx={-7} cy={-8} r={3.5} fill="#b98a5a" />
          <circle cx={7} cy={-8} r={3.5} fill="#b98a5a" />
          <circle cx={-3} cy={-1} r={1} fill="#3a2510" />
          <circle cx={3} cy={-1} r={1} fill="#3a2510" />
          <circle cx={0} cy={3} r={2.5} fill="#8a6540" />
        </g>
      )
    default:
      return null
  }
}
