import type { Metadata } from 'next'
import Link from 'next/link'
import { Photo } from '@/components/Photo'
import { site } from '@/lib/site'
import { byId } from '@/lib/products'
import styles from './about.module.css'


/** The owner's kitchen — a one-off photo, not a product, so its image record is
 *  built here rather than coming from the products collection. */
const KITCHEN_IMAGE = {
  variants: [
    { width: 480, avif: '/img/kitchen-480.avif', webp: '/img/kitchen-480.webp', jpg: '/img/kitchen-480.jpg' },
    { width: 640, avif: '/img/kitchen-640.avif', webp: '/img/kitchen-640.webp', jpg: '/img/kitchen-640.jpg' },
  ],
  width: 640,
  height: 426,
  aspectRatio: 1.502,
  lqip: 'data:image/webp;base64,UklGRkoAAABXRUJQVlA4ID4AAACQAwCdASoUAA0APu1mqk4ppaOiMAgBMB2JZwCsAB48wS+2ux2AAP5T8tPm81urI4F4IALEqC5RcOKdpkXkAA==',
}

export const metadata: Metadata = {
  title: 'About',
  description:
    'A home bakery in Texas making custom cakes, cookies, cake pops and chocolate-covered strawberries to order.',
}

export default async function AboutPage() {
  const makePhoto = await byId('building-block')

  return (
    <>
      <section className="section">
        <div className="container">
          <div className={styles.intro}>
            <h1>About</h1>
            {/* TODO(owner): the whole of this page needs your words. What is here
                now is true but general — it says nothing only you could say.
                See CONTENT-TODO.md items 3 and 4. */}
            <p className={styles.lede}>
              Sannidhi&rsquo;s Bakery is a home bakery. Everything on this site
              is something we have made for someone, mostly for a birthday, a
              baby shower or a celebration at home.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--tall section--shelf">
        <div className="container">
          <div className={styles.split}>
            <Photo
              image={KITCHEN_IMAGE}
              alt="Our home kitchen, where every order is baked."
              sizes="(min-width: 900px) 45vw, 100vw"
            />
            <div className={styles.body}>
              <h2>How we work</h2>
              <p>
                {site.kitchenNote} Cottage food means we bake at home and sell
                directly to you rather than through a shop, so there is no
                storefront to visit — orders are arranged ahead and collected at
                an agreed time.
              </p>

              {site.cottageDisclosure && (
                <p className={styles.disclosure}>{site.cottageDisclosure}</p>
              )}
              {site.story && site.story.trim() ? (
                site.story
                  .trim()
                  .split(/\n\n+/)
                  .map((para, i) => <p key={i}>{para}</p>)
              ) : (
                <>
                  <p>
                    Almost everything is made to order. People usually come to us
                    with a date, a rough idea and often a photo of something they
                    have seen, and we work out together what is possible before
                    anything is agreed. We would rather tell you a design will
                    not work than deliver something that disappoints.
                  </p>
                  <p>
                    We are a family business, and the person who bakes your order
                    is the person who replies to your enquiry.
                  </p>
                </>
              )}

              {site.certification && (
                <p className={styles.credential}>
                  <strong>Food handler certified.</strong> The person baking your
                  order holds a {site.certification.name} certificate from{' '}
                  {site.certification.issuer} (certificate{' '}
                  {site.certification.number}), valid to{' '}
                  {new Date(site.certification.expires).toLocaleDateString(
                    'en-US',
                    { day: 'numeric', month: 'long', year: 'numeric' }
                  )}
                  . {site.certification.accreditation}.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className={styles.split}>
            <div className={styles.body}>
              <h2>What we make</h2>
              <p>
                Cakes are most of what we do — single tier and two tier,
                buttercream and fondant, from plain and elegant to a fondant
                football pitch. Alongside those we make cookies, cake pops, and
                chocolate-covered strawberries by the tray.
              </p>
              <p>
                {/* TODO(owner): dietary options — src/content/site.json → dietary.
                    A lot of custom-cake buyers filter on eggless, nut-free etc.,
                    so this is worth answering properly. */}
                If you have allergies or dietary requirements, tell us when you
                enquire and we will be straight with you about what we can and
                cannot do safely from a home kitchen.
              </p>
              <Link href="/menu" className="btn btn--quiet">
                See everything we have made
              </Link>
            </div>
            <Photo
              image={makePhoto.image}
              alt={makePhoto.alt}
              sizes="(min-width: 900px) 45vw, 100vw"
            />
          </div>
        </div>
      </section>

      <section className={`section ${styles.cta}`}>
        <div className={`container ${styles.ctaInner}`}>
          <h2 className={styles.ctaTitle}>Tell us what you need.</h2>
          <Link href="/custom-orders" className="btn btn--onCurrant">
            Start a custom order
          </Link>
        </div>
      </section>
    </>
  )
}
