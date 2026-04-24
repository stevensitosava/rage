// Raffy Gelato — Firebase Page Loader
// Called by main.js on every page load and after every SPA navigation.
// Detects current page and loads the appropriate Firestore content.
// Depends on: firebase-data.js

function initFirebasePage() {
  if (typeof db === 'undefined') return;
  const p = location.pathname;
  if      (p.endsWith('menu.html')    || p.endsWith('/menu'))    loadMenuPage();
  else if (p.endsWith('about.html')   || p.endsWith('/about'))   loadAboutPage();
  else if (p.endsWith('contact.html') || p.endsWith('/contact')) loadContactPage();
  else if (p === '/' || p.endsWith('index.html') || p === '' || p.endsWith('/')) loadIndexPage();
  loadSharedContent(); // always runs — keeps footer + CTA banners in sync with Firestore
}

/* ============================================================
   MENU PAGE — image cards, search, filter, pagination
   ============================================================ */
function _pageSize() {
  const w = window.innerWidth;
  if (w < 540) return 3;  // 1-col grid  → 3 rows
  if (w < 900) return 6;  // 2-col grid  → 3 rows
  return 9;               // 3-col grid  → 3 rows
}

let _allMenuFlavors = [];
let _menuPage       = 0;
let _activeFilter   = 'all';
let _menuSearch     = '';

async function loadMenuPage() {
  const grid = document.querySelector('.menu-grid');
  if (!grid) return;

  // Reset state on each page visit
  _menuPage     = 0;
  _activeFilter = 'all';
  _menuSearch   = '';

  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--color-text-light);">Laden…</div>';

  // Reset active filter tab
  document.querySelectorAll('.filter-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.filter === 'all');
  });

  // Clear search input
  const searchInput = document.querySelector('.menu-search-input');
  if (searchInput) searchInput.value = '';

  try {
    _allMenuFlavors = await getFlavors();

    if (!_allMenuFlavors.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--color-text-light);">Geen smaken beschikbaar.</p>';
      return;
    }

    // Search input — debounced for performance
    if (searchInput) {
      let _debounce;
      searchInput.oninput = e => {
        clearTimeout(_debounce);
        _debounce = setTimeout(() => {
          _menuSearch = e.target.value.trim().toLowerCase();
          _menuPage   = 0;
          _renderMenuPage();
        }, 220);
      };
    }

    // Filter tabs — use onclick to override any existing listeners
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.filter-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        _activeFilter = tab.dataset.filter || 'all';
        _menuPage     = 0;
        _renderMenuPage();
      };
    });

    _renderMenuPage();

  } catch (err) {
    console.error('[Raffy] Menu laden mislukt:', err);
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--color-text-light);">Menu kon niet worden geladen.</p>';
  }
}

function _getFilteredFlavors() {
  return _allMenuFlavors.filter(f => {
    const matchCat = _activeFilter === 'all' || f.category === _activeFilter;
    if (!_menuSearch) return matchCat;
    const q = _menuSearch;
    const matchSearch =
      (f.name        || '').toLowerCase().includes(q) ||
      (f.description || '').toLowerCase().includes(q) ||
      (f.category    || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
}

function _renderMenuPage() {
  const grid = document.querySelector('.menu-grid');
  if (!grid) return;

  const filtered   = _getFilteredFlavors();
  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / _pageSize()));

  // Clamp page index to valid range
  _menuPage = Math.max(0, Math.min(_menuPage, totalPages - 1));

  if (!total) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem 1rem;color:var(--color-text-light);">Geen smaken gevonden voor deze zoekopdracht.</p>';
    _updatePagination(1, 1);
    return;
  }

  const start = _menuPage * _pageSize();
  const shown = filtered.slice(start, start + _pageSize());

  grid.innerHTML = shown.map(_buildMenuItemHTML).join('');

  if (typeof gsap !== 'undefined') {
    gsap.fromTo('.menu-item',
      { opacity: 0, y: 24 },
      {
        opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out',
        scrollTrigger: { trigger: '.menu-grid', start: 'top 88%', toggleActions: 'play none none reverse' }
      }
    );
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }

  _updatePagination(_menuPage + 1, totalPages);
}

