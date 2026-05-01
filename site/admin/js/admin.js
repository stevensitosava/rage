// Raffy Gelato — Admin Dashboard Logic
// Depends on: firebase-config.js (sets up db, storage, auth globals)

/* ============================================================
   CLOUDINARY — unsigned upload (cloud name is intentionally public)
   ============================================================ */
const CLOUDINARY_CLOUD  = 'dkggavx4l';
const CLOUDINARY_PRESET = 'raffy_gelato'; // unsigned preset

async function uploadToCloudinary(file) {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_PRESET);
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Cloudinary upload mislukt (' + res.status + ')');
  const data = await res.json();
  return data.secure_url;
}

/* ============================================================
   STATE
   ============================================================ */
let currentUser        = null;
let isAdmin            = false; // true only for admin@raffygelato.nl
let allFlavors         = [];
let editingFlavor      = null;
const pendingImgs      = {}; // keyed by context: 'about' | 'index-story' | 'index-seasonal-N'
let activeFlavorCat    = 'gelato'; // default category tab
const CATEGORY_LABELS = {
  gelato:  'Gelato',
  smaken:  'Smaken',
  crepe:   'Crêpes',
  wafel:   'Miniwafels',
  dranken: 'Dranken',
};
const CATEGORY_ORDER = ['gelato', 'smaken', 'crepe', 'wafel', 'dranken'];
let lastFlavorsRendered = [];

/* ============================================================
   BOOT — auth guard
   ============================================================ */
auth.onAuthStateChanged(async user => {
  if (!user) { location.href = '/admin/index.html'; return; }

  try {
    // Verify against Firestore allowlist — only explicitly registered emails can enter
    const snap = await db.collection('admin_users').doc(user.email).get();
    if (!snap.exists) {
      auth.signOut().then(() => { location.href = '/admin/index.html'; });
      return;
    }

    currentUser = user;
    isAdmin     = snap.data().role === 'admin';
    document.getElementById('admin-email').textContent = user.email;
    init();
    applyRoleRestrictions();
  } catch (err) {
    console.error('[Admin] Auth check failed:', err);
    auth.signOut().then(() => { location.href = '/admin/index.html'; });
  }
});

function applyRoleRestrictions() {
  // CSS hides the story text fields by default (see admin.css).
  // Add role-admin class to reveal them only for the admin account.
  if (isAdmin) document.body.classList.add('role-admin');
}

document.getElementById('logout-btn').addEventListener('click', () => {
  auth.signOut().then(() => { location.href = '/admin/index.html'; });
});

/* ============================================================
   INIT
   ============================================================ */
function init() {
  setupTabs();
  loadFlavors();
  loadAboutContent();
  loadContactContent();
  loadIndexContent();
  setupFlavorModal();
  if (isAdmin) initStats();
}

/* ============================================================
   TABS
   ============================================================ */
function setupTabs() {
  const tabs   = document.querySelectorAll('.admin-tab');
  const panels = document.querySelectorAll('.admin-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t  => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
      if (tab.dataset.tab === 'stats' && isAdmin) loadStats();
    });
  });
}

/* ============================================================
   HELPER — toast notification from top of page
   ============================================================ */
let _toastTimer = null;
function showStatus(_containerId, msg, type = 'success') {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.className = `admin-toast admin-toast--${type}`;
  toast.textContent = msg;
  // force reflow so the transition plays even if called back-to-back
  toast.getBoundingClientRect();
  toast.classList.add('admin-toast--show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('admin-toast--show'), 3200);
}

/* ============================================================
   FLAVORS TAB
   ============================================================ */
async function loadFlavors() {
  const body = document.getElementById('flavors-table-body');
  body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--text-light);">Laden…</td></tr>';

  try {
    const snap = await db.collection('flavors').orderBy('order', 'asc').get();
    allFlavors = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setupFlavorTabs();
    applyFlavorFilters();
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--danger);">Fout bij laden: ${err.message}</td></tr>`;
  }
}

