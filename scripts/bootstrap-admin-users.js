'use strict';

/**
 * Creates admin_users documents in Firestore using Firebase CLI stored credentials.
 * Bypasses Firestore security rules via the Admin REST API.
 * Run once: node scripts/bootstrap-admin-users.js
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PROJECT_ID = 'raffy-gelato';

const ADMIN_USERS = [
  { email: 'admin@raffygelato.nl', role: 'admin' },
  { email: 'owner@raffygelato.nl', role: 'owner' },
];

function loadFirebaseToken() {
  const configPath = path.join(
    process.env.APPDATA || process.env.HOME,
    '.config', 'configstore', 'firebase-tools.json'
  );
  const altPath = path.join(
    process.env.HOME || '',
    '.config', 'configstore', 'firebase-tools.json'
  );

  let config;
  try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch { config = JSON.parse(fs.readFileSync(altPath, 'utf8')); }

  const token = config?.tokens?.access_token || config?.tokens?.refresh_token;
  if (!token) throw new Error('No Firebase token found — run: firebase login');
  return { config, configPath };
}

function refreshToken(refreshToken_) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      grant_type:    'refresh_token',
      refresh_token: refreshToken_,
      client_id:     '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8ywKVtBzZFHjTbVNL',
    });
    const req = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, res => {
      let raw = '';
      res.on('data', d => { raw += d; });
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { reject(new Error(raw)); } });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function setDocument(idToken, email, data) {
  return new Promise((resolve, reject) => {
    const docId  = encodeURIComponent(email);
    const url    = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admin_users/${docId}`;
    const body   = JSON.stringify({
      fields: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, { stringValue: v }])
      ),
    });
    const req = https.request(url, {
      method:  'PATCH',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization':  `Bearer ${idToken}`,
      },
    }, res => {
      let raw = '';
      res.on('data', d => { raw += d; });
      res.on('end', () => { resolve({ status: res.statusCode, body: raw }); });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('\n=== Raffy Gelato — Admin Users Bootstrap ===\n');

  // Load stored Firebase CLI credentials
  const { config } = loadFirebaseToken();
  const tokens = config.tokens;

  // Get a fresh access token via refresh token
  process.stdout.write('Refreshing access token… ');
  const refreshed = await refreshToken(tokens.refresh_token);
  if (refreshed.error) throw new Error(refreshed.error_description || refreshed.error);
  const accessToken = refreshed.access_token;
  console.log('✓\n');

  for (const user of ADMIN_USERS) {
    process.stdout.write(`Creating ${user.email} (role: ${user.role})… `);
    const res = await setDocument(accessToken, user.email, user);

    if (res.status === 200 || res.status === 201) {
      console.log('✓');
    } else {
      const parsed = (() => { try { return JSON.parse(res.body); } catch { return {}; } })();
      console.log(`✗  HTTP ${res.status} — ${parsed.error?.message || res.body}`);
    }
  }

  console.log('\n✅  admin_users collection is ready. You can now log in to the admin panel.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ ', err.message);
  process.exit(1);
});
