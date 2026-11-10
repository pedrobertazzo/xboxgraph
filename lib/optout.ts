// Gamertags of players who asked to opt out, separated by commas (case doesn't matter).
const ids = new Set(
  (process.env.OPTED_OUT_GAMERTAGS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

export const isOptedOut = (gamertag: string) => ids.has(gamertag.trim().toLowerCase());
