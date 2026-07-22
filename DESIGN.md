# Sannidhi's Bakery — design plan

Phase 1 deliverable. Nothing below is built yet; this is for sign-off.

The idea, restated in one line: **a bakery display case, translated to a screen.**
The photos are the show. The UI is the glass and the shelf, and a small printed
card sits in front of every item.

---

## 1. Tokens

Taken from the brief. Three deviations, each justified, each verified with a
contrast calculation rather than by eye.

| Token | Value | Note |
|---|---|---|
| `--paper` | `#FCFAF6` | unchanged — page ground |
| `--shelf` | `#F2EDE6` | unchanged — alternating band, case-card ground |
| `--ink` | `#2A211D` | unchanged — body text |
| `--stone` | **`#6F635C`** | **changed** from `#7C7069` — see below |
| `--currant` | `#6E1F32` | unchanged — brand primary |
| `--currant-deep` | `#501624` | unchanged — hover/pressed |
| `--sugar` | `#F6DDE2` | unchanged — large quiet blocks only, never text |
| `--gold` | `#C08A2E` | unchanged — hairline + focus only, **never text** |
| `--hairline` | `rgba(42,33,29,0.14)` | **added** — `--ink` at 14%, not a new hue |

### Measured contrast

| Pair | Ratio | Verdict |
|---|---|---|
| `--ink` on `--paper` | 15.10 | pass |
| `--currant` on `--paper` | 10.57 | pass |
| `--paper` on `--currant` | 10.57 | pass — the CTA band works |
| `--stone` **as specified** on `--paper` | 4.60 | pass, barely |
| `--stone` **as specified** on `--shelf` | **4.12** | **fails 4.5** |
| `--stone` **at `#6F635C`** on `--paper` | 5.51 | pass |
| `--stone` **at `#6F635C`** on `--shelf` | 4.94 | pass |
| `--gold` on `--paper` | 2.92 | fails everything — text use is banned |

**Why `--stone` moved.** The brief says "verify everything else," and secondary
text on the `--shelf` band is the one place the given value fails. Rather than
ban `--stone` from half the page, it is darkened by roughly 8% luminance. Same
hue, same role, legible on both grounds.

**Why `--hairline` was added.** The case card needs a rule that stays hairline on
retina. `--stone` is too dark for a 1px rule at this scale and reads as a border.
This is `--ink` at 14% alpha — no new hue enters the palette.

**Focus rings.** `--gold` alone measures 2.92 against `--paper`, under the 3:1
that WCAG 2.2 wants for a non-text indicator. So the ring is a **2px `--gold`
outline with a 1px `--ink` outer edge**. Gold stays the visible signal; the ink
edge guarantees the ratio on any ground, including over a photo.

**Type** exactly as the brief specifies — Fraunces (display), Schibsted Grotesk
(body), DM Mono (prices, labels, lead times). Self-hosted woff2, `font-display:
swap`, subset to latin. No Google Fonts hotlink.

Scale: 13 / 15 / 17 / 21 / 27 / 36 / 52 / 76, fluid via `clamp()`. Body 17/1.6,
measure capped at 68ch. Display at 52–76, line-height 1.05, tracking −0.02em.

---

## 2. The case card — exact construction

One element, used everywhere, and the only decorated thing on the site.

It is a **three-line block on `--shelf`, 20px padding, 0 radius, sitting flush to
the left edge of its photo's optical column.** Top to bottom:

1. A **hairline rule** at full card width — 1px `--hairline`, drawn with
   `box-shadow: inset 0 1px` rather than `border-top`, so it renders as one
   device pixel at any DPR instead of resolving to 0.5px and going grey.
2. **Product name**, Fraunces 600 at 21px, `SOFT 80`, `WONK 0`, `--ink`,
   tracking −0.01em. Set at the optical left edge — Fraunces carries a small
   left sidebearing, so the card gets `text-indent: -0.02em` to bring the
   glyph edge flush with the rule above it.
3. **One-line description**, Schibsted Grotesk 400 at 15px, `--stone`,
   line-height 1.45, clamped to two lines.
