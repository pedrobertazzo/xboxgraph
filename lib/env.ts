export const env = {
  // An OpenXBL API key (xbl.io). When set, the site reads Xbox through OpenXBL instead of signing in itself.
  openxblKey: process.env.OPENXBL_API_KEY ?? '',
  appUrl: process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  // The helper Microsoft account's sign-in, through an Azure app registration (see the README). Use a separate
  // account made for this site, never your main one.
  clientId: process.env.XBOX_CLIENT_ID ?? '',
  // Only for app registrations of the "Web" type; public (mobile and desktop) registrations have no secret.
  clientSecret: process.env.XBOX_CLIENT_SECRET ?? '',
  refreshToken: process.env.XBOX_REFRESH_TOKEN ?? '',
  redirectUri: process.env.XBOX_REDIRECT_URI ?? 'http://localhost:8080/auth/callback',
};
