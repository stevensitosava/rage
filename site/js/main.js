/* ============================================
   RAFFY GELATO — Main JavaScript
   Stack: GSAP + ScrollTrigger, Vanilla JS
   ============================================ */

// Always start at the top — prevents broken ScrollTrigger state on reload
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

// AbortController for page-level event listeners (resize, scroll inside hero)
// Replaced on every page navigation so stale listeners self-remove.
let _pageAC = new AbortController();
function _pageSignal() { return _pageAC.signal; }
function _teardownPage() { _pageAC.abort(); _pageAC = new AbortController(); }

document.addEventListener('DOMContentLoaded', () => {

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ limitCallbacks: true, ignoreMobileResize: true });
    initVideoScroll();
    initAnimations();
    initFlavors();
  }

  initNav();
  initMobileMenu();
  initFaq();
  initFilterTabs();
  initContactForm();
  initRouter();
  if (typeof initFirebasePage === 'function') initFirebasePage();

});

/* ============================================
   NAVIGATION
   ============================================ */
function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  // Nav is invisible at page top; appears once the user starts scrolling
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ============================================
   MOBILE MENU
   ============================================ */
function initMobileMenu() {
  const toggle = document.querySelector('.nav-toggle');
  const menu   = document.querySelector('.mobile-menu');
  const close  = document.querySelector('.mobile-close');
  if (!toggle || !menu) return;

  const open = () => {
    menu.classList.add('open');
    document.body.style.overflow = 'hidden';
    toggle.setAttribute('aria-expanded', 'true');
  };
  const closeMenu = () => {
    menu.classList.remove('open');
    document.body.style.overflow = '';
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    menu.classList.contains('open') ? closeMenu() : open();
  });
  if (close) close.addEventListener('click', closeMenu);
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
}

/* ============================================
   FAQ ACCORDION
   ============================================ */
function initFaq() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach((item, i) => {
    const btn    = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!btn || !answer) return;
    const id = `faq-answer-${i}`;
    answer.id = id;
    btn.setAttribute('aria-controls', id);
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      items.forEach(el => {
        el.classList.remove('open');
        el.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ============================================
   MENU FILTER TABS
   ============================================ */
function initFilterTabs() {
  const tabs  = document.querySelectorAll('.filter-tab');
  const items = document.querySelectorAll('.menu-item[data-category]');
  if (!tabs.length) return;
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      items.forEach(item => {
        const show = filter === 'all' || item.dataset.category === filter;
        item.style.display = show ? '' : 'none';
        if (show && typeof gsap !== 'undefined') {
          gsap.fromTo(item, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
        }
      });
      // Page height changed — recalculate all ScrollTrigger positions
      if (typeof ScrollTrigger !== 'undefined') {
        requestAnimationFrame(() => ScrollTrigger.refresh());
      }
    });
  });
}

/* ============================================
   HERO — gelato animation canvas, scroll-driven
   80 JPEG frames from assets/frames/
   Desktop: sticky + GSAP scrub + zoom + fade
   Mobile:  scroll listener, static text
   ============================================ */
