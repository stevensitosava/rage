// Raffy Gelato — Firebase Data Layer
// Depends on: firebase-config.js (sets up global db, storage, auth)

/* ============================================================
   FLAVORS (menu page)
   Collection: flavors
   Doc structure: { name, description, price, emoji, category,
                    visible, order, imageUrl, createdAt }
   ============================================================ */

async function getFlavors() {
  const snap = await db.collection('flavors')
    .where('visible', '==', true)
    .orderBy('order', 'asc')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getAllFlavors() {
  const snap = await db.collection('flavors').orderBy('order', 'asc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addFlavor(data) {
  return db.collection('flavors').add({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function updateFlavor(id, data) {
  return db.collection('flavors').doc(id).update(data);
}

async function deleteFlavor(id) {
  return db.collection('flavors').doc(id).delete();
}

/* ============================================================
   ABOUT PAGE
   Collection: about / Document: main
   Doc structure: { storyLabel, storyTitle, storyParagraph1..3,
                    imageUrl, processSteps[], values[] }
   ============================================================ */

async function getAbout() {
  const doc = await db.collection('about').doc('main').get();
  return doc.exists ? doc.data() : null;
}

async function updateAbout(data) {
  return db.collection('about').doc('main').set(data, { merge: true });
}

/* ============================================================
   CONTACT PAGE
   Collection: contact / Document: main
   Doc structure: { address, addressUrl, hoursWeekdays,
                    hoursSaturday, hoursSunday, phone,
                    phoneDisplay, email, instagram,
                    instagramUrl, mapEmbedUrl }
   ============================================================ */

async function getContact() {
  const doc = await db.collection('contact').doc('main').get();
  return doc.exists ? doc.data() : null;
}

async function updateContact(data) {
  return db.collection('contact').doc('main').set(data, { merge: true });
}

/* ============================================================
   INDEX PAGE
   Collection: pages / Document: index
   Doc structure: { storyLabel, storyTitle, storyText1,
                    storyText2, storyImageUrl, pillarsTitle,
                    pillars[], seasonal[] }
   ============================================================ */

async function getIndexContent() {
  const doc = await db.collection('pages').doc('index').get();
  return doc.exists ? doc.data() : null;
}

async function updateIndexContent(data) {
  return db.collection('pages').doc('index').set(data, { merge: true });
}

/* ============================================================
   IMAGE UPLOAD (Firebase Storage)
   path example: "flavors/my-image.jpg" or "about/founder.jpg"
   ============================================================ */

async function uploadImage(file, path) {
  const ref  = storage.ref(path);
  const snap = await ref.put(file);
  return snap.ref.getDownloadURL();
}
