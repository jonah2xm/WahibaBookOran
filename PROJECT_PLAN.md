# Online Bookstore — Project Plan

Mobile-first Algerian book shop with Yalidine delivery, plus a separate admin back-office.
Status: **Both apps run on MongoDB end to end.** The storefront reads its
catalogue, settings and conditions from the database, places orders through
`POST /api/orders` with every number recomputed server-side, and tracks them
by number + phone. The admin reads and writes through its own API, with login
on `adminUsers` + bcrypt. No seed files, no localStorage stubs left in either
app — only the cart, which is where a guest cart belongs.

Verified end to end: an order placed in the storefront appears in the admin
pipeline; moving it to *expédiée* there decrements stock through the ledger
and changes what the customer sees on the tracking page.

**What is left: Yalidine.** The delivery fee still comes from the zone table
in `apps/store/src/lib/geo.ts`, there is no parcel creation and no label, and
the communes list is a stub. All of it is blocked on the API credentials.
A6 Frais de production is out of scope.
Store runs on :3110, admin on :3111 (launch.json entries `bookoran-store` and
`bookoran-admin`).

Browsing diverges from the board on purpose: the home category rail, the /categories
index and the /recherche screen were removed in favour of one **Tous les livres**
(/livres) page carrying search, category + price filters and five sorts, with state in
the URL. Board screens S2, S2b and S3 no longer describe the built app.

Built against the Claude Design board `BookOran31.dc.html`
(project `b24adc68-6601-4e56-99d5-44e01595b888`).

Still stubbed, all flagged in-file:

- Delivery fees come from the zone table in `apps/store/src/lib/geo.ts`, and
  the commune list is ~40 of ~1541. **That file and `src/lib/quote.ts` are the
  only two Yalidine touches.**
- Books with no cover yet render a tinted placeholder from `coverTint`.
  Uploading one replaces it; the catalogue is otherwise unchanged.
- Conditions sections 4—5 are drafts I wrote; the owner must review them.

---

## 1. Decisions already locked

| Area | Decision |
|---|---|
| Repo | Monorepo: `apps/store`, `apps/admin`, `packages/db`, `packages/ui` |
| Customer auth | None — guest checkout (name + phone). Tracking by order number + phone |
| Languages | French + Arabic, switchable, full RTL |
| Payment | Cash on delivery only. Yalidine collects and remits later |
| Delivery | Yalidine — live fee quote at checkout |
| Palette | Beige + pink + white + black |
| Primary target | Phone screens. Desktop is a graceful upgrade, not the reference |

---

## 2. Stack

- **Next.js 15** (App Router, Server Components) + **TypeScript**
- **Tailwind CSS v4** with CSS-variable design tokens (see `DESIGN_BRIEF.md`)
- **MongoDB Atlas** + **Mongoose**, models shared from `packages/db`
- **next-intl** for fr/ar with `dir` switching
- **NextAuth (credentials)** for admin only
- **Zod** for every request body and every Yalidine response
- **Cloudinary** (or UploadThing) for book covers — never store images in Mongo
- **Vercel** for both apps, two projects pointing at the same repo
- **npm workspaces** (pnpm is not installed on this machine)

### Non-negotiable engineering rules

1. Money is stored as **integer centimes of DZD**. No floats anywhere.
2. Prices, delivery fees and totals are **recomputed server-side at order creation**. The client's numbers are display-only and never trusted.
3. Yalidine credentials live **only** in server code. No `NEXT_PUBLIC_` prefix, ever.
4. All Yalidine reference data (wilayas, communes, centers, fee tables) is **cached in Mongo**. Their API is rate-limited; we do not call it per keystroke.
5. Every user-facing string comes from a translation file. No hardcoded French in JSX.
6. No `left`/`right` in CSS — logical properties only (`ms`, `me`, `ps`, `pe`, `start`, `end`), or RTL becomes a rewrite.

---

## 3. Repo structure

