// Prints a player's stats, for checking the numbers against Xbox: npm run peek -- Gamertag (with the XBOX_ variables set)
// With "sample" it prints the sample player and needs no token.
import { getXboxProfile } from '../lib/xbox';
import { sampleProfile } from '../lib/sample';
import { xboxStats } from '../lib/stats';

const name = process.argv[2] ?? 'sample';
const t0 = Date.now();
const p = name === 'sample' ? sampleProfile() : await getXboxProfile(name);
console.log(`${p.name} · ${p.gamerscore}G · ${p.games.length} games · ${p.unlocks.length} unlocks · ${Date.now() - t0} ms`);
for (const s of xboxStats(p)) console.log(`- ${s.key.padEnd(11)} ${s.display.padEnd(16)} ${s.unit}\n    ${s.line}`);
