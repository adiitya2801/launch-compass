// Validate the input contract and output board before writing any artifact.
export function validateSnapshot(snapshot: any): void {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Snapshot must be an object');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.as_of)) {
    throw new Error('Snapshot as_of must be a UTC date');
  }
  if (!Number.isFinite(Date.parse(snapshot.as_of + 'T00:00:00Z'))) {
    throw new Error('Snapshot date is invalid');
  }
  if (!Array.isArray(snapshot.protocols) || !Array.isArray(snapshot.watchlist)) {
    throw new Error('Snapshot needs protocols and watchlist arrays');
  }
  const slugs = new Set<string>();
  for (const protocol of snapshot.protocols) {
    if (typeof protocol.slug !== 'string' || !protocol.slug || /\s/.test(protocol.slug)) {
      throw new Error('Invalid protocol slug');
    }
    if (slugs.has(protocol.slug)) {
      throw new Error('Duplicate protocol slug: ' + protocol.slug);
    }
    slugs.add(protocol.slug);
    if (typeof protocol.name !== 'string' || !protocol.name.trim()) {
      throw new Error('Protocol needs a name: ' + protocol.slug);
    }
    if (!Number.isFinite(protocol.tvl_usd) || protocol.tvl_usd < 0) {
      throw new Error('Invalid TVL: ' + protocol.slug);
    }
    if (!Array.isArray(protocol.chains) || protocol.chains.some((c: any) => typeof c !== 'string')) {
      throw new Error('Invalid chains: ' + protocol.slug);
    }
    if (protocol.change_7d !== null && !Number.isFinite(protocol.change_7d)) {
      throw new Error('Invalid growth: ' + protocol.slug);
    }
    if (protocol.listed_at !== null && !Number.isFinite(Date.parse(protocol.listed_at + 'T00:00:00Z'))) {
      throw new Error('Invalid listing date: ' + protocol.slug);
    }
  }
  for (const slug of snapshot.watchlist) {
    if (!slugs.has(slug)) throw new Error('Unknown watchlist slug: ' + slug);
  }
}
export function validateBoard(rows: any[], snapshot: any): void {
  if (rows.length < 100 || rows.length > 4000) throw new Error('Board row count outside caps');
  const known = new Set(snapshot.protocols.map((p: any) => p.slug));
  const seen = new Set<string>();
  let previous = Infinity;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!known.has(row.slug) || seen.has(row.slug)) throw new Error('Unknown or repeated board slug');
    seen.add(row.slug);
    if (row.rank !== i + 1) throw new Error('Board ranks must be contiguous');
    const value = row.implied_value_usd;
    if (!Number.isSafeInteger(value) || value <= 0 || value > 100000000000000) {
      throw new Error('Invalid implied value for ' + row.slug);
    }
    if (value > previous) throw new Error('Board is not sorted by value');
    previous = value;
    if (!Array.isArray(row.farm_steps) || row.farm_steps.length < 3 || row.farm_steps.length > 12) {
      throw new Error('Invalid farm plan length for ' + row.slug);
    }
    for (const step of row.farm_steps) {
      if (typeof step !== 'string' || step.trim().length < 20 || step.trim().length > 600) {
        throw new Error('Invalid farm step for ' + row.slug);
      }
    }
  }
  for (const slug of snapshot.watchlist) {
    if (!seen.has(slug)) throw new Error('Board misses watchlist protocol: ' + slug);
  }
  if (new Set(rows.map(r => r.implied_value_usd)).size < 2) {
    throw new Error('Board values must differentiate protocols');
  }
}
