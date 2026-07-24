import type { Review } from '@/lib/content'
import styles from './Reviews.module.css'

/**
 * Named reviews. Real attribution under each quote is what makes them read as
 * true rather than invented — so the name is never optional and the component
 * renders nothing at all when there are no reviews, so an empty testimonial
 * section never appears.
 */
export function Reviews({ items }: { items: Review[] }) {
  if (items.length === 0) return null

  return (
    <div className={styles.grid}>
      {items.map((review) => (
        <figure key={review.id} className={styles.review}>
          <blockquote className={styles.quote}>{review.quote}</blockquote>
          <figcaption className={styles.attribution}>
            <span className={styles.name}>{review.name}</span>
            {review.occasion && (
              <span className={styles.occasion}>{review.occasion}</span>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