```
bookstore/
├── apps/
│   ├── store/                 # customer storefront
│   │   ├── app/[locale]/...
│   │   ├── app/api/...
│   │   └── messages/{fr,ar}.json
│   └── admin/                 # back-office
│       ├── app/[locale]/...
│       └── app/api/...
├── packages/
│   ├── db/                    # BUILT — mongoose models, connection, seed
│   │   ├── src/models/        # Category Book StockMovement Order
│   │   │                      # AgreementSection AdminUser Settings
│   │   │                      # YalidineCache Counter
│   │   ├── src/stock.ts       # recordMovement + reconciliation
│   │   ├── src/orderNumber.ts # BO-YYMM-NNNN from an atomic counter
│   │   └── src/seed/          # canonical catalogue + agreement + runner
│   ├── ui/                    # shared components + design tokens (todo)
│   └── yalidine/              # API client, cache layer, fee calculator (todo)
├── PROJECT_PLAN.md
└── DESIGN_BRIEF.md
```

### Seeding

```bash
cp .env.local.example .env.local     # fill in MONGODB_URI
npm run seed --workspace @bookoran/db
```

Idempotent — every write is an upsert on `slug` / `key` / `_id`, so re-running
changes nothing. `--reset` empties the catalogue, the ledger, the agreement,
the settings and the counters first; it refuses a non-localhost URI without
`--force`. Orders and admin users are never cleared: one is the business's
records, the other its credentials.

The seed gives each book an opening `purchase_in` movement equal to its seed
stock, so the ledger explains the count from day one and the first
reconciliation run does not zero it. On a re-run it does not write a second
opening balance, and it never resets a stock the owner has since adjusted.

`SEED_ADMIN_PASSWORD` is optional: left empty, the script generates a password
and prints it once. It never falls back to a fixed default.

---

## 4. Data model

Bilingual fields are `{ fr: string; ar?: string }` and fall back to `fr` when `ar` is empty.
This lets you launch in French and fill Arabic in later with no migration.

### categories
```
_id, slug, name: {fr, ar}, description: {fr, ar},
icon, sortOrder, isActive
```

### books
```
_id, slug,
title: {fr, ar}, author: {fr, ar}, summary: {fr, ar},
categoryIds: [ObjectId],        // a book can sit in several
isbn, publisher, publishedYear, pageCount, bookLanguage,
coverUrl, galleryUrls: [],
priceDzd: int,                  // centimes
compareAtPriceDzd: int | null,  // for strike-through
weightGrams: int,               // REQUIRED — drives the Yalidine surcharge
dimensionsCm: { l, w, h },
stockOnHand: int,               // denormalized from stockMovements
stockReserved: int,             // held by confirmed-but-unshipped orders
lowStockThreshold: int,
isActive, isFeatured, isNewArrival, isBestSeller,
createdAt, updatedAt
```

`isNewArrival`, not `isNew`: `isNew` is a reserved Mongoose path (`doc.isNew`
is its own "not yet saved" flag) and shadowing it breaks `save()`.

### stockMovements — append-only ledger, never edited
```
_id, bookId, type, quantity (signed),
reason, orderId?, createdBy, createdAt
```
type is one of: `purchase_in`, `sale_out`, `return_in`, `damage_out`, `adjustment`

`books.stockOnHand` is a cached sum. A nightly job recomputes it from the ledger and flags any book where the two disagree.

### orders
```
_id, orderNumber,               // human-readable, e.g. BO-2609-0143
status, statusHistory: [{ status, at, by, note }],
customer: { fullName, phone, altPhone? },
delivery: {
  method,                       // home | stopdesk
  wilayaId, wilayaName, communeId, communeName,
  address?, stopdeskCenterId?, stopdeskName?
},
items: [{ bookId, titleSnapshot, priceSnapshot, quantity }],
totals: { subtotal, deliveryFee, discount, grandTotal },   // centimes
yalidine: { tracking?, labelUrl?, lastStatus?, lastSyncedAt? },
payment: { method: cod, collected: bool, collectedAt?, remittedAt? },
locale, notes, createdAt, updatedAt
```

