# Sannidhi's Bakery — website

This is written for whoever runs the bakery, not for a developer. Everything you
are likely to want to change — product names, descriptions, photos, hours, lead
times — lives in two files and needs no programming.

If something here does not work, the short version is: **you cannot break this
permanently.** Every change is tracked, and anything can be undone.

---

## Before you start (once per computer)

You need Node.js. Check whether you already have it:

```
node --version
```

If that prints a number like `v24.14.0`, you are set. If it says "command not
found", install it from <https://nodejs.org> (choose the LTS version).

Then, once, inside this folder:

```
npm install
```

## Seeing the site on your own computer

```
npm run dev
```

Open <http://localhost:3000>. Leave that running while you edit — the page
updates as you save. Press `Ctrl + C` in that window to stop it.

---

## Changing product names, descriptions and categories

Open **`src/content/products.json`**. Each product looks like this:

```json
{
  "id": "red-rose-two-tier",
  "sourceFile": "photo-03.png",
  "name": "Red Rose Two-Tier",
  "category": "cakes",
  "blurb": "Two white tiers, a gold leaf seam, fresh red roses.",
  "alt": "Two-tier white buttercream cake with a diagonal seam of gold leaf…",
  "featured": true,
  "image": "/img/photo-03",
  "width": 1426
}
```

**You can edit:**

| Field | What it does |
|---|---|
| `name` | The heading on the little card under the photo |
| `blurb` | The one line under the name. Keep it under about 14 words — longer and it gets cut off |
| `category` | One of `cakes`, `cookies`, `cake-pops`, `strawberries` |
| `alt` | The description read aloud to blind visitors, and what Google reads. Describe **the actual photo** |
| `featured` | `true` puts it in the running for the home page row, `false` keeps it to the menu only |

**Do not edit** `image`, `width`, `height`, `aspectRatio`, `widths` or `lqip`.
Those are measured from the photos automatically and will be overwritten.

### Writing a good blurb

Say what it is, concretely. "Dark ganache pooled on top, chocolate bars and Oreos
stacked over" tells someone something. "A delightful treat for any occasion" does
not. Only describe what is actually visible in the photo — if you know the sponge
is vanilla but the photo does not show it, that is fine to add, but do not guess.

---

## Changing hours, lead times, prices and contact details

Open **`src/content/site.json`**. This is the one file with all the business
facts in it.

Anything set to `null` is treated as "not supplied yet", and the site says so on
the page instead of inventing something. Fill it in and it appears everywhere it
belongs — footer, contact page, order form and the data Google reads — all at
once.

The list of what is still `null` and what each one affects is in
**`CONTENT-TODO.md`**.

Two worth calling out:

- **`leadTime.minDays`** — set this to a number (say `7`) and the order form
  starts warning people whose event date is sooner than that. It is already
  built; it just needs the number.
- **`domain`** — until this is set, the sitemap Google uses is empty. Set it to
  your domain without `https://`, e.g. `"sannidhisbakery.com"`.

### Showing prices

Right now every card says `QUOTED PER ORDER`, because you asked for quotes rather
than prices. If you change your mind, set `"pricing": "from"` in `site.json` and
add a `"price"` line to each product in `products.json`.

---

## Adding new photos

1. Put the new files in **`assets/bakery-photos/`**. Name them `photo-22.png`,
   `photo-23.png` and so on, continuing the numbering.
2. Run:

   ```
   npm run images:crop
   npm run images:build
   ```

3. Add an entry for each new photo to `src/content/products.json`, copying the
   shape of an existing one. You only need `id`, `sourceFile`, `name`,
   `category`, `blurb`, `alt` and `featured` — the rest fills itself in when you
   re-run step 2.
4. Check nothing is broken:

   ```
   npm run check:images
   ```

**Photos straight off the phone are much better than screenshots.** See item 1 of
`CONTENT-TODO.md` — this is the biggest single improvement available to the site.

### What the two image commands do

- `npm run images:crop` — finds the grey and black bands that screenshots leave
  around the edges and cuts them off, writing clean copies to `assets/cropped/`.
  Your originals in `assets/bakery-photos/` are never touched.
- `npm run images:build` — makes every size and format the site needs (four
  widths × three formats) from the cropped copies, and fills in the measurements
  in `products.json`.

If a crop cuts off too much or too little of a particular photo, the numbers are
in `scripts/crop-chrome.mjs` under `MANUAL`, with a comment explaining each one.

---

## Publishing changes

The site is set up for Vercel.

```
npm run build
```

If that finishes without errors, the site is fine to publish. If it stops with a
message about a missing image, run `npm run images:build` and try again — that
check exists specifically so a broken photo can never reach the live site.

To publish, push the change to the `main` branch and Vercel deploys it
automatically.

**If Vercel returns `404: NOT_FOUND`,** its project was connected back when this
repo was a single `index.html` file, so its Framework Preset is set to "Other"
and it is trying to serve static files that no longer exist. `vercel.json` in the
repo root declares the framework as Next.js, which overrides that setting — but
if a deploy still 404s, open the project's *Settings → Build & Deployment* and
check that the Framework Preset is **Next.js** and that there is no Output
Directory override. Then redeploy.

### Environment variables

There are none, and nothing secret is stored in this project. The order form
posts to Formspree, whose address is public by design and lives in
`src/lib/submit-order.ts`.

If you later move to sending email directly, that is the only file that needs to
change, and the key would go in Vercel's *Settings → Environment Variables*,
never in the project files.

---

## The order form

Enquiries go to **Formspree** and arrive in whichever inbox that form is set to.
The form is `xnjebdqe`.

