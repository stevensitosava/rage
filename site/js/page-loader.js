// Raffy Gelato — Firebase Page Loader
// Uses onSnapshot() so admin changes reflect on the live site in real time.
// Depends on: firebase-data.js

function initFirebasePage() {
  if (typeof db === 'undefined') return;
  const p = location.pathname;
  if      (p.endsWith('menu.html')    || p.endsWith('/menu'))    loadMenuPage();
  else if (p.endsWith('about.html')   || p.endsWith('/about'))   loadAboutPage();
  else if (p.endsWith('contact.html') || p.endsWith('/contact')) loadContactPage();
  else if (p === '/' || p.endsWith('index.html') || p === '' || p.endsWith('/')) loadIndexPage();
  loadSharedContent();
}

/* ============================================================
   MENU PAGE — real-time flavor updates
   ============================================================ */
function _pageSize() {
  return 9999; // No pagination — show all items in the active category at once
}

let _allMenuFlavors = [];
let _menuPage       = 0;
let _activeFilter   = 'all';
let _menuSearch     = '';

function loadMenuPage() {
  const grid = document.querySelector('.menu-grid');
  if (!grid) return;

  _menuPage     = 0;
  _activeFilter = 'gelato';
  _menuSearch   = '';

  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--color-text-light);">Laden…</div>';

  document.querySelectorAll('.filter-tab').forEach(t => {
    const isActive = t.dataset.filter === 'gelato';
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  const searchInput = document.querySelector('.menu-search-input');
  if (searchInput) {
    searchInput.value = '';
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
      _applySmakenChrome();
      _renderMenuPage();
    };
  });

  _applySmakenChrome();

  db.collection('flavors')
    .where('visible', '==', true)
    .orderBy('order', 'asc')
    .onSnapshot(snap => {
      _allMenuFlavors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!_allMenuFlavors.length) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--color-text-light);">Geen smaken beschikbaar.</p>';
        return;
      }
      _renderMenuPage();
    }, err => {
      console.error('[Raffy] Menu laden mislukt:', err);
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--color-text-light);">Menu kon niet worden geladen.</p>';
    });
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

  if (totalPages <= 1) { bar.innerHTML = ''; return; }

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
  const rawName  = flavor.name || '';
  const price    = _esc(flavor.price       || '');
  const desc     = _esc(flavor.description || '');
  const category = _esc(flavor.category    || 'gelato');

  // Smaken: compact layout, vegan asterisk highlighted, allergens inline
  if (category === 'smaken') {
    const isVegan   = rawName.endsWith('*');
    const cleanName = isVegan ? rawName.slice(0, -1) : rawName;
    return `
      <article class="menu-item menu-item--smaak" data-category="${category}" role="listitem">
        <span class="smaak-name">${_esc(cleanName)}${isVegan ? '<span class="smaak-vegan">*</span>' : ''}</span>
        ${desc ? `<span class="smaak-allergens">${desc}</span>` : ''}
      </article>`;
  }

  const name = _esc(rawName);
  return `
    <article class="menu-item" data-category="${category}" role="listitem">
      <div class="menu-item-info">
        <div class="menu-item-header">
          <span class="menu-item-name">${name}</span>
          <span class="menu-item-leader" aria-hidden="true"></span>
          <span class="menu-item-price">${price}</span>
        </div>
        ${desc ? `<p class="menu-item-desc">${desc}</p>` : ''}
      </div>
    </article>`;
}

function _applySmakenChrome() {
  const top    = document.getElementById('smaken-info-top');
  const bottom = document.getElementById('smaken-info-bottom');
  const grid   = document.querySelector('.menu-grid');
  const isSmaken = _activeFilter === 'smaken';
  if (top)    top.hidden    = !isSmaken;
  if (bottom) bottom.hidden = !isSmaken;
  if (grid)   grid.classList.toggle('menu-grid--smaken', isSmaken);
}

/* ============================================================
   ABOUT PAGE — real-time updates
   ============================================================ */
function loadAboutPage() {
  if (!document.querySelector('.about-story')) return;

  db.collection('about').doc('main').onSnapshot(doc => {
    if (!doc.exists) return;
    const data = doc.data();
    const storySection = document.querySelector('.about-story');

    if (data.imageUrl) {
      const img = storySection.querySelector('.about-founder-img img');
      if (img) img.src = data.imageUrl;
    }

    const textEl = storySection.querySelector('.about-text');
    if (textEl) {
      const label = textEl.querySelector('.section-label');
      const h2    = textEl.querySelector('h2');
      const paras = textEl.querySelectorAll('p');
      if (label && data.storyLabel)         label.textContent    = data.storyLabel;
      if (h2    && data.storyTitle)         h2.innerHTML         = data.storyTitle;
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
        if (icon) {
          if (val.iconUrl) icon.innerHTML = `<img src="${_esc(val.iconUrl)}" alt="" style="max-width:64px;max-height:64px;object-fit:contain;" />`;
          else if (val.icon) icon.textContent = val.icon;
        }
        if (h3 && val.title)       h3.textContent = val.title;
        if (p  && val.description) p.textContent  = val.description;
      });
    }
  }, err => console.error('[Raffy] About laden mislukt:', err));
}

