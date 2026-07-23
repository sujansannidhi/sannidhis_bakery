import Link from 'next/link'
import { site, serviceArea, telHref } from '@/lib/site'
import styles from './SiteFooter.module.css'

/**
 * Facts that have not been supplied are omitted rather than filled with a
 * plausible-looking placeholder. A wrong phone number on a live site is a real
 * problem; a missing one is only an unfinished one. See CONTENT-TODO.md.
 */
export function SiteFooter() {
  const { contact, hours, fulfilment, leadTime } = site
  const year = 2026

  const area = serviceArea()

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div>
            <div className={styles.brandName}>Sannidhi&rsquo;s Bakery</div>
            <p className={styles.brandNote}>
              {site.kitchenNote} Everything is made to order, one order at a
              time.
            </p>
          </div>

          <div>
            <div className={styles.groupTitle}>Order</div>
            <ul className={styles.list}>
              <li>
                <Link href="/menu">Menu</Link>
              </li>
              <li>
                <Link href="/custom-orders">Start a custom order</Link>
              </li>
              <li>
                <Link href="/contact">Lead times &amp; FAQ</Link>
              </li>
            </ul>
          </div>

          <div>
            <div className={styles.groupTitle}>Visit</div>
            <ul className={styles.list}>
              {/* TODO(owner): city and service area — src/content/site.json → location */}
              <li>
                {area ? (
                  <span>{area}</span>
                ) : (
                  <span className={styles.pending}>Service area to come</span>
                )}
              </li>
              {/* TODO(owner): opening hours — src/content/site.json → hours */}
              <li>
                {hours ? (
                  <span>{hours}</span>
                ) : (
                  <span className={styles.pending}>Hours to come</span>
                )}
              </li>
              <li>
                <span>
                  {fulfilment.pickup && !fulfilment.delivery
                    ? 'Pickup only'
                    : 'Pickup and delivery'}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <div className={styles.groupTitle}>Follow</div>
            <ul className={styles.list}>
              <li>
                <a
                  href={contact.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @{contact.instagram}
                </a>
              </li>
              {/* TODO(owner): phone and email — src/content/site.json → contact */}
              <li>
                {contact.email ? (
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                ) : (
                  <span className={styles.pending}>Email to come</span>
                )}
              </li>
              <li>
                {contact.phone ? (
                  <a href={telHref(contact.phone)}>{contact.phone}</a>
                ) : (
                  <span className={styles.pending}>Phone to come</span>
                )}
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.leadNote}>
          {/* TODO(owner): lead times — src/content/site.json → leadTime */}
          <p>
            {leadTime.summary ??
              'Lead time to come — please ask when you enquire'}
          </p>
          <p>&copy; {year} Sannidhi&rsquo;s Bakery</p>
        </div>

        {/* The owner's way in. Deliberately quiet — it is a staff door, not a
            customer one — and noindex on the admin keeps it out of search. */}
        <p className={styles.adminLink}>
          <Link href="/admin">Admin</Link>
        </p>
      </div>
    </footer>
  )
}
