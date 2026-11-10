export const C = {
  bg: '#181a18',
  deep: '#0b0c0b',
  card: '#1d1f1d',
  head: 'rgba(0,0,0,0.25)',
  panel: 'rgba(255,255,255,0.045)',
  text: '#dfe3df',
  bright: '#ffffff',
  dim: '#8f998f',
  blue: '#8fe08f',
  green: '#5fd35f',
  greenDeep: '#107c10',
  light: '#f2f6f2',
  ph: '#272927',
  gold: '#f2c14e',
  rare: '#b48cff',
};

export async function firstOk(urls: (string | null | undefined)[]) {
  for (const u of urls) {
    if (!u) continue;
    try {
      const r = await fetch(u, { method: 'HEAD', next: { revalidate: 86400 } });
      if (r.ok) return u;
    } catch {}
    // Some image hosts (Microsoft's store CDN) refuse HEAD; ask for one byte instead.
    try {
      const r = await fetch(u, { headers: { Range: 'bytes=0-0' }, next: { revalidate: 86400 } });
      if (r.ok || r.status === 206) return u;
    } catch {}
  }
  return null;
}

export function Logo({ size = 22 }: { size?: number }) {
  const u = size / 22;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.dim, fontSize: size }}>
      <svg width={28 * u} height={28 * u} viewBox="0 0 28 28">
        <rect x="1" y="1" width="26" height="26" rx="6" fill="#0e1a0f" stroke="#2c4a2e" strokeWidth="1" />
        <rect x="5.5" y="5.5" width="9" height="9" rx="2" fill="#4cc94f" />
        <rect x="16" y="5.5" width="6.5" height="9" rx="2" fill="#e8ece8" fillOpacity=".85" />
        <rect x="5.5" y="16" width="6.5" height="6.5" rx="2" fill="#e8ece8" fillOpacity=".55" />
        <rect x="13.5" y="16" width="9" height="6.5" rx="2" fill="#e8ece8" fillOpacity=".3" />
      </svg>
      My Gaming Grid
    </div>
  );
}
