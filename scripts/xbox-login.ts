// Signs the site's helper Microsoft account in once and prints the refresh token for XBOX_REFRESH_TOKEN.
//
//   npm run xbox-login
//
// It reads XBOX_CLIENT_ID (and XBOX_CLIENT_SECRET, XBOX_REDIRECT_URI if set) from the environment or .env.local,
// opens a tiny local server for Microsoft's redirect, and prints the sign-in link. Sign in with the helper account,
// never your main one. The token can act as that account on Xbox Live: keep it secret.
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';

for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const { env } = await import('../lib/env');
const { msaToken, xstsFor } = await import('../lib/xbox');

if (!env.clientId) {
  console.error('Set XBOX_CLIENT_ID first (the Application (client) ID of your Azure app registration). See the README.');
  process.exit(1);
}

const redirect = new URL(env.redirectUri);
const authorize = new URL('https://login.live.com/oauth20_authorize.srf');
authorize.search = new URLSearchParams({
  client_id: env.clientId,
  response_type: 'code',
  approval_prompt: 'auto',
  scope: 'Xboxlive.signin Xboxlive.offline_access',
  redirect_uri: env.redirectUri,
}).toString();

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', env.redirectUri);
  if (url.pathname !== redirect.pathname) return void res.writeHead(404).end();
  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end(`Sign-in failed: ${url.searchParams.get('error_description') ?? 'no code'}`);
    return;
  }
  try {
    const msa = await msaToken({ code });
    const x = await xstsFor(msa.access);
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('Signed in. You can close this tab and go back to the terminal.');
    console.log(`\nSigned in to Xbox Live (xuid ${x.xuid || 'unknown'}). Add this to .env.local and to Vercel:\n`);
    console.log(`XBOX_REFRESH_TOKEN=${msa.refresh}\n`);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }).end(`Sign-in failed: ${(e as Error).message}`);
    console.error(e);
  } finally {
    server.close();
  }
});

server.listen(Number(redirect.port) || 80, redirect.hostname, () => {
  console.log('Open this link in a browser and sign in with the helper account (not your main one):\n');
  console.log(authorize.toString() + '\n');
  console.log(`Waiting for Microsoft to redirect to ${env.redirectUri} …`);
});