let _flavorTabsBound = false;
function setupFlavorTabs() {
  if (_flavorTabsBound) return;
  _flavorTabsBound = true;
  document.querySelectorAll('.flavor-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeFlavorCat = tab.dataset.cat || '';
      document.querySelectorAll('.flavor-tab').forEach(t => {
        const isActive = t === tab;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      applyFlavorFilters();
    });
  });
}

function renderFlavorsTable(flavors) {
  lastFlavorsRendered = flavors;
  const body  = document.getElementById('flavors-table-body');
  const total = flavors.length;

  // Hide pagination — every section now fits on one page
  const pagBar = document.getElementById('flavors-pagination');
  if (pagBar) pagBar.innerHTML = '';

  if (!total) {
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-light);">Geen smaken in deze categorie.</td></tr>';
    return;
  }

  // Show category section headers only when the "Alles" tab is active
  const showHeaders = !activeFlavorCat;
  const labelFor = c => CATEGORY_LABELS[c] || c;

  let html = '';
  let lastCategory = null;
  for (const f of flavors) {
    const cat = f.category || 'gelato';

    if (showHeaders && cat !== lastCategory) {
      const count = allFlavors.filter(x => (x.category || 'gelato') === cat).length;
      html += `
        <tr class="cat-header">
          <td colspan="6" style="background:var(--cat-header-bg, #f6e9ec);padding:0.55rem 0.85rem;font-weight:700;font-size:0.8rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--primary);border-top:2px solid var(--primary);">
            ${escAdmin(labelFor(cat))} <span style="color:var(--text-light);font-weight:400;letter-spacing:0;text-transform:none;">— ${count} item${count === 1 ? '' : 's'}</span>
          </td>
        </tr>`;
      lastCategory = cat;
    }

    const badge = `<span class="badge badge-${cat}">${escAdmin(labelFor(cat))}</span>`;
    html += `
      <tr data-id="${f.id}" draggable="true"
          ondragstart="dragStart(event,'${f.id}')"
          ondragover="dragOver(event,'${f.id}')"
          ondragleave="dragLeave(event)"
          ondrop="dragDrop(event,'${f.id}')"
          ondragend="dragEnd(event)">
        <td><span class="drag-handle" title="Slepen om te herordenen">⠿</span></td>
        <td><strong>${escAdmin(f.name || '')}</strong></td>
        <td>${badge}</td>
        <td>${escAdmin(f.price || '')}</td>
        <td>
          <label class="toggle" title="${f.visible ? 'Zichtbaar' : 'Verborgen'}">
            <input type="checkbox" ${f.visible ? 'checked' : ''}
                   onchange="toggleVisibility('${f.id}', this.checked)" />
            <span class="toggle-track"></span>
          </label>
        </td>
        <td>
          <div class="actions">
            <button class="btn btn-outline btn-sm" onclick="openFlavorModal('${f.id}')">Bewerken</button>
            <button class="btn btn-danger  btn-sm" onclick="confirmDeleteFlavor('${f.id}', '${escAdmin(f.name || '')}')">Verwijder</button>
          </div>
        </td>
      </tr>`;
  }

  body.innerHTML = html;
}

async function toggleVisibility(id, visible) {
  try {
    await db.collection('flavors').doc(id).update({ visible });
    const f = allFlavors.find(x => x.id === id);
    if (f) f.visible = visible;
  } catch (err) {
    alert('Fout: ' + err.message);
    loadFlavors();
  }
}

/* ── Drag and drop reorder ─────────────────────────────── */
let dragSrcId = null;

function dragStart(e, id) {
  dragSrcId = id;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('dragging');
}

function dragOver(e, id) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (dragSrcId !== id) e.currentTarget.classList.add('drag-over');
}

function dragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function dragDrop(e, targetId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!dragSrcId || dragSrcId === targetId) return;

  const srcIdx = allFlavors.findIndex(f => f.id === dragSrcId);
  const tgtIdx = allFlavors.findIndex(f => f.id === targetId);
  if (srcIdx === -1 || tgtIdx === -1) return;

  const [moved] = allFlavors.splice(srcIdx, 1);
  allFlavors.splice(tgtIdx, 0, moved);
  allFlavors.forEach((f, i) => { f.order = i + 1; });

  applyFlavorFilters();
  saveFlavorsOrder();
}

function dragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('#flavors-table-body tr').forEach(r => r.classList.remove('drag-over'));
}

async function saveFlavorsOrder() {
  try {
    const batch = db.batch();
    allFlavors.forEach((f, i) => {
      batch.update(db.collection('flavors').doc(f.id), { order: i + 1 });
    });
    await batch.commit();
    showStatus('flavors-status', 'Volgorde opgeslagen.');
  } catch (err) {
    showStatus('flavors-status', 'Fout bij opslaan: ' + err.message, 'error');
  }
}

/* ── Search / filter ──────────────────────────────────────── */
function applyFlavorFilters() {
  const q        = (document.getElementById('flavor-search')?.value  || '').trim().toLowerCase();
  const priceVal =  document.getElementById('filter-price')?.value   || '';
  const visVal   =  document.getElementById('filter-visible')?.value || '';

  let result = allFlavors.filter(f => {
    if (q && !(
      (f.name        || '').toLowerCase().includes(q) ||
      (f.description || '').toLowerCase().includes(q) ||
      (f.category    || '').toLowerCase().includes(q)
    )) return false;
    if (activeFlavorCat && (f.category || '') !== activeFlavorCat) return false;
    if (visVal === '1' && !f.visible)  return false;
    if (visVal === '0' &&  f.visible)  return false;
    return true;
  });

  const toNum = v => parseFloat(String(v || '0').replace(/[€\s]/g, '').replace(',', '.')) || 0;
  if (priceVal === 'asc')  result = [...result].sort((a, b) => toNum(a.price) - toNum(b.price));
  if (priceVal === 'desc') result = [...result].sort((a, b) => toNum(b.price) - toNum(a.price));

  renderFlavorsTable(result);
}
function filterFlavors() { applyFlavorFilters(); }

function confirmDeleteFlavor(id, name) {
  if (!confirm(`Smaak "${name}" definitief verwijderen?`)) return;
  db.collection('flavors').doc(id).delete()
    .then(() => { loadFlavors(); showStatus('flavors-status', 'Smaak verwijderd.'); })
    .catch(err => showStatus('flavors-status', 'Fout: ' + err.message, 'error'));
}

/* ─── Flavor Modal ─────────────────────────────────────────── */
function setupFlavorModal() {
  document.getElementById('add-flavor-btn').addEventListener('click', () => openFlavorModal(null));
  document.getElementById('modal-close').addEventListener('click',    closeFlavorModal);
  document.getElementById('modal-cancel').addEventListener('click',   closeFlavorModal);
  document.getElementById('flavor-form').addEventListener('submit',   saveFlavorFromModal);
  document.getElementById('modal-backdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-backdrop')) closeFlavorModal();
  });
}

function openFlavorModal(id) {
  const backdrop = document.getElementById('modal-backdrop');
  const title    = document.getElementById('modal-title');
  const form     = document.getElementById('flavor-form');

  form.reset();

  if (id) {
    editingFlavor = allFlavors.find(f => f.id === id) || null;
    title.textContent = 'Smaak Bewerken';
    if (editingFlavor) {
      form.elements['name'].value        = editingFlavor.name        || '';
      form.elements['description'].value = editingFlavor.description || '';
      form.elements['price'].value       = editingFlavor.price       || '';
      form.elements['category'].value    = editingFlavor.category    || 'gelato';
      form.elements['visible'].checked   = editingFlavor.visible     !== false;
    }
  } else {
    editingFlavor = null;
    title.textContent = 'Smaak Toevoegen';
    form.elements['visible'].checked = true;
    form.elements['category'].value = 'gelato';
    // Set order to max + 1
    const maxOrder = allFlavors.reduce((m, f) => Math.max(m, f.order || 0), 0);
    form.dataset.nextOrder = String(maxOrder + 1);
  }

  backdrop.classList.add('open');
  form.elements['name'].focus();
}

function closeFlavorModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  editingFlavor = null;
}

