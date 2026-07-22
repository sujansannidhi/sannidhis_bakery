# Content still needed

Everything on the site is either true or visibly marked as missing. Nothing has
been invented — no flavours, no prices, no reviews, no lead times, no awards.
Where a fact was not supplied, the page says so plainly ("Hours to come") rather
than showing a plausible-looking placeholder, because a wrong phone number on a
live site is a real problem and a missing one is only an unfinished one.

Items are in order of how much they improve the site.

---

## 1. The original photos off the phone — highest leverage on the whole site

**This is the single biggest upgrade available, and it costs nothing.**

The 21 files supplied are Instagram screenshots, not photographs. They were
cropped out of the app in a 51-second burst, which means:

- They top out at **1190–1916px wide** before cropping, and 1178–1811px after
  the app chrome is removed. A real phone camera file is 3000–4000px.
- They have been through Instagram's compression **twice** — once on upload, once
  on screenshot. Fine detail in the buttercream is already gone.
- **14 of 21 had app chrome baked in**, including three with a browser bookmarks
  bar showing personal bookmark names. All removed, but removing it cost real
  picture area.
- Two photos (`photo-11`, `bearly-wait`/`photo-21`) are now too small to display
  above 768px, which is why neither leads a page.

**What to do:** find the originals in the phone's camera roll and drop them into
`assets/bakery-photos/`, keeping the same `photo-NN.png` names. Then run:

```
npm run images:crop && npm run images:build && npm run check:images
```

No code changes. Every derivative, aspect ratio and blur placeholder is
recalculated automatically, and the site immediately serves sharper images at
every size.

## 2. One good cookie photo, and more of the small categories

The category blocks are the weak spot, and it is purely a supply problem:

| Category | Photos | Problem |
|---|---|---|
| Cakes | 17 | fine |
| Cake pops | 2 | thin but workable |
| **Cookies** | **1** | the block rests on the softest file in the whole set |
| **Chocolate-covered strawberries** | **1** | a functional shot, not a nice one |

`photo-07` (the chocolate chip cookies) holds at the ~280px the category block
uses and cannot go any larger. One decent cookie photo — daylight, plain surface,
shot straight off the phone rather than screenshotted — is the cheapest visible
improvement to the site after item 1.

Also worth knowing: **your old site advertised cupcakes, and there is no cupcake
photo in the folder.** Cupcakes are not currently offered anywhere on the new
site. If you sell them, send a photo and they can be added as a fifth category.

## 3. The story, in your own words — `src/app/page.tsx` and `src/app/about/page.tsx`

Home → "In our kitchen", and the whole of the About page.

What is written there now is true but generic — it says nothing that only you
could say. This is the section that makes a site feel like it belongs to one
bakery and no other, and it is the one thing that cannot be written for you.

120–180 words. Who bakes. How long you have been doing it. What you most like
making. Why you started. Plain sentences, no marketing voice.

- `src/app/page.tsx` — the `TODO(owner)` in the Story section
- `src/app/about/page.tsx` — the `TODO(owner)` markers in both prose blocks

## 4. Whether the baker wants to be named — `src/content/site.json` → `owner`

The About page currently says "we" throughout and names nobody. If you would
rather it named the baker, set `owner.name` and `owner.nameOnAboutPage`, and the
About copy can be rewritten in the first person, which reads considerably warmer.

## 5. The facts in `src/content/site.json`

Every one of these is `null` right now, and every page handles that gracefully.
Filling them in requires no code changes.

| Field | Where it shows | Notes |
|---|---|---|
| `location.city` | footer, contact, JSON-LD | Also unlocks a proper local-SEO address block |
| `location.serviceArea` | footer, promise band, order page | e.g. "Katy and west Houston" |
| `leadTime.summary` | promise band, menu, footer, FAQ | e.g. "7 days for cakes, 3 for cookies" |
| `leadTime.minDays` | **order form** | A number. Setting it turns on the "your date is sooner than we usually need" warning, which is already built and tested |
| `contact.email` | footer, contact | |
| `contact.phone` | footer, contact, JSON-LD | |
| `hours` | footer, contact, JSON-LD | When you answer messages, if there is no shop |
| `deposit` | order page, FAQ | Amount or percentage, and whether it is refundable |
| `dietary` | About, FAQ | **Worth prioritising** — eggless / nut-free is one of the first things custom-cake buyers filter on, and the FAQ currently has to dodge the question |
| `domain` | canonical URLs, sitemap, OG tags | **The sitemap is empty until this is set**, because a sitemap needs absolute URLs and guessing a hostname would be worse than omitting it |

## 6. Cancellation and changes policy — `src/app/contact/Faq.tsx`

The FAQ answer for "Can I cancel or change my order?" is deliberately vague
because no policy was supplied. Replace it with your actual terms.

## 7. Reviews — `src/content/site.json` → `reviews`

**The reviews section is built and commented out.** It is not showing invented
testimonials, and it should not.

Add real ones with real attribution:

```json
"reviews": [
  { "quote": "…", "name": "First name and initial", "occasion": "Birthday cake" }
]
```

Then uncomment the Reviews block in `src/app/page.tsx`. Screenshots of Instagram
comments are a good source — ask the person before using their name.

## 8. Servings guide — `src/content/site.json` → `servingsGuide`

A size-to-servings table is genuinely useful and is one of the most common
pre-order questions. The table is built and only renders once there is data, so
it stays hidden rather than showing empty rows.

```json
"servingsGuide": [
  { "size": "6 inch, two layers", "servings": "8–10" }
]
```

## 9. Prices, if you ever want them shown

You chose quotes-only, so every case card reads `QUOTED PER ORDER` and no number
appears anywhere. If you later want "from $X" per category, the price slot is
already in the case card — set `pricing` to `"from"` in `src/content/site.json`
and add a `price` to each product in `src/content/products.json`.

---

## Two things to decide, not fill in

**Customer names are visible on three cakes.** `building-block` shows a child's
first name piped across the front, `match-day` shows another, and
`gold-leaf-bears` has a name plaque on the board. They are already public on your
Instagram, so this may be entirely fine — but they are now on a website that will
be indexed by Google, which is a different level of exposure. The alt text
describes them as "a child's name" without repeating it. Say the word and any of
them can be dropped or swapped.

**Send one test enquiry before relying on the form.** The endpoint is
`xnjebdqe`, in `src/lib/submit-order.ts` — the only file that talks to it.
Formspree activates a form on its first submission and requires you to confirm
the notification address by email, so until you have submitted once and seen it
arrive, delivery is unproven.
