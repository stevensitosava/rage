// Raffy Gelato — Admin Dashboard Logic
// Depends on: firebase-config.js (sets up db, storage, auth globals)

/* ============================================================
   STATE
   ============================================================ */
let currentUser    = null;
let allFlavors     = [];
let editingFlavor  = null; // null = new, object = existing
let pendingImgFile = null; // image selected but not yet uploaded
let pendingImgCtx  = '';   // "flavor" | "about" | "index-story" | "index-seasonal-N"

/* ============================================================
   BOOT — auth guard
   ============================================================ */
auth.onAuthStateChanged(user => {
  if (!user) {
    location.href = 'index.html';
    return;
  }
  currentUser = user;
  document.getElementById('admin-email').textContent = user.email;
  init();
});

document.getElementById('logout-btn').addEventListener('click', () => {
  auth.signOut().then(() => { location.href = 'index.html'; });
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
    });
  });
}

/* ============================================================
   HELPER — show temporary status message
   ============================================================ */
function showStatus(containerId, msg, type = 'success') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="admin-alert admin-alert-${type}">${msg}</div>`;
  setTimeout(() => { el.innerHTML = ''; }, 3500);
}

/* ============================================================
   FLAVORS TAB
   ============================================================ */
async function loadFlavors() {
  const body = document.getElementById('flavors-table-body');
  body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:var(--text-light);">Laden…</td></tr>';

  try {
    const snap = await db.collection('flavors').orderBy('order', 'asc').get();
    allFlavors  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderFlavorsTable(allFlavors);
  } catch (err) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:var(--danger);">Fout bij laden: ${err.message}</td></tr>`;
  }
}