function _updatePagination(currentPage, totalPages) {
  const bar = document.getElementById('menu-pagination');
  if (!bar) return;

  // Hide entirely when everything fits on one page
  if (totalPages <= 1) {
    bar.innerHTML = '';
    return;
  }

  bar.innerHTML = `
    <button class="menu-pg-btn menu-pg-prev" aria-label="Vorige pagina"${currentPage <= 1 ? ' disabled' : ''}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Vorige
    </button>
    <span class="menu-pg-info" aria-live="polite" aria-atomic="true">
      <strong>${currentPage}</strong> van ${totalPages}
    </span>
    <button class="menu-pg-btn menu-pg-next" aria-label="Volgende pagina"${currentPage >= totalPages ? ' disabled' : ''}>
      Volgende
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>`;

  bar.querySelector('.menu-pg-prev').onclick = () => {
    if (_menuPage > 0) {
      _menuPage--;
      _renderMenuPage();
      document.querySelector('.menu-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  bar.querySelector('.menu-pg-next').onclick = () => {
    if (currentPage < totalPages) {
      _menuPage++;
      _renderMenuPage();
      document.querySelector('.menu-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
}

function _buildMenuItemHTML(flavor) {
  const name     = _esc(flavor.name        || '');
  const price    = _esc(flavor.price       || '');
  const desc     = _esc(flavor.description || '');
  const category = _esc(flavor.category   || 'gelato');
  const emoji    = flavor.emoji || '🍦';

  const mediaHtml = flavor.imageUrl
    ? `<div class="menu-item-img"><img src="${_esc(flavor.imageUrl)}" alt="${name}" loading="lazy" /></div>`
    : `<div class="menu-item-emoji" aria-hidden="true">${emoji}</div>`;

  return `
    <article class="menu-item" data-category="${category}" role="listitem">
      ${mediaHtml}
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
    if (!data) return;

    if (data.imageUrl) {
      const img = storySection.querySelector('.about-founder-img img');
      if (img) img.src = data.imageUrl;
    }

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
    if (!data) return;

    const cards = contactSection.querySelectorAll('.contact-info-card');

    if (data.address && cards[0]) {
      const p = cards[0].querySelector('p');
      if (p) {
        const addr = _esc(data.address).replace(/\n/g, '<br>');
        const link = _esc(data.addressUrl || 'https://maps.google.com/?q=Oude+Markt+1,+5038+TJ+Tilburg');
        p.innerHTML = `${addr}<br><a href="${link}" target="_blank" rel="noopener noreferrer" style="color:var(--color-primary);font-weight:600;text-decoration:underline;">Routebeschrijving →</a>`;
      }
    }

    if (data.hoursWeekdays && cards[1]) {
      const p = cards[1].querySelector('p');
      if (p) {
        p.innerHTML = `${_esc(data.hoursWeekdays)}<br>${_esc(data.hoursSaturday || '')}<br>${_esc(data.hoursSunday || '')}`;
      }
    }

    if (data.phone && cards[2]) {
      const p = cards[2].querySelector('p');
      if (p) {
        p.innerHTML = `<a href="tel:${_esc(data.phone)}">${_esc(data.phoneDisplay || data.phone)}</a>`;
      }
    }

    if (data.email && cards[3]) {
      const p = cards[3].querySelector('p');
      if (p) {
        p.innerHTML = `<a href="mailto:${_esc(data.email)}">${_esc(data.email)}</a><br><span style="font-size:0.8rem;color:var(--color-text-light);">We reageren binnen 24 uur.</span>`;
      }
    }

    if (data.instagram && cards[4]) {
      const p = cards[4].querySelector('p');
      if (p) {
        const igUrl = _esc(data.instagramUrl || '#');
        p.innerHTML = `<a href="${igUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--color-primary);">@${_esc(data.instagram)}</a><br><span style="font-size:0.8rem;color:var(--color-text-light);">Volg ons voor dagelijkse smaken &amp; aanbiedingen.</span>`;
      }
    }

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
   ============================================================ */
async function loadIndexPage() {
  try {
    const data = await getIndexContent();
    if (!data) return;

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

    if (data.favSmaken && data.favSmaken.length) {
      const track = document.querySelector('.fls-track');
      if (track) {
        const itemHTML = data.favSmaken.map(s => `
          <div class="fls-item">
            <img src="${_esc(s.imageUrl || '')}" alt="" loading="lazy">
            <div class="fls-item-overlay">
              <span class="fls-item-tag">${_esc(s.tag || '')}</span>
              <p class="fls-item-name">${_esc(s.name || '')}</p>
            </div>
          </div>`).join('');
        track.innerHTML = itemHTML + itemHTML;
      }
      const srList = document.querySelector('.sr-only[aria-label="Onze favoriete smaken"]');
      if (srList) {
        srList.innerHTML = data.favSmaken.map(s => `<li>${_esc(s.name || '')}</li>`).join('');
      }
    }

  } catch (err) {
    console.error('[Raffy] Index laden mislukt:', err);
  }
}

/* ============================================================
   SHARED CONTENT — footer + CTA banners (runs on every page)
   ============================================================ */
async function loadSharedContent() {
  try {
    const data = await getContact();
    if (!data) return;

    // Footer hours — update only the time <span>, leave the day labels untouched
    const hourItems = document.querySelectorAll('.footer-hours-item span');
    if (hourItems[0] && data.hoursWeekdays) hourItems[0].textContent = _extractHoursShort(data.hoursWeekdays);
    if (hourItems[1] && data.hoursSaturday) hourItems[1].textContent = _extractHoursShort(data.hoursSaturday);
    if (hourItems[2] && data.hoursSunday)   hourItems[2].textContent = _extractHoursShort(data.hoursSunday);

    // Footer contact links
    document.querySelectorAll('.footer-links').forEach(nav => {
      const tel = nav.querySelector('a[href^="tel:"]');
      if (tel && data.phone) {
        tel.href        = `tel:${data.phone}`;
        tel.textContent = data.phoneDisplay || data.phone;
      }
      const mail = nav.querySelector('a[href^="mailto:"]');
      if (mail && data.email) {
        mail.href        = `mailto:${data.email}`;
        mail.textContent = data.email;
      }
      const addrLink = nav.querySelector('a[href="contact.html"]');
      if (addrLink && data.address) {
        addrLink.innerHTML = data.address.split('\n').map(_esc).join('<br />');
      }
    });

    // CTA banner meta items — match by data-cta attribute
    document.querySelectorAll('.cta-meta-item[data-cta]').forEach(item => {
      const type = item.dataset.cta;
      const val  = item.querySelector('span:not([aria-hidden])');
      if (!val) return;

      if (type === 'address' && data.address) {
        const lines = data.address.split('\n');
        val.innerHTML = `<strong>${_esc(lines[0])}</strong>${lines[1] ? ', ' + _esc(lines[1]) : ''}`;
      }
      if (type === 'hours' && data.hoursWeekdays) {
        const wd = _extractHoursShort(data.hoursWeekdays);
        const sa = _extractHoursShort(data.hoursSaturday || '');
        const su = _extractHoursShort(data.hoursSunday   || '');
        let html = wd ? `Ma–Vr <strong>${_esc(wd)}</strong>` : '';
        if (sa) html += ` · Za <strong>${_esc(sa)}</strong>`;
        if (su) html += ` · Zo <strong>${_esc(su)}</strong>`;
        val.innerHTML = html;
      }
      if (type === 'phone' && (data.phoneDisplay || data.phone)) {
        val.innerHTML = `<strong>${_esc(data.phoneDisplay || data.phone)}</strong>`;
      }
    });

  } catch (err) {
    console.error('[Raffy] Gedeelde inhoud laden mislukt:', err);
  }
}

// Extracts "HH:MM–HH:MM" from a full string like "Maandag – Vrijdag: 12:00 – 21:00"
function _extractHoursShort(str) {
  const m = (str || '').match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  return m ? `${m[1]}–${m[2]}` : str;
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