4. **The mono line**, DM Mono 400 at 13px, uppercase, +0.08em tracking,
   `--stone`. Because pricing is quotes-only, this reads `QUOTED PER ORDER`
   rather than a number. It is the "printed ticket" texture that ties the whole
   idea together.

All four lines share an 8px baseline grid so the card looks typeset rather than
stacked. On hover of the parent product, **the hairline extends from 60% to 100%
width over 400ms** and the photo scales to 1.03 — that is the entire hover state.
No shadow, no lift.

---

## 3. Home — mobile (390px)

```
┌──────────────────────────────┐
│ Sannidhi's        ☰          │ header, transparent over hero
├──────────────────────────────┤
│                              │
│  ██████████████████████████  │
│  ██  bearly-wait  AR 0.66 ██ │ photo full-width, native ratio
│  ██████████████████████████  │
│  ┌─────────────────┐         │
│  │─────────        │         │ case card overlaps photo bottom,
│  │ BEARly Wait     │         │ inset 20px from left
│  │ Two white tiers…│         │
│  │ QUOTED PER ORDER│         │
│  └─────────────────┘         │
│                              │
│  Custom cakes, cookies       │ h1, Fraunces 36→52
│  and cake pops, baked        │
│  to order.                   │
│                              │
│  One line of plain copy      │ 17px
│  about how ordering works.   │
│                              │
│  [ Start a custom order ]    │ currant, 2px radius, 44px tall
│  See the menu →              │ quiet secondary
├──────────────────────────────┤ ← --shelf band, tight padding
│ MADE TO ORDER                │ mono 13, small caps
│ LEAD TIME · TODO             │ three items stacked
│ PICKUP ONLY                  │
├──────────────────────────────┤
│  Cakes                       │
│  ████████████████████        │ each category block:
│  ─────────                   │ photo at native AR, case card under
│  Cakes                       │
│  17 designs · View →         │
│                              │
│  ████████████████████        │ Cookies
│  ████████████████████        │ Cake pops
│  ████████████████████        │ Chocolate-covered strawberries
├──────────────────────────────┤
│  Featured                    │ 6 products, 1-up stack,
│  ████ + case card            │ native ratios, 60ms stagger
├──────────────────────────────┤ ← --shelf
│  How custom orders work      │
│  01  You send us the details │ mono numerals, no icons
│  02  We confirm design + quote│
│  03  Deposit holds the date  │
│  04  Pickup                  │
├──────────────────────────────┤
│  ████ story photo            │
│  About the kitchen, 120–180w │
├──────────────────────────────┤
│ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓            │ photo strip, full-bleed,
│ ← drifts, pauses on hover    │ aria-hidden, static fallback
├──────────────────────────────┤ ← --currant ground
│  Have a date in mind?        │
│  [ Start a custom order ]    │
├──────────────────────────────┤
│  Footer — hours, area,       │
│  phone, email, Instagram,    │
│  lead-time reminder, nav     │
└──────────────────────────────┘
```

## 4. Home — desktop (1440px, 1240 container)

