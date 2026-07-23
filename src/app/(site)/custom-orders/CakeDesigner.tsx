'use client'

import { useRef } from 'react'
import { CakePreview } from './CakePreview'
import {
  COLOURS,
  DECORATIONS,
  DIAMETERS,
  FINISHES,
  WRITING_PLACEMENTS,
  type CakeDesign,
  type ColourId,
  type DecorationId,
  type Diameter,
  type Finish,
  type Tiers,
  type WritingPlacement,
} from '@/lib/cake-design'
import styles from './designer.module.css'

/**
 * The cake designer.
 *
 * Controlled entirely by the parent form, which owns the CakeDesign so it can
 * read it at submit time. Every control is a real labelled button/input, and the
 * live preview carries an aria-label describing the current design, so the panel
 * is not a black box to a screen reader.
 *
 * A hidden, export-ready copy of the preview sits off-screen; the parent grabs
 * its <svg> at submit time to rasterise. Keeping it in the DOM (rather than
 * building one on the fly) means the exported picture is exactly what the
 * customer seed — same maths, just a system font.
 */
export function CakeDesigner({
  design,
  onChange,
  exportRef,
}: {
  design: CakeDesign
  onChange: (next: CakeDesign) => void
  exportRef: React.RefObject<HTMLDivElement | null>
}) {
  const set = <K extends keyof CakeDesign>(key: K, value: CakeDesign[K]) =>
    onChange({ ...design, [key]: value })

  const toggleDecoration = (id: DecorationId) => {
    const has = design.decorations.includes(id)
    set(
      'decorations',
      has
        ? design.decorations.filter((d) => d !== id)
        : [...design.decorations, id]
    )
  }

  return (
    <div className={styles.designer}>
      <div className={styles.preview}>
        <div className={styles.previewInner}>
          <CakePreview design={design} />
        </div>
        <p className={styles.previewNote}>
          A rough idea — we finalise the details together.
        </p>
      </div>

      <div className={styles.controls}>
        <Group label="Size">
          <div className={styles.buttons}>
            {DIAMETERS.map((d) => (
              <button
                key={d.value}
                type="button"
                className={styles.choice}
                aria-pressed={design.diameter === d.value}
                onClick={() => set('diameter', d.value as Diameter)}
              >
                <span>{d.label}</span>
                <span className={styles.choiceSub}>{d.serves}</span>
              </button>
            ))}
          </div>
        </Group>

        <Group label="Tiers">
          <div className={styles.buttons}>
            {([1, 2] as Tiers[]).map((t) => (
              <button
                key={t}
                type="button"
                className={styles.choice}
                aria-pressed={design.tiers === t}
                onClick={() => set('tiers', t)}
              >
                {t === 1 ? 'Single tier' : 'Two tiers'}
              </button>
            ))}
          </div>
        </Group>

        <Group label="Colour">
          <div className={styles.swatches}>
            {(Object.keys(COLOURS) as ColourId[]).map((id) => (
              <button
                key={id}
                type="button"
                className={styles.swatch}
                aria-pressed={design.colour === id}
                aria-label={COLOURS[id].label}
                title={COLOURS[id].label}
                style={{ background: COLOURS[id].mid }}
                onClick={() => set('colour', id)}
              />
            ))}
          </div>
        </Group>

        <Group label="Finish">
          <div className={styles.buttons}>
            {FINISHES.map((f) => (
              <button
                key={f.value}
                type="button"
                className={styles.choice}
                aria-pressed={design.finish === f.value}
                onClick={() => set('finish', f.value as Finish)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Group>

        <Group label="Base border">
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={design.basePiping}
              onChange={(e) => set('basePiping', e.target.checked)}
            />
            Piped shell border around the bottom
          </label>
        </Group>

        <Group label="Decorations">
          <div className={styles.decorations}>
            {DECORATIONS.map((d) => (
              <label key={d.value} className={styles.decoration}>
                <input
                  type="checkbox"
                  checked={design.decorations.includes(d.value)}
                  onChange={() => toggleDecoration(d.value)}
                />
                {d.label}
              </label>
            ))}
          </div>
        </Group>

        <Group label="Writing">
          <input
            type="text"
            className={styles.text}
            maxLength={30}
            placeholder="e.g. Happy Birthday Sarah"
            value={design.writing}
            onChange={(e) => set('writing', e.target.value)}
            aria-label="Writing on the cake"
          />
          {design.writing.trim() !== '' && (
            <div className={styles.buttons} style={{ marginTop: 'var(--s-8)' }}>
              {WRITING_PLACEMENTS.filter((w) => w.value !== 'none').map((w) => (
                <button
                  key={w.value}
                  type="button"
                  className={styles.choice}
                  aria-pressed={design.writingPlacement === w.value}
                  onClick={() => set('writingPlacement', w.value as WritingPlacement)}
                >
                  {w.label}
                </button>
              ))}
            </div>
          )}
        </Group>
      </div>

      {/* Off-screen, export-ready copy. The parent reads this <svg> at submit
          time. aria-hidden and not focusable — it is a rendering surface, not
          content. */}
      <div ref={exportRef} className={styles.exportSurface} aria-hidden="true">
        <CakePreview design={design} forExport idPrefix="export" />
      </div>
    </div>
  )
}

function Group({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.groupLabel}>{label}</legend>
      {children}
    </fieldset>
  )
}