async function saveFlavorFromModal(e) {
  e.preventDefault();
  const form     = e.target;
  const saveBtn  = document.getElementById('modal-save');
  saveBtn.disabled    = true;
  saveBtn.textContent = 'Opslaan…';

  try {
    const data = {
      name:        form.elements['name'].value.trim(),
      description: form.elements['description'].value.trim(),
      price:       form.elements['price'].value.trim(),
      category:    form.elements['category'].value,
      visible:     form.elements['visible'].checked,
    };

    if (editingFlavor) {
      await db.collection('flavors').doc(editingFlavor.id).update(data);
    } else {
      data.order     = parseInt(form.dataset.nextOrder || '999');
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('flavors').add(data);
    }

    closeFlavorModal();
    await loadFlavors();
    showStatus('flavors-status', editingFlavor ? 'Smaak bijgewerkt.' : 'Smaak toegevoegd.');

  } catch (err) {
    showStatus('flavors-status', 'Fout: ' + err.message, 'error');
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = 'Opslaan';
  }
}

/* ============================================================
   ABOUT TAB
   ============================================================ */
async function loadAboutContent() {
  try {
    const doc = await db.collection('about').doc('main').get();
    if (!doc.exists) return;
    const data = doc.data();

    const f = document.getElementById('about-form');
    if (!f) return;

    f.elements['storyLabel'].value      = data.storyLabel      || '';
    f.elements['storyTitle'].value      = data.storyTitle      || '';
    f.elements['storyParagraph1'].value = data.storyParagraph1 || '';
    f.elements['storyParagraph2'].value = data.storyParagraph2 || '';
    f.elements['storyParagraph3'].value = data.storyParagraph3 || '';

    if (data.imageUrl) {
      const prev = document.getElementById('about-img-preview');
      prev.src = data.imageUrl;
      prev.style.display = 'block';
    }

    // Process steps
    (data.processSteps || []).forEach((s, i) => {
      const titleEl = f.elements[`step${i+1}Title`];
      const descEl  = f.elements[`step${i+1}Desc`];
      if (titleEl) titleEl.value = s.title       || '';
      if (descEl)  descEl.value  = s.description || '';
    });

    // Values
    (data.values || []).forEach((v, i) => {
      const n       = i + 1;
      const iconEl  = f.elements[`val${n}Icon`];
      const titleEl = f.elements[`val${n}Title`];
      const descEl  = f.elements[`val${n}Desc`];
      if (iconEl)  iconEl.value  = v.icon        || '';
      if (titleEl) titleEl.value = v.title        || '';
      if (descEl)  descEl.value  = v.description  || '';
      if (v.iconUrl) {
        const prev = document.getElementById(`val${n}-icon-preview`);
        if (prev) { prev.src = v.iconUrl; prev.style.display = 'block'; }
      }
    });
  } catch (err) {
    console.error('[Admin] About laden mislukt:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const aboutForm = document.getElementById('about-form');
  if (!aboutForm) return;

  // About image preview
  document.getElementById('about-img-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    pendingImgs['about'] = file;
    const prev = document.getElementById('about-img-preview');
    prev.src   = URL.createObjectURL(file);
    prev.style.display = 'block';
  });

  // Value icon previews
  [1,2,3].forEach(n => {
    document.getElementById(`val${n}-icon-input`)?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      pendingImgs[`about-val-icon-${n}`] = file;
      const prev = document.getElementById(`val${n}-icon-preview`);
      if (prev) { prev.src = URL.createObjectURL(file); prev.style.display = 'block'; }
    });
  });

  aboutForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = aboutForm.querySelector('.save-btn');
    btn.disabled    = true;
    btn.textContent = 'Opslaan…';

    try {
      let imageUrl = '';
      const existingDoc = await db.collection('about').doc('main').get();
      if (existingDoc.exists) imageUrl = existingDoc.data().imageUrl || '';

      // Upload founder image — all roles can change the image
      if (pendingImgs['about']) {
        imageUrl = await uploadToCloudinary(pendingImgs['about']);
        delete pendingImgs['about'];
      }

      const f = e.target;
      const aboutStoryFields = isAdmin ? {
        storyLabel:      f.elements['storyLabel'].value.trim(),
        storyTitle:      f.elements['storyTitle'].value.trim(),
        storyParagraph1: f.elements['storyParagraph1'].value.trim(),
        storyParagraph2: f.elements['storyParagraph2'].value.trim(),
        storyParagraph3: f.elements['storyParagraph3'].value.trim(),
        imageUrl,
      } : { imageUrl }; // owner: image only

      const data = {
        ...aboutStoryFields,
        processSteps: [1,2,3].map(n => ({
          title:       f.elements[`step${n}Title`]?.value.trim() || '',
          description: f.elements[`step${n}Desc`]?.value.trim()  || '',
        })),
        values: await Promise.all([1,2,3].map(async n => {
          let iconUrl = existingDoc.exists ? (existingDoc.data().values?.[n-1]?.iconUrl || '') : '';
          if (pendingImgs[`about-val-icon-${n}`]) {
            iconUrl = await uploadToCloudinary(pendingImgs[`about-val-icon-${n}`]);
            delete pendingImgs[`about-val-icon-${n}`];
          }
          return {
            icon:        f.elements[`val${n}Icon`]?.value.trim()  || '',
            iconUrl,
            title:       f.elements[`val${n}Title`]?.value.trim() || '',
            description: f.elements[`val${n}Desc`]?.value.trim()  || '',
          };
        })),
      };

      await db.collection('about').doc('main').set(data, { merge: true });
      showStatus('about-status', 'Over Ons opgeslagen.');
    } catch (err) {
      showStatus('about-status', 'Fout: ' + err.message, 'error');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Opslaan';
    }
  });
});

