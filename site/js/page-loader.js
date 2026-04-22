// Raffy Gelato — Firebase Page Loader
// Called by main.js on every page load and after every SPA navigation.
// Detects current page and loads the appropriate Firestore content.
// Depends on: firebase-data.js

function initFirebasePage() {
  if (typeof db === 'undefined') return; // Firebase not yet configured
  const p = location.pathname;
  if      (p.endsWith('menu.html')    || p.endsWith('/menu'))    loadMenuPage();
  else if (p.endsWith('about.html')   || p.endsWith('/about'))   loadAboutPage();
  else if (p.endsWith('contact.html') || p.endsWith('/contact')) loadContactPage();
  else if (p === '/' || p.endsWith('index.html') || p === '')    loadIndexPage();
}

/* ============================================================
   MENU PAGE — replaces static .menu-grid with Firestore items
   ============================================================ */
async function loadMenuPage() {
  const grid = document.querySelector('.menu-grid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--color-text-light);">Laden…</div>';

  try {
    const flavors = await getFlavors();

    if (!flavors.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--color-text-light);">Geen smaken beschikbaar.</p>';
      return;
    }

    grid.innerHTML = flavors.map(_buildMenuItemHTML).join('');

    // Re-init filter tabs now that items are in the DOM
    if (typeof initFilterTabs === 'function') initFilterTabs();

    // Apply GSAP entrance animation to dynamically rendered items
    if (typeof gsap !== 'undefined') {
      gsap.fromTo('.menu-item',
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out',
          scrollTrigger: {
            trigger: '.menu-grid',
            start: 'top 88%',
            toggleActions: 'play none none reverse'
          }
        }
      );
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    }
  } catch (err) {
    console.error('[Raffy] Menu laden mislukt:', err);
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--color-text-light);">Menu kon niet worden geladen.</p>';
  }
}

function _buildMenuItemHTML(flavor) {
  const emoji    = flavor.emoji       || '🍦';
  const name     = _esc(flavor.name        || '');
  const price    = _esc(flavor.price       || '');
  const desc     = _esc(flavor.description || '');
  const category = _esc(flavor.category   || 'gelato');
  return `
    <article class="menu-item" data-category="${category}" role="listitem">
      <div class="menu-item-emoji" aria-hidden="true">${emoji}</div>
      <div class="menu-item-info">
        <div class="menu-item-header">
          <span class="menu-item-name">${name}</span>
          <span class="menu-item-price">${price}</span>
        </div>
        <p class="menu-item-desc">${desc}</p>
      </div>
    </article>`;
}

/* ============================================================
   ABOUT PAGE — updates text/image of existing DOM elements
   ============================================================ */
async function loadAboutPage() {
  const storySection = document.querySelector('.about-story');
  if (!storySection) return;

  try {
    const data = await getAbout();
    if (!data) return; // Use static HTML as fallback

    // Founder image
    if (data.imageUrl) {
      const img = storySection.querySelector('.about-founder-img img');
      if (img) img.src = data.imageUrl;
    }

    // Story text
    const textEl = storySection.querySelector('.about-text');
    if (textEl) {
      const label = textEl.querySelector('.section-label');
      const h2    = textEl.querySelector('h2');
      const paras = textEl.querySelectorAll('p');
      if (label && data.storyLabel)      label.textContent = data.storyLabel;
      if (h2    && data.storyTitle)      h2.innerHTML      = data.storyTitle;
      if (paras[0] && data.storyParagraph1) paras[0].textContent = data.storyParagraph1;
      if (paras[1] && data.storyParagraph2) paras[1].textContent = data.storyParagraph2;
      if (paras[2] && data.storyParagraph3) paras[2].textContent = data.storyParagraph3;
    }

    // Process steps
    if (data.processSteps && data.processSteps.length) {
      const steps = document.querySelectorAll('.process-step');
      data.processSteps.forEach((step, i) => {
        if (!steps[i]) return;
        const h3 = steps[i].querySelector('h3');
        const p  = steps[i].querySelector('p');
        if (h3 && step.title)       h3.textContent = step.title;
        if (p  && step.description) p.textContent  = step.description;
      });
    }

    // Values
    if (data.values && data.values.length) {
      const cards = document.querySelectorAll('.value-card');
      data.values.forEach((val, i) => {
        if (!cards[i]) return;
        const icon = cards[i].querySelector('.value-icon');
        const h3   = cards[i].querySelector('h3');
        const p    = cards[i].querySelector('p');
        if (icon && val.icon)        icon.textContent = val.icon;
        if (h3   && val.title)       h3.textContent   = val.title;
        if (p    && val.description) p.textContent    = val.description;
      });
    }
  } catch (err) {
    console.error('[Raffy] About laden mislukt:', err);
  }
}

/* ============================================================
   CONTACT PAGE — updates existing info cards with Firestore data
   ============================================================ */
