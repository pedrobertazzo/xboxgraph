import { describe, expect, it } from 'vitest';
import { attachUnlocks, inputProblem, isGame, parseGamertag, platformsOf, secure, toGame, toUnlock } from '@/lib/xbox';

describe('search input', () => {
  it('takes a gamertag or a profile link', () => {
    expect(parseGamertag('  Major   Nelson ')).toBe('major nelson');
    expect(parseGamertag('Player#1234')).toBe('player#1234');
    expect(parseGamertag('https://www.xbox.com/en-US/play/user/Major%20Nelson')).toBe('major nelson');
    expect(parseGamertag('account.xbox.com/en-us/profile?gamertag=Some+One')).toBe('some one');
    expect(parseGamertag('https://www.trueachievements.com/gamer/Stallion83')).toBe('stallion83');
    expect(parseGamertag('ÉlodieGamer')).toBe('élodiegamer');
  });

  it('rejects what can’t be a gamertag, and says why', () => {
    for (const bad of ['', 'a'.repeat(17), ' -dash', 'name#12345', 'https://example.com/x', 'bad_underscore']) expect(parseGamertag(bad), bad).toBeNull();
    expect(inputProblem('a'.repeat(17))).toMatch(/at most 15/);
    expect(inputProblem('https://example.com/x')).toMatch(/isn’t an Xbox profile/);
    expect(inputProblem('name#12a')).toMatch(/suffix/);
  });
});

describe('reading Xbox Live', () => {
  it('names platforms and drops apps', () => {
    expect(platformsOf(['XboxSeries', 'XboxOne', 'PC', 'Win32', 'Xbox360', 'iOS', 'Unknown'])).toEqual(['Series X|S', 'Xbox One', 'PC', 'Xbox 360', 'Mobile']);
    expect(isGame({ titleId: '1', name: 'Netflix', type: 'App' })).toBe(false);
    expect(isGame({ titleId: '1', name: 'Halo', type: 'Game' })).toBe(true);
    // Xbox files nearly every modern game as mediaItemType "Application"; those are games.
    expect(isGame({ titleId: '1', name: 'Forza', type: 'Game', mediaItemType: 'Application' })).toBe(true);
  });

  it('turns a title into a game with its achievements and art', () => {
    const g = toGame({
      titleId: '219630713',
      name: 'Halo Infinite™',
      type: 'Game',
      devices: ['XboxSeries', 'PC'],
      displayImage: 'http://store-images.s-microsoft.com/image/apps.1',
      images: [{ url: 'http://store-images.s-microsoft.com/image/apps.2', type: 'BoxArt' }],
      achievement: { currentAchievements: 60, totalAchievements: 119, currentGamerscore: 600, totalGamerscore: 1600, progressPercentage: 37 },
      titleHistory: { lastTimePlayed: '2026-11-01T20:00:00Z' },
      detail: { genres: ['Shooter', 'Action & adventure'], releaseDate: '2021-12-08T00:00:00Z' },
    });
    expect(g.title).toBe('Halo Infinite');
    expect(g.platforms).toEqual(['Series X|S', 'PC']);
    expect(g.art).toBe('https://store-images.s-microsoft.com/image/apps.2?w=400');
    expect(g.achievements).toEqual({ earned: 60, total: 119, score: 600, maxScore: 1600, progress: 37 });
    expect(g.lastPlayed).toBe(Date.UTC(2026, 10, 1, 20));
    expect(g.genres[0]).toBe('Shooter');
    // An Xbox 360 game reports gamerscore but no achievement count; its progress comes from the score.
    expect(toGame({ titleId: '2', name: 'Old', achievement: { currentGamerscore: 250, totalGamerscore: 1000 } }).achievements?.progress).toBe(25);
    expect(toGame({ titleId: '3', name: 'None', achievement: {} }).achievements).toBeNull();
  });

  it('reads unlocks and dates each game by them', () => {
    const u = toUnlock({
      name: 'Rare one',
      titleAssociations: [{ id: 42 }],
      progression: { timeUnlocked: '2026-10-01T21:15:00Z' },
      rarity: { currentPercentage: 0.8 },
      rewards: [{ type: 'Gamerscore', value: '50' }],
    })!;
    expect(u).toMatchObject({ titleId: '42', score: 50, rarity: 0.8, at: Date.UTC(2026, 9, 1, 21, 15) });
    expect(toUnlock({ name: 'Locked', titleAssociations: [{ id: 1 }], progression: { timeUnlocked: '' } })).toBeNull();
    // OpenXBL lists locked achievements too, dated 0001-01-01.
    expect(toUnlock({ name: 'Locked', titleAssociations: [{ id: 1 }], progression: { timeUnlocked: '0001-01-01T00:00:00.0000000Z' } })).toBeNull();
    const g = toGame({ titleId: '42', name: 'G', achievement: { currentGamerscore: 50, totalGamerscore: 1000 } });
    attachUnlocks([g], [u, { ...u, at: Date.UTC(2026, 0, 1) }]);
    expect([g.firstUnlock, g.lastUnlock]).toEqual([Date.UTC(2026, 0, 1), u.at]);
  });

  it('serves images over https and sizes Xbox tiles', () => {
    expect(secure('http://images-eds-ssl.xboxlive.com/image?url=abc', 208)).toBe('https://images-eds-ssl.xboxlive.com/image?url=abc&w=208&h=208');
    expect(secure(null)).toBeNull();
  });
});
