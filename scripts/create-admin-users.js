/**
 * One-time bootstrap: creates admin_users documents in Firestore.
 * Uses Firebase Auth REST API + Firestore REST API (no extra dependencies).
 *
 * Usage:
 *   node scripts/create-admin-users.js
 *
 * You will be prompted for your admin@raffygelato.nl password.
 * The script signs in, creates the two documents, then exits.
 */

'use strict';

const https    = require('https');
const readline = require('readline');

const API_KEY    = 'AIzaSyBCkXzzA2QExMw_9SnJVa0R7D5Noof6bB0';
const PROJECT_ID = 'raffy-gelato';

const ADMIN_USERS = [
  { email: 'admin@raffygelato.nl', role: 'admin'  },
  { email: 'owner@raffygelato.nl', role: 'owner'  },
];

/* ── helpers ─────────────────────────────────────────────── */
function post(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, res => {
      let raw = '';
      res.on('data', d => { raw += d; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function patch(url, body, idToken) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(url, {
      method:  'PATCH',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization':  `Bearer ${idToken}`,
      },
    }, res => {
      let raw = '';
      res.on('data', d => { raw += d; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function prompt(question, hidden = false) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (hidden) {
      process.stdout.write(question);
      const stdin = process.openStdin();
      let pw = '';
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');
      stdin.on('data', ch => {
        if (ch === '\n' || ch === '\r' || ch === '') {
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write('\n');
          rl.close();
          resolve(pw);
        } else if (ch === '') {
          pw = pw.slice(0, -1);
        } else {
          pw += ch;
          process.stdout.write('*');
        }
      });
    } else {
      rl.question(question, ans => { rl.close(); resolve(ans.trim()); });
    }
  });
}

/* ── Firestore document format ───────────────────────────── */
function toFirestoreDoc(data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = { stringValue: v };
  }
  return { fields };
}

/* ── main ────────────────────────────────────────────────── */
async function main() {
  console.log('\n=== Raffy Gelato — Admin Users Bootstrap ===\n');
  console.log('This will create the following documents in Firestore > admin_users:\n');
  ADMIN_USERS.forEach(u => console.log(`  • ${u.email}  (role: ${u.role})`));
  console.log('\nSign in with admin@raffygelato.nl to authenticate.\n');

  const email    = await prompt('Email:    ');
  const password = await prompt('Password: ', true);

  console.log('\nSigning in to Firebase…');
  const authRes = await post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { email, password, returnSecureToken: true }
  );

  if (authRes.error) {
    console.error('\n❌  Sign-in failed:', authRes.error.message);
    process.exit(1);
  }

  const idToken = authRes.idToken;
  console.log(`✓  Signed in as ${authRes.email}\n`);

  // Note: Firestore rules currently set admin_users write to false.
  // These writes go through the Firebase Admin override path when the rule
  // is temporarily set to allow write: if request.auth != null.
  // To bootstrap, temporarily update the rule in firestore.rules:
  //   allow write: if request.auth != null;
  // deploy, run this script, then set it back to:
  //   allow write: if false;
  //
  // Alternatively, create the documents directly in the Firebase Console.

  let allOk = true;
  for (const user of ADMIN_USERS) {
    const docId = encodeURIComponent(user.email);
    const url   = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admin_users/${docId}`;
    const body  = toFirestoreDoc({ email: user.email, role: user.role });

    process.stdout.write(`Creating ${user.email}… `);
    const res = await patch(url, body, idToken);

    if (res.status === 200 || res.status === 201) {
      console.log('✓');
    } else {
      console.log(`✗  (HTTP ${res.status})`);
      if (res.body?.error) console.error('   ', res.body.error.message);
      allOk = false;
    }
  }

  if (allOk) {
    console.log('\n✅  All admin_users documents created successfully.');
    console.log('    You can now log in to the admin panel.\n');
  } else {
    console.log('\n⚠️  Some documents could not be created.');
    console.log('    Check the Firestore rules — admin_users writes may be blocked.');
    console.log('    See the comment in this script for how to temporarily allow writes.\n');
  }
}

main().catch(err => {
  console.error('\n❌  Unexpected error:', err.message);
  process.exit(1);
});
