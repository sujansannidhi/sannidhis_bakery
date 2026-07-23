import styles from './CaseCard.module.css'
import site from '@/content/site.json'

const priceLine = site.priceLine

type Props = {
  name: string
  blurb: string
  /** Defaults to the site-wide quotes-only line. Never invent a number here. */
  price?: string
  /** Set when the card sits over a photograph, as it does in the hero. */
  onPhoto?: boolean
  /** Render the name as a heading of this level instead of a plain div. */
  as?: 'h2' | 'h3' | 'h4' | 'div'
  className?: string
}

/**
 * The case card — see CaseCard.module.css for why each rule is what it is.
 */
export function CaseCard({
  name,
  blurb,
  price = priceLine,
  onPhoto = false,
  as: Name = 'div',
  className,
}: Props) {
  return (
    <div
      className={[styles.card, onPhoto && styles['card--onPhoto'], className]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={styles.rule} aria-hidden="true" />
      <Name className={styles.name}>{name}</Name>
      <p className={styles.blurb}>{blurb}</p>
      <span className={styles.price}>{price}</span>
    </div>
  )
}
