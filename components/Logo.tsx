import Link from 'next/link';

// Four dashboard tiles, one lit green: the grid, Xbox-coloured. Not the Xbox logo.
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="My Gaming Grid for Xbox, home">
      <svg viewBox="0 0 28 28" aria-hidden>
        <rect x="1" y="1" width="26" height="26" rx="6" fill="#0e1a0f" stroke="#2c4a2e" strokeWidth="1" />
        <rect x="5.5" y="5.5" width="9" height="9" rx="2" fill="url(#mgg-lit)" />
        <rect x="16" y="5.5" width="6.5" height="9" rx="2" fill="#e8ece8" fillOpacity=".85" />
        <rect x="5.5" y="16" width="6.5" height="6.5" rx="2" fill="#e8ece8" fillOpacity=".55" />
        <rect x="13.5" y="16" width="9" height="6.5" rx="2" fill="#e8ece8" fillOpacity=".3" />
        <defs>
          <linearGradient id="mgg-lit" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9cff7a" />
            <stop offset="1" stopColor="#139e18" />
          </linearGradient>
        </defs>
      </svg>
      <span>
        My Gaming Grid <em>for Xbox</em>
      </span>
    </Link>
  );
}
