import { SIZES, backlogOf, fmtLeft, howLong, lastTouch, sizeOf, untouched } from './backlog';
import { PLATFORMS, type Entry, type Game, type Stat, type Unlock, type XboxProfile } from './types';

const DAY = 86400000;
const nf = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const plural = (n: number, one: string, many = one + 's') => `${nf(n)} ${n === 1 ? one : many}`;
export const hours = (min: number) => min / 60;
export const fmtHours = (min: number) => {
  const h = hours(min);
  return h >= 100 ? `${nf(h)} hrs` : h >= 1 ? `${h.toFixed(1)} hrs` : `${Math.round(min)} min`;
};
export const fmtG = (n: number) => `${nf(n)}G`;
const rarityText = (p: number) => (p < 1 ? `${p.toFixed(2).replace(/0$/, '')}%` : p < 10 ? `${p.toFixed(1)}%` : `${Math.round(p)}%`);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const monthYear = (t: number) => `${MONTHS[new Date(t).getUTCMonth()]} ${new Date(t).getUTCFullYear()}`;

// The game's art for an entry: the square tile as the wide image, the box art as the poster.
const art = (g: Game) => ({ image: g.icon, poster: g.art ?? g.icon });
const played = (games: Game[]) => games.filter((g) => (g.playMin ?? 0) > 0);
// Games with achievements to earn, where at least one is unlocked.
const started = (games: Game[]) => games.filter((g) => g.achievements && g.achievements.maxScore > 0 && g.achievements.score > 0);
const isComplete = (g: Game) => !!g.achievements && g.achievements.maxScore > 0 && g.achievements.score >= g.achievements.maxScore;
const doneAt = (g: Game) => g.lastUnlock ?? g.lastPlayed ?? 0;