Snapshots matter: an order must still show what the customer actually paid even after you change that book's price next month.

`orderNumber` is `BO-YYMM-NNNN`, minted by `nextOrderNumber()` from an atomic
`$inc` on a per-month counter — not from a count of existing orders, which two
simultaneous checkouts would both read and then collide on the unique index.
The `BO-` prefix is what the board, both apps and the tracking page already
show. The storefront still generates a random `BO-####` into localStorage; that
stub and the `BO-0000` placeholder on /suivi change over when order creation
moves to the API.

### agreementSections — the user-agreement editor
```
_id, key, title: {fr, ar}, points: [{ fr, ar }], sortOrder, isActive, updatedAt
```
Rendered as `<ul><li>` on the storefront, edited as a reorderable list in admin.

### settings — one document, `_id: "store"`
```
_id: "store", storeName, phone,
originWilayaId, originWilayaName,
freeShippingThresholdDzd: int, overweightRateDzd: int, freeKg: int,
stopdeskByDefault: bool, updatedAt
```
Admin A10 edits it; the quote route reads it instead of the constants in
`apps/store/src/lib/geo.ts` and `apps/store/src/data/catalogue.ts`.

### counters — atomic sequences
```
_id (e.g. "order:2609"), seq: int
```

### adminUsers
```
_id, email, passwordHash, name, role (owner | staff), isActive, lastLoginAt
```

`passwordHash` is bcrypt at cost 12 and is `select: false`, so it cannot reach
a session, an API response or a log without being asked for by name.
`verifyAdminPassword()` hashes even when the e-mail is unknown, so a wrong
address and a wrong password take the same time. This replaces the plaintext
`===` check against env vars that A1 uses today — **that check must not reach
production.**

### yalidineCache
```
_id, kind (wilayas | communes | centers | fees), key, payload, fetchedAt, ttlHours
```

---

## 5. Order lifecycle

```
pending ──confirm──▶ confirmed ──pack──▶ packed ──ship──▶ shipped
   │                     │                                   │
   │                     │                        ┌──────────┴──────────┐
   └──cancel──▶ cancelled ◀──cancel───────────    ▼                     ▼
                                              delivered            returned
                                                  │                     │
                                                  ▼                     ▼
                                              remitted             restocked
```

- **pending** — customer submitted. Stock is *not* touched yet; with COD a real share of orders never confirm.
- **confirmed** — you phoned the customer. Stock moves into `stockReserved`.
- **packed** — physically ready to hand over.
- **shipped** — parcel exists at Yalidine, tracking stored, `sale_out` movement written.
- **delivered** — Yalidine says delivered. Cash collected by them, not yet by you.
- **remitted** — money actually in your account. **Only this status counts as revenue.**
- **returned** — `return_in` movement, stock comes back, the delivery fee is still a real loss.

`delivered ≠ paid` is the single most important thing this model gets right.

Enforced in `packages/db/src/orders.ts`: `applyOrderStatus()` owns the legal
transitions and their stock effects, and an illegal jump is refused with the
moves that *are* available. Cancelling a confirmed or packed order releases
the reservation; cancelling a pending one has nothing to release, so it
writes no compensating movement for stock that never left.

---

## 6. Yalidine integration

> Assumed base `https://api.yalidine.app/v1/` with `X-API-ID` / `X-API-TOKEN` headers.
> **To be verified against your actual account docs before Phase 3.**

| Need | Endpoint | Cache |
|---|---|---|
| Wilaya list | `GET /wilayas` | 30 days in Mongo |
| Commune list | `GET /communes?wilaya_id=` | 30 days |
| Stopdesk centers | `GET /centers?wilaya_id=` | 7 days |
| Delivery fee | `GET /deliveryfees?from_wilaya_id=&to_wilaya_id=` | 24 h |
| Create parcel | `POST /parcels` | never |
| Track parcel | `GET /parcels/{tracking}` | polled |

### Fee calculation (server-side, `packages/yalidine/quote.ts`)

