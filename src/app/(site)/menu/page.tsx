import type { Metadata } from 'next'
import { MenuBrowser } from './MenuBrowser'
import { categories, products } from '@/lib/products'
import { site } from '@/lib/site'
import styles from './menu.module.css'

export const metadata: Metadata = {
  title: 'Menu',
  description:
    'Every cake, cookie, cake pop and chocolate-covered strawberry we have made, grouped by category. Everything is quoted per order.',
}

export default async function MenuPage() {
  const [allProducts, allCategories] = await Promise.all([
    products(),
    categories(),
  ])

  return (
    <section className="section">
      <div className="container">
        <div className={`${styles.intro} ${styles.sectionHead}`}>
          <h1>The menu</h1>
          <p>
            Everything here is something we have actually made. Most orders are
            custom, so treat these as starting points rather than a fixed list —
            if you have seen something you like, send it to us.
          </p>
          {/* TODO(owner): lead time — src/content/site.json → leadTime.summary */}
          <p className={styles.introNote}>
            {site.priceLine} ·{' '}
            {site.leadTime.summary ?? 'Lead time — ask when you enquire'}
          </p>
        </div>

        <MenuBrowser products={allProducts} categories={allCategories} />
      </div>
    </section>
  )
}
