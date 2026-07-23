import type { Metadata } from 'next'
import { Suspense } from 'react'
import { OrderForm } from './OrderForm'
import { Photo } from '@/components/Photo'
import { site, serviceArea } from '@/lib/site'
import { byId, categories, products } from '@/lib/products'
import styles from './order.module.css'

export const metadata: Metadata = {
  title: 'Start a custom order',
  description:
    'Tell us the date, the occasion and roughly what you would like. We reply with a design and a quote before anything is booked.',
}

/**
 * Three photographs so people can see what they are actually enquiring about.
 *
 * These are the one place on the site with an imposed ratio — a ragged row of
 * three thumbnails in a narrow sidebar reads as broken rather than deliberate.
 * Because the ratio is fixed, each one carries an explicit focal point so the
 * square never crops through the part of the cake that matters.
 */
const PROOF = [
  { id: 'butterfly-two-tier', focal: 'center 30%' },
  { id: 'match-day', focal: 'center 38%' },
  { id: 'ruffle-and-bloom', focal: 'center 42%' },
]

export default async function CustomOrdersPage() {
  const area = serviceArea()
  const proof = await Promise.all(
    PROOF.map(async ({ id, focal }) => ({ product: await byId(id), focal }))
  )
  const [allProducts, allCategories] = await Promise.all([
    products(),
    categories(),
  ])

  return (
    <section className="section">
      <div className="container">
        <div className={styles.sectionHead} style={{ marginBottom: '2.5rem' }}>
          <h1>Start a custom order</h1>
          <p>
            This takes about two minutes. Nothing is booked by sending it — we
            reply with what we can make and what it would cost, and you decide
            from there.
          </p>
        </div>

        <div className={styles.layout}>
          <aside className={styles.aside}>
            <div className={styles.proof}>
              {proof.map(({ product, focal }) => (
                <Photo
                  key={product.id}
                  image={product.image}
                  alt={product.alt}
                  sizes="(min-width: 1000px) 15vw, 30vw"
                  ratio={1}
                  focal={focal}
                />
              ))}
            </div>

            <div className={styles.facts}>
              <div className={styles.fact}>
                <span className={styles.factLabel}>Lead time</span>
                {/* TODO(owner): src/content/site.json → leadTime */}
                {site.leadTime.summary ? (
                  <p className={styles.factValue}>{site.leadTime.summary}</p>
                ) : (
                  <p className={styles.factPending}>
                    To be confirmed — send your date and we will tell you
                    straight away whether it is doable.
                  </p>
                )}
              </div>

              <div className={styles.fact}>
                <span className={styles.factLabel}>Deposit</span>
                {/* TODO(owner): src/content/site.json → deposit */}
                {site.deposit ? (
                  <p className={styles.factValue}>{site.deposit}</p>
                ) : (
                  <p className={styles.factPending}>
                    A deposit reserves your date. We confirm the amount with your
                    quote.
                  </p>
                )}
              </div>

              <div className={styles.fact}>
                <span className={styles.factLabel}>Collection</span>
                <p className={styles.factValue}>
                  {site.fulfilment.note}
                  {area ? ` Pickup in ${area}.` : ''}
                </p>
              </div>

              {site.payment && (
                <div className={styles.fact}>
                  <span className={styles.factLabel}>Payment</span>
                  <p className={styles.factValue}>{site.payment}</p>
                </div>
              )}

              <div className={styles.fact}>
                <span className={styles.factLabel}>Pricing</span>
                <p className={styles.factValue}>
                  Every order is quoted. Prices depend on size, design and how
                  much work the decoration takes.
                </p>
              </div>
            </div>
          </aside>

          <div>
            <Suspense fallback={null}>
              <OrderForm products={allProducts} categories={allCategories} />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  )
}