function initVideoScroll() {
  const section = document.querySelector('#video-scroll');
  if (!section) return;

  const canvas      = section.querySelector('.vs-canvas');
  const loadingEl   = section.querySelector('.vs-loading');
  const loadingFill = section.querySelector('.vs-loading-fill');
  const heroContent = section.querySelector('.hs-hero-content');
  const scrollCue   = section.querySelector('.hs-scroll-cue');
  const blackout    = section.querySelector('.vs-blackout');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    loadingEl && loadingEl.classList.add('hidden');
    if (heroContent) { heroContent.style.opacity = '1'; heroContent.style.transform = 'none'; }
    section.querySelectorAll('.hero-line, .hero-sub, .hero-ctas').forEach(el => {
      el.style.opacity = '1'; el.style.transform = 'none';
    });
    return;
  }

  // Mobile: animate hero text on page load — use fromTo so the clip-reveal works
  // (.hero-line starts at translateY(112%) in CSS, so `from` would go nowhere)
  if (window.innerWidth <= 768) {
    gsap.timeline({ delay: 0.3, defaults: { ease: 'power4.out' } })
      .fromTo(section.querySelector('.hero-eyebrow'),
        { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0)
      .fromTo(section.querySelectorAll('.hero-line'),
        { y: '112%' }, { y: '0%', duration: 1.0, stagger: 0.16 }, 0.22)
      .fromTo(section.querySelector('.hero-sub'),
        { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.72)
      .fromTo(section.querySelector('.hero-ctas'),
        { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.95);
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, currentIndex = 0;

  const FRAME_COUNT = 80;
  const images      = new Array(FRAME_COUNT);
  let loaded        = 0;

  function drawFrame(index, zoomProgress) {
    currentIndex = Math.max(0, Math.min(Math.round(index), FRAME_COUNT - 1));
    const img = images[currentIndex];
    if (!img || !img.complete || !img.naturalWidth) return;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const zoom  = 1 + (zoomProgress || 0) * 0.28;
    const scale = Math.max(W / iw, H / ih) * zoom;
    const sw = iw * scale, sh = ih * scale;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
  }

  function resizeCanvas() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame(currentIndex);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas, { passive: true, signal: _pageSignal() });

  function onLoaded() {
    loaded++;
    if (loadingFill) loadingFill.style.width = (loaded / FRAME_COUNT * 100).toFixed(0) + '%';
    if (loaded === FRAME_COUNT) {
      loadingEl && loadingEl.classList.add('hidden');
      drawFrame(0);
      if (window.innerWidth <= 768) {
        setupMobile();
      } else {
        setupDesktop();
        ScrollTrigger.refresh();
      }
    }
  }

  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    img.src    = `assets/frames/frame_${String(i + 1).padStart(4, '0')}.jpg`;
    img.onload = img.onerror = onLoaded;
    images[i]  = img;
  }

  // ── Mobile: scroll listener maps canvas exit → frame index ──
  function setupMobile() {
    const LAST = FRAME_COUNT - 1;
    let raf = null;

    // Cache layout values — reflow only on resize, not every scroll tick
    let sectionTop  = section.getBoundingClientRect().top + window.scrollY;
    let scrollRange = section.offsetHeight - window.innerHeight;

    window.addEventListener('resize', () => {
      sectionTop  = section.getBoundingClientRect().top + window.scrollY;
      scrollRange = section.offsetHeight - window.innerHeight;
    }, { passive: true, signal: _pageSignal() });

    function update() {
      raf = null;
      const progress = Math.max(0, Math.min(1, (window.scrollY - sectionTop) / scrollRange));

      drawFrame(progress * LAST);

      // Scroll cue fades out in first 15%
      if (scrollCue) {
        scrollCue.style.opacity = Math.max(0, 1 - progress / 0.15).toString();
      }

      // Hero content lifts + fades from 45% → 72%
      if (heroContent) {
        const t = Math.max(0, Math.min(1, (progress - 0.45) / 0.27));
        heroContent.style.opacity   = (1 - t).toString();
        heroContent.style.transform = t > 0 ? `translateY(${-t * 28}px)` : '';
      }

      // Espresso blackout closes from 70% → 92%
      if (blackout) {
        blackout.style.opacity = Math.max(0, Math.min(1, (progress - 0.70) / 0.22)).toString();
      }
    }

    window.addEventListener('scroll', () => {
      if (!raf) raf = requestAnimationFrame(update);
    }, { passive: true, signal: _pageSignal() });
    update();
  }

  // ── Desktop: GSAP scrub — frames + zoom + staggered hero reveal ──
  function setupDesktop() {
    const LAST = FRAME_COUNT - 1;

    const eyebrow = heroContent?.querySelector('.hero-eyebrow');
    const lines   = heroContent ? [...heroContent.querySelectorAll('.hero-line')] : [];
    const sub     = heroContent?.querySelector('.hero-sub');
    const ctas    = heroContent?.querySelector('.hero-ctas');

    // ── ON LOAD: eyebrow + title lines animate in immediately ──
    const loadTl = gsap.timeline({ delay: 0.35, defaults: { ease: 'power4.out' } });
    if (eyebrow) loadTl.fromTo(eyebrow,
      { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out' }, 0);
    lines.forEach((line, i) => {
      loadTl.fromTo(line, { y: '112%' }, { y: '0%', duration: 1.1 }, 0.22 + i * 0.18);
    });
    if (scrollCue) loadTl.fromTo(scrollCue,
      { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.9);

    // ── Frame scrub 1:1 with scroll progress; zoom applied in canvas draw ──
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate(self) { drawFrame(self.progress * LAST, self.progress); },
    });

    // ── Scroll timeline: sub + ctas reveal, then everything fades ──
    // 0-100 virtual units = full section scroll height
    const tl = gsap.timeline({
      scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: true },
    });

    // Subtitle slides in as user starts scrolling (5-17%)
    if (sub)  tl.fromTo(sub,
      { opacity: 0, y: 14 }, { opacity: 1, y: 0, ease: 'power3.out', duration: 12 }, 5);

    // CTAs follow shortly after (12-22%)
    if (ctas) tl.fromTo(ctas,
      { opacity: 0, y: 12 }, { opacity: 1, y: 0, ease: 'power3.out', duration: 10 }, 12);

    // Scroll cue fades when content is revealed (28-38%)
    if (scrollCue) tl.to(scrollCue, { opacity: 0, duration: 10 }, 28);

    // All hero content lifts and fades at ~52-72%
    if (heroContent) tl.to(heroContent, { opacity: 0, y: -44, ease: 'power3.in', duration: 20 }, 52);

    // Espresso blackout closes the hero (82-98%)
    if (blackout) tl.to(blackout, { opacity: 1, ease: 'none', duration: 16 }, 82);
  }
}

/* ============================================
   GSAP SCROLL ANIMATIONS
   ============================================ */
function initAnimations() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const mobile = window.innerWidth <= 768;

  /* ── Generic helpers — picked up by inner pages (about, menu, contact) ── */
  gsap.utils.toArray('.fade-up').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  gsap.utils.toArray('.fade-in').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0 },
      { opacity: 1, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  gsap.utils.toArray('.slide-left').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, x: mobile ? 0 : -44, y: mobile ? 28 : 0 },
      { opacity: 1, x: 0, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  gsap.utils.toArray('.slide-right').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, x: mobile ? 0 : 44, y: mobile ? 28 : 0 },
      { opacity: 1, x: 0, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  /* ── Story strip ───────────────────────────────────────────────────── */
  const storySection = document.querySelector('.story-strip');
  if (storySection) {
    const img   = storySection.querySelector('.story-image');
    const label = storySection.querySelector('.section-label');
    const h2    = storySection.querySelector('h2');
    const paras = [...storySection.querySelectorAll('p')];
    const btn   = storySection.querySelector('.btn');

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: { trigger: storySection, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
    if (img)   tl.fromTo(img,   { opacity: 0, x: mobile ? 0 : -52, y: mobile ? 26 : 0, scale: 0.96 },
                                  { opacity: 1, x: 0, y: 0, scale: 1, duration: 1.0, ease: 'power3.out' }, 0);
    if (label) tl.fromTo(label, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, mobile ? 0 : 0.1);
    if (h2)    tl.fromTo(h2,    { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }, mobile ? 0.14 : 0.24);
    paras.forEach((p, i) => {
      tl.fromTo(p, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, (mobile ? 0.3 : 0.38) + i * 0.13);
    });
    if (btn)   tl.fromTo(btn,   { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, mobile ? 0.55 : 0.65);
  }

  /* ── Pillars ───────────────────────────────────────────────────────── */
  const pillarsSection = document.querySelector('.pillars');
  if (pillarsSection) {
    const label = pillarsSection.querySelector('.section-label');
    const h2    = pillarsSection.querySelector('h2');
    const cards = [...pillarsSection.querySelectorAll('.pillar-card')];

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: { trigger: pillarsSection, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
    if (label) tl.fromTo(label, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0);
    if (h2)    tl.fromTo(h2,    { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.12);
    if (cards.length) tl.fromTo(cards,
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out' }, 0.18);
  }

  /* ── Seasonal ──────────────────────────────────────────────────────── */
  const seasonalSection = document.querySelector('.seasonal');
  if (seasonalSection) {
    const label = seasonalSection.querySelector('.section-label');
    const h2    = seasonalSection.querySelector('h2');
    const pEl   = seasonalSection.querySelector('.seasonal-header p');
    const cards = [...seasonalSection.querySelectorAll('.seasonal-card')];

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: { trigger: seasonalSection, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
    if (label) tl.fromTo(label, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0);
    if (h2)    tl.fromTo(h2,    { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.14);
    if (pEl)   tl.fromTo(pEl,   { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 0.3);
    if (cards.length) tl.fromTo(cards,
      { opacity: 0, y: 52, scale: 0.91 },
      { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.12, ease: 'power3.out' }, 0.46);
  }

  /* ── Testimonials ──────────────────────────────────────────────────── */
  const testiSection = document.querySelector('.testimonials');
  if (testiSection) {
    const label = testiSection.querySelector('.section-label');
    const h2    = testiSection.querySelector('h2');
    const cards = [...testiSection.querySelectorAll('.testimonial-card')];

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: { trigger: testiSection, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
    if (label) tl.fromTo(label, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0);
    if (h2)    tl.fromTo(h2,    { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.14);
    if (cards.length) tl.fromTo(cards,
      { opacity: 0, y: 46, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.65, stagger: 0.16, ease: 'power3.out' }, 0.35);
  }

  /* ── CTA Banner ────────────────────────────────────────────────────── */
  const ctaBanner = document.querySelector('.cta-banner');
  if (ctaBanner) {
    const h2   = ctaBanner.querySelector('h2');
    const pEl  = ctaBanner.querySelector('p');
    const btn  = ctaBanner.querySelector('.btn');
    const meta = [...ctaBanner.querySelectorAll('.cta-meta-item')];

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: { trigger: ctaBanner, start: 'top 90%', toggleActions: 'play none none none', invalidateOnRefresh: true },
    });
    if (h2)  tl.fromTo(h2,  { opacity: 0, scale: 0.87, y: 22 }, { opacity: 1, scale: 1, y: 0, duration: 0.85, ease: 'back.out(1.7)' }, 0);
    if (pEl) tl.fromTo(pEl, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.28);
    if (btn) tl.fromTo(btn, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.44);
    if (meta.length) tl.fromTo(meta, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }, 0.58);
  }

  /* ── Inner pages: flavor cards (menu.html) ─────────────────────────── */
  const flavorCards = gsap.utils.toArray('.flavor-card');
  if (flavorCards.length) {
    gsap.fromTo(flavorCards,
      { opacity: 0, y: 50, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: { trigger: '.flavor-grid', start: 'top 88%', toggleActions: 'play none none reverse' } });
  }

  /* ── Inner pages: process steps (about.html) ───────────────────────── */
  const steps = gsap.utils.toArray('.process-step');
  if (steps.length) {
    gsap.fromTo(steps,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.2, ease: 'power2.out',
        scrollTrigger: { trigger: '.process-steps', start: 'top 88%', toggleActions: 'play none none reverse' } });
  }

  /* ── Inner pages: menu items ───────────────────────────────────────── */
  const menuItems = gsap.utils.toArray('.menu-item');
  if (menuItems.length) {
    gsap.fromTo(menuItems,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out',
        scrollTrigger: { trigger: '.menu-grid', start: 'top 88%', toggleActions: 'play none none reverse' } });
  }
}

/* ============================================
   FLAVOURS REEL — headline clip-reveal + reel + stats fade
   ============================================ */
function initFlavors() {
  const section = document.querySelector('#flavors');
  if (!section) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    section.querySelectorAll('.fls-eyebrow, .fls-tl, .fls-sub, .fls-reel, .fls-stats, .fls-cta-btn')
      .forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
    return;
  }

  const isMobile = window.innerWidth <= 768;
  const eyebrow = section.querySelector('.fls-eyebrow');
  const lines   = section.querySelectorAll('.fls-tl');
  const sub     = section.querySelector('.fls-sub');
  const reel    = section.querySelector('.fls-reel');
  const stats   = section.querySelector('.fls-stats');
  const btn     = section.querySelector('.fls-cta-btn');

  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    scrollTrigger: {
      trigger: section,
      // Mobile: section overlaps hero — fire when section top enters at 85% of viewport
      // Desktop: fire when section top reaches 65% of viewport
      start: isMobile ? 'top 85%' : 'top 65%',
      end: 'bottom top',
      toggleActions: 'play none none reverse',
    },
  });

  if (eyebrow) tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.55 }, 0);
  if (lines[0]) tl.to(lines[0], { y: '0%', duration: 0.85, ease: 'power4.out' }, 0.1);
  if (lines[1]) tl.to(lines[1], { y: '0%', duration: 0.85, ease: 'power4.out' }, 0.3);
  if (sub)   tl.to(sub,   { opacity: 1, duration: 0.6 }, 0.4);
  if (reel)  tl.fromTo(reel,  { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 0.25);
  if (stats) tl.to(stats, { opacity: 1, duration: 0.55 }, 0.65);
  if (btn)   tl.fromTo(btn, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 0.8);
}

/* ============================================
   CONTACT FORM
   ============================================ */
function initContactForm() {
  const form = document.querySelector('#contact-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.textContent = 'Bericht verzonden!';
    btn.disabled = true;
    btn.style.background = '#4CAF50';
    setTimeout(() => {
      btn.textContent = original;
      btn.disabled = false;
      btn.style.background = '';
      form.reset();
    }, 3000);
  });
}