```
base      = home ? commune.home_fee : commune.desk_fee
billable  = max(ceil(totalWeightGrams / 1000), volumetricWeight)
surcharge = billable > FREE_KG ? (billable - FREE_KG) * OVERWEIGHT_RATE : 0
fee       = base + surcharge - (subtotal >= FREE_SHIP_THRESHOLD ? base : 0)
```

`FREE_KG`, `OVERWEIGHT_RATE` and `FREE_SHIP_THRESHOLD` live in a `settings` document so you can change them without a deploy.

### Failure policy

If Yalidine is down or rate-limits us at checkout: serve the **last cached fee** for that commune and mark the quote `stale`. If no cached fee exists at all, let the order through with `deliveryFee = null` and a "à confirmer par téléphone" note. **Never block a sale on their uptime.**

### Status sync

A Vercel cron every 30 minutes pulls tracking status for every order in `shipped`, updates `yalidine.lastStatus`, and auto-advances to `delivered` / `returned`.

---

## 7. API surface

**Store** — `apps/store/src/app/api/` — BUILT
```
GET  /api/catalogue             books + categories + public settings, for the cart
POST /api/quote                 { items, wilayaId, communeId, method } -> fee breakdown
POST /api/orders                places the order
GET  /api/orders/track          ?number=&phone=  (both required, both must match)
```

Server components read `src/lib/catalogue.ts` directly — the home rails, the
listing, a book page, the conditions. Only the cart calls `/api/catalogue`,
because it runs in the browser and holds nothing but slugs.

`POST /api/orders` takes slugs, quantities, an address and a delivery choice.
**Every price, weight, fee and total is recomputed from the catalogue and the
settings**; the numbers the browser showed are display only. It shares
`src/lib/quote.ts` with `/api/quote`, so the figure quoted and the figure
charged cannot drift apart. A basket line that sold out in the meantime is
dropped and reported back rather than silently priced.

Stock is **not** decremented at checkout. A COD order is a request, not a
sale: copies are reserved on confirmation and leave stock on shipment (§5).

`/api/orders/track` needs the number **and** the phone. Order numbers are
sequential, so a number alone would let anyone walk the range and read
customers' names and addresses. A wrong pair returns the same 404 as an
unknown number, so it cannot be used to discover which numbers exist.

Not built, all waiting on Yalidine credentials: `/api/geo/*` served from the
cached API response instead of the stub in `lib/geo.ts`, parcel creation and
labels.

**Admin** — `apps/admin/src/app/api/` — BUILT
```
GET   /api/dashboard                    the A2 tiles, computed
GET   /api/books                        catalogue + categories
POST  /api/books
GET   /api/books/[slug]
PATCH /api/books/[slug]                 stockOnHand is NOT accepted here
GET   /api/stock/[slug]                 on hand, reserved, movement history
POST  /api/stock/[slug]/movements       an adjustment, reason required
GET   /api/orders                       ?status= , plus counts per column
GET   /api/orders/[orderNumber]
PATCH /api/orders/[orderNumber]         status transition + its stock effects
GET   /api/agreement
PUT   /api/agreement                    whole list; owner only
GET   /api/settings
PUT   /api/settings                     owner only
```

`GET /api/users` lists who has access — names, e-mails and roles, never the
hash (`passwordHash` is `select: false`, so it cannot reach a response by
accident).

Still to build: `POST /api/orders/[orderNumber]/ship` (create the Yalidine
parcel, store tracking and label), `POST /api/users` (inviting someone means
minting credentials), `/api/categories`, and `/api/reports/sales`.

Every handler goes through `route()` in `src/lib/api.ts`, which connects,
confirms the session **against the database** — a JWT alone would keep working
after an account is deactivated — applies the `owner` guard, and turns Zod and
Mongoose errors into `{ error: { code, message, fields } }`.

Responses speak the shapes the screens already use: category slugs rather than
ObjectIds, `isNew` rather than the database's `isNewArrival`. That translation
lives in `src/lib/serialize.ts` alone.

