import { useEffect, useState } from 'react';

import { getAthleteCard, watchRoster, type AthleteCard, type RosterMember } from '@/services/team-roster';

/** Live roster for a team: pending and active athletes, or 'loading' / 'error'. */
export function useRoster(teamId: string | null) {
  const [result, setResult] = useState<{ teamId: string; value: RosterMember[] | 'error' } | null>(null);
  useEffect(() => {
    if (!teamId) return;
    return watchRoster(teamId, (members) => setResult({ teamId, value: members }), () => setResult({ teamId, value: 'error' }));
  }, [teamId]);
  return result && result.teamId === teamId ? result.value : 'loading';
}

/** Profile basics for approved athletes, fetched once each. */
export function useAthleteCards(ids: string[]) {
  const [cards, setCards] = useState<Record<string, AthleteCard | null>>({});
  const key = ids.join(',');
  useEffect(() => {
    const missing = key ? key.split(',').filter((id) => !(id in cards)) : [];
    if (missing.length === 0) return;
    let live = true;
    Promise.all(missing.map((id) => getAthleteCard(id).then((card) => [id, card] as const).catch(() => [id, null] as const)))
      .then((entries) => { if (live) setCards((current) => ({ ...current, ...Object.fromEntries(entries) })); });
    return () => { live = false; };
    // `cards` is read only to skip ids already fetched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return cards;
}