```
┌────────────────────────────────────────────────────────────────────┐
│  Sannidhi's Bakery          Menu  Custom orders  About  Contact    │
│                                                                     │
│   ┌──────────────────────┐   ┌────────────────────────────────┐   │
│   │                      │   │ ████████████████████████████   │   │
│   │ Custom cakes,        │   │ ██                         ██  │   │
│   │ cookies and cake     │   │ ██   bearly-wait           ██  │   │
│   │ pops, baked to       │   │ ██   1228×1852, AR 0.66    ██  │   │
│   │ order.               │   │ ██   tall portrait         ██  │   │
│   │                      │   │ ██                         ██  │   │
│   │ One plain line about │   │ ██                         ██  │   │
│   │ how ordering works.  │   │ ██                         ██  │   │
│   │                      │   │ ██                         ██  │   │
│   │ [Start custom order] │  ┌┴─────────────┐              ██  │   │
│   │ See the menu →       │  │──────        │ case card    ██  │   │
│   │                      │  │ BEARly Wait  │ breaks the   ██  │   │
│   │                      │  │ Two white…   │ photo edge   ██  │   │
│   │                      │  │ QUOTED/ORDER │              ██  │   │
│   └──────────────────────┘  └┬─────────────┘──────────────██  │   │
│         45% col              │   55% col                       │   │
│                              └────────────────────────────────┘   │
│                          ~88vh, never 100vh                        │
├────────────────────────────────────────────────────────────────────┤
│  MADE TO ORDER          LEAD TIME · TODO        PICKUP ONLY        │ --shelf, tight
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                  │
│   │████████│  │████████│  │████████│  │████████│                   │
│   │████████│  │████████│  │████████│  │████████│  4 equal-WIDTH    │
│   │████████│  │████████│  │████████│  └────────┘  columns; heights │
│   │████████│  │████████│  │████████│  ──────      follow each      │
│   └────────┘  └────────┘  └────────┘  Strawberries photo's native  │
│   ──────      ──────      ──────      Dipped to order  ratio, so   │
│   Cakes       Cookies     Cake pops   View →           bottoms are │
│   17 designs  Baked to…   Two ways    (AR 0.99)        ragged.     │
│   View →      View →      View →                                   │
│   (AR 0.83)   (AR 0.81)   (AR 0.79)                                │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│  Featured                                                           │
│   ████████   ██████████████   ███████     justified row: each      │
│   ████████   ██████████████   ███████     photo keeps its native   │
│   ──────     ──────           ──────      ratio, row heights match │
│   name       name             name        by scaling widths        │
├────────────────────────────────────────────────────────────────────┤ --shelf
│  How custom orders work                                             │
│   01 ─────────  02 ─────────  03 ─────────  04 ─────────           │
│   You send us   We confirm    A deposit     Pickup on the          │
│   the details   design+quote  holds it      agreed date            │
├────────────────────────────────────────────────────────────────────┤
│   ┌──────────────┐   In our kitchen                                │
│   │  ██████████  │   120–180 words, plain and specific.            │
│   │  ██████████  │   Home bakery, cottage food.                    │
│   └──────────────┘                                                  │
├────────────────────────────────────────────────────────────────────┤
│ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓  full-bleed, edge to edge  │
├────────────────────────────────────────────────────────────────────┤ --currant
│           Have a date in mind?      [ Start a custom order ]        │
├────────────────────────────────────────────────────────────────────┤
│  Sannidhi's Bakery │ Order      │ Visit       │ Follow             │
│  Lead-time note    │ Menu       │ Service area│ Instagram          │
│                    │ Custom     │ Hours       │ Email              │
└────────────────────────────────────────────────────────────────────┘
```

**Container is broken deliberately twice:** the hero case card crosses the photo
edge, and the photo strip runs full-bleed.

---

## 5. Image manifest

All 21 files cropped, classified by eye, ranked after cropping. `A` = strong
enough to feature or lead. `B` = good in a grid. `C` = grid only, never large.

