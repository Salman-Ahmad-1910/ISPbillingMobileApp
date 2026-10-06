// Ported from the web app (client/src/lib/search.ts) so subscriber search
// ranks results identically on mobile.

export type SearchableValue = string | number | null | undefined;

const matchGroup = (q: string, values: SearchableValue[]): number => {
  let substringMatch = -1;
  for (const v of values) {
    if (v === null || v === undefined) {
      continue;
    }
    const s = String(v).toLowerCase();
    if (s.startsWith(q)) {
      return 0;
    }
    if (substringMatch < 0 && s.includes(q)) {
      substringMatch = 1;
    }
  }
  return substringMatch;
};

// Ranked match, lower is better, -1 = no match. Every value-group is scored as
// `groupIndex * 2 + (0 prefix | 1 substring)`, so any match in an earlier group
// outranks any match in a later group.
export const smartMatchScore = (
  query: string,
  ...groups: SearchableValue[][]
): number => {
  const q = query.trim().toLowerCase();
  if (!q) {
    return 0;
  }
  for (let i = 0; i < groups.length; i++) {
    const groupScore = matchGroup(q, groups[i]);
    if (groupScore >= 0) {
      return i * 2 + groupScore;
    }
  }
  return -1;
};

export const smartMatch = (
  query: string,
  ...groups: SearchableValue[][]
): boolean => smartMatchScore(query, ...groups) >= 0;

// Filters `items` down to matches AND reorders them by match quality, keeping
// the original relative order for ties.
export const smartSearch = <T>(
  query: string,
  items: T[],
  getGroups: (item: T) => SearchableValue[][],
): T[] =>
  items
    .map((item, index) => ({
      item,
      index,
      score: smartMatchScore(query, ...getGroups(item)),
    }))
    .filter(entry => entry.score >= 0)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(entry => entry.item);