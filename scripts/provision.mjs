import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getSecurityRules } from 'firebase-admin/security-rules';
import { readFile } from 'fs/promises';

const serviceAccount = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url)));

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const rules = getSecurityRules();

// 1. Enable Email/Password auth provider via Identity Platform REST API
async function enableEmailPasswordAuth() {
  const { GoogleAuth } = await import('google-auth-library');
  const authClient = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/identitytoolkit'],
  });
  const client = await authClient.getClient();
  const accessToken = await client.getAccessToken();

  // First check current config
  const getRes = await fetch(
    `https://identitytoolkit.googleapis.com/v2/projects/${serviceAccount.project_id}/config`,
    { headers: { Authorization: `Bearer ${accessToken.token}` } }
  );
  const currentConfig = await getRes.json();
  console.log('Current auth config:', JSON.stringify({ signIn: currentConfig.signIn }, null, 2));

  // Only update the signIn.email section
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v2/projects/${serviceAccount.project_id}/config?updateMask=signIn.email`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signIn: {
          email: {
            enabled: true,
          },
        },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    console.error('Failed to enable Email/Password auth:', err);
    // Try alternative: use the Identity Toolkit v1 API
    console.log('Trying v1 API...');
    const altRes = await fetch(
      `https://identitytoolkit.googleapis.com/admin/v2/projects/${serviceAccount.project_id}/configs`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signIn: {
            email: {
              enabled: true,
            },
          },
        }),
      }
    );
    const altResult = await altRes.text();
    console.log('v1 API result:', altResult);
  } else {
    const result = await res.json();
    console.log('Email/Password auth enabled:', result.signIn?.email?.enabled);
  }
}

// 2. Deploy Firestore rules
async function deployFirestoreRules() {
  const rulesContent = await readFile(
    new URL('../firestore.rules', import.meta.url),
    'utf-8'
  );
  const result = await rules.releaseFirestoreRulesetFromSource(rulesContent);
  console.log('Firestore rules deployed. Name:', result.name);
}

// 3. Enable Firebase Storage (via Service Usage API)
async function enableFirebaseStorage() {
  const { GoogleAuth } = await import('google-auth-library');
  const authClient = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await authClient.getClient();
  const accessToken = await client.getAccessToken();

  const res = await fetch(
    `https://serviceusage.googleapis.com/v1/projects/${serviceAccount.project_id}/services/firebasestorage.googleapis.com:enable`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken.token}` },
    }
  );
  if (res.ok) {
    console.log('Firebase Storage enabled.');
  } else {
    const err = await res.text();
    // 409 means already enabled
    if (res.status === 409) {
      console.log('Firebase Storage already enabled.');
    } else {
      console.error('Failed to enable Firebase Storage:', err);
    }
  }
}

async function main() {
  try {
    await enableEmailPasswordAuth();
  } catch (e) {
    console.error('Auth config error (may already be enabled):', e.message);
  }
  try {
    await deployFirestoreRules();
  } catch (e) {
    console.error('Rules deploy error:', e.message);
  }
  try {
    await enableFirebaseStorage();
  } catch (e) {
    console.error('Storage enable error:', e.message);
  }
  console.log('Provisioning complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
