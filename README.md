# G.Greens Lodge — Pub N' Grill (demo website)

Static multi-page site (HTML / CSS / JS, no build step, GitHub Pages ready). Open `index.html`.

## Pages
Home · Branches · Rooms · Dining · Events · Gallery · Book (stay / table / event wizard) · Contact

## Concept
"Lodge by day, pub by night" — built from the real logo: the sun, the mountain-roof line and the four-pane window.
- Day/night toggle (sun ↔ moon button in the header) switches the whole site; choice is remembered.
- Welcome preloader on the home page (once per session, "Skip intro" button included).
- House-shaped photo frames, roof-line section dividers, scroll-linked word reveals, parallax sun, day/night compare slider.
- Mobile: full-screen menu + sticky Call / Book / WhatsApp bar.

## Booking system (`book.html`, `js/book.js`)
- Three tabs: **Stay**, **Table**, **Event**.
- Stay wizard: Branch → Dates & guests (custom range calendar, quick picks, steppers) → Room + extras → Details → Review.
- Live summary panel (desktop sidebar, collapsible bar on mobile), validation, reference number (e.g. `GG-261106-AB3K`).
- Sends a ready-made WhatsApp message to the **main number +260 961 633 636** (also: email fallback + copy details).
- No payments / no availability engine — the lodge confirms by reply. Last guest name/phone is remembered in the browser.
- Deep links work: `book.html?branch=kazungula&in=2026-12-20&out=2026-12-23&g=3`, `?type=table`, `?type=event&kind=...`, `?room=garden-chalet`.

## Edit the basics in ONE place
`js/config.js` holds the WhatsApp number, email, branch names/addresses, sample room types and extras.
The phone/email also appear in the HTML footers and contact page — search for `961 633 636` / `info@ggreenslodge.com` to change everywhere.

## Needs confirming with G.Greens
- **Branch addresses**: Lusaka (12534/M Lilayi, Kasama Road) and Solwezi (Independence Avenue) came from public listings; Kazungula and Manyama addresses are marked "to confirm".
- **Rooms & rates**: room types are sample categories, all rates say "Rate on request". Check-in/out times differ by listing — confirm per branch.
- **Menu**: sample dishes, all "Price TBC".
- **Branch lines** found publicly (not used on the site, main number used instead): Kazungula 097 521 6666 / 097 692 6834; Solwezi 0777 752 555 / 0965 652 555.
- **Socials connected**: Facebook (Lusaka page + Kazungula page), WhatsApp, phone, email. No Instagram/TikTok found — to add later, copy an `.scard` block in `index.html` / `contact.html` and a link in the footer `.socials`.
- Facebook feed embed uses the Lusaka page; it only shows when the page allows embedding.

## Photos
All photos are stand-ins hotlinked from Wikimedia Commons (search the HTML for `commons.wikimedia.org`) and fall back to a green placeholder if offline.
Replace each `src` with a real G.Greens photo (put files in `assets/`). Footer states these are stand-in photos — remove that line once real photos are in.

## Accessibility / performance notes
Respects `prefers-reduced-motion`, keyboard-friendly tabs/calendar/lightbox, 44px+ tap targets, lazy-loaded images, no frameworks.

## Intro + banners (latest)
- Welcome intro "Open the window to sunrise": night & fireflies, four window panes light up, zoom through the glow into a Zambian sunrise, G.GREENS wordmark + 4 branch pins, then the sun opens up and reveals the site. Plays once per session on the homepage, has a Skip button, and is skipped for reduced-motion users.
- Every inner page opens with a photo banner and a big animated page title. Banner photos are set in `PHERO_IMG` in build.py.

## Mobile menu v2
Full-screen green menu that opens as a circle from the button, numbered links that stagger in, call/WhatsApp footer, and a burger that turns into a sun-yellow X which stays visible at any scroll position. Page scroll position is kept when it opens/closes.
