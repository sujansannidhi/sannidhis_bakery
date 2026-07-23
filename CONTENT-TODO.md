# Content still needed

Everything on the site is either true or visibly marked as missing. Nothing has
been invented — no flavours, no prices, no reviews, no fake awards.

Most of the original list is now done. What follows is what genuinely remains.

---

## Done

- **Business facts** — Frisco, the DFW service area, 4–7 day lead times with a
  4-day minimum, phone, public email, 9am–5pm hours, cash or Zelle.
- **Food handler certification** — stated with issuer, certificate number
  `TX-FH-1168038` and expiry (23 July 2028), on the About page and in the FAQ.
- **Lead-time warning** — active. Anyone choosing an event date under 4 days
  away now sees a warning on the order form.
- **Domain** — set to the live Vercel URL, which fills in the sitemap and the
  canonical/OG tags. Change it in one place if you buy a proper domain.
- **Local SEO** — the `Bakery` JSON-LD now carries phone, email, hours, payment
  methods, served area and locality.

---

## 1. The original photos off the phone — still the biggest upgrade available

The 21 original files are Instagram screenshots, not photographs. They top out
at 1178–1811px after the app chrome is cropped off, and they have been through
Instagram's compression twice. A real camera file is 3000–4000px.

**You can now do this yourself.** Admin → Menu → Edit any product → *Replace
photo*. Upload straight from your phone; the site resizes and publishes it in
seconds. No commands, no developer.

Two photos (`photo-11`, `photo-21`) are small enough that neither can lead a
page. Replacing those two first would have the most visible effect.

## 2. One good cookie photo, and more of the small sections

| Section | Photos |
|---|---|
| Cakes | 17 |
| Cake pops | 2 |
| **Cookies** | **1** — and it is the softest file in the set |
| **Chocolate-covered strawberries** | **1** — functional, not appetising |
| **Cupcakes** | **0** — the section exists but is empty |

A cookie photo taken in daylight on a plain surface is the cheapest visible
improvement to the site. The **Cupcakes** section is currently empty: either put
cupcakes in it or delete it in Admin → Menu → Sections.

## 3. The story, in your own words

Home → "In our kitchen", and the About page. What is written there now is true
but generic — it says nothing only you could say, and it is the thing that makes
a site feel like it belongs to one bakery rather than any bakery.

120–180 words. Who bakes. How long. What you most like making. Why you started.

- `src/app/(site)/page.tsx` — the `TODO(owner)` in the Story section
- `src/app/(site)/about/page.tsx` — the `TODO(owner)` markers

## 4. Whether the baker wants to be named

The About page says "we" and names nobody. Set `owner.name` in
`src/content/site.json` and the copy can be rewritten in the first person, which
reads considerably warmer.

## 5. Deposit terms

The FAQ says a deposit reserves your date but not how much or whether it is
refundable, because that was never supplied. Admin → Details → Deposit.

## 6. Cancellation policy

The FAQ answer for "Can I cancel or change my order?" is deliberately vague for
the same reason. Replace it in `src/app/(site)/contact/Faq.tsx` with your terms.

## 7. Dietary options — worth prioritising

Eggless, vegan and nut-free are among the first things custom-cake buyers filter
on, and the FAQ currently has to dodge the question. Set `dietary` in
`src/content/site.json`.

## 8. Reviews

**The reviews section is built and commented out.** It is not showing invented
testimonials, and it should not. Add real ones with real attribution to
`site.json` → `reviews`, then uncomment the block in `src/app/(site)/page.tsx`.
Screenshots of Instagram comments are a good source — ask the person first.

## 9. Servings guide

A size-to-servings table is one of the most common pre-order questions. It only
renders once it has data, so it stays hidden rather than showing empty rows.
`site.json` → `servingsGuide`.

## 10. Prices, if you ever want them shown

Quotes-only today, so every case card reads `QUOTED PER ORDER`. If you change
your mind, set `pricing` to `"from"` and add a `price` to each product.

---

## Two things to decide, not fill in

**Customer names are visible on three cakes.** `building-block` shows a child's
first name piped across the front, `match-day` shows another, and
`gold-leaf-bears` has a name plaque. They are already public on your Instagram,
but this site is indexed by Google, which is a different level of exposure. Alt
text describes them as "a child's name" without repeating it. Any of them can be
dropped or swapped from Admin → Menu.

**The admin password is `localdev`.** You chose this knowing it is weak and
appears in every password-guessing wordlist, and the admin is now linked from
the public footer. Rate limiting slows an attacker but does not stop a
distributed attempt, and what is behind it is your customers' names, emails and
phone numbers. Changing it is one value in Vercel — `ADMIN_PASSWORD` — and
takes a minute.