// Gamerscore milestones, for the next one to aim for.
const MILESTONES = [1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 75_000, 100_000, 150_000, 250_000, 500_000, 750_000, 1_000_000, 1_500_000, 2_000_000];
const short = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000}M` : n >= 1000 ? `${n / 1000}K` : String(n));
export function milestone(score: number) {
  const next = MILESTONES.find((m) => m > score) ?? Math.ceil((score + 1) / 1_000_000) * 1_000_000;
  const prev = [...MILESTONES].reverse().find((m) => m <= score) ?? 0;
  return { prev, next, club: prev ? `${short(prev)} club` : 'Getting started' };
}

function gamerscore(p: XboxProfile): Stat | null {
  if (!p.gamerscore) return null;
  const list = started(p.games).sort((a, b) => b.achievements!.score - a.achievements!.score);
  const { prev, next, club } = milestone(p.gamerscore);
  const lead = list[0];
  return {
    key: 'gamerscore',
    title: 'Gamerscore',
    value: p.gamerscore,
    display: nf(p.gamerscore),
    unit: 'gamerscore',
    series: list.slice(0, 8).map((g) => ({ label: g.title, value: g.achievements!.score, display: fmtG(g.achievements!.score), ...art(g), badge: isComplete(g) ? ('complete' as const) : undefined })),
    progress: { value: p.gamerscore - prev, max: next - prev, label: `${nf(next - p.gamerscore)}G to ${short(next)}` },
    line:
      `${nf(p.gamerscore)} gamerscore across ${plural(list.length, 'game')}, ${nf(next - p.gamerscore)} short of ${short(next)}.` +
      (lead ? ` The most from one game: ${fmtG(lead.achievements!.score)} in ${lead.title}.` : ''),
    tag: club,
    theme: 'score',
  };
}

function achievements(p: XboxProfile): Stat | null {
  const list = p.games.filter((g) => g.achievements && g.achievements.earned > 0).sort((a, b) => b.achievements!.earned - a.achievements!.earned);
  const total = list.reduce((s, g) => s + g.achievements!.earned, 0);
  if (!total) return null;
  const counted = list.filter((g) => g.achievements!.total > 0);
  const on = counted.reduce((s, g) => s + g.achievements!.total, 0);
  const got = counted.reduce((s, g) => s + g.achievements!.earned, 0);
  return {
    key: 'achievements',
    title: 'Achievements',
    value: total,
    display: nf(total),
    unit: 'achievements unlocked',
    series: list.slice(0, 8).map((g) => ({ label: g.title, value: g.achievements!.earned, display: nf(g.achievements!.earned), ...art(g) })),
    gallery: list.slice(0, 12).map((g) => ({ label: g.title, value: g.achievements!.earned, display: nf(g.achievements!.earned), ...art(g) })),
    progress: { value: got, max: on || 1, label: `${pct(got, on)}% of the achievements in games you’ve started` },
    line: `${nf(total)} achievements across ${plural(list.length, 'game')}: ${nf(got)} of the ${nf(on)} on offer in the games you’ve started. Most from one game: ${nf(list[0].achievements!.earned)} in ${list[0].title}.`,
  };
}

function completed(p: XboxProfile): Stat | null {
  const list = p.games.filter(isComplete).sort((a, b) => doneAt(b) - doneAt(a));
  if (!list.length) return null;
  const latest = list[0];
  const s = started(p.games).length;
  return {
    key: 'completed',
    title: 'Completed',
    value: list.length,
    display: nf(list.length),
    unit: list.length === 1 ? 'game at 100%' : 'games at 100%',
    series: list.slice(0, 8).map((g) => ({ label: g.title, value: doneAt(g), display: doneAt(g) ? monthYear(doneAt(g)) : fmtG(g.achievements!.maxScore), ...art(g), badge: 'complete' as const })),
    gallery: list.slice(0, 12).map((g) => ({ label: g.title, value: 1, display: fmtG(g.achievements!.maxScore), ...art(g), badge: 'complete' as const })),
    progress: { value: list.length, max: s || 1, label: `${pct(list.length, s)}% of the games you’ve started` },
    cover: { label: latest.title, ...art(latest) },
    line: `${plural(list.length, 'game')} with every last gamerscore point, the latest ${latest.title}${doneAt(latest) ? ` (${monthYear(doneAt(latest))})` : ''}.`,
    theme: 'complete',
  };
}

// Xbox's own completion figure per game (its share of gamerscore), averaged over the games you've started.
function completion(p: XboxProfile): Stat | null {
  const list = started(p.games);
  if (!list.length) return null;
  const avg = Math.round(list.reduce((s, g) => s + g.achievements!.progress, 0) / list.length);
  const full = list.filter(isComplete).length;
  const ranked = [...list].sort((a, b) => b.achievements!.progress - a.achievements!.progress || b.achievements!.score - a.achievements!.score);
  return {
    key: 'completion',
    title: 'Completion',
    value: avg,
    display: `${avg}%`,
    unit: 'average game completion',
    series: ranked.slice(0, 8).map((g) => ({ label: g.title, value: g.achievements!.progress, display: `${g.achievements!.progress}%`, ...art(g), badge: isComplete(g) ? ('complete' as const) : undefined })),
    progress: { value: avg, max: 100, label: `${plural(full, 'game')} at 100%` },
    line: `Your games are ${avg}% complete on average, over the ${plural(list.length, 'game')} where you’ve unlocked an achievement. ${full ? `${plural(full, 'game is', 'games are')} fully complete.` : 'None is fully complete yet.'}`,
  };
}

function almost(p: XboxProfile): Stat | null {
  const list = started(p.games)
    .filter((g) => !isComplete(g) && g.achievements!.progress >= 70)
    .map((g) => ({ g, left: g.achievements!.maxScore - g.achievements!.score, n: Math.max(0, g.achievements!.total - g.achievements!.earned) }))
    .sort((a, b) => b.g.achievements!.progress - a.g.achievements!.progress || a.left - b.left);
  if (!list.length) return null;
  const first = list[0];
  const leftText = (x: (typeof list)[number]) => (x.n ? plural(x.n, 'achievement') : fmtG(x.left));
  return {
    key: 'almost',
    title: 'Almost 100%',
    value: list.length,
    display: nf(list.length),
    unit: list.length === 1 ? 'game at 70% or more' : 'games at 70% or more',
    series: list.slice(0, 8).map((x) => ({ label: x.g.title, value: x.g.achievements!.progress, display: `${x.g.achievements!.progress}% · ${fmtG(x.left)} left`, ...art(x.g) })),
    progress: { value: first.g.achievements!.progress, max: 100, label: `${first.g.title}: ${leftText(first)} to go` },
    cover: { label: first.g.title, ...art(first.g) },
    line:
      `${first.g.title} is ${first.g.achievements!.progress}% done, ${leftText(first)} (${fmtG(first.left)}) short of 100%.` +
      (list.length > 1 ? ` ${list.length - 1} more ${list.length > 2 ? 'games are' : 'game is'} at 70% or better.` : ''),
  };
}

function playtime(p: XboxProfile): Stat | null {
  const list = played(p.games).sort((a, b) => b.playMin! - a.playMin!);
  const total = list.reduce((s, g) => s + g.playMin!, 0);
  if (!total) return null;
  const lead = list[0];
  return {
    key: 'playtime',
    title: 'Play time',
    value: hours(total),
    display: nf(hours(total)),
    unit: 'hours played',
    series: list.slice(0, 8).map((g) => ({ label: g.title, value: hours(g.playMin!), display: fmtHours(g.playMin!), ...art(g) })),
    progress: { value: lead.playMin!, max: total, label: `${lead.title} is ${pct(lead.playMin!, total)}% of it` },
    line: `${nf(hours(total))} hours on Xbox One, Series X|S and PC, about ${nf(hours(total) / 24)} days, and ${fmtHours(lead.playMin!)} of it in ${lead.title}. Xbox doesn’t count time on the 360.`,
  };
}

function top(p: XboxProfile): Stat | null {
  const list = played(p.games).sort((a, b) => b.playMin! - a.playMin!);
  const g = list[0];
  if (!g) return null;
  const total = list.reduce((s, x) => s + x.playMin!, 0);
  return {
    key: 'top',
    title: 'Most played',
    value: hours(g.playMin!),
    display: nf(hours(g.playMin!)),
    unit: 'hours',
    series: list.slice(0, 4).map((x) => ({ label: x.title, value: hours(x.playMin!), display: fmtHours(x.playMin!), ...art(x) })),
    progress: { value: g.playMin!, max: total, label: `${g.title}: ${pct(g.playMin!, total)}% of your time` },
    cover: { label: g.title, ...art(g) },
    line: `Your most played game is ${g.title}: ${fmtHours(g.playMin!)}` + (g.achievements?.maxScore ? `, ${fmtG(g.achievements.score)} of its ${fmtG(g.achievements.maxScore)}` : '') + '.',
  };
}

function ago(t: number, now: number) {
  const d = Math.floor((now - t) / DAY);
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`;
}

