// The player search used on the home page and every topic page.
export function SearchBox({ q, label = 'Look up a player' }: { q?: string; label?: string }) {
  return (
    <form action="/api/search" method="get" className="start-opt search">
      <h2>
        <label htmlFor="q">{label}</label>
      </h2>
      <div className="search-row">
        <input id="q" name="q" defaultValue={q} placeholder="Gamertag or profile link" required autoComplete="off" autoCapitalize="off" spellCheck={false} />
        <button type="submit" className="btn primary">Search</button>
      </div>
    </form>
  );
}
