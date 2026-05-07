# Raffy Gelato — Project Status & Change Log

**Site:** raffygelato.nl
**Stack:** Vanilla HTML/CSS/JS · Firebase Firestore · GSAP · GitHub Pages
**Repo:** github.com/stevensitosava/rage

---

## Current State (May 2026)

### Live Features
- Scroll-driven hero animation (video scrubbing — 275 KB desktop / 383 KB mobile)
- Real-time menu via Firebase Firestore with admin dashboard
- Dynamic categories (add/edit/delete from admin, reflects instantly on site)
- Smaken section: 65+ flavours, allergenenwijzer modal (14 allergens), vegan markering
- Contact form (needs real email service — Web3Forms recommended)
- Visitor tracker (session-based, admin-only stats panel)
- WebP images throughout (50–77% smaller than originals)
- Mobile-specific hero video (portrait 9:16)
- Text logo: RAFFY (italic, primary wine) / Gelato Italiano (gold, letter-spaced)
- Hamburger menu: 3-line → X animation

### Admin Dashboard (`/admin/dashboard.html`)
- Tabs: **Menu · Categorieën · Index Pagina · Over Ons · Contact · 📊 Statistieken**
- Menu tab has category filter tabs (Gelato · Smaken · Crêpes · Miniwafels · Dranken)
- Position-swap input on each row (type target position + Enter)
- Price field: € prefix built-in, numeric validation, required for non-smaken
- Statistics tab: today / week / total visitors (admin-only)

### Pages
| Page | File | Status |
|------|------|--------|
| Home | `index.html` | ✅ Live |
| Menu | `menu.html` | ✅ Live — data from Firestore |
| About | `about.html` | ✅ Live |
| Contact | `contact.html` | ✅ Live — form not wired to email |
| Brand Card | `brand-card.html` | ✅ Internal reference |

---

## Change Log

### May 2026 — Session 3 (latest)

**Deployed:**
- **Logo redesign:** image logo → text logo "RAFFY" (Cormorant Garamond italic, primary wine color) + "Gelato Italiano" (Nunito uppercase, gold, letter-spacing 0.4em). Gold gradient on footer version. Drop-shadow for contrast.
- **Hamburger menu:** ice cream animation removed → clean 3-line → X CSS animation
- **Hero text:** removed "Gelato Italiano · Oude Markt, Tilburg" eyebrow; sub text updated to "Van romig ijs tot knapperige wafels en crêpes - dé plek om jezelf te verwennen in het hart van Tilburg."
- **Flavour showcase section:** eyebrow "Italiaans & Grieks Gelato" → "Italiaans Gelato"; sub "60 smaken" → "40+"; stats "30+" → "40+"
- **Crêpes & Wafels section:** removed "& Dranken" from title; updated description text
- **Real story added:** index + about pages updated with real Raffy history (Bulgaria 1997, Tilburg 2025)
- **CTA banners:** removed phone/address/hours from index, menu, contact CTA banners
- **Allergenenwijzer modal:** updated from 9 to 14 allergens (correct Dutch names); mobile button reliability fix (touch-action: manipulation, 44px min touch target)
- **Allergen note card:** removed margin-top
- **SEO full update:** all pages — raffygelato.com → raffygelato.nl; removed "Grieks" and "25 jaar" from all meta descriptions, OG tags, Twitter cards, JSON-LD schema
- **sitemap.xml:** domain updated, dates updated to 2026-05-02, comment removed
- **robots.txt:** domain updated
- **Favicon:** changed from logo.png → helado-full.webp on all pages
- **Brand card:** domain updated, "Grieks" references removed, content updated

### May 2026 — Session 2

- Brand card (`brand-card.html`) created and updated with research data, real Tilburg competitors, current tech stack
- `visit-tracker.js` merged into `main.js`, file deleted
- `/admin/seed.html` deleted (no longer needed)
- Hero animation: switched from 77 WebP frames to video scrubbing (A+C) — 95% smaller
- Frame reload when crossing 768px breakpoint in DevTools
- About page: founder image hidden on mobile
- Categories: real-time updates via `onSnapshot`

### April–May 2026 — Session 1

- **Menu:** Real Raffy menu from PDF — 119 items (gelato, smaken, crepes, miniwafels, drinks)
- **Smaken section:** 65 flavours with allergen numbers, vegan marker, allergenenwijzer modal
- **Categories system:** Firestore `categories` collection, fully dynamic tabs
- **Admin categories panel:** CRUD for categories (owner + admin)
- **Price field:** € prefix input with numeric validation
- **Position swap:** type number to reorder items in admin
- **Competitor research:** Updated to real Tilburg-area shops
- **WebP conversion:** All images converted (50–77% size reduction)
- **Video hero scrubbing:** Video-based animation (275 KB vs 6.4 MB frames)

---

## Known Issues / To Do

- [ ] Contact form not connected to email (Web3Forms recommended)
- [ ] Prices still at € 1,00 placeholder — update real prices via admin
- [ ] Testimonials on homepage need real customer quotes (admin → Index Pagina)
- [ ] Seasonal cards on homepage need real content (admin → Index Pagina)
- [ ] about.html: `icecreams.jpg` still referenced (old filename — update when real photo added)

---

## Architecture Notes

### Firebase Collections
| Collection | Purpose |
|------------|---------|
| `flavors` | All menu items (gelato, smaken, crepes, etc.) |
| `categories` | Menu filter categories — dynamic tabs |
| `pages/index` | Homepage editable content (story, pillars, seasonal, testimonials) |
| `about/main` | About page content |
| `contact/main` | Contact info, hours, map |
| `site_visits` | Visitor count per day + total |
| `admin_users` | Email allowlist (role: admin \| owner) |

### Key Files
| File | Purpose |
|------|---------|
| `site/js/main.js` | GSAP animations, hero video scrub, nav, router, visit tracker |
| `site/js/page-loader.js` | Firebase real-time data → public pages, allergen modal |
| `site/js/components.js` | Shared nav + footer HTML (text logo, hamburger) |
| `site/admin/js/admin.js` | All admin dashboard logic |
| `site/css/styles.css` | All public styles |
| `site/admin/css/admin.css` | Admin dashboard styles |

### Hero Animation
- Desktop: `assets/video-hero.mp4` (275 KB) → video.currentTime scrubbing
- Mobile: `assets/video-hero-mobile.mp4` (383 KB) → same, portrait 9:16
- Backup frames: `assets/frames-original/` (80 frames, old gelato animation)
- To restore old animation: copy frames-original/ → frames/ and push
