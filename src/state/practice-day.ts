import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

// Today's practice for one team: the time the coach set, the plan they approved, and their
// before-practice checklist. Saved on this device only; there is no Firestore schema for practices
// yet, so a coach on two devices sets it on each. Nothing here is health data.

export type ApprovedPlan = {
  /** Everything the plan was built from. When the current inputs differ, the plan needs review. */
  signature: string;
  approvedAt: number;
};

export type PracticeDay = {
  /** Minutes after midnight, local time. */
  startMinutes: number | null;
  durationMinutes: number | null;
  approved: ApprovedPlan | null;
  checklist: string[];
};

const EMPTY: PracticeDay = { startMinutes: null, durationMinutes: null, approved: null, checklist: [] };

function todayKey(scope: string) {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `heatsense.practice.v1.${scope}.${date}`;
}

/** Loads and saves today's practice for a team (or for this coach before they have one). */
export function usePracticeDay(scope: string | null) {
  const key = scope ? todayKey(scope) : null;
  const [loaded, setLoaded] = useState<{ key: string; day: PracticeDay } | null>(null);

  useEffect(() => {
    if (!key) return;
    let live = true;
    AsyncStorage.getItem(key)
      .then((raw) => { if (live) setLoaded({ key, day: raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<PracticeDay>) } : EMPTY }); })
      .catch(() => { if (live) setLoaded({ key, day: EMPTY }); });
    return () => { live = false; };
  }, [key]);

  const ready = Boolean(key && loaded?.key === key);
  const day = ready ? loaded!.day : EMPTY;

  const update = useCallback((change: (current: PracticeDay) => PracticeDay) => {
    if (!key) return;
    setLoaded((current) => {
      const next = change(current?.key === key ? current.day : EMPTY);
      AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
      return { key, day: next };
    });
  }, [key]);

  return { day, ready, update };
}

export function formatClock(minutes: number) {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours % 12 === 0 ? 12 : hours % 12}:${String(mins).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}
