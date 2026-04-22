# Raffy Gelato — Website Handoff Guide

A premium 5-page website for Raffy Gelato, a small-batch artisan gelato shop.

---

## Project Structure

```
raffy-gelato/
├── research/
│   ├── 01-client-brand.md          ← Brand identity rationale
│   ├── 02-competitor-analysis.md   ← Niche research + competitor scoring
│   ├── 03-build-brief.md           ← Master architecture + content plan
│   └── niche-analysis-report.md    ← Client-facing PDF/sales report
├── site/
│   ├── index.html                  ← Homepage
│   ├── menu.html                   ← Full flavor menu (filterable)
│   ├── about.html                  ← Founder story + process + values
│   ├── contact.html                ← Location, hours, contact form, FAQ
│   ├── 404.html                    ← On-brand error page
│   ├── sitemap.xml                 ← SEO sitemap (update domain before deploy)
│   ├── robots.txt                  ← Search engine directives
│   ├── css/
│   │   └── styles.css              ← Full stylesheet (CSS custom properties)
│   ├── js/
│   │   └── main.js                 ← GSAP animations + nav + FAQ + filters
│   └── assets/                     ← Drop logo, favicon, og-image, photos here
└── README.md
```

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| HTML | Semantic HTML5 | SEO + accessibility |
| CSS | Custom Properties + Mobile-first | No framework bloat |
| Animation | GSAP 3 + ScrollTrigger | Industry-standard, buttery smooth |
| Fonts | Google Fonts (Cormorant Garamond + Nunito) | Elegant + readable |
| Hosting | Netlify or Vercel | Free, HTTPS, instant deploy |

---

## Before You Deploy

### 1. Replace Placeholder Content

Search for these strings and replace with real information:

| Placeholder | Replace With |
|-------------|-------------|
| `123 Main Street` | Real address |
| `Your City, ST 00000` | Real city, state, zip |
| `(555) 000-0000` | Real phone number |
| `hello@raffygelato.com` | Real email |
| `https://raffygelato.com` | Real domain (in sitemap.xml) |
| All `🏪`, `👨‍🍳`, `🍦` emojis | Real photographs |

### 2. Add Real Photos

Recommended photography for each placeholder:

| Location | Dimensions | Notes |
|----------|-----------|-------|
| Hero asset | 560 × 560 px | **Nano Banana 3D asset** — see below |
| Founder portrait (about.html) | 480 × 640 px | Warm, natural light |
| Shop exterior (about gallery) | 400 × 600 px | Golden hour preferred |
| Flavor cards (index.html) | 800 × 600 px | Dark surface, styled |
| Story section image (index.html) | 600 × 450 px | Atmospheric, shop interior |

### 3. Nano Banana 3D Asset

The hero section has a clearly marked placeholder:

```html
<!-- NANO BANANA ASSET HERE -->
<!-- Dimensions: 560 × 560 px | Format: PNG transparent or WebGL canvas -->
```

Generate a 3D gelato cone/cup in Nano Banana 2, export as PNG with transparent background,
and replace the `.hero-asset-placeholder` div with an `<img>` tag pointing to your asset.

### 4. Connect the Contact Form

The contact form at `contact.html` needs a backend. Two free options:

**Option A — Netlify Forms (easiest):**
Add `data-netlify="true"` to the `<form>` element:
```html
<form id="contact-form" name="contact" data-netlify="true">
```
Netlify handles everything automatically when deployed there.

**Option B — Formspree:**
```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```
Sign up at formspree.io, create a form, and paste your form ID.

### 5. Add Favicon + OG Image

- Drop `favicon.ico` into `site/assets/`
- Drop `og-image.jpg` (1200 × 630 px) into `site/assets/`

---

## Deployment

### Netlify (recommended)
1. Drag the `site/` folder to [netlify.com/drop](https://netlify.com/drop)
2. Done. You'll get a live HTTPS URL instantly.
3. Connect a custom domain in the Netlify dashboard.

### Vercel
1. Push this repo to GitHub
2. Import at [vercel.com](https://vercel.com)
3. Set root directory to `site/`
4. Deploy.

---

## What to Update Regularly

| Frequency | Task |
|-----------|------|
| Weekly | Update seasonal flavor cards on menu.html |
| Monthly | Rotate the seasonal strip on index.html |
| As needed | Add new testimonials |
| As needed | Update hours for holidays |

---

## Brand Quick Reference

| Token | Value |
|-------|-------|
| Primary color | `#E8704A` (Terracotta Coral) |
| Background | `#FDF6EC` (Cream Ivory) |
| Dark | `#2D1B0E` (Espresso Brown) |
| Accent | `#F5C842` (Warm Honey Gold) |
| Heading font | Cormorant Garamond 700 |
| Body font | Nunito 400/600 |
| Tagline | "Made Slow. Eaten Fast." |

---

## Cost Breakdown (for client reference)

| Deliverable | Value |
|-------------|-------|
| Brand identity (colors, fonts, tone, messaging) | $1,500 |
| Competitive niche analysis + report | $1,200 |
| 5-page website (HTML/CSS/JS) | $5,500 |
| GSAP scroll animations | $1,200 |
| SEO setup (schema, meta, sitemap) | $800 |
| Mobile-first responsive design | $800 |
| **Total** | **$11,000** |

*Hosting, domain registration, and photography are not included.*

---

*Built by SRSS Design · April 2026*
