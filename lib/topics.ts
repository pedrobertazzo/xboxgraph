// Pages written for what people search before they find the site ("xbox gamerscore", "xbox play time"…). Each one
// explains a slice of the dashboard, shows those cards filled in from the sample player, and ends in a search.
export type Topic = {
  slug: string;
  title: string; // The <title> and share title.
  description: string;
  h1: string;
  lede: string;
  sections: [string, string][];
  // Dashboard cards to show from the sample player, each with a sentence on what it measures.
  stats: [string, string][];
  faq: [string, string][];
};

const PRIVACY =
  'Stats need the player’s game history to be visible to everyone. On Xbox that’s Settings → Account → Privacy & online safety → Xbox privacy → View details & customize → Game content → “Others can see your game and app history”: Everyone. The same setting is under Privacy at account.xbox.com.';

export const TOPICS: Topic[] = [
  {
    slug: 'xbox-gamerscore',
    title: 'Xbox Gamerscore and Achievement Stats for Any Gamertag',
    description:
      'Look up any public Xbox profile’s gamerscore and achievement stats for free: gamerscore by game, achievements, games at 100%, completion and the next milestone. No sign-in.',
    h1: 'Xbox gamerscore and achievement stats',
    lede:
      'Type a gamertag and see an Xbox profile as one dashboard: gamerscore and the next milestone, achievements unlocked, games at 100%, average completion and the games close to finishing.',
    sections: [
      ['More than a number', 'Your Xbox shows gamerscore as one total. This dashboard breaks it down: which games it came from, how many you’ve taken to 100%, how fast you earn it and how far you are from the next milestone.'],
      ['No sign-in, no password', 'Type a gamertag or paste a profile link. We read what Xbox already shows to anyone who looks that player up, and never ask for a password.'],
      ['Shaped the way you want', 'Every stat is a card. Drag one into another row and it redraws as a chart, a big number, a list or a cover wall, and the share link opens your exact layout.'],
    ],
    stats: [
      ['gamerscore', 'Your gamerscore, the games it came from and how far you are from the next milestone.'],
      ['achievements', 'Every achievement you’ve unlocked, and how many are left in the games you’ve started.'],
      ['completed', 'Your games at 100%, newest first, as a wall of game covers.'],
      ['completion', 'Average completion across your games, as Xbox counts it.'],
      ['scorerate', 'How much gamerscore an hour of play brings you, and which games give it fastest.'],
    ],
    faq: [
      ['How do I check my Xbox gamerscore stats?', 'Type your gamertag, or paste your profile link, in the search box. Your game history needs to be public for it to work.'],
      ['Can I look up someone else’s gamerscore?', 'Yes, as long as their game history is public, the same as looking them up on Xbox. Players can opt out of being shown here.'],
      ['Do Xbox 360 games count?', 'Yes. Gamerscore, achievements and completion include Xbox 360 games. Their play time, rarity and unlock dates aren’t shared by Xbox, so those stats cover Xbox One, Series X|S and PC.'],
      ['Why does it say the game history is private?', PRIVACY],
      ['How fresh are the numbers?', 'Profiles are kept for about an hour, so an achievement you just unlocked can take that long to show up.'],
    ],
  },
  {
    slug: 'xbox-play-time',
    title: 'Xbox Play Time: How Many Hours Have You Played?',
    description:
      'See how many hours you’ve played on Xbox, game by game: total play time, most played games, favourite genres, gamerscore per hour and your hours in perspective. Free, no sign-in.',
    h1: 'How many hours have you played on Xbox?',
    lede:
      'Type a gamertag and see total play time across Xbox One, Series X|S and PC, your most played games, the genres your hours go to and what all that time adds up to.',
    sections: [
      ['Every hour, added up', 'Xbox keeps play time per game. This dashboard adds it all up, ranks your games by hours and puts it in perspective, in films, audiobooks and trips to the Moon.'],
      ['Xbox One and later', 'Xbox records play time for Xbox One, Series X|S and PC games. Xbox 360 games still show their gamerscore, but no hours.'],
      ['What your hours go to', 'Your favourite genres and the decades your games come from, weighted by the hours you put in.'],
    ],
    stats: [
      ['playtime', 'Total hours, and your top games by hours.'],
      ['top', 'Your most played game, with its hours and gamerscore.'],
      ['genres', 'The genres your play time goes to, from each game’s main genre on the Xbox store.'],
      ['eras', 'The decades your games come from, by hours.'],
      ['instead', 'Your hours as films, drives across the US, trips to the Moon and more.'],
    ],
    faq: [
      ['How do I see my total play time on Xbox?', 'Type your gamertag in the search box. The dashboard adds up the play time Xbox records for each of your games.'],
      ['Why is play time missing?', `Either the games are Xbox 360 games, which have no play time, or the player’s game history is private. ${PRIVACY}`],
      ['Does Game Pass count?', 'Yes. Every game you’ve played counts, however you got it.'],
    ],
  },
  {
    slug: 'rarest-xbox-achievements',
    title: 'Your Rarest Xbox Achievements and Rarity Stats',
    description:
      'Find your rarest Xbox achievements: the ones fewest players have, how many of yours are rare, ultra rare or common, and what share of your unlocks are rare. Free, no sign-in.',
    h1: 'Your rarest Xbox achievements',
    lede:
      'Type a gamertag and see the achievements fewest players have, with their rarity, and how your unlocks split from ultra rare to common.',
    sections: [
      ['Rarity from Xbox itself', 'Every achievement on Xbox One and later carries the share of players who have it. We sort yours by it, rarest first.'],
      ['Rare, very rare, ultra rare', 'Xbox calls an achievement rare when 10% of players or fewer have it. The Rarity mix splits yours further: under 1%, under 5%, under 10%, under 30% and the rest.'],
      ['Up to 5,000 unlocks', 'We read your 5,000 most recent achievements, which covers the whole Xbox One era for most players.'],
    ],
    stats: [
      ['rarest', 'Your rarest achievements, with the share of players who have each one.'],
      ['rarity', 'Your unlocks split by rarity, and the share that are rare.'],
      ['calendar', 'The days you unlocked something in the last six months.'],
    ],
    faq: [
      ['How is rarity worked out?', 'Xbox reports, for each achievement, the share of the game’s players who have unlocked it. We show that figure as it is.'],
      ['Why don’t my Xbox 360 achievements show up?', 'Xbox only reports rarity and unlock dates for Xbox One, Series X|S and PC achievements. Xbox 360 games still count toward your gamerscore and completion.'],
      ['Why does it say the game history is private?', PRIVACY],
    ],
  },
  {
    slug: 'xbox-completion-rate',
    title: 'Xbox Completion Rate: How Many Games Do You 100%?',
    description:
      'See how many of your Xbox games you finish: games at 100%, your finish rate by platform, average completion, the games closest to 100% and your biggest completion. Free.',
    h1: 'How many of your Xbox games do you 100%?',
    lede:
      'Type a gamertag and see every game you’ve taken to 100%, your finish rate, your average completion and the games you’re closest to finishing.',
    sections: [
      ['Your finish rate', 'Of the games you started, how many you took all the way, overall and platform by platform.'],
      ['Your next 100%', 'Almost 100% lists the games at 70% or more, closest first, with how much gamerscore is left.'],
      ['Your biggest 100%', 'The games with the most gamerscore you’ve completed, add-ons included.'],
    ],
    stats: [
      ['finishrate', 'How many of the games you started you took to 100%.'],
      ['completed', 'Every game at 100%, newest first.'],
      ['almost', 'Games close to 100%, with the gamerscore left.'],
      ['biggest', 'Your biggest complete game, by gamerscore.'],
    ],
    faq: [
      ['What counts as a game I started?', 'Any game where you’ve unlocked at least one achievement.'],
      ['What counts as 100%?', 'Every point of gamerscore the game offers, add-ons included, as on your Xbox.'],
      ['Why does it say the game history is private?', PRIVACY],
    ],
  },
  {
    slug: 'xbox-backlog',
    title: 'Xbox Backlog: Hours to Finish the Games You Started',
    description:
      'How long would it take to 100% every Xbox game you started? Your Xbox backlog in hours, worked out from your own pace, with quick wins and dropped games. Free.',
    h1: 'How long is your Xbox backlog?',
    lede:
      'Every Xbox game you started and never finished, with how many hours it would take to reach 100% at your own pace, added up. Plus the quickest wins to go for first.',
    sections: [
      [
        'Worked out from your own pace',
        'If 40% of a game’s gamerscore took you 20 hours, the other 60% should take about 30. Each unfinished game is projected that way from your own play time, so a slow, thorough player gets a longer estimate than a speedrunner.',
      ],
      [
        'Games you started, not games you own',
        'Xbox only lists games someone has played, so the backlog is what you started and left unfinished, not a pile of unopened purchases or Game Pass picks. Estimates are to 100% of the gamerscore, not just the end of the story.',
      ],
      ['When there’s too little to go on', 'Games with barely any progress, or Xbox 360 games (which share no play time), use your average hours per 100% game instead.'],
    ],
    stats: [
      ['backlog', 'Hours to 100% every game you started, quickest first, at your own pace.'],
      ['almost', 'Games you’re only a few achievements away from finishing.'],
      ['oneanddone', 'Games you dropped after an achievement or two, or under an hour.'],
      ['starts', 'The month of the year you start the most new games.'],
    ],
    faq: [
      ['How do I see my Xbox backlog?', 'Type your gamertag in the search box. The Backlog card lists every unfinished game with its hours to 100%, and opens into the full list.'],
      ['Why aren’t games I own but never played in my backlog?', 'Xbox only shares games that have been played, so unplayed purchases can’t be seen by anyone, including us.'],
      ['How accurate are the hours?', 'They’re estimates. Gamerscore is a rough gauge of how far through a game you are, so a game whose last achievements are grindy will take longer than projected.'],
    ],
  },
  {
    slug: 'xbox-achievement-calendar',
    title: 'Xbox Achievement Calendar: When Do You Play?',
    description:
      'See when you play Xbox: an achievement calendar for the last six months, your busiest hour of the day, your longest streak and the month you start the most games. Free.',
    h1: 'When do you play Xbox?',
    lede:
      'Type a gamertag and see every day you unlocked something in the last six months, the hour your achievements pop, your longest streak and what your year looks like so far.',
    sections: [
      ['A calendar of unlocks', 'Each square is a day, coloured by how many achievements you unlocked. The longest run of days in a row is your streak.'],
      ['Night owl or early bird?', 'Your achievements by hour of the day, on your own clock, so you can see when you really play.'],
      ['Your year so far', 'Gamerscore earned each month this year, games played and how many of them were new.'],
    ],
    stats: [
      ['calendar', 'The days you unlocked something in the last six months, and your longest streak.'],
      ['when', 'Your achievements by hour of the day.'],
      ['thisyear', 'Gamerscore earned each month this year.'],
      ['recent', 'The games you played in the last 30 days.'],
    ],
    faq: [
      ['Whose clock is used?', 'Yours: the page uses your device’s time zone, so a link you share shows the same hours you see.'],
      ['Why is my calendar empty?', 'It needs unlock dates, which Xbox only reports for Xbox One, Series X|S and PC achievements, and a public game history. ' + PRIVACY],
    ],
  },
];

export const topic = (slug: string) => TOPICS.find((t) => t.slug === slug);
