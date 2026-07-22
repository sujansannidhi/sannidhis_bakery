'use client'

import { useState } from 'react'
import { site } from '@/lib/site'
import styles from './contact.module.css'

/**
 * A native <details>/<summary> accordion would be simpler, but it cannot animate
 * and gives no control over the marker. This is a button + region pair, which is
 * the pattern screen readers handle best, and it is keyboard operable by default
 * because the trigger is a real button.
 *
 * Every answer here is either a fact supplied by the owner or an honest "we will
 * tell you when you ask". None of them invents a policy.
 */
const ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'How far in advance should I order?',
    a: site.leadTime.summary ? (
      <p>{site.leadTime.summary}</p>
    ) : (
      <p>
        {/* TODO(owner): src/content/site.json → leadTime.summary and minDays */}
        As early as you can. Custom cakes take planning and we only take on what
        we can do properly, so popular weekends fill up. Send your date and we
        will tell you straight away whether we can fit it in.
      </p>
    ),
  },
  {
    q: 'How much will it cost?',
    a: (
      <p>
        Everything is quoted per order. Price depends on size, how many people it
        needs to feed, and how much work the decoration takes — a two-tier cake
        with hand-placed detail is a different job from a single tier with a
        smooth finish. Tell us your budget and we will tell you what is possible
        within it.
      </p>
    ),
  },
  {
    q: 'Do you take a deposit?',
    a: site.deposit ? (
      <p>{site.deposit}</p>
    ) : (
      <p>
        {/* TODO(owner): src/content/site.json → deposit */}
        Yes — a deposit is what reserves your date. We confirm the amount when we
        send your quote, so you know it before you commit to anything.
      </p>
    ),
  },
  {
    q: 'Can I cancel or change my order?',
    a: (
      <p>
        {/* TODO(owner): cancellation terms. This is deliberately vague because
            no policy has been supplied, and a wrong policy on a live site is
            worse than an incomplete one. See CONTENT-TODO.md item 5. */}
        Get in touch as early as you can and we will work it out with you.
        Changes to a design are usually fine well ahead of the date; closer in,
        it depends on what has already been bought and started.
      </p>
    ),
  },
  {
    q: 'Do you deliver?',
    a: <p>{site.fulfilment.note}</p>,
  },
  {
    q: 'Can you make something eggless, vegan or nut-free?',
    a:
      site.dietary.length > 0 ? (
        <p>We can make: {site.dietary.join(', ')}.</p>
      ) : (
        <p>
          {/* TODO(owner): src/content/site.json → dietary. This is one of the
              most common filters for custom-cake buyers and is worth a real
              answer. */}
          Ask us when you enquire. We bake in a home kitchen, so we will be
          straight with you about what we can make safely rather than promising
          something we cannot guarantee.
        </p>
      ),
  },
  {
    q: 'What size do I need?',
    a: (
      <p>
        Tell us how many people you are feeding and we will suggest a size.
        Serving numbers depend on how the cake is cut, so a rough headcount is
        more useful than a size in inches.
      </p>
    ),
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className={styles.faq}>
      {ITEMS.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={item.q} className={styles.faqItem}>
            <h3 className={styles.faqHeading}>
              <button
                type="button"
                className={styles.faqTrigger}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                id={`faq-trigger-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span>{item.q}</span>
                <span className={styles.faqMarker} aria-hidden="true">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
            </h3>
            <div
              id={`faq-panel-${i}`}
              role="region"
              aria-labelledby={`faq-trigger-${i}`}
              className={styles.faqPanel}
              hidden={!isOpen}
            >
              {item.a}
            </div>
          </div>
        )
      })}
    </div>
  )
}
