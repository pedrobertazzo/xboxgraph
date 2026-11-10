# My Gaming Grid for Xbox

Any public Xbox profile as a dashboard. Type a gamertag and its gamerscore, achievements and play time become cards: 23 stats in 8 card types, plus a summary image you can post anywhere.

The Xbox sibling of [My Gaming Grid for Steam](https://steam.morphgrid.io), [for PlayStation](https://psn.morphgrid.io) and [for Chess](https://chess.morphgrid.io), built on [morphgrid](https://www.npmjs.com/package/morphgrid). Drag one card onto another and they swap; each card redraws its stat to suit its new spot.

Planned home: **xbox.morphgrid.io**.

## How it reads Xbox

Microsoft offers websites no open Xbox API, so the site reads Xbox Live the way the Xbox app does, signed in as **one helper Microsoft account**. Visitors never sign in; they type a gamertag and see what Xbox already shows to anyone who looks that player up.

> **Use a separate Microsoft account made just for this site, never your main one.** If Microsoft ever restricts the reading account, everything on it goes with it. With a throwaway account, the worst case is making a new one.

The server signs in through an Azure app registration and a refresh token:

1. Create a free Microsoft account for the site, and sign in to xbox.com with it once so it has a gamertag.
2. In the [Azure portal](https://portal.azure.com) → **App registrations → New registration**: any name, **Personal Microsoft accounts only**, redirect URI type **Public client/native (mobile & desktop)** with `http://localhost:8080/auth/callback`. Under **Authentication**, turn on **Allow public client flows**. Copy the **Application (client) ID**.
   (A **Web** redirect works too; then also create a client secret and set `XBOX_CLIENT_SECRET`.)
3. Put `XBOX_CLIENT_ID=…` in `.env.local`, run `npm run xbox-login`, open the link it prints and sign in with the helper account. It prints `XBOX_REFRESH_TOKEN=…`: add that to `.env.local` and to Vercel.

The server swaps the refresh token for a Microsoft access token, then an Xbox Live user token, then an XSTS token (about 16 hours). Microsoft issues a new refresh token on each refresh; with the shared cache on, the newest one is kept there, so the one in the environment doesn't go stale. If sign-in ever fails, profile pages say so; run `npm run xbox-login` again.

### The shared cache

Vercel runs several copies of the server, each with its own memory. With **Upstash Redis** connected, they share one cache, one request count and the sign-in tokens, so a profile is read from Xbox once for everyone. Without it the app still works, with a memory cache per copy.

Open `/api/status` to check: whether the shared cache is connected, how many Xbox requests are left in the current 15 minutes, and whether sign-in is configured (never the tokens).

To connect it: Vercel → your project → **Storage → Create Database → Upstash for Redis**, connect it to the project, then redeploy. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Entries over 900 KB stay in memory only (the free plan caps entries at 1 MB); unlock icons are dropped except for the 40 rarest to keep profiles small.

### Staying under Xbox's limits

Xbox Live limits each signed-in user per service and answers 429 with a Retry-After. All server copies share one count (with the shared cache on) and stay under 300 requests per 15 minutes (`XBOX_BUDGET` changes it); after a 429 every request waits out the Retry-After, at least a minute.

A new profile costs **4 to 9 requests**, cached for an hour:

| Request | Gives |
| --- | --- |
| `profile.xboxlive.com` | gamertag → xuid, gamerpic, gamerscore, years on Xbox |
| `titlehub.xboxlive.com` title history | every game played, its achievements and gamerscore, last played, art, genres, release date |
| `userstats.xboxlive.com` batch | `MinutesPlayed` for Xbox One, Series X\|S and PC games, 200 games a request (up to 600) |
| `achievements.xboxlive.com` | unlocked achievements with unlock time, gamerscore and rarity, 1,000 a page, up to 5,000 |

Apps in the title history (Netflix, Spotify…) are dropped. Xbox 360 games count toward gamerscore, achievements and completion, but Xbox shares no play time, unlock dates or rarity for them.

### The Backlog

Xbox only lists games someone has played, so the Backlog is **hours to finish what you started**: every game with gamerscore but not at 100%, projected from the player's own pace (if 40% of the gamerscore took 20 hours, the rest should take about 30). Games under 20% done, or with no play time (Xbox 360), use the player's average hours per 100% game and are marked "estimate"; no game is projected past 150 hours (or three average completions). No extra requests (`lib/backlog.ts`).

## Stats

| Stat | Highlight | Chart / top list | Progress |
| --- | --- | --- | --- |
| **Gamerscore** | Total, with its "10K club" milestone | Gamerscore by game | To the next milestone |
| **Achievements** | Achievements unlocked | By game | Unlocked vs on offer in started games |
| **Completed** | Games at 100% | Newest first (wall of covers) | Share of started games |
| **Completion** | Xbox's completion %, averaged per game | Most complete games | Games at 100% |
| **Almost 100%** | Games at 70%+ | Closest first, with gamerscore left | The closest game |
| **Play time** | Hours on Xbox One, Series X\|S and PC | Top games by hours | The top game's share |
| **Most played** | Hours in your #1 game (cover) | It vs the next three | Its share |
| **Recently played** | Games in the last 30 days | Most recent first | Against the last 90 days |
| **Where you play** | Your main platform | Games per platform | Series X\|S share |
| **Rarest achievements** | The share of players who have your rarest | Your rarest, with their game | Unlocks under 5% |
| **Rarity mix** | Share of your unlocks that are rare (≤10%) | Ultra rare, very rare, rare, uncommon, common | Rare of all |
| **When you play** | Your busiest hour, on the viewer's clock | Unlocks by hour of the day (a ring) | Share after 10 PM |
| **Achievement calendar** | Days with an unlock in the last 26 weeks | Unlocks by weekday; weekday × week heatmap | Longest streak |
| **When you start games** | The month you start the most new games | By year; year × month heatmap | That month's share |
| **Gamerscore per hour** | Overall rate | Quickest games first | Games beating your average |
| **One and done** | Games dropped after an achievement or two | Those games | Share of started games |
| **Finish rate** | Started games taken to 100% | By platform | Completed of started |
| **Biggest 100%** | Gamerscore of your largest complete game | Complete games, biggest first | Games at 100% |
| **Favorite genres** | Your main genre, by hours | Share of hours per genre | Top genre's share |
| **Your gaming eras** | The decade most of your hours come from | Hours by release decade | Last three years' share |
| **Time well spent** | Your hours as films, trips to the Moon… | All six | The drive to the Moon |
| **Backlog** | Hours to 100% everything you started | Quickest wins; ⤢ opens the full list | Quick wins under 5 hours |
| **Your year** | Gamerscore earned this year (all of last year through January) | Gamerscore per month | Games played, and new |

Time-of-day stats use the viewer's time zone (sent as a cookie, and in shared links).

### Privacy settings

Stats need **"Others can see your game and app history"** set to **Everyone**: on Xbox, *Settings → Account → Privacy & online safety → Xbox privacy → View details & customize → Game content*, or under Privacy at account.xbox.com. Private histories get a page explaining that.

## Compare

`/compare` takes two to four gamertags or profile links and opens `/compare/<a>/<b>…`: each player's gamerscore ring and 100% count, head-to-heads (gamerscore, achievements, games at 100%, completion, rare achievements, hours, games started), the games you share with each player's completion, and the 100% games only one of you has. Try `/compare/sample/samplerival`.

## Search and landing pages

Search takes a gamertag (classic, or modern with a `#1234` suffix) or a profile link from xbox.com, account.xbox.com, TrueAchievements, XboxAchievements or xboxgamertag.com. Six landing pages target what people search, each filled in from the sample: `/xbox-gamerscore`, `/xbox-play-time`, `/rarest-xbox-achievements`, `/xbox-completion-rate`, `/xbox-backlog` and `/xbox-achievement-calendar`.

## Look

The feel of the Xbox home screen: near-black charcoal with a soft green glow, frosted tiles with small rounded corners that lift with a white border when you point at them, plain green buttons that turn white on focus, and an "achievement unlocked" pop-up cycling through the sample's best unlocks on the landing page. A bold X with curved arms that flare at the tips floats in the hero and the profile banner: a nod to Xbox drawn for this site, never inside a sphere, so it isn't the Xbox logo. The gamerscore coin, 100% medal and rare gem are drawn for this site (`components/Medal.tsx`). Nothing uses the Xbox logo, Microsoft's fonts or its artwork.

The sample player's games are made up; their covers are illustrated SVGs in `public/sample/`.

## Run it

```bash
npm install
cp .env.example .env.local     # the sample works without sign-in
npm run dev                    # http://localhost:3000, sample at /profile/sample
npm run xbox-login             # once, for XBOX_REFRESH_TOKEN
npm run peek -- "Some Gamertag"   # print a real profile's stats in the terminal
```

| Variable | Needed for | Where to get it |
| --- | --- | --- |
| `APP_URL` | Link previews, canonical URLs, sitemap | e.g. `https://xbox.morphgrid.io` |
| `XBOX_CLIENT_ID` | Looking up real players | Your Azure app registration, as above |
| `XBOX_CLIENT_SECRET` | Only for "Web" app registrations | Azure → Certificates & secrets |
| `XBOX_REDIRECT_URI` | `npm run xbox-login` | Defaults to `http://localhost:8080/auth/callback`; must match the registration |
| `XBOX_REFRESH_TOKEN` | Looking up real players | `npm run xbox-login`. Keep it secret; it can act as the helper account. |
| `OPTED_OUT_GAMERTAGS` | Opt-outs | Gamertags, comma-separated |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | The shared cache (optional, recommended) | Set when you connect Upstash for Redis on Vercel |

On Vercel, add these under **Settings → Environment Variables** and redeploy; add `xbox.morphgrid.io` under **Settings → Domains**.

## How it works

```
app/
  page.tsx                   landing: search, achievement pop-ups, live preview, FAQ
  profile/[id]/              a player's dashboard, loading screen and card.png
  compare/                   two to four players side by side
  api/search, api/compare    search input → profile or compare page
lib/
  xbox.ts                    sign-in, request budget, caching, reading Xbox Live
  stats.ts                   turns a profile into the 23 stats
  backlog.ts                 hours to 100%, from the player's pace
  sample.ts                  the made-up sample players
  card.tsx                   the summary image (next/og)
  presets.ts, layout.ts      presets, row heights and layout codes for URLs
components/
  Dashboard.tsx, views.tsx   morphgrid setup and the eight card views
  ProfileView.tsx            the profile page
  Medal.tsx, Shapes.tsx      the gamerscore coin, 100% medal, rare gem and the hero outlines
  Toast.tsx                  the landing page's achievement pop-up
scripts/
  xbox-login.ts              signs the helper account in once
  peek.ts                    prints a profile's stats
```

```bash
npm test
npm run build
```

Not affiliated with or endorsed by Microsoft. Xbox is a trademark of the Microsoft group of companies.
