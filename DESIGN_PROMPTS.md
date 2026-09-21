# Claude Design — prompt sequence

Paste these one at a time into the design-system project at claude.ai/design.
Wait for each pass to finish and eyeball it before sending the next: later passes
build on the tokens and components from the earlier ones.

---

## Message 1 — the brief

> Attach `DESIGN_BRIEF.md`, or paste its full contents, followed by:

Here is the full brief for the product I want designed. Read it and confirm back to me,
in a short list, the palette tokens, the type scale and the screen inventory you extracted
— I want to check we agree before you design anything. Don't produce any screens yet.

---

## Message 2 — foundations

Build the style foundations page: the color tokens exactly as specified in the brief (do
not substitute your own values), the type scale in both Latin and Arabic faces, the spacing
scale, radii, and the three shadow levels. Show each token with its name and value so the
values can be transcribed into CSS variables.

---

## Message 3 — components

Now the component sheet from section 7 of the brief. Every component in every state:
default, hover, focus, active, disabled, loading, error. Group them as Actions, Forms,
Commerce, Navigation, Feedback. Use only the tokens from the foundations page.

---

## Message 4 — storefront, core path

Design S1 Home, S4 Book detail, S5 Cart at 390x844. Mobile only. Use the components you
just built — do not invent new ones without telling me.

---

## Message 5 — checkout (the important one)

Design S6 Checkout at 390x844, all three steps, plus the four delivery-fee states:
not yet calculated, loading, calculated, and unavailable-confirm-by-phone. Then S7
Confirmation and S8 Tracking.

The delivery fee is the make-or-break moment of this product — see section 10 of the
brief. Show me two different approaches to presenting it and tell me which you'd pick.

---

## Message 6 — storefront, the rest

S2 Category listing with its filter sheet, S3 Search including the no-results state,
S9 the agreement/conditions template, and S10 (404, offline, generic error).

---

## Message 7 — admin, phone

A1 Login, A2 Dashboard, A7 Sales pipeline, A8 Order detail — phone width first.
Remember: tables become card lists on phones, never horizontal scroll.

---

## Message 8 — admin, the rest

A3 Books list, A4 Book editor with its FR/AR tabs, A5 Stock, A6 Production fees,
A9 Agreement editor, A10 Settings. Then desktop 1440 layouts for A2, A3 and A7 only.

---

## Message 9 — Arabic

Now the Arabic RTL versions of S1, S4, S6 and A7. Mirror the layout, navigation order,
icons and progress steppers. Do not mirror book covers or the logo. Prices and numbers
stay left-to-right inside the Arabic text. Use Tajawal for headings since Fraunces has
no Arabic coverage.

---

## Message 10 — before handing back to code

Give me a final summary: every token with its value, every component with its file path
in this project, and any place where you deviated from the brief and why.

---

## Then come back here

Tell Claude Code the project name and say you want it synced. It reads the project
directly and builds the components against the real tokens instead of guessing.
