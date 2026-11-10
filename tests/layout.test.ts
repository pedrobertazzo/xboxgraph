import { describe, expect, it } from 'vitest';
import { rowItems, rowSlotId, type Section } from 'morphgrid';
import { boardRows, clockQuery, dashQuery, decodeLayout, decodeRows, decodeSections, encodeLayout, encodeRows, matchPreset, presetBoard, readClock, readDashState, validTimeZone } from '@/lib/layout';
import { DEFAULT_TITLE, EXTRA_TITLE, MAX_SLOTS, PRESETS, presetById, presetRows, type ViewKey } from '@/lib/presets';

const all = ['gamerscore', 'achievements', 'completed', 'completion', 'almost', 'playtime', 'top', 'recent', 'platforms', 'rarest', 'rarity', 'when', 'calendar', 'starts', 'scorerate', 'oneanddone', 'finishrate', 'biggest', 'genres', 'eras', 'instead', 'backlog', 'thisyear', 'value', 'costhour', 'rated', 'studios', 'gamepass'];
const keys = ['gamerscore', 'achievements', 'completed', 'completion', 'starts', 'rarity', 'top', 'almost', 'finishrate', 'scorerate', 'calendar'];
const shown = (layout: Record<string, string | null>) => Object.values(layout).filter(Boolean);

describe('presets', () => {
  for (const p of PRESETS)
    for (const n of [5, 10, 15, 28]) {
      it(`${p.name} shows all ${n} stats once, in rows of at most ${MAX_SLOTS}`, () => {
        const ks = all.slice(0, n);
        const board = presetBoard(p, ks);
        expect(new Set(shown(board.layout))).toEqual(new Set(ks));
        expect(shown(board.layout)).toHaveLength(ks.length);
        for (const r of boardRows(board)) expect(r.slots).toBeGreaterThanOrEqual(1), expect(r.slots).toBeLessThanOrEqual(MAX_SLOTS);
        expect(rowItems(boardRows(board), board.layout).flat().every(Boolean)).toBe(true);
        for (const s of board.sections) expect(s.rows.length).toBeGreaterThan(0);
      });
    }

  for (const p of PRESETS)
    it(`${p.name} places every stat once and uses each card type for one shared row`, () => {
      const placed = presetRows(p).flatMap((r) => r.prefer);
      expect([...placed].sort()).toEqual([...all].sort());
      // A card type gets one row, except a single card given a row of its own (Backlog).
      const views = presetRows(p).filter((r) => r.prefer.length > 1).map((r) => r.view);
      expect(new Set(views).size).toBe(views.length);
      for (const r of presetRows(p)) expect(r.prefer.length).toBeLessThanOrEqual(MAX_SLOTS);
    });

  it('puts preferred stats in their preset rows', () => {
    const b = presetBoard(presetById('standard'), all);
    expect(b.sections[0].title).toBe('Your Xbox gaming stats');
    expect(boardRows(b)[0].view).toBe('highlight');
    expect(rowItems(boardRows(b), b.layout)[0]).toEqual(['gamerscore', 'playtime', 'value', 'finishrate']);
  });

  it('gives stats a preset has no slot for a row of the card type that suits them', () => {
    const p = presetById('spotlight');
    const drop = (k: string) => k !== 'completion' && k !== 'top';
    const trimmed = { ...p, sections: p.sections.map((s) => ({ ...s, rows: s.rows.map((r) => ({ ...r, prefer: r.prefer.filter(drop) })) })) };
    const b = presetBoard(trimmed, all);
    const rows = boardRows(b);
    const where = (k: string) => rows.find((r, i) => rowItems(rows, b.layout)[i].includes(k))!.view;
    expect(where('completion')).toBe('progress');
    expect(where('top')).toBe('showcase');
    expect(b.sections[b.sections.length - 1].title).toBe(EXTRA_TITLE);
  });

});

