import type { Metadata } from 'next'
import Link from 'next/link'
import { site, serviceArea, telHref } from '@/lib/site'
import { Faq } from './Faq'
import styles from './contact.module.css'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'How to reach Sannidhi’s Bakery, what we need to know when you enquire, and answers to the questions we get asked most.',
}

export default function ContactPage() {
  const area = serviceArea()

  return (
    <section className="section">
      <div className="container">
        <div className={styles.head}>
          <h1>Contact</h1>
          <p>
            The fastest way to reach us about an order is the custom order form —
            it asks for everything we need to give you a real answer. For
            anything else, use whichever of these suits you.
          </p>
        </div>

        <div className={styles.layout}>
          <div className={styles.details}>
            <div className={styles.detail}>
              <span className={styles.detailLabel}>Instagram</span>
              <a
                href={site.contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                @{site.contact.instagram}
              </a>
            </div>

            {/* TODO(owner): email, phone, hours and service area all live in
                src/content/site.json. Anything not supplied is shown as
                outstanding rather than filled with a placeholder. */}
            <div className={styles.detail}>
              <span className={styles.detailLabel}>Email</span>
              {site.contact.email ? (
                <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
              ) : (
                <span className={styles.pending}>Not published yet</span>
              )}
            </div>

            <div className={styles.detail}>
              <span className={styles.detailLabel}>Phone</span>
              {site.contact.phone ? (
                <a href={telHref(site.contact.phone)}>{site.contact.phone}</a>
              ) : (
                <span className={styles.pending}>Not published yet</span>
              )}
            </div>

            <div className={styles.detail}>
              <span className={styles.detailLabel}>Hours</span>
              {site.hours ? (
                <span>{site.hours}</span>
              ) : (
                <span className={styles.pending}>Not published yet</span>
              )}
            </div>

            <div className={styles.detail}>
              <span className={styles.detailLabel}>Service area</span>
              {area ? (
                <span>{area}</span>
              ) : (
                <span className={styles.pending}>Not published yet</span>
              )}
            </div>

            <div className={styles.detail}>
              <span className={styles.detailLabel}>Collection</span>
              <span>{site.fulfilment.note}</span>
            </div>

            <Link href="/custom-orders" className={`btn ${styles.cta}`}>
              Start a custom order
            </Link>
          </div>

          <div className={styles.faqWrap}>
            <h2 className={styles.faqTitle}>Questions we get asked</h2>
            <Faq />
          </div>
        </div>

        {/*
          A servings guide belongs here and is genuinely useful — size against
          number of people. It is not built with invented numbers. Add the real
          figures to src/content/site.json → servingsGuide and render them here.
          See CONTENT-TODO.md item 6.
        */}
        {site.servingsGuide.length > 0 && (
          <div className={styles.servings}>
            <h2>Sizes and servings</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Size</th>
                  <th scope="col">Serves</th>
                </tr>
              </thead>
              <tbody>
                {site.servingsGuide.map((row) => (
                  <tr key={row.size}>
                    <th scope="row">{row.size}</th>
                    <td>{row.servings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