/* ============================================================
   CONTACT TAB
   ============================================================ */
async function loadContactContent() {
  try {
    const doc = await db.collection('contact').doc('main').get();
    if (!doc.exists) return;
    const data = doc.data();
    const f    = document.getElementById('contact-form-admin');
    if (!f) return;

    const fields = ['address','addressUrl','hoursWeekdays','hoursSaturday',
                    'hoursSunday','phone','phoneDisplay','email',
                    'instagram','instagramUrl','mapEmbedUrl'];
    fields.forEach(key => {
      if (f.elements[key]) f.elements[key].value = data[key] || '';
    });
  } catch (err) {
    console.error('[Admin] Contact laden mislukt:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contact-form-admin');
  if (!contactForm) return;

  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = contactForm.querySelector('.save-btn');
    btn.disabled    = true;
    btn.textContent = 'Opslaan…';

    try {
      const f = e.target;
      const data = {};
      ['address','addressUrl','hoursWeekdays','hoursSaturday',
       'hoursSunday','phone','phoneDisplay','email',
       'instagram','instagramUrl','mapEmbedUrl'].forEach(key => {
        data[key] = f.elements[key]?.value.trim() || '';
      });
      await db.collection('contact').doc('main').set(data, { merge: true });
      showStatus('contact-status', 'Contactgegevens opgeslagen.');
    } catch (err) {
      showStatus('contact-status', 'Fout: ' + err.message, 'error');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Opslaan';
    }
  });
});

/* ============================================================
   INDEX PAGE TAB
   ============================================================ */