function recent(p: XboxProfile, now: number): Stat | null {
  const list = p.games.filter((g) => lastTouch(g) >= now - 30 * DAY).sort((a, b) => lastTouch(b) - lastTouch(a));
  if (!list.length) return null;
  const quarter = p.games.filter((g) => lastTouch(g) >= now - 90 * DAY).length;
  const won = p.unlocks.filter((u) => u.at >= now - 30 * DAY);
  return {
    key: 'recent',
    title: 'Recently played',
    value: list.length,
    display: nf(list.length),
    unit: list.length === 1 ? 'game in the last 30 days' : 'games in the last 30 days',
    series: list.slice(0, 8).map((g) => ({ label: g.title, value: lastTouch(g), display: ago(lastTouch(g), now), ...art(g) })),
    progress: { value: list.length, max: quarter, label: `${plural(quarter, 'game')} in the last 90 days` },
    line:
      `${plural(list.length, 'game')} in the last 30 days, most recently ${list[0].title} (${ago(lastTouch(list[0]), now).toLowerCase()}).` +
      (won.length ? ` ${plural(won.length, 'achievement')} and ${fmtG(won.reduce((s, u) => s + u.score, 0))} in that time.` : ''),
  };
}

function platforms(p: XboxProfile): Stat | null {
  const by = new Map<string, number>();
  for (const g of p.games) for (const pl of g.platforms) by.set(pl, (by.get(pl) ?? 0) + 1);
  const series = [...by]
    .filter(([, n]) => n)
    .sort((a, b) => PLATFORMS.indexOf(a[0] as never) - PLATFORMS.indexOf(b[0] as never))
    .map(([label, n]) => ({ label, value: n, display: nf(n) }));
  if (!series.length) return null;
  const lead = [...series].sort((a, b) => b.value - a.value)[0];
  const total = p.games.length;
  const series9 = by.get('Series X|S') ?? 0;
  const pc = by.get('PC') ?? 0;
  return {
    key: 'platforms',
    title: 'Where you play',
    value: pct(lead.value, total),
    display: lead.label,
    unit: `${pct(lead.value, total)}% of your games`,
    series,
    progress: { value: series9, max: total || 1, label: `${pct(series9, total)}% of your games play on Series X|S` },
    line: `Most of your games play on ${lead.label} (${nf(lead.value)} of ${nf(total)}). A game can count for several: ${nf(series9)} on Series X|S, ${nf(pc)} on PC.`,
  };
}

// ———————————————————————— From the unlock list (Xbox One and later)

const titleOf = (p: XboxProfile) => {
  const by = new Map(p.games.map((g) => [g.id, g]));
  return (u: Unlock) => by.get(u.titleId);
};

function rarest(p: XboxProfile): Stat | null {
  const list = p.unlocks.filter((u) => u.rarity != null && u.rarity > 0).sort((a, b) => a.rarity! - b.rarity! || b.score - a.score);
  if (list.length < 3) return null;
  const game = titleOf(p);
  const r = list[0];
  const under5 = list.filter((u) => u.rarity! < 5).length;
  const entry = (u: Unlock): Entry => {
    const g = game(u);
    return { label: u.name, value: u.rarity!, display: `${rarityText(u.rarity!)} · ${g?.title ?? ''}`.replace(/ · $/, ''), image: u.icon ?? g?.icon ?? null, poster: u.icon ?? g?.art ?? null, badge: u.rarity! < 5 ? 'rare' : undefined };
  };
  return {
    key: 'rarest',
    title: 'Rarest achievements',
    value: r.rarity!,
    display: rarityText(r.rarity!),
    unit: `of players have your rarest: ${r.name}`,
    series: list.slice(0, 8).map(entry),
    gallery: list.slice(0, 12).map(entry),
    progress: { value: under5, max: list.length, label: `${plural(under5, 'achievement')} fewer than 5% of players have` },
    line: `Your rarest achievement is ${r.name}${game(r) ? ` in ${game(r)!.title}` : ''}: only ${rarityText(r.rarity!)} of players have it. ${plural(under5, 'of yours is', 'of yours are')} under 5%.`,
    theme: 'rare',
    tag: r.rarity! < 1 ? 'Ultra rare' : 'Rare',
  };
}

// Xbox calls an achievement "Rare" when 10% of players or fewer have it.
const RARITY: [string, number][] = [
  ['Ultra rare', 1],
  ['Very rare', 5],
  ['Rare', 10],
  ['Uncommon', 30],
  ['Common', Infinity],
];

