# Design Brief — Online Bookstore (FR/AR, mobile-first)

Self-contained brief for Claude Design. Everything needed to design the product is in this
file; no other document is required.

---

## 1. The product

An online bookstore in Algeria selling physical books with cash-on-delivery shipping via
Yalidine. Two separate interfaces:

- **Storefront** — customers browse books by category (novels, kids' stories, and more),
  add to cart, and check out as guests. At checkout they pick their wilaya and commune and
  see the **real delivery price** before confirming. They pay the delivery driver in cash.
- **Admin** — the owner manages books, stock, production costs, sales, and the user
  agreement.

**Design for phones first.** The reference frame is **390 × 844**. Desktop is a graceful
upgrade, not the starting point — this includes the admin, which the owner will often use
on a phone while standing at a shelf.

**Both interfaces are bilingual French / Arabic with full RTL.**

### Audience

Algerian book buyers, 18–45, shopping on mid-range Android phones over patchy mobile data.
They are used to COD and are wary of paying before seeing a product. The design job is to
make a small shop feel **trustworthy**: the price is clear, the delivery cost is shown
before commitment, and a real phone number is visible.

---

## 2. Visual direction

Beige, pink, white, black. Aim for **warm, papery, bookish and calm** — the feeling of a
well-lit independent bookshop, not a discount marketplace. Generous whitespace, soft
edges, covers as the loudest element on any screen. Pink is an accent that guides the eye
to actions, never a wash across the page.

Avoid: neon gradients, heavy drop shadows, cartoonish illustration, dense marketplace grids
with badges shouting on every card.

---

## 3. Design tokens

Deliver these as the literal token set. All colors are checked for WCAG AA on their
intended background.

### Color

```
/* surfaces */
--paper:        #FAF6F0   /* page background */
--surface:      #FFFFFF   /* cards, sheets */
--sand:         #F2E9DC   /* secondary surface, section bands */
--sand-deep:    #E3D5C3   /* borders, dividers, input outlines */

/* brand */
--rose:         #B34A62   /* primary action. 5.1:1 with white text */
--rose-hover:   #9A3E53
--rose-300:     #E9A7B5   /* decorative only, never text */
--rose-50:      #FBEDF0   /* tints, selected rows, badges */

/* ink */
--ink:          #1A1614   /* primary text */
--ink-muted:    #6B605A   /* secondary text, 4.8:1 on --paper */
--ink-faint:    #9C918A   /* placeholders, disabled */

/* semantic */
--success:      #2E7D5B
--warning:      #B4762A
--danger:       #B3352F
--info:         #3A6B8A
```

Rules:
- `--rose-300` and `--rose-50` are **never** used for text. Only fills and tints.
- Body text is always `--ink` or `--ink-muted`. Never pink text on beige.
- One primary (rose) button per screen. Everything else is outline or ghost.
- Include a **dark mode** for the admin only. The storefront is light-only.

### Typography

- **Latin display** — Fraunces (or Instrument Serif). Headings, book titles, the logo.
- **Latin body/UI** — Plus Jakarta Sans (or Inter). Everything else.
- **Arabic** — Tajawal for both display and body. Fraunces has no Arabic coverage, so in AR
  the display role falls to Tajawal 700. Design the Arabic screens with that substitution
  visible, not as an afterthought.

```
display-lg   32 / 38  700
display      26 / 32  700
title        20 / 28  600
body-lg      17 / 26  400
body         15 / 23  400
caption      13 / 18  500
micro        11 / 14  600  uppercase, 0.06em tracking (labels, status pills)
```

Minimum body size on the storefront is **15px**. No 12px paragraphs.

### Space, radius, elevation

```
space:   4 / 8 / 12 / 16 / 24 / 32 / 48
radius:  input 12 · card 16 · sheet 24 (top only) · pill 999 · cover 8
shadow:  sm  0 1px 2px rgba(26,22,20,.06)
         md  0 4px 16px rgba(26,22,20,.08)
         lg  0 12px 32px rgba(26,22,20,.12)   /* sheets and modals only */
```

Screen side gutter: **16px**. Minimum tap target: **44 × 44**. Minimum gap between two
tappable things: **8px**.

### Motion

150–200 ms, ease-out. Sheets slide up, toasts fade in from the bottom above the tab bar.
Nothing bounces. Respect `prefers-reduced-motion`.

---

## 4. Conventions to apply everywhere

- **Currency** — `2 450 DA`, space as thousands separator, unit after the number, Western
  digits in both locales. Never `DZD 2450.00`.
- **Phone** — `0X XX XX XX XX`.
- **RTL** — mirror the whole layout in Arabic: nav order, icon placement, chevrons, progress
  steppers, drawer side. Do **not** mirror the book covers or the logo. Numbers and prices
  stay LTR inside RTL text.
- **Covers** — 2:3 portrait ratio, always. Design a placeholder for books with no cover
  (sand background, title set in the display face).
- **Every list needs four designs**: loaded, loading (skeleton, not a spinner), empty (with
  an action), error (with a retry).
- **Out of stock** is a first-class state on the book card, the detail page, and in the cart.

---

## 5. Storefront screens (390 × 844)

### S1 — Home
Top bar: logo, search icon, language toggle (FR | ع). Below: a compact hero band in sand
with one line of positioning and the free-delivery threshold; a horizontally scrolling
category strip; "Nouveautés" carousel of book cards; "Meilleures ventes" grid (2 columns);
a reassurance row — paiement à la livraison, livraison 58 wilayas, retour sous 48h. Bottom
tab bar throughout.

### S2 — Category listing
Sticky header with the category name and a result count. Filter row: sort (nouveauté, prix
croissant/décroissant), price range, availability. 2-column grid of book cards. Filters open
in a bottom sheet, with an applied-filters chip row when active.

### S3 — Search
Full-screen. Recent searches, suggestions as the user types, results reusing the S2 grid,
and a designed "no result" state with suggested categories.

### S4 — Book detail
Large cover on a sand band. Title, author, price (with strike-through original when
discounted), stock line ("En stock" / "Plus que 3 exemplaires" / "Rupture de stock").
Quantity stepper. Sticky bottom bar with the price and "Ajouter au panier". Below the fold:
a collapsible summary, a spec table (éditeur, pages, langue, ISBN, poids), a delivery-estimate
block, and "Du même auteur".

### S5 — Cart
Line items with cover thumb, title, unit price, quantity stepper, remove. Subtotal. A note
that the delivery fee is calculated at the next step. Sticky "Commander" bar. Empty-cart
state with a route back into the catalogue.

### S6 — Checkout — the screen that decides the business
Three steps on one scroll with a progress indicator at the top:
1. **Coordonnées** — full name, phone, optional second phone.
2. **Livraison** — wilaya select, commune select (dependent, searchable, 1 500+ communes so
   it must be a searchable sheet, not a native dropdown), then a choice between
   **À domicile** and **Point de retrait (stopdesk)** shown as two cards, each with its own
   price. Stopdesk reveals a center picker. Home reveals an address field.
3. **Récapitulatif** — items, subtotal, delivery fee, total in bold, a COD notice
   ("Vous payez à la livraison"), and the agreement checkbox linking to S9.

Design these states for the fee: **not yet calculated**, **loading**, **calculated**,
**unavailable — to be confirmed by phone**. The fee changing after the commune is picked must
feel deliberate, not like a glitch.

### S7 — Confirmation
Order number large and copyable, a "we will call you to confirm" line, the summary, and
buttons to track the order or keep shopping.

### S8 — Tracking
Order number + phone lookup. Then a vertical timeline: confirmée → préparée → expédiée →
livrée, with the Yalidine tracking number and the current carrier status.

### S9 — User agreement / conditions
Sections with a title and bullet points, `ul/li`, rendered from admin-entered content.
Needs a table of contents for long documents and comfortable reading measure. Also covers
the privacy and returns pages — one template.

### S10 — System states
404, offline, and a generic error, all in the same warm tone.

### Navigation
Bottom tab bar, 4 items: Accueil · Catégories · Recherche · Panier (with a count badge).
Top bar carries the logo, the language toggle, and contextual back.

---

## 6. Admin screens

Designed mobile-first too, but with a desktop layout at 1440 where tables can breathe.
On phones, **every table becomes a card list** — no horizontal scrolling tables.

- **A1 Login** — email + password, centered, logo, error state.
- **A2 Dashboard** — stat tiles (commandes du jour, à confirmer, chiffre d'affaires encaissé
  vs en attente, marge du mois), a low-stock list, top sellers, a recent-orders list.
- **A3 Books list** — search, category filter, status filter. Each row: cover thumb, title,
  price, stock badge, active toggle. FAB to add.
- **A4 Book editor** — sectioned form with **FR / AR tabs** at the top of the text fields.
  Cover upload with crop to 2:3. Categories multi-select. Price, weight (required — show the
  validation state), dimensions, stock, low-stock threshold. Sticky save bar with a dirty
  indicator.
- **A5 Stock** — per-book on-hand, a movement history timeline with typed entries
  (production, vente, retour, ajustement, casse), and an adjustment sheet requiring a reason.
- **A6 Production fees** — batch list per book, and a batch form: quantity + cost breakdown
  (impression, couverture, reliure, transport, autre) that computes the unit cost live and
  large. Show the resulting margin per book against the sale price.
- **A7 Sales** — the pipeline. Status tabs (En attente · Confirmées · Expédiées · Livrées ·
  Encaissées · Retours) with counts. Each order card: number, customer, wilaya, total,
  status pill, and a one-tap call button.
- **A8 Order detail** — customer block with call/copy, items, the money breakdown, the
  Yalidine block (create parcel → tracking number → print label), and a status timeline with
  the next action as the primary button.
- **A9 Agreement editor** — sections list with drag reorder; inside a section, a bullet-point
  builder (add, reorder, delete) with FR and AR side by side and a live preview of the public
  page.
- **A10 Settings** — store info, origin wilaya, free-delivery threshold, overweight rate,
  admin users.

Status pill colors: pending `--warning` · confirmed `--info` · shipped `--rose` ·
delivered `--success` · remitted `--success` solid · returned/cancelled `--danger`.

---

## 7. Component inventory

Deliver these as a component sheet with all states (default, hover, focus, active, disabled,
loading, error):

Button (primary, secondary, ghost, danger, icon) · Text input · Textarea · Searchable select
sheet · Quantity stepper · Checkbox · Radio card (used for delivery method) · Toggle ·
FR/AR tab switch · Language toggle · Book card (grid and list) · Price block · Stock badge ·
Status pill · Cart line item · Stat tile · Card-list row (admin) · Bottom sheet · Modal ·
Toast · Skeleton · Empty state · Bottom tab bar · Top app bar · Stepper/progress · Timeline ·
Cover uploader · Bullet-point list builder · Pagination.

---

## 8. Accessibility

- AA contrast on every text/background pair. The token set above is already compliant —
  keep it that way in any new combination.
- Visible focus rings (2px `--rose`, 2px offset) on every interactive element.
- Never communicate a state by color alone: status pills carry a label, stock states carry
  text.
- Form errors sit under the field, in `--danger`, with an icon.
- Target sizes ≥ 44px, including the quantity stepper and the delete icons.

---

## 9. What to deliver

1. **Style foundations** — the color tokens, type scale, spacing, radius and elevation as a
   single sheet.
2. **Component sheet** — section 7, all states.
3. **Storefront** — S1 through S10 at 390 × 844.
4. **Admin** — A1 through A10, phone first, plus a 1440 desktop layout for A2, A3 and A7.
5. **Arabic RTL versions** of S1, S4, S6 and A7 — enough to prove the mirroring works.
6. **Key states** — the checkout fee in all four of its states, one empty state, one error
   state, one skeleton.

Hand-off format: screens with visible spacing and token names, so the values can be
transcribed directly into Tailwind CSS variables.

---

## 10. One thing to get right above all else

**The delivery fee at checkout.** Algerian buyers abandon carts when the shipping cost is a
surprise. Show the fee the moment the commune is chosen, show it again in the summary, show
the total in the heaviest type on the screen, and make the home-vs-stopdesk price difference
impossible to miss. If that moment is clear and honest, the rest of the design has done its
job.
