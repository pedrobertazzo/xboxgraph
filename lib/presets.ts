import type { Row, Section } from 'morphgrid';

export type ViewKey = 'chart' | 'highlight' | 'toplist' | 'progress' | 'summary' | 'showcase' | 'heatmap' | 'radial';

export const VIEW_KEYS: ViewKey[] = ['chart', 'highlight', 'toplist', 'progress', 'summary', 'showcase', 'heatmap', 'radial'];

export const VIEW_CODES: Record<ViewKey, string> = {
  chart: 'c',
  highlight: 'h',
  toplist: 't',
  progress: 'p',
  summary: 's',
  showcase: 'w',
  heatmap: 'm',
  radial: 'r',
};

export type DashRow = Row<ViewKey>;
export type DashSection = Section<ViewKey>;

// A preset is a list of sections, each a titled group of rows. Each row shows one card type; its slots take the
// stats it prefers, in order.
export interface PresetRow {
  view: ViewKey;
  prefer: string[];
}

export interface PresetSection {
  title: string;
  rows: PresetRow[];
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  sections: PresetSection[];
}

export const presetRows = (p: Preset) => p.sections.flatMap((s) => s.rows);

// Every stat appears once, in the card type that suits it best, and no card type gets two rows.
export const PRESETS: Preset[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Your Xbox gaming stats up top, then how you play and the deep cuts.',
    sections: [
      {
        title: 'Your Xbox gaming stats',
        rows: [
          { view: 'highlight', prefer: ['gamerscore', 'achievements', 'playtime', 'finishrate'] },
          { view: 'showcase', prefer: ['completed', 'top', 'rarest', 'biggest'] },
        ],
      },
      {
        title: 'How you play',
        rows: [
          { view: 'heatmap', prefer: ['calendar'] },
          { view: 'radial', prefer: ['when', 'genres', 'rarity', 'platforms'] },
          { view: 'chart', prefer: ['thisyear', 'eras', 'scorerate'] },
          { view: 'toplist', prefer: ['backlog'] },
          { view: 'heatmap', prefer: ['starts'] },
        ],
      },
      {
        title: 'Deep cuts',
        rows: [
          { view: 'toplist', prefer: ['almost', 'recent', 'oneanddone'] },
          { view: 'progress', prefer: ['completion'] },
          { view: 'summary', prefer: ['instead'] },
        ],
      },
    ],
  },
  {
    id: 'spotlight',
    name: 'Spotlight',
    description: 'Your most played game as a wide hero, then the rest.',
    sections: [
      {
        title: 'Spotlight',
        rows: [
          { view: 'showcase', prefer: ['top'] },
          { view: 'highlight', prefer: ['gamerscore', 'rarest', 'finishrate', 'completion'] },
          { view: 'heatmap', prefer: ['calendar'] },
          { view: 'summary', prefer: ['instead', 'biggest', 'scorerate'] },
        ],
      },
      {
        title: 'How you play',
        rows: [
          { view: 'chart', prefer: ['thisyear', 'playtime', 'eras', 'achievements'] },
          { view: 'radial', prefer: ['when', 'genres', 'rarity', 'platforms'] },
          { view: 'toplist', prefer: ['backlog'] },
          { view: 'heatmap', prefer: ['starts'] },
        ],
      },
      {
        title: 'Deep cuts',
        rows: [{ view: 'toplist', prefer: ['almost', 'recent', 'completed', 'oneanddone'] }],
      },
    ],
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Smaller cards: more stats at a glance.',
    sections: [
      {
        title: 'At a glance',
        rows: [
          { view: 'highlight', prefer: ['gamerscore', 'achievements', 'playtime', 'finishrate'] },
          { view: 'progress', prefer: ['completion', 'oneanddone', 'scorerate', 'almost'] },
          { view: 'summary', prefer: ['instead', 'recent', 'biggest'] },
        ],
      },
      {
        title: 'How you play',
        rows: [
          { view: 'chart', prefer: ['thisyear', 'eras', 'rarest'] },
          { view: 'heatmap', prefer: ['calendar', 'starts'] },
          { view: 'radial', prefer: ['when', 'genres', 'rarity', 'platforms'] },
          { view: 'toplist', prefer: ['backlog'] },
        ],
      },
      { title: 'Highlights', rows: [{ view: 'showcase', prefer: ['completed', 'top'] }] },
    ],
  },
];

export const presetById = (id: string | null | undefined) => PRESETS.find((p) => p.id === id) ?? PRESETS[0];

export const MAX_SLOTS = 4;
export const MAX_ROWS = 12;
export const MAX_SECTIONS = 8;
export const MAX_TITLE = 40;
// Stats a preset has no row for, and boards from links made before sections, land in a section with this title.
export const EXTRA_TITLE = 'More stats';
export const DEFAULT_TITLE = 'Your stats';

export const ROW_HEIGHT: Record<ViewKey, number> = { highlight: 160, progress: 160, summary: 200, chart: 240, toplist: 350, showcase: 320, heatmap: 230, radial: 280 };
export const NARROW_HEIGHT: Record<ViewKey, number> = { highlight: 156, progress: 150, summary: 190, chart: 220, toplist: 280, showcase: 260, heatmap: 220, radial: 260 };
export const NARROW_PER_LINE = (v: ViewKey) => (v === 'highlight' || v === 'progress' ? 2 : 1);