function renderFlavorsTable(flavors) {
  const body = document.getElementById('flavors-table-body');
  if (!flavors.length) {
    body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-light);">Nog geen smaken toegevoegd.</td></tr>';
    return;
  }

  body.innerHTML = flavors.map((f, idx) => {
    const badge = `<span class="badge badge-${f.category || 'gelato'}">${f.category || 'gelato'}</span>`;
    return `
    <tr data-id="${f.id}">
      <td style="text-align:center;">
        <div style="display:flex;gap:2px;justify-content:center;">
          <button class="btn btn-outline btn-sm btn-icon" onclick="moveOrder('${f.id}', -1)" ${idx === 0 ? 'disabled' : ''} title="Omhoog">↑</button>
          <button class="btn btn-outline btn-sm btn-icon" onclick="moveOrder('${f.id}', 1)"  ${idx === flavors.length-1 ? 'disabled' : ''} title="Omlaag">↓</button>
        </div>
      </td>
      <td style="font-size:1.4rem;text-align:center;">${f.emoji || '🍦'}</td>
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
  }).join('');
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

async function moveOrder(id, direction) {
  const idx = allFlavors.findIndex(f => f.id === id);
  const swapIdx = idx + direction;
  if (swapIdx < 0 || swapIdx >= allFlavors.length) return;

  const a = allFlavors[idx];
  const b = allFlavors[swapIdx];

  try {
    const batch = db.batch();
    batch.update(db.collection('flavors').doc(a.id), { order: b.order });
    batch.update(db.collection('flavors').doc(b.id), { order: a.order });
    await batch.commit();
    await loadFlavors();
  } catch (err) {
    alert('Fout: ' + err.message);
  }
}

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
  pendingImgFile = null;
  document.getElementById('modal-img-preview').style.display = 'none';

  if (id) {
    editingFlavor = allFlavors.find(f => f.id === id) || null;
    title.textContent = 'Smaak Bewerken';
    if (editingFlavor) {
      form.elements['name'].value        = editingFlavor.name        || '';
      form.elements['description'].value = editingFlavor.description || '';
      form.elements['price'].value       = editingFlavor.price       || '';
      form.elements['emoji'].value       = editingFlavor.emoji       || '';
      form.elements['category'].value    = editingFlavor.category    || 'gelato';
      form.elements['visible'].checked   = editingFlavor.visible     !== false;
      if (editingFlavor.imageUrl) {
        const prev = document.getElementById('modal-img-preview');
        prev.src = editingFlavor.imageUrl;
        prev.style.display = 'block';
      }
    }
  } else {
    editingFlavor = null;
    title.textContent = 'Smaak Toevoegen';
    form.elements['visible'].checked = true;
    form.elements['emoji'].value = '🍦';
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
  pendingImgFile = null;
}

async function saveFlavorFromModal(e) {
  e.preventDefault();
  const form     = e.target;
  const saveBtn  = document.getElementById('modal-save');
  saveBtn.disabled    = true;
  saveBtn.textContent = 'Opslaan…';

  try {
    let imageUrl = editingFlavor?.imageUrl || '';

    // Upload new image if selected
    if (pendingImgFile) {
      const path = `flavors/${Date.now()}_${pendingImgFile.name}`;
      const ref  = storage.ref(path);
      const snap = await ref.put(pendingImgFile);
      imageUrl   = await snap.ref.getDownloadURL();
    }

    const data = {
      name:        form.elements['name'].value.trim(),
      description: form.elements['description'].value.trim(),
      price:       form.elements['price'].value.trim(),
      emoji:       form.elements['emoji'].value.trim() || '🍦',
      category:    form.elements['category'].value,
      visible:     form.elements['visible'].checked,
      imageUrl,
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

// Image preview in modal
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-img-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    pendingImgFile = file;
    const prev = document.getElementById('modal-img-preview');
    prev.src   = URL.createObjectURL(file);
    prev.style.display = 'block';
  });
});

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
      const iconEl  = f.elements[`val${i+1}Icon`];
      const titleEl = f.elements[`val${i+1}Title`];
      const descEl  = f.elements[`val${i+1}Desc`];
      if (iconEl)  iconEl.value  = v.icon        || '';
      if (titleEl) titleEl.value = v.title        || '';
      if (descEl)  descEl.value  = v.description  || '';
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
    pendingImgFile = file;
    pendingImgCtx  = 'about';
    const prev = document.getElementById('about-img-preview');
    prev.src   = URL.createObjectURL(file);
    prev.style.display = 'block';
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

      if (pendingImgFile && pendingImgCtx === 'about') {
        const ref  = storage.ref(`about/${Date.now()}_${pendingImgFile.name}`);
        const snap = await ref.put(pendingImgFile);
        imageUrl   = await snap.ref.getDownloadURL();
        pendingImgFile = null;
      }

      const f = e.target;
      const data = {
        storyLabel:      f.elements['storyLabel'].value.trim(),
        storyTitle:      f.elements['storyTitle'].value.trim(),
        storyParagraph1: f.elements['storyParagraph1'].value.trim(),
        storyParagraph2: f.elements['storyParagraph2'].value.trim(),
        storyParagraph3: f.elements['storyParagraph3'].value.trim(),
        imageUrl,
        processSteps: [1,2,3].map(n => ({
          title:       f.elements[`step${n}Title`]?.value.trim() || '',
          description: f.elements[`step${n}Desc`]?.value.trim()  || '',
        })),
        values: [1,2,3].map(n => ({
          icon:        f.elements[`val${n}Icon`]?.value.trim()  || '',
          title:       f.elements[`val${n}Title`]?.value.trim() || '',
          description: f.elements[`val${n}Desc`]?.value.trim()  || '',
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
      const iconEl  = f.elements[`pillar${i+1}Icon`];
      const titleEl = f.elements[`pillar${i+1}Title`];
      const descEl  = f.elements[`pillar${i+1}Desc`];
      if (iconEl)  iconEl.value  = p.icon        || '';
      if (titleEl) titleEl.value = p.title        || '';
      if (descEl)  descEl.value  = p.description  || '';
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
      pendingImgFile = file;
      pendingImgCtx  = 'index-story';
      const prev = document.getElementById('index-story-img-preview');
      prev.src   = URL.createObjectURL(file);
      prev.style.display = 'block';
    });
  }

  // Seasonal image previews (up to 8)
  for (let i = 1; i <= 8; i++) {
    const input = document.getElementById(`seasonal${i}-img-input`);
    if (!input) continue;
    input.addEventListener('change', (e => {
      const idx = i;
      return ev => {
        const file = ev.target.files[0];
        if (!file) return;
        pendingImgFile = file;
        pendingImgCtx  = `index-seasonal-${idx}`;
        const prev = document.getElementById(`seasonal${idx}-img-preview`);
        if (prev) { prev.src = URL.createObjectURL(file); prev.style.display = 'block'; }
      };
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

      // Upload story image if pending
      if (pendingImgFile && pendingImgCtx === 'index-story') {
        const ref  = storage.ref(`pages/index-story-${Date.now()}_${pendingImgFile.name}`);
        const snap = await ref.put(pendingImgFile);
        storyImageUrl = await snap.ref.getDownloadURL();
      }

      // Build seasonal array (upload images where pending)
      const seasonal = [];
      for (let i = 1; i <= 8; i++) {
        const seasonEl = f.elements[`seasonal${i}Season`];
        if (!seasonEl || !seasonEl.value.trim()) continue;
        let imageUrl = (existingSeasonal[i-1] || {}).imageUrl || '';
        if (pendingImgFile && pendingImgCtx === `index-seasonal-${i}`) {
          const ref  = storage.ref(`pages/seasonal${i}-${Date.now()}_${pendingImgFile.name}`);
          const snap = await ref.put(pendingImgFile);
          imageUrl   = await snap.ref.getDownloadURL();
        }
        seasonal.push({
          season:      f.elements[`seasonal${i}Season`]?.value.trim() || '',
          name:        f.elements[`seasonal${i}Name`]?.value.trim()   || '',
          description: f.elements[`seasonal${i}Desc`]?.value.trim()   || '',
          imageUrl,
        });
      }

      const data = {
        storyLabel:    f.elements['storyLabel'].value.trim(),
        storyTitle:    f.elements['storyTitle'].value.trim(),
        storyText1:    f.elements['storyText1'].value.trim(),
        storyText2:    f.elements['storyText2'].value.trim(),
        storyImageUrl,
        pillars: [1,2,3].map(n => ({
          icon:        f.elements[`pillar${n}Icon`]?.value.trim()  || '',
          title:       f.elements[`pillar${n}Title`]?.value.trim() || '',
          description: f.elements[`pillar${n}Desc`]?.value.trim()  || '',
        })),
        seasonal,
      };

      await db.collection('pages').doc('index').set(data, { merge: true });
      pendingImgFile = null;
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
window.toggleVisibility     = toggleVisibility;
window.moveOrder            = moveOrder;
window.openFlavorModal      = openFlavorModal;
window.confirmDeleteFlavor  = confirmDeleteFlavor;