| ID | Cropped | AR | Category | What it is | Rank | Use |
|---|---|---|---|---|---|---|
| `photo-21` | 1228×1852 | 0.66 | cakes | Two-tier white, pastel spheres, macarons, bear, gold stars | A | **Hero** |
| `photo-19` | 1520×1828 | 0.83 | cakes | Green fondant football pitch, number five | A | Featured |
| `photo-03` | 1486×1798 | 0.83 | cakes | Two-tier white, gold leaf seam, red roses | A | **Cakes category** |
| `photo-05` | 1324×1744 | 0.76 | cakes | Two-tier, butterflies, gold wings, macarons | A | Featured |
| `photo-18` | 1788×1574 | 1.14 | cakes | Combed buttercream, pink blooms, gold fan | A | Featured |
| `photo-01` | 1436×1674 | 0.86 | cakes | Gold leaf, sphere cluster, two fondant bears | A | Featured |
| `photo-16` | 1730×1504 | 1.15 | cakes | Chocolate drip, Oreos, white chocolate | A | Featured |
| `photo-06` | 1476×1652 | 0.89 | cakes | Vertical piped buttercream, strawberries, blossom | A | Featured |
| `photo-14` | 1548×1782 | 0.87 | cakes | Dark ganache pool, chocolate bars, Oreos | A | Story / strip |
| `photo-02` | 1785×1804 | 0.99 | **strawberries** | Two foil trays, chocolate-dipped strawberries | B | **Strawberries category** |
| `photo-08` | 1360×1712 | 0.79 | **cake-pops** | White chocolate, rainbow nonpareils | B | **Cake pops category** |
| `photo-13` | 1717×1707 | 1.01 | **cake-pops** | Cellophane-wrapped, gold ties | B | Featured |
| `photo-17` | 1816×1376 | 1.32 | cakes | Cream, shell border, fruit crown | B | Widest file — photo strip |
| `photo-09` | 1765×1636 | 1.08 | cakes | Pale drip, fruit, chocolate rolls | B | Grid |
| `photo-12` | 1552×1451 | 1.07 | cakes | Overhead fruit ring on cream | B | Grid |
| `photo-20` | 1574×1628 | 0.97 | cakes | Overhead strawberries and blossom | B | Grid — see palette note |
| `photo-15` | 1568×1288 | 1.22 | cakes | Fondant building bricks, figurines | B | Grid |
| `photo-10` | 1814×1436 | 1.26 | cakes | Whipped cream, rosettes, fruit ring | B | Grid |
| `photo-04` | 1388×1768 | 0.79 | cakes | Bare-sided sponge, cream, blueberries | C | Grid only |
| `photo-07` | 1326×1634 | 0.81 | **cookies** | Chocolate chip on a floral plate | C | **Cookies category** ⚠ |
| `photo-11` | 1190×1333 | 0.89 | cakes | Blue ombré, sugar pearls, bear, Oh Baby | C | Grid only |

**Where I disagree with Appendix A.** It recommended cutting `photo-11`. Keeping
it: it is the only baby-blue ombré in the set and nothing else covers that
occasion. Restricted to grid, never above 480px. It is the one file that cannot
reach 1200px, and the pipeline enforces that automatically.

**⚠ The one real weak spot.** `photo-07` is rank C and it is the *only* cookie
photo, so it has to carry a category block at ~280px wide. It will hold at that
size. It cannot go larger. This is the top item in `CONTENT-TODO.md`.

**Palette conflicts confirmed.** `photo-14` and `photo-20` carry deep maroons
close to `--currant`. Neither goes adjacent to the currant CTA band; both get
`--paper` or `--shelf` surroundings.

**Chrome removed.** All 21 cropped. `photo-12`, `photo-13` and `photo-21` had a
browser bookmarks bar with personal bookmark names baked into the top band —
removed. Six more had Instagram carousel arrows and action icons on the **right**
edge, which Appendix A did not measure because it only looked at top and bottom.

### Hero: `photo-21`

- **Tallest portrait in the set at AR 0.66.** The hero photo column is a tall
  portrait container; every other candidate would need cropping to fill it, and
  cropping is banned. This one was shot for that shape.
- **Brightest of the strong files** (luma 207) with a near-white ground, so it
  sits continuously against `--paper` instead of cutting a rectangle into it.
- **No customer name is visible.** `photo-19`, the sharpest colourful file, has a
  child's first name piped across the front, and `photo-15` has another. Neither
  belongs on a homepage hero. Both are still used further down.
- **It shows two-tier custom work**, which is the actual business, rather than a
  single themed cake that narrows the brand on first impression.
- **Trade-off, stated:** at 1228px it is the narrowest of the A-rank files. In a
  682px CSS column that is 1.8× DPR, not 2×. For a photograph with no fine text
  that is invisible; for the sharper-but-shorter alternatives the cost would be a
  destructive crop, which is worse. Original camera files fix this for free.

---

## 6. Motion