async function loadContactPage() {
  const contactSection = document.querySelector('.contact-section');
  if (!contactSection) return;

  try {
    const data = await getContact();
    if (!data) return; // Use static HTML as fallback

    const cards = contactSection.querySelectorAll('.contact-info-card');

    // [0] Address
    if (data.address && cards[0]) {
      const p = cards[0].querySelector('p');
      if (p) {
        const addr = _esc(data.address).replace(/\n/g, '<br>');
        const link = _esc(data.addressUrl || 'https://maps.google.com/?q=Oude+Markt+1,+5038+TJ+Tilburg');
        p.innerHTML = `${addr}<br><a href="${link}" target="_blank" rel="noopener noreferrer" style="color:var(--color-primary);font-weight:600;text-decoration:underline;">Routebeschrijving →</a>`;
      }
    }

    // [1] Opening hours
    if (data.hoursWeekdays && cards[1]) {
      const p = cards[1].querySelector('p');
      if (p) {
        p.innerHTML = `${_esc(data.hoursWeekdays)}<br>${_esc(data.hoursSaturday || '')}<br>${_esc(data.hoursSunday || '')}`;
      }
    }

    // [2] Phone
    if (data.phone && cards[2]) {
      const p = cards[2].querySelector('p');
      if (p) {
        p.innerHTML = `<a href="tel:${_esc(data.phone)}">${_esc(data.phoneDisplay || data.phone)}</a>`;
      }
    }

    // [3] Email
    if (data.email && cards[3]) {
      const p = cards[3].querySelector('p');
      if (p) {
        p.innerHTML = `<a href="mailto:${_esc(data.email)}">${_esc(data.email)}</a><br><span style="font-size:0.8rem;color:var(--color-text-light);">We reageren binnen 24 uur.</span>`;
      }
    }

    // [4] Instagram
    if (data.instagram && cards[4]) {
      const p = cards[4].querySelector('p');
      if (p) {
        const igUrl = _esc(data.instagramUrl || '#');
        p.innerHTML = `<a href="${igUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--color-primary);">@${_esc(data.instagram)}</a><br><span style="font-size:0.8rem;color:var(--color-text-light);">Volg ons voor dagelijkse smaken &amp; aanbiedingen.</span>`;
      }
    }

    // Google Maps embed
    if (data.mapEmbedUrl) {
      const iframe = contactSection.querySelector('iframe');
      if (iframe) iframe.src = data.mapEmbedUrl;
    }

  } catch (err) {
    console.error('[Raffy] Contact laden mislukt:', err);
  }
}

/* ============================================================
   INDEX PAGE — updates story strip, pillars, seasonal section
   Hero section is intentionally excluded per project rules.
   ============================================================ */
async function loadIndexPage() {
  try {
    const data = await getIndexContent();
    if (!data) return; // Use static HTML as fallback

    // Story strip
    const storySection = document.querySelector('.story-strip');
    if (storySection) {
      const img   = storySection.querySelector('.story-image img');
      const label = storySection.querySelector('.section-label');
      const h2    = storySection.querySelector('h2');
      const paras = storySection.querySelectorAll('p');
      if (img   && data.storyImageUrl) img.src            = data.storyImageUrl;
      if (label && data.storyLabel)    label.textContent  = data.storyLabel;
      if (h2    && data.storyTitle)    h2.innerHTML       = data.storyTitle;
      if (paras[0] && data.storyText1) paras[0].textContent = data.storyText1;
      if (paras[1] && data.storyText2) paras[1].textContent = data.storyText2;
    }

    // Pillars ("Waarom Raffy?")
    if (data.pillars && data.pillars.length) {
      const cards = document.querySelectorAll('.pillar-card');
      data.pillars.forEach((pillar, i) => {
        if (!cards[i]) return;
        const icon = cards[i].querySelector('.pillar-icon');
        const h3   = cards[i].querySelector('h3');
        const p    = cards[i].querySelector('p');
        if (icon && pillar.icon)        icon.textContent = pillar.icon;
        if (h3   && pillar.title)       h3.textContent   = pillar.title;
        if (p    && pillar.description) p.textContent    = pillar.description;
      });
    }

    // Seasonal cards
    if (data.seasonal && data.seasonal.length) {
      const seasonalSection = document.querySelector('.seasonal');
      const scroll = seasonalSection ? seasonalSection.querySelector('.seasonal-scroll') : null;
      if (scroll) {
        scroll.innerHTML = data.seasonal.map(s => `
          <article class="seasonal-card" role="listitem">
            <div class="seasonal-card-bg" aria-hidden="true">
              <img src="${_esc(s.imageUrl || '')}" alt="" loading="lazy" />
            </div>
            <div class="seasonal-card-overlay" aria-hidden="true"></div>
            <div class="seasonal-card-content">
              <span class="seasonal-badge">${_esc(s.season || '')}</span>
              <h3>${_esc(s.name || '')}</h3>
              <p>${_esc(s.description || '')}</p>
            </div>
          </article>`).join('');
      }
    }

  } catch (err) {
    console.error('[Raffy] Index laden mislukt:', err);
  }
}

/* ============================================================
   UTILITY — HTML escaping to prevent XSS
   ============================================================ */
function _esc(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}
