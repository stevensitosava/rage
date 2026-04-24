// Raffy Gelato — Visit Tracker
// Counts one visit per browser session in Firestore (site_visits collection).
// Relies on firebase-config.js (db global) being loaded first.
(function () {
  const SESSION_KEY = 'raffy_visit_tracked';
  if (sessionStorage.getItem(SESSION_KEY)) return;

  function track() {
    if (typeof db === 'undefined' || !db) return;
    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const inc   = firebase.firestore.FieldValue.increment(1);
      const opts  = { merge: true };
      db.collection('site_visits').doc('total').set({ count: inc }, opts).catch(() => {});
      db.collection('site_visits').doc(today).set({ count: inc }, opts).catch(() => {});
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch (_) {}
  }

  // db may not be ready yet if Firebase scripts are still loading
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', track);
  } else {
    track();
  }
})();