- **One choreographed load**, home hero only: wordmark + headline settle, then
  the photo scales 1.04 → 1.0 over 900ms, then the case card fades in last, as if
  placed. Under 1.4s total. Nothing blocks reading.
- **Scroll reveals:** 12px rise + fade, 500ms, `cubic-bezier(0.16,1,0.3,1)`,
  60ms stagger across a row. Headings and images only. Once per element.
- **Product hover:** photo to 1.03 over 400ms; case-card hairline extends to full
  width. Nothing else.
- **Buttons:** 150ms background transition.
- **Header:** transparent over hero, settles to `--paper` + hairline at 80px
  scroll, 250ms. Logo does not shrink.
- `prefers-reduced-motion: reduce` disables all of the above including the load
  sequence, and the photo strip becomes a static justified row.

No parallax, no scroll-jacking, no carousels, no counters.

---

## 7. Stack

Next.js App Router + TypeScript, CSS Modules, no Tailwind, no UI kit, no
animation library. Motion is CSS transitions plus one `IntersectionObserver`.

**Two changes from §5, both from your Phase 0 answers:**

1. **Formspree, not Resend + Route Handler.** This means there is **no
   server-side validation** — Formspree is a client POST. Mitigations: a honeypot
   field, required-field and date validation on the client, and a real success
   state. The submit is isolated behind `src/lib/submit-order.ts` so swapping in
   a route handler later is a one-file change.
2. **The site is fully static as a result**, which helps the LCP and JS budgets.

**Formspree caveat:** file uploads are a paid-plan feature. The inspiration-photo
field is built as optional, with helper text offering Instagram as the
alternative, so it degrades honestly on the free plan.

---

## 8. Self-critique

**Two things here that I would produce for any bakery brief:**

1. **"Warm off-white ground, one deep accent, a serif display face."** That is
   the default move for every artisan food site, and the token set steers
   straight into it. What I changed: the palette is doing *less* than usual, not
   more. There is no secondary accent, no tint ramp, and gold is capped at three
   uses per page and banned from text. The distinguishing element is not the
   colour, it is the case card — a piece of typography with a hairline and a mono
   ticket line that no template ships. I put the precision budget there and
   deliberately starved everything else: one radius value, one rule weight, one
   hover state on the whole site.

2. **"Four category blocks in a row."** A four-up of equal squares is the single
   most generic layout in this genre, and it is also what the source photos
   physically cannot do — 16 aspect ratios across 21 files means any uniform grid
   is a destructive crop. What I changed: the columns are equal in **width only**.
   Each block's height is `width ÷ its own aspect ratio`, so the four bottom edges
   land at four different heights and the case cards sit on a ragged baseline.
   That is not an accident to be tidied up later; it is the layout admitting what
   the photographs are. The same rule governs Featured and the photo strip — the
   images' native ratios are the input, never an imposed frame.

**The thing I am least sure about:** the cookies category block resting on a
rank-C photo. It works at 280px. It would not survive being featured, and if you
send one good cookie photo it becomes the easiest upgrade on the site.

---

## 9. Still needed from you

Not blocking — I will build with visible `TODO(owner)` markers and list every one
in `CONTENT-TODO.md`. But these are the facts I cannot invent:

| | |
|---|---|
| Owner / baker name | and whether she wants to be named on the About page |
| City + state | service area for the footer and `Bakery` JSON-LD |
| Lead time | e.g. 7 days cakes, 3 days cookies — used in the promise band and the form's date warning |
| Phone / email | footer, contact page, JSON-LD |
| Delivery | current site says pickup only — still true? |
| Dietary | eggless? nut-free? — custom-cake buyers filter on this |
| Domain | for canonical URLs, sitemap, OG tags |
| Reviews | real ones only. Without them the component ships commented out |
| Hours | contact page and JSON-LD |
| Servings guide | sizes → number of servings, if you have the numbers |

Confirmed already: Instagram `@sannidhis_bakerytx`, home bakery (cottage food),
pickup only, quotes not prices, Formspree `mykbnddq`.