/* ============================================================
   CONTACT PAGE — real-time updates
   ============================================================ */
function loadContactPage() {
  if (!document.querySelector('.contact-section')) return;

  db.collection('contact').doc('main').onSnapshot(doc => {
    if (!doc.exists) return;
    const data = doc.data();
    const contactSection = document.querySelector('.contact-section');
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
      if (p) p.innerHTML = `${_esc(data.hoursWeekdays)}<br>${_esc(data.hoursSaturday || '')}<br>${_esc(data.hoursSunday || '')}`;
    }
    if (data.phone && cards[2]) {
      const p = cards[2].querySelector('p');
      if (p) p.innerHTML = `<a href="tel:${_esc(data.phone)}">${_esc(data.phoneDisplay || data.phone)}</a>`;
    }
    if (data.email && cards[3]) {
      const p = cards[3].querySelector('p');
      if (p) p.innerHTML = `<a href="mailto:${_esc(data.email)}">${_esc(data.email)}</a><br><span style="font-size:0.8rem;color:var(--color-text-light);">We reageren binnen 24 uur.</span>`;
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
  }, err => console.error('[Raffy] Contact laden mislukt:', err));
}

/* ============================================================
   INDEX PAGE — real-time updates
   ============================================================ */
function loadIndexPage() {
  db.collection('pages').doc('index').onSnapshot(doc => {
    if (!doc.exists) return;
    const data = doc.data();

    const storySection = document.querySelector('.story-strip');
    if (storySection) {
      const img   = storySection.querySelector('.story-image img');
      const label = storySection.querySelector('.section-label');
      const h2    = storySection.querySelector('h2');
      const paras = storySection.querySelectorAll('p');
      if (img   && data.storyImageUrl) img.src              = data.storyImageUrl;
      if (label && data.storyLabel)    label.textContent    = data.storyLabel;
      if (h2    && data.storyTitle)    h2.innerHTML         = data.storyTitle;
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
        if (icon) {
          if (pillar.iconUrl) icon.innerHTML = `<img src="${_esc(pillar.iconUrl)}" alt="" style="max-width:64px;max-height:64px;object-fit:contain;" />`;
          else if (pillar.icon) icon.textContent = pillar.icon;
        }
        if (h3 && pillar.title)       h3.textContent = pillar.title;
        if (p  && pillar.description) p.textContent  = pillar.description;
      });
    }

    if (data.seasonal && data.seasonal.length) {
      const scroll = document.querySelector('.seasonal .seasonal-scroll');
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
        if (typeof ScrollTrigger !== 'undefined') {
          requestAnimationFrame(() => ScrollTrigger.refresh());
        }
      }
      const srList = document.querySelector('.sr-only[aria-label="Onze favoriete smaken"]');
      if (srList) {
        srList.innerHTML = data.favSmaken.map(s => `<li>${_esc(s.name || '')}</li>`).join('');
      }
    }

    if (data.testimonials && data.testimonials.length) {
      const grid = document.querySelector('.testimonials-grid');
      if (grid) {
        grid.innerHTML = data.testimonials.slice(0, 3).map(r => {
          const initial   = _esc((r.name || '?').charAt(0).toUpperCase());
          const starCount = Math.max(1, Math.min(5, r.stars || 5));
          const stars     = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
          return `
            <blockquote class="testimonial-card">
              <span class="testimonial-quote" aria-hidden="true">"</span>
              <p class="testimonial-text">${_esc(r.text || '')}</p>
              <footer class="testimonial-author">
                <div class="testimonial-avatar" aria-hidden="true">${initial}</div>
                <div>
                  <div class="testimonial-name">${_esc(r.name || '')}</div>
                  <div class="testimonial-stars" aria-label="${starCount} sterren">${stars}</div>
                </div>
              </footer>
            </blockquote>`;
        }).join('');
      }
    }
  }, err => console.error('[Raffy] Index laden mislukt:', err));
}

/* ============================================================
   SHARED CONTENT — footer + CTA banners, real-time
   ============================================================ */
function loadSharedContent() {
  db.collection('contact').doc('main').onSnapshot(doc => {
    if (!doc.exists) return;
    const data = doc.data();

    const hourItems = document.querySelectorAll('.footer-hours-item span');
    if (hourItems[0] && data.hoursWeekdays) hourItems[0].textContent = _extractHoursShort(data.hoursWeekdays);
    if (hourItems[1] && data.hoursSaturday) hourItems[1].textContent = _extractHoursShort(data.hoursSaturday);
    if (hourItems[2] && data.hoursSunday)   hourItems[2].textContent = _extractHoursShort(data.hoursSunday);

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
  }, err => console.error('[Raffy] Gedeelde inhoud laden mislukt:', err));
}

function _extractHoursShort(str) {
  const m = (str || '').match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  return m ? `${m[1]}–${m[2]}` : str;
}

function _esc(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}