Role split: **staff** can run the shop — orders, stock, parcels. **owner** is
additionally required for anything that changes money or the legal terms
(`/api/settings`, `/api/agreement`).

---

## 8. Admin modules

All six read and write through the API above. Server components
(A2 dashboard, the tab-bar badge) call `src/lib/queries.ts` directly rather
than fetching their own routes — one definition of each figure, no HTTP hop
to the same process. Client screens use `src/lib/client.ts`, which turns a
failure into a typed error carrying the server's own message, so a screen can
say "Le stock ne peut pas passer sous zéro" rather than "une erreur est
survenue". Every screen has a loading state and a retry.

1. **Dashboard** — today's orders, pending-to-call count, revenue this month (remitted vs pending), low-stock list, top sellers.
2. **Books** — list with cover/stock/price/status; editor with FR+AR tabs, cover upload, category multi-select, weight (required, blocks save when empty).
3. **Stock** — on-hand per book, movement history, manual adjustment with a mandatory reason, low-stock alerts. On-hand lives on the book and an adjustment writes the movement and the new count together, so the ledger and the book editor can never disagree. Stock cannot be pushed below zero.
4. **Sales** — order pipeline with status filters, one-tap call link, order detail, "create Yalidine parcel", print label, revenue reports.
5. **Agreement** — section list, bullet-point builder with up/down reorder (not drag: the list is edited on a phone, where a drag handle fights the page scroll and is unreachable by keyboard), FR/AR side by side, missing-translation flags, preview of the public page. Section numbers are rendered from position, never typed into the title.
6. **Settings** — origin wilaya, free-shipping threshold, overweight rate, store info, admin users, dark mode (admin only). The delivery values are display-only until Phase 1: the quote route still computes from `apps/store/src/lib/geo.ts`, and the screen says so.

---


## 9. Environment variables

Two files at the repo root, one per database (see §10):

- `.env.local` — development, local mongod. Start from `.env.local.example`.
- `.env.production.local` — production, Atlas. Start from
  `.env.production.local.example`. Read only by `npm run seed:prod`; the
  deployed apps get the same values from Vercel's own settings.

Both are git-ignored. Each app also has its own `.env.local` for `npm run dev`;
the seed reads the root one first, so it wins.

```
# packages/db
MONGODB_URI=

# packages/db — seed script only
SEED_ADMIN_EMAIL=
SEED_ADMIN_NAME=
SEED_ADMIN_PASSWORD=          # leave empty: the seed generates and prints one

# packages/db — seed script only, and only when this machine's DNS refuses
# SRV lookups. Never needed on the host.
DNS_SERVERS=                  # e.g. 8.8.8.8,1.1.1.1

# apps/store + apps/admin
NEXT_PUBLIC_SITE_URL=

# apps/admin — signs the session cookie. NextAuth v5 reads AUTH_SECRET, not
# NEXTAUTH_SECRET. Production uses a different value from development, so a
# session minted locally is not accepted by the live back-office.
AUTH_SECRET=

# apps/admin — where the public shop lives, for the A9 preview link.
# Public by design; nothing secret ever gets a NEXT_PUBLIC_ prefix.
NEXT_PUBLIC_STORE_URL=

# yalidine (server only)
YALIDINE_API_ID=
YALIDINE_API_TOKEN=
YALIDINE_FROM_WILAYA_ID=

# apps/admin — book covers. The cloud name is public (it is inside every
# delivery URL); the key and secret are server-only. The secret can delete the
# whole media library, so it never gets a NEXT_PUBLIC_ prefix.
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=bookoran31/covers
```

---

## 10. Deploying

### Two databases, never one

Development and production are separate databases and must stay that way: a
test order in the shop's real ledger is indistinguishable from a real one, and
a dev reset would take the real catalogue with it.