async function loadIndexContent() {
  try {
    const doc = await db.collection('pages').doc('index').get();
    if (!doc.exists) return;
    const data = doc.data();
    const f    = document.getElementById('index-form');
    if (!f) return;

    ['storyLabel','storyTitle','storyText1','storyText2'].forEach(key => {
      if (f.elements[key]) f.elements[key].value = data[key] || '';
    });

    if (data.storyImageUrl) {
      const prev = document.getElementById('index-story-img-preview');
      prev.src = data.storyImageUrl;
      prev.style.display = 'block';
    }

    (data.pillars || []).forEach((p, i) => {
      const n       = i + 1;
      const iconEl  = f.elements[`pillar${n}Icon`];
      const titleEl = f.elements[`pillar${n}Title`];
      const descEl  = f.elements[`pillar${n}Desc`];
      if (iconEl)  iconEl.value  = p.icon        || '';
      if (titleEl) titleEl.value = p.title        || '';
      if (descEl)  descEl.value  = p.description  || '';
      if (p.iconUrl) {
        const prev = document.getElementById(`pillar${n}-icon-preview`);
        if (prev) { prev.src = p.iconUrl; prev.style.display = 'block'; }
      }
    });

    (data.seasonal || []).forEach((s, i) => {
      const seasonEl = f.elements[`seasonal${i+1}Season`];
      const nameEl   = f.elements[`seasonal${i+1}Name`];
      const descEl   = f.elements[`seasonal${i+1}Desc`];
      if (seasonEl) seasonEl.value = s.season      || '';
      if (nameEl)   nameEl.value   = s.name        || '';
      if (descEl)   descEl.value   = s.description || '';

      if (s.imageUrl) {
        const prev = document.getElementById(`seasonal${i+1}-img-preview`);
        if (prev) { prev.src = s.imageUrl; prev.style.display = 'block'; }
      }
    });

    (data.favSmaken || []).forEach((s, i) => {
      const tagEl  = f.elements[`favSmaken${i+1}Tag`];
      const nameEl = f.elements[`favSmaken${i+1}Name`];
      if (tagEl)  tagEl.value  = s.tag  || '';
      if (nameEl) nameEl.value = s.name || '';

      if (s.imageUrl) {
        const prev = document.getElementById(`favSmaken${i+1}-img-preview`);
        if (prev) { prev.src = s.imageUrl; prev.style.display = 'block'; }
      }
    });

    (data.testimonials || []).slice(0, 3).forEach((r, i) => {
      const n       = i + 1;
      const textEl  = f.elements[`review${n}Text`];
      const nameEl  = f.elements[`review${n}Name`];
      const starsEl = f.elements[`review${n}Stars`];
      if (textEl)  textEl.value  = r.text  || '';
      if (nameEl)  nameEl.value  = r.name  || '';
      if (starsEl) starsEl.value = String(r.stars || 5);
    });
  } catch (err) {
    console.error('[Admin] Index laden mislukt:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Story image preview
  const storyImgInput = document.getElementById('index-story-img-input');
  if (storyImgInput) {
    storyImgInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      pendingImgs['index-story'] = file;
      const prev = document.getElementById('index-story-img-preview');
      prev.src   = URL.createObjectURL(file);
      prev.style.display = 'block';
    });
  }

  // Pillar icon previews
  [1,2,3].forEach(n => {
    document.getElementById(`pillar${n}-icon-input`)?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      pendingImgs[`index-pillar-icon-${n}`] = file;
      const prev = document.getElementById(`pillar${n}-icon-preview`);
      if (prev) { prev.src = URL.createObjectURL(file); prev.style.display = 'block'; }
    });
  });

  // Seasonal image previews (up to 8)
  for (let i = 1; i <= 8; i++) {
    const input = document.getElementById(`seasonal${i}-img-input`);
    if (!input) continue;
    input.addEventListener('change', (e => {
      const idx = i;
      return ev => {
        const file = ev.target.files[0];
        if (!file) return;
        pendingImgs[`index-seasonal-${idx}`] = file;
        const prev = document.getElementById(`seasonal${idx}-img-preview`);
        if (prev) { prev.src = URL.createObjectURL(file); prev.style.display = 'block'; }
      };
    })(i));
  }

  // FavSmaken image previews (up to 8)
  for (let i = 1; i <= 8; i++) {
    const input = document.getElementById(`favSmaken${i}-img-input`);
    if (!input) continue;
    input.addEventListener('change', (idx => ev => {
      const file = ev.target.files[0];
      if (!file) return;
      pendingImgs[`index-favsmaken-${idx}`] = file;
      const prev = document.getElementById(`favSmaken${idx}-img-preview`);
      if (prev) { prev.src = URL.createObjectURL(file); prev.style.display = 'block'; }
    })(i));
  }

  const indexForm = document.getElementById('index-form');
  if (!indexForm) return;

  indexForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = indexForm.querySelector('.save-btn');
    btn.disabled    = true;
    btn.textContent = 'Opslaan…';

    try {
      const f = e.target;

      // Fetch existing to preserve image URLs
      let existingData = {};
      const existing = await db.collection('pages').doc('index').get();
      if (existing.exists) existingData = existing.data();

      let storyImageUrl = existingData.storyImageUrl || '';
      const existingSeasonal = existingData.seasonal || [];

      // Upload story image if pending — all roles can change the image
      if (pendingImgs['index-story']) {
        storyImageUrl = await uploadToCloudinary(pendingImgs['index-story']);
      }

      // Build seasonal array (upload images where pending)
      const seasonal = [];
      for (let i = 1; i <= 8; i++) {
        const seasonEl = f.elements[`seasonal${i}Season`];
        if (!seasonEl || !seasonEl.value.trim()) continue;
        let imageUrl = (existingSeasonal[i-1] || {}).imageUrl || '';
        if (pendingImgs[`index-seasonal-${i}`]) {
          imageUrl = await uploadToCloudinary(pendingImgs[`index-seasonal-${i}`]);
        }
        seasonal.push({
          season:      f.elements[`seasonal${i}Season`]?.value.trim() || '',
          name:        f.elements[`seasonal${i}Name`]?.value.trim()   || '',
          description: f.elements[`seasonal${i}Desc`]?.value.trim()   || '',
          imageUrl,
        });
      }

      // Build favSmaken array (upload images where pending)
      const existingFavSmaken = existingData.favSmaken || [];
      const favSmaken = [];
      for (let i = 1; i <= 8; i++) {
        const nameEl = f.elements[`favSmaken${i}Name`];
        if (!nameEl || !nameEl.value.trim()) continue;
        let imageUrl = (existingFavSmaken[i-1] || {}).imageUrl || '';
        if (pendingImgs[`index-favsmaken-${i}`]) {
          imageUrl = await uploadToCloudinary(pendingImgs[`index-favsmaken-${i}`]);
        }
        favSmaken.push({
          tag:      f.elements[`favSmaken${i}Tag`]?.value.trim()  || '',
          name:     nameEl.value.trim(),
          imageUrl,
        });
      }

      const testimonials = [];
      for (let i = 1; i <= 3; i++) {
        const textEl = f.elements[`review${i}Text`];
        const nameEl = f.elements[`review${i}Name`];
        if (!textEl?.value.trim() && !nameEl?.value.trim()) continue;
        testimonials.push({
          text:  textEl?.value.trim()  || '',
          name:  nameEl?.value.trim()  || '',
          stars: parseInt(f.elements[`review${i}Stars`]?.value || '5'),
        });
      }

      const storyFields = isAdmin ? {
        storyLabel:    f.elements['storyLabel'].value.trim(),
        storyTitle:    f.elements['storyTitle'].value.trim(),
        storyText1:    f.elements['storyText1'].value.trim(),
        storyText2:    f.elements['storyText2'].value.trim(),
        storyImageUrl,
      } : { storyImageUrl }; // owner: image only

      const data = {
        ...storyFields,
        testimonials,
        pillars: await Promise.all([1,2,3].map(async n => {
          let iconUrl = existingData?.pillars?.[n-1]?.iconUrl || '';
          if (pendingImgs[`index-pillar-icon-${n}`]) {
            iconUrl = await uploadToCloudinary(pendingImgs[`index-pillar-icon-${n}`]);
            delete pendingImgs[`index-pillar-icon-${n}`];
          }
          return {
            icon:        f.elements[`pillar${n}Icon`]?.value.trim()  || '',
            iconUrl,
            title:       f.elements[`pillar${n}Title`]?.value.trim() || '',
            description: f.elements[`pillar${n}Desc`]?.value.trim()  || '',
          };
        })),
        seasonal,
        favSmaken,
      };

      await db.collection('pages').doc('index').set(data, { merge: true });
      Object.keys(pendingImgs).filter(k => k.startsWith('index-')).forEach(k => delete pendingImgs[k]);
      showStatus('index-status', 'Index pagina opgeslagen.');
    } catch (err) {
      showStatus('index-status', 'Fout: ' + err.message, 'error');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Opslaan';
    }
  });
});

