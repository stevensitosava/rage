# 03 — Build Brief: Raffy Gelato Website

---

## Design Direction

### Color System
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#E8704A` | CTAs, highlights, logo mark |
| `--color-cream` | `#FDF6EC` | Page backgrounds, cards |
| `--color-espresso` | `#2D1B0E` | Dark sections, footer, text |
| `--color-gold` | `#F5C842` | Accent highlights, hover states |
| `--color-blush` | `#FAD4C0` | Subtle section backgrounds |
| `--color-white` | `#FFFFFF` | Contrast text on dark sections |

**Rationale:** Terracotta/coral differentiates from the pink/pastel crowd. The espresso brown grounds the palette in richness and authenticity. Cream creates breathing room.

### Typography
- **Display (H1/H2):** Cormorant Garamond — 700 weight, letter-spaced. Google Fonts.
- **Body:** Nunito — 400/600 weight. Clean, warm, readable. Google Fonts.
- **Accent:** Cormorant Garamond italic for pullquotes and flavor descriptions.

### Animation Style
- **Entry animations:** Fade-up on scroll (GSAP ScrollTrigger)
- **Hero:** Parallax depth on background image + floating gelato asset
- **Flavor cards:** Scale up + shadow deepen on hover
- **Navigation:** Shrink + backdrop-blur on scroll
- **Section transitions:** Staggered child animations (0.1s delay between items)
- **CTA buttons:** Color fill sweep on hover (left-to-right clip-path animation)

### Photography Style (Placeholder direction)
- Dark surfaces (slate, marble, wood) with product as hero
- Natural ingredients scattered around (berries, nuts, vanilla pods)
- Warm directional lighting — golden hour feel
- Avoid: white backgrounds, top-down only shots

---

## Site Architecture

### Pages
| Page | File | Purpose |
|------|------|---------|
| Home | `index.html` | First impression, drive to menu + visit |
| Menu | `menu.html` | Full flavor catalog, drive appetite + urgency |
| About | `about.html` | Build trust, tell the Raffy story |
| Contact | `contact.html` | Location, hours, inquiries |
| 404 | `404.html` | On-brand error recovery |

### Navigation Structure
```
[ Raffy Gelato logo ] ——— Menu  |  About  |  Find Us  ——— [ Order Now ]
```

### Content Hierarchy Per Page

#### index.html (Home)
1. **Hero** — Full-bleed, 100vh. Headline + subhead + 2 CTAs. Nano Banana 3D asset placeholder.
2. **Flavor Spotlight** — 3 featured flavors with scroll-triggered card reveal.
3. **Our Story** — 50/50 split: image left, text right. Brief brand story with link to About.
4. **Why Raffy** — 3 icon columns: Real Ingredients / Small Batches / Made Daily.
5. **Seasonal Flavors** — Horizontal scroll strip of 4 seasonal cards.
6. **Testimonials** — 3 customer quotes, dark section background.
7. **CTA Banner** — "Find us today" with location and hours.
8. **Footer** — Links, social, copyright.

#### menu.html
1. **Page Hero** — Compact, 40vh. "What will you scoop today?"
2. **Filter Tabs** — Classic / Seasonal / Sorbet / Sugar-Free
3. **Flavor Grid** — Cards with name, description, key ingredients, price.
4. **Allergen Note** — Clear, accessible disclaimer.
5. **CTA** — "Visit us to try before you buy."

#### about.html
1. **Page Hero** — 50vh, atmospheric image with "The Raffy Story" headline.
2. **Founder Story** — Long-form copy section, personal and warm.
3. **Our Process** — 3-step visual: Source → Craft → Serve.
4. **Values** — 3 pillars: Seasonal / Authentic / Community.
5. **Gallery Strip** — Horizontal scroll of shop/process images (placeholders).
6. **CTA** — "Come taste the difference."

#### contact.html
1. **Page Hero** — Compact, 40vh.
2. **Split layout** — Left: hours + location + map embed placeholder. Right: contact form.
3. **FAQ** — 4 collapsed accordion items.
4. **Footer** — Same as all pages.

---

## Content Framework

### Homepage Headline Options
1. "Gelato the Way It Was Meant to Be." *(Heritage positioning)*
2. "Every Scoop Tells a Story." *(Emotional positioning)*
3. "Made Slow. Eaten Fast." *(Playful contrast)*

**Recommended:** Option 3 — punchy, memorable, on-brand.

### Subheadline
"Small-batch gelato crafted daily from real ingredients. No shortcuts. Just joy."

### SEO Keywords (from competitor gap analysis)
- "artisan gelato [city]"
- "best ice cream shop near me"
- "handmade gelato"
- "small batch ice cream"
- "gelato flavors"
- "Italian gelato shop"

---

## Conversion Playbook

### Primary Goal
Drive foot traffic → Get address + hours in front of the visitor within 5 seconds.

### Secondary Goal
Email/social follow for flavor announcements and seasonal drops.

### CTA Strategy Per Page
| Page | Primary CTA | Secondary CTA |
|------|-------------|---------------|
| Home | "See Our Flavors" | "Find Us" |
| Menu | "Visit Us Today" | "Follow for New Flavors" |
| About | "Come Taste the Difference" | "See Our Menu" |
| Contact | "Send Message" | — |

### Social Proof Plan
- 3 testimonials on homepage (authentic quotes)
- Google rating badge in the header or hero
- Instagram feed embed in footer area (Phase 2)
- Press mentions if/when available

### Trust Signal Checklist
- [x] Real address + phone number visible without scrolling
- [x] Hours of operation on every page (footer)
- [x] Fresh/local ingredient callouts
- [x] Photo of the shop/founder (About page)
- [x] SSL padlock (HTTPS deployment)
