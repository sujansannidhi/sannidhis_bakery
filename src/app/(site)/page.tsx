import Link from 'next/link'
import styles from './page.module.css'
import { site } from '@/lib/site'
import { Photo } from '@/components/Photo'
import { CaseCard } from '@/components/CaseCard'
import { Reveal } from '@/components/Reveal'
import { Reviews } from '@/components/Reviews'
import { getReviews } from '@/lib/content'
import {
  byCategory,
  byId,
  byIdOrNull,
  categories,
  featured,
} from '@/lib/products'

/**
 * The photo strip. Chosen for variety of subject and ratio rather than rank —
 * it reads as a feed, so a run of near-identical cakes would flatten it.
 *
 * Resolved with byIdOrNull because products are editable now: the owner can
 * delete one, and a strip with a gap in it is better than a page that throws.
 */
const STRIP_IDS = [
  'match-day',
  'sprinkle-cake-pops',
  'ruffle-and-bloom',
  'chocolate-strawberries',
  'fresh-fruit-cream',
  'butterfly-two-tier',
  'wrapped-cake-pops',
  'building-block',
]

export default async function HomePage() {
  const hero = await byId('red-rose-two-tier')
  const allCategories = await categories()
  const strip = (await Promise.all(STRIP_IDS.map(byIdOrNull))).filter(
    (p) => p !== null
  )

  // A photograph gets one job on this page. Anything already carrying the hero
  // or a category block is excluded, so Featured can never repeat it.
  const spokenFor = new Set([hero.id, ...allCategories.map((c) => c.cover)])
  const featuredProducts = (await featured())
    .filter((p) => !spokenFor.has(p.id))
    .slice(0, 6)

  // Resolved up front so the JSX below stays declarative rather than awaiting
  // inside a map.
  const storyPhoto = await byId('ruffle-and-bloom')
  const reviews = await getReviews()

  const categoryBlocks = await Promise.all(
    allCategories.map(async (category) => ({
      category,
      cover: category.cover ? await byIdOrNull(category.cover) : null,
      count: (await byCategory(category.id)).length,
    }))
  )

  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className={`container ${styles.hero}`}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              Custom cakes, baked one order at a time.
            </h1>
            <p className={styles.heroLede}>
              Cakes, cookies, cake pops and chocolate-covered strawberries, made
              to order from our home kitchen. Tell us the date and the occasion
              and we&rsquo;ll quote you.
            </p>
            <div className={styles.heroActions}>
              <Link href="/custom-orders" className="btn">
                Start a custom order
              </Link>
              <Link href="/menu" className="btn btn--quiet">
                See the menu
              </Link>
            </div>
          </div>

          <figure className={styles.heroFigure}>
            {/* The card anchors to the photograph, not to the column, so it
                breaks the photo's left edge by a fixed amount at any width. */}
            <div className={styles.heroPhotoWrap}>
              <Photo
                image={hero.image}
                alt={hero.alt}
                className={styles.heroPhoto}
                sizes="(min-width: 900px) 46vw, 100vw"
                priority
              />
              <CaseCard
                name={hero.name}
                blurb={hero.blurb}
                onPhoto
                className={styles.heroCard}
              />
            </div>
          </figure>
        </div>
      </section>

      {/* ── Promise band ────────────────────────────────────────────────── */}
      <section className="section section--tight section--shelf">
        <div className="container">
          <h2 className="visually-hidden">What to expect</h2>
          <div className={styles.promise}>
            <p className={styles.promiseItem}>Everything made to order</p>
            {/* TODO(owner): lead time — src/content/site.json → leadTime.summary */}
            <p className={styles.promiseItem}>
              {site.leadTime.summary ?? 'Lead time — ask when you enquire'}
            </p>
            {/* TODO(owner): service area — src/content/site.json → location */}
            <p className={styles.promiseItem}>
              {site.location.serviceArea
                ? `Pickup in ${site.location.serviceArea}`
                : 'Pickup only'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Categories ──────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <Reveal as="div" className={styles.sectionHead}>
            <h2>What we make</h2>
          </Reveal>

          <div className={styles.categories}>
            {categoryBlocks.map(({ category, cover, count }, i) => (
              <Reveal key={category.id} delay={i * 60}>
                <Link
                  href={`/menu#${category.id}`}
                  className={`product ${styles.category}`}
                >
                  {cover && (
                    <Photo
                      image={cover.image}
                      alt={cover.alt}
                      className={styles.categoryPhoto}
                      sizes="(min-width: 1000px) 25vw, (min-width: 560px) 50vw, 100vw"
                    />
                  )}
                  <CaseCard
                    as="h3"
                    name={category.name}
                    blurb={category.line}
                    price={`${count} ${count === 1 ? 'design' : 'designs'} · View`}
                  />
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured ────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <Reveal as="div" className={styles.sectionHead}>
            <h2>Recently out of the kitchen</h2>
          </Reveal>

          <div className={styles.featured}>
            {featuredProducts.map((product, i) => (
              <Reveal key={product.id} delay={(i % 3) * 60}>
                <article className={`product ${styles.product}`}>
                  <Photo
                    image={product.image}
                    alt={product.alt}
                    className={styles.productPhoto}
                    sizes="(min-width: 1000px) 33vw, (min-width: 560px) 50vw, 100vw"
                  />
                  <CaseCard as="h3" name={product.name} blurb={product.blurb} />
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How custom orders work ──────────────────────────────────────── */}
      <section className="section section--shelf">
        <div className="container">
          <Reveal as="div" className={styles.sectionHead}>
            <h2>How a custom order works</h2>
          </Reveal>

          <ol className={styles.steps}>
            {site.orderSteps.map((step) => (
              <li key={step.n} className={styles.step}>
                <span className={styles.stepNumber}>{step.n}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Story ───────────────────────────────────────────────────────── */}
      <section className="section section--tall">
        <div className="container">
          <div className={styles.story}>
            <Reveal>
              <Photo
                image={storyPhoto.image}
                alt={storyPhoto.alt}
                sizes="(min-width: 900px) 45vw, 100vw"
              />
            </Reveal>
            <div className={styles.storyBody}>
              <h2>In our kitchen</h2>
              {/* TODO(owner): this is the one section that most needs your words.
                  Who bakes, how long, what you like making. 120–180 words.
                  See CONTENT-TODO.md item 3. */}
              <p>
                Sannidhi&rsquo;s Bakery is a home bakery. We work as a Texas
                cottage food operation, which means everything is baked in our
                own kitchen and sold directly to you.
              </p>
              <p>
                Most of what we make is custom. Someone sends us a date, an
                occasion and usually a photo of something they liked, and we
                work out what we can make and what it will cost before anything
                is agreed. The cakes on this site are all ones we have actually
                made.
              </p>
              <Link href="/about" className="btn btn--quiet">
                More about how we work
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reviews ─────────────────────────────────────────────────────── */}
      {/* Renders only when real reviews exist; managed in Admin → Reviews. */}
      {reviews.length > 0 && (
        <section className="section section--shelf">
          <div className="container">
            <Reveal as="div" className={styles.sectionHead}>
              <h2>What people say</h2>
            </Reveal>
            <Reviews items={reviews} />
          </div>
        </section>
      )}

      {/* ── Photo strip ─────────────────────────────────────────────────── */}
      <section className={styles.strip} aria-label="Photographs of recent orders">
        {/* The marquee is decorative duplication; every one of these photographs
            also appears with its own alt text on the menu. */}
        <div className={styles.stripTrack} aria-hidden="true">
          {[...strip, ...strip].map((product, i) => (
            <div key={`${product.id}-${i}`} className={styles.stripItem}>
              <Photo
                image={product.image}
                alt={product.alt}
                sizes="(min-width: 768px) 320px, 220px"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA band ────────────────────────────────────────────────────── */}
      <section className={`section ${styles.cta}`}>
        <div className={`container ${styles.ctaInner}`}>
          <h2 className={styles.ctaTitle}>Have a date in mind?</h2>
          <Link href="/custom-orders" className="btn btn--onCurrant">
            Start a custom order
          </Link>
        </div>
      </section>
    </>
  )
}