/* ============================================================
   UTILITY
   ============================================================ */
function escAdmin(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Expose functions called from inline HTML
window.toggleVisibility    = toggleVisibility;
window.openFlavorModal     = openFlavorModal;
window.confirmDeleteFlavor = confirmDeleteFlavor;
window.filterFlavors       = filterFlavors;
window.applyFlavorFilters  = applyFlavorFilters;
window.dragStart           = dragStart;
window.dragOver            = dragOver;
window.dragLeave           = dragLeave;
window.dragDrop            = dragDrop;
window.dragEnd             = dragEnd;

/* ============================================================
   STATS (admin only)
   ============================================================ */
let statsCache  = null;
let statsPeriod = 'days';

const PERIOD_TITLES = {
  days:   'Bezoekers per dag — laatste 30 dagen',
  months: 'Bezoekers per maand — laatste 12 maanden',
  years:  'Bezoekers per jaar',
};

function initStats() {
  document.getElementById('stats-refresh-btn').addEventListener('click', () => {
    statsCache = null;
    loadStats();
  });
  document.querySelectorAll('.stats-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.stats-period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      statsPeriod = btn.dataset.period;
      document.getElementById('stats-chart-title').textContent = PERIOD_TITLES[statsPeriod];
      if (statsCache) renderStatsChart(statsCache);
    });
  });
}

