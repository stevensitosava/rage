// Raffy Gelato — Shared Nav + Footer
// Injects nav and footer from a single source of truth.
// Must be listed BEFORE main.js so that nav elements exist when main.js runs.
(function () {
  const NAV_HTML = `
  <nav class="nav" role="navigation" aria-label="Hoofdnavigatie">
    <div class="container nav-inner">
      <a href="index.html" class="nav-logo" aria-label="Raffy Gelato — naar homepagina">
        <img src="assets/logo.png" alt="Raffy Gelato" />
      </a>
      <ul class="nav-links" role="list">
        <li><a href="menu.html"    class="nav-link">Menu</a></li>
        <li><a href="about.html"   class="nav-link">Over ons</a></li>
        <li><a href="contact.html" class="nav-link">Vind ons</a></li>
      </ul>
      <button class="nav-toggle" aria-label="Menu openen" aria-expanded="false" aria-controls="mobile-menu">
        <img src="assets/helado-empty.png" alt="" class="nav-toggle-icon nav-toggle-empty" aria-hidden="true" />
        <img src="assets/helado-full.png"  alt="" class="nav-toggle-icon nav-toggle-full"  aria-hidden="true" />
      </button>
    </div>
  </nav>
  <div class="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Mobiele navigatie">
    <button class="mobile-close" aria-label="Menu sluiten">&times;</button>
    <ul role="list">
      <li><a href="menu.html"    class="nav-link">Menu</a></li>
      <li><a href="about.html"   class="nav-link">Over ons</a></li>
      <li><a href="contact.html" class="nav-link">Vind ons</a></li>
    </ul>
  </div>`;

  const FOOTER_HTML = `
  <footer class="footer" role="contentinfo">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="index.html" class="nav-logo" aria-label="Raffy Gelato — naar homepagina">
            <img src="assets/logo.png" alt="Raffy Gelato" />
          </a>
          <p class="footer-tagline">Authentiek Italiaans en Grieks gelato, wafels en crêpes — al meer dan 25 jaar op de Oude Markt in Tilburg.</p>
          <div class="footer-social" aria-label="Sociale media">
            <a href="https://www.instagram.com/raffytilburg" class="social-link" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
          </div>
        </div>
        <div class="footer-col">
          <h4>Navigatie</h4>
          <nav class="footer-links" aria-label="Footer navigatie">
            <a href="index.html">Home</a>
            <a href="menu.html">Ons Menu</a>
            <a href="about.html">Over ons</a>
            <a href="contact.html">Vind ons</a>
          </nav>
        </div>
        <div class="footer-col">
          <h4>Openingstijden</h4>
          <ul class="footer-hours-list" role="list">
            <li class="footer-hours-item"><strong>Ma – Vr</strong><span>12:00 – 21:00</span></li>
            <li class="footer-hours-item"><strong>Zaterdag</strong><span>11:00 – 22:00</span></li>
            <li class="footer-hours-item"><strong>Zondag</strong><span>11:00 – 21:00</span></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Contact</h4>
          <nav class="footer-links" aria-label="Contactgegevens">
            <a href="tel:+31882050505">+31 88 205 0505</a>
            <a href="mailto:info@raffygelato.nl">info@raffygelato.nl</a>
            <a href="contact.html">Oude Markt 1<br />5038 TJ Tilburg</a>
          </nav>
        </div>
      </div>
      <hr class="footer-divider" />
      <div class="footer-bottom">
        <p class="footer-copy">&copy; 2026 Raffy Gelato. Alle rechten voorbehouden.</p>
        <p class="footer-copy">Gelato Italiano dal 1997 &middot; Tilburg, Nederland</p>
        <p style="margin-top:0.5rem;font-size:0.7rem;color:rgba(253,246,236,0.25);letter-spacing:0.04em;">made by <a href="https://www.stevensawarin.com/" target="_blank" rel="noopener noreferrer" style="color:rgba(253,246,236,0.25);text-decoration:none;border-bottom:1px solid rgba(253,246,236,0.15);">Steven Sawarin</a></p>
      </div>
    </div>
  </footer>`;

  const navRoot    = document.getElementById('nav-root');
  const footerRoot = document.getElementById('footer-root');
  if (navRoot)    navRoot.outerHTML    = NAV_HTML;
  if (footerRoot) footerRoot.outerHTML = FOOTER_HTML;
})();