describe('links', () => {
  it('shares a preset as just its id, and nothing for the standard one', () => {
    expect(dashQuery(presetBoard(presetById('standard'), keys), keys).toString()).toBe('');
    expect(dashQuery(presetBoard(presetById('compact'), keys), keys).toString()).toBe('p=compact');
    expect(matchPreset(readDashState({ p: 'compact' }, keys), keys)).toBe('compact');
  });

  it('round-trips a rearranged board through r, n and l', () => {
    const b = presetBoard(presetById('standard'), keys);
    const extra = { id: 'x', view: 'radial' as ViewKey, slots: 3 };
    const sections: Section<ViewKey>[] = [
      { ...b.sections[1], title: 'Habits ~ & more' },
      { ...b.sections[0], rows: [...b.sections[0].rows.slice(1), extra] },
      { id: 'empty', title: 'Later', rows: [] },
    ];
    const layout = { ...b.layout, [rowSlotId(extra, 1)]: null };
    const q = dashQuery({ sections, layout }, keys);
    expect(q.get('r')).toBe(encodeRows(sections));
    expect(q.get('r')).toMatch(/^[a-z0-9]+_[a-z0-9]+_$/);
    const back = readDashState({ r: q.get('r'), n: q.get('n'), l: q.get('l') }, keys);
    expect(encodeRows(back.sections)).toBe(encodeRows(sections));
    expect(back.sections.map((s) => s.title)).toEqual(['Habits - & more', 'Your Xbox gaming stats', 'Later']);
    expect(encodeLayout(boardRows(back), back.layout)).toBe(encodeLayout(sections.flatMap((s) => s.rows), layout));
    expect(matchPreset(back, keys)).toBeNull();
  });

  it('no longer matches a preset once a section is renamed', () => {
    const b = presetBoard(presetById('compact'), keys);
    expect(matchPreset({ ...b, sections: b.sections.map((s, i) => (i ? s : { ...s, title: 'Mine' })) }, keys)).toBeNull();
  });

  it('opens a one-section board without titles', () => {
    const s = decodeSections('h3c1')!;
    expect(s).toHaveLength(1);
    expect(s[0].title).toBe(DEFAULT_TITLE);
    expect(s[0].rows.map((r) => r.id)).toEqual(['r0', 'r1']);
    expect(decodeSections('h3_c1', 'A~')!.map((x) => x.title)).toEqual(['A', 'Section 2']);
  });

  it('keeps empty slots and drops unknown or repeated stats', () => {
    const rows = decodeRows('h3c1')!;
    const l = decodeLayout('gamerscore..hack.gamerscore', rows, keys);
    expect(rowItems(rows, l)).toEqual([['gamerscore', null, null], [null]]);
  });

  it('rejects malformed rows', () => {
    for (const bad of ['', 'h', 'h0', 'h5', 'z2', 'h2c', 'h2'.repeat(13)]) expect(decodeRows(bad), bad).toBeNull();
    for (const bad of ['_', 'h2_c', 'h2' + '_h1'.repeat(8)]) expect(decodeSections(bad), bad).toBeNull();
    expect(readDashState({ r: 'zz', p: 'nope' }, keys).sections).toEqual(presetBoard(presetById('standard'), keys).sections);
  });

  it('validates time zones', () => {
    expect(validTimeZone('Europe/Lisbon')).toBe('Europe/Lisbon');
    expect(validTimeZone('Mars/Olympus')).toBe('UTC');
  });
});

describe('clock', () => {
  it('reads a time zone and hour format, falling back to UTC and 12 hours', () => {
    expect(readClock('Europe/Stockholm', '24')).toEqual({ tz: 'Europe/Stockholm', h12: false });
    expect(readClock('Not/AZone', null)).toEqual({ tz: 'UTC', h12: true });
    expect(clockQuery({ tz: 'UTC', h12: true }).toString()).toBe('');
    expect(clockQuery({ tz: 'Europe/Stockholm', h12: false }).toString()).toBe('tz=Europe%2FStockholm&h=24');
  });
});