/* ============================================
   SPA CLIENT-SIDE ROUTER
   ============================================ */
const _pageCache = new Map();
let _navigating  = false;

async function navigateTo(url, push = true) {
  if (_navigating) return;
  _navigating = true;
  // Normalise both URLs for comparison (strip trailing slash / index.html variants)
  const norm = u => u.replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';
  if (norm(url) === norm(location.href)) {
    _navigating = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // Close mobile menu if open
  const mobileMenu = document.querySelector('.mobile-menu');
  const navToggle  = document.querySelector('.nav-toggle');
  if (mobileMenu?.classList.contains('open')) {
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
    navToggle?.setAttribute('aria-expanded', 'false');
  }

  // Release lock once navigation is done — wrapped in try/finally to be safe
  const releaseLock = () => { _navigating = false; };

  // Fade out current <main>
  const outEl = document.querySelector('main');
  if (outEl) {
    outEl.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
    outEl.style.opacity    = '0';
    outEl.style.transform  = 'translateY(10px)';
    outEl.style.pointerEvents = 'none';
    await new Promise(r => setTimeout(r, 230));
  }

  // Derive URLs: always fetch the .html file, always push the clean URL
  const _urlObj   = new URL(url);
  const _hasExt   = /\.[a-z0-9]{1,5}$/i.test(_urlObj.pathname);
  const fetchUrl  = _hasExt ? url : _urlObj.pathname === '/'
    ? url
    : url.replace(_urlObj.pathname, _urlObj.pathname.replace(/\/?$/, '.html'));
  const cleanUrl  = url.replace(/\/index\.html(?=$|\?|#)/, '/').replace(/\.html(?=$|\?|#)/, '');

  // Fetch new page (use cache for instant revisits)
  let html = _pageCache.get(cleanUrl);
  if (!html) {
    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(res.statusText);
      html = await res.text();
      _pageCache.set(cleanUrl, html);
    } catch {
      releaseLock();
      location.href = url;
      return;
    }
  }

  const doc    = new DOMParser().parseFromString(html, 'text/html');
  const newMain = doc.querySelector('main');
  if (!newMain) { releaseLock(); location.href = url; return; }

  // Kill all GSAP ScrollTrigger instances + page listeners
  if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.getAll().forEach(t => t.kill());
  _teardownPage();

  // Swap <main>
  outEl?.replaceWith(newMain);

  // Update <title> and meta description
  document.title = doc.title;
  const newDesc = doc.querySelector('meta[name="description"]');
  const curDesc = document.querySelector('meta[name="description"]');
  if (newDesc && curDesc) curDesc.setAttribute('content', newDesc.getAttribute('content'));

  // Push history state — store fetchUrl so popstate can refetch without server round-trip
  if (push) history.pushState({ url: cleanUrl, fetchUrl }, doc.title, cleanUrl);

  // Scroll to top
  window.scrollTo(0, 0);

  // Highlight active nav link
  _syncNavLinks(cleanUrl);

  // Wait for browser to lay out the new DOM before GSAP measures positions
  const inEl = document.querySelector('main');
  if (inEl) {
    inEl.style.opacity    = '0';
    inEl.style.transform  = 'translateY(10px)';
    inEl.style.transition = 'none';
  }

  requestAnimationFrame(() => requestAnimationFrame(() => {
    // Re-init page-specific JS after layout is ready
    _reinitPage();

    // Refresh ScrollTrigger so all positions are recalculated on the new DOM
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();

    // Fade in
    if (inEl) {
      inEl.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      inEl.style.opacity    = '1';
      inEl.style.transform  = 'translateY(0)';
    }

    releaseLock();
  }));
}

function _syncNavLinks(url) {
  const path = new URL(url).pathname;
  document.querySelectorAll('.nav-link').forEach(a => {
    const href = (a.getAttribute('href') || '').replace(/\.html$/, '');
    const isActive = href === '/' ? path === '/' : path.endsWith(href);
    a.classList.toggle('active', isActive);
  });
}

function _reinitPage() {
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    const p = location.pathname;
    if (p === '/' || p === '' || p.endsWith('/') || p.endsWith('index.html')) {
      initVideoScroll();
    }
    initAnimations();
    initFlavors();
  }
  initFaq();
  initFilterTabs();
  initContactForm();
  if (typeof initFirebasePage === 'function') initFirebasePage();
}

function initRouter() {
  // Intercept all internal <a> clicks
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (
      !href ||
      href.startsWith('http') || href.startsWith('//') ||
      href.startsWith('#')    || href.startsWith('mailto:') ||
      href.startsWith('tel:') || a.target === '_blank'
    ) return;
    e.preventDefault();
    navigateTo(new URL(href, location.href).href);
  });

  // Back / forward buttons — prefer fetchUrl stored in state so local dev can re-fetch .html
  window.addEventListener('popstate', e => {
    navigateTo(e.state?.fetchUrl || e.state?.url || location.href, false);
  });

  // Seed the history state for the current page
  const _initClean = location.href
    .replace(/\/index\.html(?=$|\?|#)/, '/')
    .replace(/\.html(?=$|\?|#)/, '');
  history.replaceState({ url: _initClean, fetchUrl: location.href }, document.title, _initClean);

  // Prefetch on hover — pages load before the user clicks
  document.addEventListener('mouseover', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (
      !href ||
      href.startsWith('http') || href.startsWith('//') ||
      href.startsWith('#')    || href.startsWith('mailto:') ||
      href.startsWith('tel:') || a.target === '_blank'
    ) return;
    const url = new URL(href, location.href).href;
    if (!_pageCache.has(url)) {
      fetch(url).then(r => r.text()).then(h => _pageCache.set(url, h)).catch(() => {});
    }
  }, { passive: true });
}