function rarity(p: XboxProfile): Stat | null {
  const list = p.unlocks.filter((u) => u.rarity != null);
  if (list.length < 10) return null;
  const counts = RARITY.map(([label, max], i) => ({ label, n: list.filter((u) => u.rarity! < max && (i === 0 || u.rarity! >= RARITY[i - 1][1])).length }));
  const rare = list.filter((u) => u.rarity! <= 10).length;
  const share = pct(rare, list.length);
  const tag = share >= 25 ? 'Rare hunter' : share >= 12 ? 'Seasoned' : 'Story first';
  return {
    key: 'rarity',
    title: 'Rarity mix',
    value: share,
    display: `${share}%`,
    unit: 'of your achievements are rare',
    series: counts.map((c) => ({ label: c.label, value: c.n, display: nf(c.n), badge: c.label.includes('rare') || c.label === 'Rare' ? ('rare' as const) : undefined })),
    progress: { value: rare, max: list.length, label: `${nf(rare)} rare of ${nf(list.length)} unlocks` },
    line: `${share}% of your achievements are rare (10% of players or fewer): ${nf(counts[0].n)} ultra rare, ${nf(counts[1].n)} very rare and ${nf(counts[2].n)} rare, of the ${nf(list.length)} with a rarity. ${tag}.`,
    tag,
    theme: share >= 25 ? 'rare' : undefined,
  };
}