| | database | env file | who reads it |
|---|---|---|---|
| development | `mongodb://127.0.0.1:27017/bookoran31` | `.env.local` (and each app's own) | `npm run dev`, `npm run seed` |
| production | Atlas `bookoran31` | `.env.production.local` | Vercel, `npm run seed:prod` |

`.env.production.local` is git-ignored; `.env.production.local.example` shows
its shape. Both files live at the repo root, and the seed resolves `--env`
against that root whichever workspace it is run from.

Development is a **local mongod**, not a second Atlas database. That is partly
speed and offline work, and partly the DNS problem below: on a machine whose
resolver refuses SRV lookups, a Next dev server cannot reach a `mongodb+srv://`
URI at all, while Vercel can. Local dev sidesteps it entirely, and only the
seed — which can be handed `DNS_SERVERS` — ever talks to Atlas from here.

### Seeding production

```bash
npm run seed:prod --workspace @bookoran/db
```

That is `run.ts --env=.env.production.local`, and that file is then the **only**
one read. Loading the dev `.env.local` alongside it looks harmless, since
dotenv never overwrites an already-set variable — but anything the production
file omits falls through to development. That bit once: `SEED_ADMIN_PASSWORD`
was commented out so the seed would generate a strong one, and `.env.local`
quietly supplied the dev password instead.

The script prints the database name and a banner before it writes anything,
refuses a URI that names no database, and refuses `--reset` against a
non-local database without `--force`. It never creates orders, and
`seed:demo` refuses a non-local database outright.

### The storefront must not be frozen at build time

The home page, `/livres` and `/conditions` all read editable data, so each
exports `revalidate = 60`. Without it Next prerenders them at build time and
Vercel serves that snapshot indefinitely — `x-vercel-cache: HIT` with an `age`
that only grows — so adding a book in the admin changes nothing on the shop
until the next deploy. Book pages were already dynamic.

Any new storefront page that reads the database needs the same export.

### Deleting a book

`DELETE /api/books/<slug>` refuses with 409 when the book appears in any
order. An order's items carry their own title and price snapshots, so an old
order still reads correctly without the book — but the records should not
quietly lose the thing they point at, and a book that has ever sold wants
hiding (`isActive: false`), not deleting. The refusal says so.

With no order it really goes: the book, its stock movements (which have
nothing left to explain) and its Cloudinary cover (an orphan nothing can
reference again). The editor asks twice before calling it.

### Book covers

The browser uploads straight to Cloudinary. `POST /api/uploads/signature`
signs ONE upload, for `public_id = <folder>/<slug>`, and only for a book that
exists — it cannot be used to overwrite an unrelated asset. The file never
passes through our own server: Vercel caps a function request body at 4.5 MB
and a phone photo clears that easily.

Signed, not an unsigned preset: an unsigned preset is readable in page source
and lets anyone upload anything to the account.

The URL stored on the book is built, not Cloudinary's `secure_url` — that one
serves the original file. The stored one carries `f_auto,q_auto,c_fill,ar_2:3,w_600`,
so the shop sends a ~2 KB WebP over a mobile connection. Because the public_id
is the slug, re-uploading replaces the old file instead of orphaning it.

`coverUrl` in the PATCH schema only accepts a `res.cloudinary.com` URL. A
free-form one would let the admin point a book's cover at any site.

### Changing an admin password

```bash
npm run admin:password --workspace @bookoran/db -- --env=.env.production.local --email=owner@example.com
```

The seed never touches an account that already exists, and the admin UI has no
password field — `passwordHash` is `select: false` and `/api/users` edits
names, roles and status only. So this script is the only way to change one:
forgotten, shared, or leaked. It generates the new password and prints it once.
There is no `--password` flag on purpose; a password typed on a command line
lands in your shell history.

### The admin needs an account CREATED, not configured

There are no `ADMIN_EMAIL` / `ADMIN_PASSWORD` variables any more. Sign-in reads
the `adminUsers` collection and compares a bcrypt hash, so setting those on the
host does nothing — the account has to be written into the database the
deployed app talks to.

On the host (Vercel), `apps/admin` needs:

```
MONGODB_URI=mongodb+srv://…            # the same database, reachable from the host
AUTH_SECRET=…                          # openssl rand -base64 32
NEXT_PUBLIC_STORE_URL=https://…        # the public shop, for the A9 preview link
```

Atlas blocks unknown IPs by default, so add `0.0.0.0/0` under Network Access
or Vercel cannot connect at all.

**Name the database in the URI.** `…mongodb.net/?appName=x` writes everything
into `test`; `…mongodb.net/bookoran31?…` is what you want, and the seed and
the host must use the same one or they will look at different data. The seed
exits rather than write into `test`.

**`querySrv ECONNREFUSED` is DNS, not Mongo.** A `mongodb+srv://` URI needs an
SRV record, and Node resolves it itself with c-ares instead of going through
the OS resolver. A machine whose DNS server is `127.0.0.1` — a VPN client,
Docker, a privacy filter — often has that proxy refuse Node's direct query
even though Windows resolves the same name fine. Either re-run with
`DNS_SERVERS=8.8.8.8,1.1.1.1`, or use Atlas's standard (non-`+srv`) string,
which lists the hosts and needs no lookup. The seed prints this when it
happens.

The account is created by `npm run seed:prod`, which reads
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_NAME` from `.env.production.local`.

Leave `SEED_ADMIN_PASSWORD` unset and the script generates one and prints it
once. The seed is idempotent and never touches an account that already exists,
so re-running it is safe — and it will not reset a forgotten password.

### Diagnosing a refused login

`GET /api/health` on the admin returns two booleans and nothing else:

```json
{ "database": "ok" | "unreachable" | "not_configured", "hasAdminAccount": true }
```

The login page calls it after a failure, so the screen says which of the three
it was rather than blaming the password for a missing database. Only a genuine
credential mismatch gets the vague "e-mail ou mot de passe incorrect" — naming
the wrong half would tell an attacker which e-mails exist.

---

## 11. Build phases

Status as of 2026-09-21. Everything not marked blocked is done.

| Phase | Work | Status |
|---|---|---|
| **0 — Foundation** | monorepo, both Next apps, Tailwind tokens, Mongo connection, next-intl + RTL, shared primitives | ✓ |
| **1 — Data & admin core** | models, seed, API routes, NextAuth against `adminUsers` + bcrypt, book list / editor / creation, **cover upload** | ✓ |
| **2 — Storefront catalogue** | home, listing, search, filters, book detail, bottom nav, cart, all reading from Mongo | ✓ |
| **3 — Checkout** | pickers, quote endpoint, fee display, order creation, confirmation, tracking | ✓ on the stub tariff table |
| **4 — Sales management** | order pipeline, detail, status transitions | ✓ |
| **5 — Stock** | movement ledger, adjustments, low-stock filter, opening stock on creation | ✓ |
| **6 — Agreement, polish, ship** | agreement editor + public page, Arabic pass, empty/error states, SEO, deploy | ✓ except the live deploy |

### What is actually left

**Blocked on Yalidine credentials** (items 1—2 below): the real API client and
its cache, live tariffs replacing the zone table in `apps/store/src/lib/geo.ts`,
the real commune list (~1541 against ~40 stubbed), parcel creation, label
printing, and the status-sync cron. Phases 3 and 4 are complete in every other
respect and the swap point is deliberately two files.

**Not blocked, not built**: inviting a second admin user (`POST /api/users`),
editing categories from the admin, and a sales report endpoint. None of them
stop the shop running.

---

## 12. Open items — still needed from you

1. `YALIDINE_API_ID` + `YALIDINE_API_TOKEN` in `.env.local`, plus whatever endpoint doc they sent you.
2. Origin wilaya, and whether admin creates parcels via the API or you enter them manually on their dashboard.
3. `MONGODB_URI`.
4. Final category list in French.
5. Book weights — Yalidine surcharges by the kilo and the schema requires it.
6. Store name, logo, phone, social links.

Items 1–2 gate Phase 3 only. Items 3–4 gate Phase 1. **Phase 0 is unblocked today.**