async function loadStats() {
  const chartEl = document.getElementById('stats-chart');
  if (!chartEl) return;
  chartEl.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem;">Laden…</p>';

  try {
    const snap = await db.collection('site_visits').get();
    const docs = {};
    snap.forEach(d => { docs[d.id] = d.data().count || 0; });
    statsCache = docs;

    const today     = new Date().toISOString().slice(0, 10);
    const todayCount = docs[today] || 0;
    const totalCount = docs['total'] || 0;

    const weekCount = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      return docs[d.toISOString().slice(0, 10)] || 0;
    }).reduce((s, n) => s + n, 0);

    document.getElementById('stat-today').textContent = todayCount;
    document.getElementById('stat-week').textContent  = weekCount;
    document.getElementById('stat-total').textContent = totalCount;

    renderStatsChart(docs);
  } catch (err) {
    chartEl.innerHTML = '<p style="color:var(--danger);font-size:0.85rem;">Kon statistieken niet laden.</p>';
    console.error('[Stats]', err);
  }
}

function renderStatsChart(docs) {
  const chartEl = document.getElementById('stats-chart');
  if (!chartEl) return;

  const today = new Date().toISOString().slice(0, 10);
  let bars = [];

  if (statsPeriod === 'days') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key   = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
      bars.push({ key, label, count: docs[key] || 0, highlight: key === today });
    }
  } else if (statsPeriod === 'months') {
    const monthly = {};
    Object.entries(docs).forEach(([k, v]) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k)) {
        const m = k.slice(0, 7);
        monthly[m] = (monthly[m] || 0) + v;
      }
    });
    const thisMonth = today.slice(0, 7);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const key   = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' });
      bars.push({ key, label, count: monthly[key] || 0, highlight: key === thisMonth });
    }
  } else {
    const yearly = {};
    Object.entries(docs).forEach(([k, v]) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k)) {
        const y = k.slice(0, 4);
        yearly[y] = (yearly[y] || 0) + v;
      }
    });
    const thisYear  = today.slice(0, 4);
    const years     = [...new Set([...Object.keys(yearly), thisYear])].sort();
    bars = years.map(y => ({ key: y, label: y, count: yearly[y] || 0, highlight: y === thisYear }));
  }

  const maxCount   = Math.max(...bars.map(b => b.count), 1);
  const showEvery  = statsPeriod === 'days' ? 5 : 1;

  chartEl.innerHTML = bars.map((b, i) => `
    <div class="stats-bar-col">
      <span class="stats-bar-count">${b.count > 0 ? b.count : ''}</span>
      <div class="stats-bar-track">
        <div class="stats-bar-fill${b.highlight ? ' stats-bar-fill--today' : ''}"
             style="height:${Math.round((b.count / maxCount) * 100)}%"
             title="${b.label}: ${b.count}"></div>
      </div>
      <span class="stats-bar-label">${i % showEvery === 0 || i === bars.length - 1 ? b.label : ''}</span>
    </div>`).join('');
}
