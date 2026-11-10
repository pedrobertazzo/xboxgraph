import type { ReactNode } from 'react';

// Icons share one 24×24 line style; their colour says what the stat is about: time (ice), gamerscore and achievements
// (green), 100% and rarity (gold and violet), the library (steel), what you drop (rose).
type Group = 'time' | 'score' | 'complete' | 'rare' | 'library' | 'shelf';

const COIN = <path d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM15.2 9.4A3.8 3.8 0 1 0 15.6 13H12.4" />;
const MEDAL = <path d="M8.5 3h7l-1.5 4.5h-4zM12 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM9.6 15l1.7 1.7 3.2-3.3" />;
const GEM = <path d="M7 4h10l4 5-9 11L3 9zM3 9h18M9.5 9 12 20l2.5-11M7 4l2.5 5L12 4l2.5 5L17 4" />;

const ICONS: Record<string, [Group, ReactNode]> = {
  gamerscore: ['score', COIN],
  achievements: ['score', <path d="M12 3.5l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z" />],
  completed: ['complete', MEDAL],
  completion: ['score', <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12zM15 3.6A8.5 8.5 0 0 1 20.4 9H15z" />],
  almost: ['complete', <path d="M5.5 21V4M5.5 4.5h12l-2.5 4 2.5 4h-12" />],
  playtime: ['time', <path d="M7 3h10M7 21h10M8 3v2a4 4 0 0 0 1.6 3.2L12 11l2.4-2.8A4 4 0 0 0 16 5V3M8 21v-2a4 4 0 0 1 1.6-3.2L12 13l2.4 2.8A4 4 0 0 1 16 19v2" />],
  top: ['time', <path d="M3.5 8 7.5 12 12 5l4.5 7 4-4-1.8 10.5H5.3zM5.3 18.5h13.4" />],
  recent: ['time', <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6M20.5 3.5V8H16M12 7.5V12l3 2" />],
  platforms: ['library', <path d="M7.5 8h9a4.5 4.5 0 0 1 4.5 4.5V15a3 3 0 0 1-5.4 1.8L14 15h-4l-1.6 1.8A3 3 0 0 1 3 15v-2.5A4.5 4.5 0 0 1 7.5 8zM8 10.5v4M6 12.5h4M15.5 11.5h.01M17.5 13.5h.01" />],
  rarest: ['rare', GEM],
  rarity: ['rare', <path d="M4 20h4v-6H4zM10 20h4V9h-4zM16 20h4V4h-4z" />],
  when: ['time', <path d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5V12l3 2" />],
  calendar: ['library', <path d="M4 6h16v14H4zM4 10.5h16M8.5 3.5v4M15.5 3.5v4M8 14.5h2M14 14.5h2M8 17.5h2" />],
  starts: ['library', <path d="M4 6h16v14H4zM4 10.5h16M8.5 3.5v4M15.5 3.5v4M12 13v5M9.5 15.5h5" />],
  scorerate: ['score', <path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12z" />],
  oneanddone: ['shelf', <path d="M14 4H5.5v16H14M10 12h10.5M17.5 8.8 20.7 12l-3.2 3.2" />],
  finishrate: ['complete', <path d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM8 12.3l2.8 2.7L16 9.6" />],
  biggest: ['complete', <path d="M12 3 5 7v6c0 4 3 6.6 7 8 4-1.4 7-4 7-8V7zM9 12.2l2.2 2.2L15.5 10" />],
  genres: ['library', <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />],
  eras: ['library', <path d="M4 18h16M6 18V9l6-4.5L18 9v9M9.5 18v-5h5v5" />],
  backlog: ['shelf', <path d="M4 7h16v4H4zM5 11v9h14v-9M10 14.5h4" />],
  thisyear: ['time', <path d="M4 6h16v14H4zM4 10.5h16M8.5 3.5v4M15.5 3.5v4M8 14.5h2M14 14.5h2M8 17.5h2" />],
  instead: ['time', <path d="M4 8h14.5M15 4.5 18.5 8 15 11.5M20 16H5.5M9 12.5 5.5 16 9 19.5" />],
};

export function StatIcon({ statKey, className }: { statKey: string; tag?: string; className?: string }) {
  const [group, path] = ICONS[statKey] ?? ['time', <path d="M5 12h14M12 5v14" />];
  return (
    <span className={'stat-icon ' + group + (className ? ' ' + className : '')} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    </span>
  );
}