// A date's parts in a time zone: one formatter for the many unlocks.
function zoned(tz: string) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23', weekday: 'short' });
  return (t: number) => {
    const o: Record<string, string> = {};
    for (const x of f.formatToParts(new Date(t))) o[x.type] = x.value;
    return { y: +o.year, m: +o.month - 1, d: +o.day, h: +o.hour % 24, wd: (['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(o.weekday) + 7) % 7 };
  };
}

export type StatClock = { tz: string; h12: boolean };
const hourLabel = (h: number, h12: boolean) => (h12 ? `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}` : `${String(h).padStart(2, '0')}:00`);

// Unlocks by hour of the day, on the viewer's clock.
function when(p: XboxProfile, clock: StatClock): Stat | null {
  if (p.unlocks.length < 20) return null;
  const at = zoned(clock.tz);
  const by = new Array(24).fill(0);
  for (const u of p.unlocks) by[at(u.at).h]++;
  const peak = by.indexOf(Math.max(...by));
  const night = [22, 23, 0, 1, 2, 3, 4].reduce((s, h) => s + by[h], 0);
  const evening = [18, 19, 20, 21].reduce((s, h) => s + by[h], 0);
  const morning = [5, 6, 7, 8, 9, 10, 11].reduce((s, h) => s + by[h], 0);
  const n = p.unlocks.length;
  const tag = night / n > 0.3 ? 'Night owl' : morning / n > 0.3 ? 'Early bird' : evening / n > 0.35 ? 'Evening player' : 'Any time';
  return {
    key: 'when',
    title: 'When you play',
    value: peak,
    display: hourLabel(peak, clock.h12),
    unit: 'is your busiest hour for achievements',
    series: by.map((v, h) => ({ label: clock.h12 ? `${h % 12 || 12}${h < 12 ? 'a' : 'p'}` : String(h), value: v, display: nf(v) })),
    progress: { value: night, max: n, label: `${pct(night, n)}% of your unlocks come after 10 PM` },
    line: `Most of your achievements pop around ${hourLabel(peak, clock.h12)}. ${pct(evening, n)}% come in the evening (6–10 PM) and ${pct(night, n)}% late at night. ${tag}.`,
    tag,
  };
}

// Unlocks per day over the last 26 weeks, weekday by week, like a contribution calendar.
function calendar(p: XboxProfile, now: number, clock: StatClock): Stat | null {
  const weeks = 26;
  const at = zoned(clock.tz);
  const today = at(now);
  const todayUtc = Date.UTC(today.y, today.m, today.d);
  const start = todayUtc - (today.wd + (weeks - 1) * 7) * DAY;
  const values = new Array(7 * weeks).fill(0);
  let count = 0;
  for (const u of p.unlocks) {
    const z = at(u.at);
    const day = Math.round((Date.UTC(z.y, z.m, z.d) - start) / DAY);
    if (day < 0 || day >= weeks * 7) continue;
    values[(day % 7) * weeks + Math.floor(day / 7)]++;
    count++;
  }
  if (count < 5) return null;
  // Days after today stay blank.
  for (let d = today.wd + 1; d < 7; d++) values[d * weeks + weeks - 1] = -1;
  const active = values.filter((v) => v > 0).length;
  const days = (weeks - 1) * 7 + today.wd + 1;
  const tips = values.map((v, i) => {
    if (v < 0) return '';
    const t = start + ((i % weeks) * 7 + Math.floor(i / weeks)) * DAY;
    const d = new Date(t);
    return `${WEEKDAYS[Math.floor(i / weeks)]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}: ${plural(v, 'achievement')}`;
  });
  // The longest run of days in a row with an unlock.
  let streak = 0;
  let run = 0;
  for (let day = 0; day < days; day++) {
    const v = values[(day % 7) * weeks + Math.floor(day / 7)];
    run = v > 0 ? run + 1 : 0;
    streak = Math.max(streak, run);
  }
  const byDay = WEEKDAYS.map((label, d) => ({ label, name: DAY_NAMES[d], value: values.slice(d * weeks, d * weeks + weeks).filter((v) => v > 0).reduce((a, b) => a + b, 0) }));
  const best = [...byDay].sort((a, b) => b.value - a.value)[0];
  const colLabels = Array.from({ length: weeks }, (_, w) => {
    const d = new Date(start + w * 7 * DAY);
    return d.getUTCDate() <= 7 ? MONTHS[d.getUTCMonth()] : '';
  });
  return {
    key: 'calendar',
    title: 'Achievement calendar',
    value: active,
    display: nf(active),
    unit: `days with an achievement in the last 6 months`,
    series: byDay.map((e) => ({ label: e.label, value: e.value, display: nf(e.value) })),
    progress: { value: active, max: days, label: `Longest streak: ${plural(streak, 'day')} in a row` },
    line: `You unlocked something on ${plural(active, 'day')} of the last ${nf(days)}: ${plural(count, 'achievement')} in all, most on ${best.name}s. Your longest streak was ${plural(streak, 'day')} in a row.`,
    heat: { rows: 7, cols: weeks, values, rowLabels: WEEKDAYS.map((d, i) => (i % 2 ? '' : d)), colLabels, tips },
  };
}

// When new games get started: the first achievement in each game, by year and month.
function starts(p: XboxProfile, now: number): Stat | null {
  const dates = p.games.map((g) => g.firstUnlock).filter((t): t is number => t != null);
  if (dates.length < 3) return null;
  const thisYear = new Date(now).getUTCFullYear();
  const firstYear = Math.max(Math.min(...dates.map((t) => new Date(t).getUTCFullYear())), thisYear - 5);
  const yrs = Array.from({ length: thisYear - firstYear + 1 }, (_, i) => firstYear + i);
  const values = new Array(yrs.length * 12).fill(0);
  for (const t of dates) {
    const d = new Date(t);
    const r = d.getUTCFullYear() - firstYear;
    if (r >= 0) values[r * 12 + d.getUTCMonth()]++;
  }
  const nowMonth = new Date(now).getUTCMonth();
  for (let m = nowMonth + 1; m < 12; m++) values[(yrs.length - 1) * 12 + m] = -1;
  const byMonth = MONTHS.map((_, m) => dates.filter((t) => new Date(t).getUTCMonth() === m).length);
  const peak = byMonth.indexOf(Math.max(...byMonth));
  const tips = values.map((v, i) => (v < 0 ? '' : `${MONTHS[i % 12]} ${yrs[Math.floor(i / 12)]}: ${plural(v, 'new game')}`));
  return {
    key: 'starts',
    title: 'When you start games',
    value: byMonth[peak],
    display: MONTHS[peak],
    unit: 'is when you start the most new games',
    series: yrs.map((y, r) => {
      const n = values.slice(r * 12, r * 12 + 12).filter((v) => v > 0).reduce((a, b) => a + b, 0);
      return { label: String(y), value: n, display: nf(n) };
    }),
    progress: { value: byMonth[peak], max: dates.length, label: `${pct(byMonth[peak], dates.length)}% of your games were started in ${MONTHS[peak]}` },
    line: `${MONTHS[peak]} is your month for new games: ${plural(byMonth[peak], 'game')} got their first achievement in ${MONTHS[peak]} across the years, of ${nf(dates.length)} in all.${p.unlocksCapped ? ' Your oldest unlocks are past the 2,000 read, so early years are cut short.' : ''}`,
    heat: { rows: yrs.length, cols: 12, values, rowLabels: yrs.map(String), colLabels: MONTHS.map((m) => m[0]), tips },
  };
}

// ———————————————————————— From the title history

// Gamerscore per hour played, for games with at least an hour.
function scoreRate(p: XboxProfile): Stat | null {
  const list = p.games
    .filter((g) => (g.playMin ?? 0) >= 60 && g.achievements && g.achievements.score > 0)
    .map((g) => ({ g, rate: g.achievements!.score / (g.playMin! / 60) }))
    .sort((a, b) => b.rate - a.rate);
  if (list.length < 3) return null;
  const score = list.reduce((s, x) => s + x.g.achievements!.score, 0);
  const h = list.reduce((s, x) => s + x.g.playMin! / 60, 0);
  const overall = score / h;
  const slow = list[list.length - 1];
  const fmt = (r: number) => (r >= 10 ? nf(r) : r.toFixed(1));
  const fast = list.filter((x) => x.rate >= overall).length;
  return {
    key: 'scorerate',
    title: 'Gamerscore per hour',
    value: overall,
    display: fmt(overall),
    unit: 'gamerscore an hour of play',
    series: list.slice(0, 8).map(({ g, rate }) => ({ label: g.title, value: rate, display: `${fmt(rate)}G/hr`, ...art(g) })),
    progress: { value: fast, max: list.length, label: `${fast} of ${plural(list.length, 'game')} beat your average` },
    line: `You earn ${fmt(overall)}G an hour on average. Quickest: ${list[0].g.title}, ${fmt(list[0].rate)}G an hour; slowest: ${slow.g.title}, ${fmt(slow.rate)}G an hour.`,
    tag: overall >= 60 ? 'Score hunter' : overall >= 25 ? 'Steady' : 'Here for the games',
  };
}

function oneAndDone(p: XboxProfile): Stat | null {
  const list = p.games.filter(
    (g) =>
      (g.achievements && g.achievements.maxScore > 0 && g.achievements.score > 0 && g.achievements.earned <= 2 && g.achievements.progress < 10) ||
      (g.playMin != null && g.playMin > 0 && g.playMin < 60 && (!g.achievements || g.achievements.earned <= 2)),
  );
  if (!list.length) return null;
  const s = p.games.filter((g) => (g.achievements?.score ?? 0) > 0 || (g.playMin ?? 0) > 0).length;
  return {
    key: 'oneanddone',
    title: 'One and done',
    value: list.length,
    display: nf(list.length),
    unit: 'games dropped after an achievement or two',
    series: list.slice(0, 8).map((g) => ({ label: g.title, value: g.achievements?.earned ?? 0, display: g.achievements?.earned ? plural(g.achievements.earned, 'achievement') : fmtHours(g.playMin ?? 0), ...art(g) })),
    gallery: list.slice(0, 12).map((g) => ({ label: g.title, value: 0, display: '', ...art(g) })),
    progress: { value: list.length, max: s || 1, label: `${pct(list.length, s)}% of the games you started` },
    line: `${plural(list.length, 'game')} got an achievement or two, or under an hour, and then nothing: ${list.slice(0, 3).map((g) => g.title).join(', ')}${list.length > 3 ? ' and more' : ''}.`,
  };
}

// How many of the games you've started were taken to 100%, by platform.
function finishRate(p: XboxProfile): Stat | null {
  const list = started(p.games);
  if (list.length < 2) return null;
  const done = list.filter(isComplete).length;
  const by = new Map<string, { n: number; done: number }>();
  for (const g of list)
    for (const pl of g.platforms) {
      const x = by.get(pl) ?? { n: 0, done: 0 };
      x.n++;
      if (isComplete(g)) x.done++;
      by.set(pl, x);
    }
  const series = [...by]
    .filter(([, x]) => x.n >= 2)
    .sort((a, b) => PLATFORMS.indexOf(a[0] as never) - PLATFORMS.indexOf(b[0] as never))
    .map(([pl, x]) => ({ label: pl, value: pct(x.done, x.n), display: `${pct(x.done, x.n)}%` }));
  const rate = pct(done, list.length);
  return {
    key: 'finishrate',
    title: 'Finish rate',
    value: rate,
    display: `${rate}%`,
    unit: `of the games you started, taken to 100% (${nf(done)} of ${nf(list.length)})`,
    series,
    progress: { value: done, max: list.length, label: `${nf(done)} of ${plural(list.length, 'game')} completed` },
    line: `You’ve taken ${nf(done)} of the ${plural(list.length, 'game')} you started to 100%: ${rate}%.` + (series.length > 1 ? ` By platform: ${series.map((e) => `${e.label} ${e.display}`).join(', ')}.` : ''),
    tag: rate >= 40 ? 'Completionist' : rate >= 15 ? 'Selective finisher' : 'Sampler',
    theme: rate >= 40 ? 'complete' : undefined,
  };
}

// The biggest games taken to 100%, by their gamerscore.
function biggest(p: XboxProfile): Stat | null {
  const list = p.games.filter(isComplete).sort((a, b) => b.achievements!.maxScore - a.achievements!.maxScore || b.achievements!.total - a.achievements!.total);
  if (!list.length) return null;
  const g = list[0];
  const s = started(p.games).length;
  return {
    key: 'biggest',
    title: 'Biggest 100%',
    value: g.achievements!.maxScore,
    display: fmtG(g.achievements!.maxScore),
    unit: `in ${g.title}, every point`,
    series: list.slice(0, 8).map((x) => ({ label: x.title, value: x.achievements!.maxScore, display: fmtG(x.achievements!.maxScore), ...art(x), badge: 'complete' as const })),
    gallery: list.slice(0, 12).map((x) => ({ label: x.title, value: 1, display: fmtG(x.achievements!.maxScore), ...art(x), badge: 'complete' as const })),
    progress: { value: list.length, max: s || 1, label: `${plural(list.length, 'game')} at 100%` },
    cover: { label: g.title, ...art(g) },
    line: `Your biggest complete game is ${g.title}: all ${fmtG(g.achievements!.maxScore)}${g.achievements!.total ? ` and ${plural(g.achievements!.total, 'achievement')}` : ''}, add-ons included. ${plural(list.length, 'game')} in all are at 100%.`,
  };
}

// Each game counts toward its first listed genre, weighted by hours (or by games without play time).
function genres(p: XboxProfile): Stat | null {
  const list = p.games.filter((g) => g.genres.length);
  if (list.length < 3) return null;
  const byHours = played(list).length >= 3;
  const by = new Map<string, number>();
  for (const g of list) {
    const w = byHours ? g.playMin ?? 0 : 1;
    if (w) by.set(g.genres[0], (by.get(g.genres[0]) ?? 0) + w);
  }
  const total = [...by.values()].reduce((a, b) => a + b, 0);
  if (!total) return null;
  const ranked = [...by].sort((a, b) => b[1] - a[1]);
  const series = ranked.slice(0, 7).map(([label, v]) => ({ label, value: pct(v, total), display: `${pct(v, total)}%` }));
  const rest = ranked.slice(7).reduce((s, [, v]) => s + v, 0);
  if (rest) series.push({ label: 'Other', value: pct(rest, total), display: `${pct(rest, total)}%` });
  const [lead] = ranked;
  return {
    key: 'genres',
    title: 'Favorite genres',
    value: pct(lead[1], total),
    display: lead[0],
    unit: `${pct(lead[1], total)}% of your ${byHours ? 'play time' : 'games'}`,
    series,
    progress: { value: lead[1], max: total, label: `${lead[0]} is ${pct(lead[1], total)}% of your ${byHours ? 'hours' : 'games'}` },
    line: `${lead[0]} leads with ${pct(lead[1], total)}% of your ${byHours ? 'play time' : 'games'}` + (ranked[1] ? `, then ${ranked[1][0]} (${pct(ranked[1][1], total)}%)` : '') + (ranked[2] ? ` and ${ranked[2][0]} (${pct(ranked[2][1], total)}%)` : '') + '. Each game counts toward its main genre on the Xbox store.',
    tag: lead[0],
  };
}

// The decades your games come from, by hours (or games without play time).
function eras(p: XboxProfile, now: number): Stat | null {
  const list = p.games.filter((g) => g.released);
  if (list.length < 3) return null;
  const byHours = played(list).length >= 3;
  const by = new Map<number, number>();
  for (const g of list) {
    const w = byHours ? g.playMin ?? 0 : 1;
    if (!w) continue;
    const dec = Math.floor(new Date(g.released!).getUTCFullYear() / 10) * 10;
    by.set(dec, (by.get(dec) ?? 0) + w);
  }
  const total = [...by.values()].reduce((a, b) => a + b, 0);
  if (!total) return null;
  const decades = [...by.keys()].sort();
  const lead = [...by].sort((a, b) => b[1] - a[1])[0];
  const fresh = list.filter((g) => g.released! >= now - 3 * 365 * DAY).reduce((s, g) => s + (byHours ? g.playMin ?? 0 : 1), 0);
  const label = (d: number) => `${String(d).slice(2)}s`;
  return {
    key: 'eras',
    title: 'Your gaming eras',
    value: lead[0],
    display: `${lead[0]}s`,
    unit: `${pct(lead[1], total)}% of your ${byHours ? 'hours' : 'games'}`,
    series: decades.map((d) => ({ label: label(d), value: pct(by.get(d)!, total), display: `${pct(by.get(d)!, total)}%` })),
    progress: { value: fresh, max: total, label: `${pct(fresh, total)}% in games from the last three years` },
    line: `Games from the ${lead[0]}s take ${pct(lead[1], total)}% of your ${byHours ? 'play time' : 'library'}; ${pct(fresh, total)}% goes to games released in the last three years.`,
  };
}

// Hours each thing takes: a feature film, an audiobook, the Apollo 11 trip out to the Moon (about three days),
// the 40 flying hours a US private pilot licence asks for, a coast-to-coast US drive, and a year of evenings at an
// hour a night.
const SAME_TIME: [string, string, number][] = [
  ['Films', 'feature films watched', 2],
  ['Audiobooks', 'audiobooks listened to', 10],
  ['Pilot licences', 'pilot licences’ worth of flying', 40],
  ['Coast-to-coast drives', 'drives across the United States', 45],
  ['Trips to the Moon', 'trips to the Moon, Apollo-style', 76],
  ['Years of evenings', 'years of an hour every evening', 365],
];
const MOON_KM = 384400;

function inOtherWords(p: XboxProfile): Stat | null {
  const h = hours(played(p.games).reduce((s, g) => s + g.playMin!, 0));
  if (h < 1) return null;
  const all = SAME_TIME.map(([s, label, each]) => ({ short: s, label, n: h / each }));
  const lead = [...all].reverse().find((x) => x.n >= 2) ?? all[0];
  const fmt = (n: number) => (n >= 10 ? nf(n) : n.toFixed(1));
  const km = h * 100;
  const [films, , , drives, moon] = all;
  return {
    key: 'instead',
    title: 'Time well spent',
    value: lead.n,
    display: fmt(lead.n),
    unit: lead.label,
    series: all.map((x) => ({ label: x.short, value: x.n, display: `${fmt(x.n)}×` })),
    progress: { value: Math.min(km, MOON_KM), max: MOON_KM, label: `${pct(km, MOON_KM)}% of the way to the Moon by car` },
    line:
      `${nf(h)} hours of Xbox is ${nf(films.n)} films back to back` +
      (moon.n >= 1 ? `, or flying to the Moon ${moon.n >= 2 ? `${fmt(moon.n)} times` : 'once'}` : `, or ${fmt(drives.n)} drives across the United States`) +
      `. Driven nonstop at 100 km/h, you’d be ${km >= MOON_KM ? 'past the Moon' : `${nf(km)} km out, ${pct(km, MOON_KM)}% of the way there`}.`,
  };
}

// Hours to finish what you started, projected from the player's own pace (lib/backlog.ts).
function backlog(p: XboxProfile, now: number): Stat | null {
  const b = backlogOf(p, now);
  if (!b) return null;
  const quick = b.games.filter((g) => g.left < 5).length;
  const next = b.games[0];
  const pace = howLong(b.total, b.perWeek);
  const stale = untouched(b, now);
  const entry = (g: (typeof b.games)[number]) => ({ label: g.title, value: g.left, display: fmtLeft(g.left), image: g.image, poster: g.poster });
  const longest = b.games[b.games.length - 1];
  return {
    key: 'backlog',
    title: 'Backlog',
    value: b.total,
    display: nf(b.total),
    unit: 'hours to finish what you started',
    series: b.games.slice(0, 8).map(entry),
    gallery: b.games.slice(0, 12).map(entry),
    cover: { label: next.title, image: next.image, poster: next.poster },
    progress: { value: quick, max: b.games.length, label: `${quick} quick win${quick === 1 ? '' : 's'} under 5 hrs` },
    backlog: {
      total: b.total,
      perWeek: b.perWeek,
      games: b.games.length,
      untouched: stale,
      averaged: b.games.filter((g) => g.source === 'average').length,
      perCompletion: b.perCompletion,
      longest: b.games.length > 1 ? { label: longest.title, hours: longest.left } : null,
      sizes: SIZES.map((sz) => {
        const inSize = b.games.filter((g) => sizeOf(g.left) === sz.key);
        return { key: sz.key, label: sz.label, hint: sz.hint, count: inSize.length, hours: inSize.reduce((s, g) => s + g.left, 0) };
      }),
    },
    line:
      `Finishing the ${plural(b.games.length, 'game')} you’ve started would take about ${nf(b.total)} more hours${pace ? `, around ${pace} at your usual pace` : ''}.` +
      ` Quickest win: ${next.title}, about ${fmtLeft(next.left)} to 100%.` +
      (stale ? ` ${plural(stale, 'game')} ${stale === 1 ? 'hasn’t' : 'haven’t'} been touched in six months.` : ''),
  };
}

// This calendar year so far: games played, gamerscore earned and new games per month. All through January it shows
// the whole previous year instead ("Your 2026 in review"), so the card isn't near-empty after New Year.
export function yearShown(now: number): { year: number; review: boolean } {
  const d = new Date(now);
  return d.getUTCMonth() === 0 ? { year: d.getUTCFullYear() - 1, review: true } : { year: d.getUTCFullYear(), review: false };
}

function thisYear(p: XboxProfile, now: number): Stat | null {
  const { year: y, review } = yearShown(now);
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y + 1, 0, 1);
  const within = (t: number | null | undefined) => t != null && t >= start && t < end;
  const yearUnlocks = p.unlocks.filter((u) => within(u.at));
  const ids = new Set(yearUnlocks.map((u) => u.titleId));
  const playedThen = p.games.filter((g) => ids.has(g.id) || within(g.lastPlayed));
  if (!playedThen.length) return null;
  const freshGames = p.games.filter((g) => within(g.firstUnlock));
  const score = yearUnlocks.reduce((s, u) => s + u.score, 0);
  const months = review ? 12 : new Date(now).getUTCMonth() + 1;
  const series: Entry[] = Array.from({ length: months }, (_, m) => {
    const n = yearUnlocks.filter((u) => new Date(u.at).getUTCMonth() === m).reduce((s, u) => s + u.score, 0);
    return { label: MONTHS[m], value: n, display: n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K` : String(n) };
  });
  const busiest = [...series].sort((a, b) => b.value - a.value)[0];
  return {
    key: 'thisyear',
    title: review ? `Your ${y} in review` : `Your ${y}`,
    value: score,
    display: fmtG(score),
    unit: `earned in ${y}`,
    series,
    progress: { value: freshGames.length, max: playedThen.length, label: `${plural(playedThen.length, 'game')} played, ${nf(freshGames.length)} new` },
    line:
      `${review ? `In ${y}` : `So far in ${y}`}: ${fmtG(score)} from ${plural(yearUnlocks.length, 'achievement')} across ${plural(playedThen.length, 'game')}, ${nf(freshGames.length)} of them new` +
      (score && busiest.value ? `. Best month: ${busiest.label}, ${busiest.display}` : '') +
      '.' +
      (review ? ` From February this card shows ${y + 1} so far.` : ''),
  };
}

export function xboxStats(p: XboxProfile, now = Date.now(), clock: StatClock = { tz: 'UTC', h12: true }): Stat[] {
  const all: (Stat | null)[] = [
    gamerscore(p),
    achievements(p),
    completed(p),
    completion(p),
    almost(p),
    playtime(p),
    top(p),
    recent(p, now),
    platforms(p),
    rarest(p),
    rarity(p),
    when(p, clock),
    calendar(p, now, clock),
    starts(p, now),
    scoreRate(p),
    oneAndDone(p),
    finishRate(p),
    biggest(p),
    genres(p),
    eras(p, now),
    inOtherWords(p),
    backlog(p, now),
    thisYear(p, now),
  ];
  return all.filter((s): s is Stat => s !== null);
}

export { isComplete, started };