**Formspree activates a form on its first submission**, so send one test enquiry
yourself before relying on it. Set the notification address in the Formspree
dashboard, click the confirmation link it emails you, then submit the real form
once and check it lands on your phone.

Worth knowing:

- **There is no server-side checking.** Formspree is a direct browser submission,
  so the checks on the form (required fields, a sensible email address, a date
  that has not passed) run in the visitor's browser. That stops ordinary spam and
  ordinary mistakes, which is what this form actually gets.
- **There is a hidden trap field** that people never see and automated spam
  usually fills in. Anything that fills it is silently discarded.
- **Photo uploads are a paid Formspree feature.** Rather than a button that fails
  silently, the form asks people to send inspiration photos on Instagram after
  submitting.

---

## The admin area

There is a private admin area at **`/admin`**. You sign in with one password.

### What it does

- **Enquiries** — every custom order that comes through the form, newest first.
  Open one to see everything they submitted, mark it New / Quoted / Confirmed /
  Completed / Declined, and keep private notes only you can see. The dashboard
  shows what is due in the next seven days.
- **Content** — change your city, lead times, phone, email, hours, deposit terms
  and every product name and description, without opening a code editor. Saving
  commits the change to GitHub and the site rebuilds; it goes live in about a
  minute.

### How it is kept private

Not with a password checked in the browser — that kind only *looks* like
security, because everything it is hiding has already been sent to the visitor
and can be read with View Source.

Instead, a check runs **on the server before the page is built**. Someone who is
not signed in never receives any admin page or any of your customers' details,
only a redirect to the sign-in screen. Alongside that: the sign-in cookie cannot
be read by any script, repeated wrong passwords get rate limited, search engines
are told to stay away, and the database refuses all connections that do not come
from this website's own server.

**Three things you should know.**

1. **The password is the whole lock.** Use a long random one from a password
   manager, not something memorable. Anyone who has it has full access.
2. **There is one password, not accounts.** Everyone who signs in looks the same,
   so there is no record of who did what. Fine for one person; tell me if more
   people need access and it should become real accounts.
3. **If the password ever leaks**, change `ADMIN_SESSION_SECRET` in Vercel. That
   signs out every device immediately, everywhere.

### Setting it up

Eight values go into Vercel under **Settings → Environment Variables**. None of
them ever belong in the project files — `.env.example` lists them with notes.

| Variable | Where it comes from |
|---|---|
| `ADMIN_PASSWORD` | You choose it. `openssl rand -base64 32` is a good source |
| `ADMIN_SESSION_SECRET` | `openssl rand -base64 32` again, a different value |
| `FIREBASE_PROJECT_ID` | Firebase → Project settings → Service accounts → Generate new private key. All three come from that one downloaded file |
| `FIREBASE_CLIENT_EMAIL` | ditto |
| `FIREBASE_PRIVATE_KEY` | ditto — paste it exactly, including the `\n` sequences |
| `GITHUB_TOKEN` | GitHub → Settings → Developer settings → **Fine-grained** token, scoped to **this repository only**, Contents: read and write |
| `GITHUB_REPO` | `sujansannidhi/sannidhis_bakery` |
| `GITHUB_BRANCH` | `main` |

Until those are set, the admin area still loads and tells you exactly which ones
are missing. **The public site is unaffected either way** — order enquiries keep
reaching your phone through Formspree.

Also upload `firestore.rules` to Firebase (Firestore → Rules). It denies all
direct access to the database, which is deliberate: only this website's server
is allowed to read your customers' details.

### Where enquiries go now

The order form used to post straight to Formspree from the visitor's browser.
It now goes to this site's own server first, which checks it properly, saves it
so it appears in the admin area, and then passes it to Formspree — **so your
phone notification still arrives exactly as before.**

The upside is that the checks can no longer be skipped. Previously someone could
bypass every rule on the form by using developer tools; now the server rejects a
bad enquiry regardless of what the browser sends.

---

## Commands, all of them

| Command | What it does |
|---|---|
| `npm run dev` | Run the site on your own computer |
| `npm run build` | Check everything works and prepare it for publishing |
| `npm run images:crop` | Trim screenshot edges off new photos |
| `npm run images:build` | Generate all the sizes the site serves |
| `npm run check:images` | Confirm no photo is missing or broken |
| `npm run fonts:subset` | Only needed if you replace a font file |

Local development of the admin area needs a `.env.local` file with the same
variables. Copy `.env.example` and fill it in — that file is ignored by git and
will never be committed.

---

## How it is built, briefly

Next.js and TypeScript, plain CSS (no framework), deployed as static pages. There
is no database and no admin login — the two JSON files in `src/content/` are the
content system, which is why they can be edited directly.

- `src/content/` — **everything you edit**
- `src/app/` — the pages
- `src/components/` — the reusable pieces
- `scripts/` — the photo tools
- `assets/` — original photos, never served directly
- `public/img/` — generated photos, never edited by hand

Design decisions and the reasoning behind them are in `DESIGN.md`. Outstanding
content is in `CONTENT-TODO.md`.

### Two things measured, and one budget missed

- **Accessibility:** 100 in Lighthouse, and zero violations from axe across all
  five pages at phone and desktop widths, checked against WCAG 2.2 AA.
- **Speed:** 100 for SEO and best practices. The largest element paints in **1.8s
  on a throttled 4G phone**, inside the 2.0s target, and nothing shifts as the
  page loads.
- **JavaScript: 185KB, against a 90KB target — this one is not met.** Almost all
  of it is React and Next.js themselves: a page with none of our own interactive
  code measures the same 184KB. Getting under 90KB would mean not using Next.js,
  which the brief specified. Flagged rather than quietly shipped past.
