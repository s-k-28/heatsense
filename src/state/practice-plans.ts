import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// Practice plans a coach builds and saves: when practice starts, how long it runs, how work and
// breaks alternate, how often water comes round, and what happens with equipment. One plan is
// "today's", and everything that shows the practice (Plan tab, Home, the field check, the practice
// clock, the Dynamic Island) reads it from here. Saved on the device.

export type Equipment = 'on' | 'breaks' | 'off';

export type PracticePlan = {
  id: string;
  name: string;
  /** Minutes after midnight that athletes arrive. */
  startMinutes: number;
  /** Check-in before the first work block. */
  checkInMinutes: number;
  workMinutes: number;
  restMinutes: number;
  /** Practice itself, work and breaks together, after check-in. */
  lengthMinutes: number;
  waterEveryMinutes: number;
  equipment: Equipment;
  builtIn?: boolean;
};

export const EQUIPMENT_LABEL: Record<Equipment, string> = { on: 'On', breaks: 'Off in breaks', off: 'Off' };

const STANDARD: PracticePlan = {
  builtIn: true,
  checkInMinutes: 10,
  equipment: 'breaks',
  id: 'orange-standard',
  lengthMinutes: 72,
  name: 'Standard practice',
  // 16 on, 4 off: three 4-minute breaks an hour, which meets UIL's Green and Yellow zones.
  restMinutes: 4,
  startMinutes: 16 * 60,
  waterEveryMinutes: 10,
  workMinutes: 16,
};

type Store = { activeId: string; plans: PracticePlan[]; status: 'loading' | 'ready' | 'error' };

const STORAGE_KEY = 'heatsense.practicePlans.v1';
let state: Store = { activeId: STANDARD.id, plans: [STANDARD], status: 'loading' };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function persist() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ activeId: state.activeId, plans: state.plans.filter((plan) => !plan.builtIn) })).catch(() => {});
}

let loadVersion = 0;

/** Hydration is explicit so an editor never saves a default draft over a late-loading plan. */
async function loadPlans() {
  const version = ++loadVersion;
  state = { ...state, status: 'loading' };
  emit();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (version !== loadVersion) return;
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Store>;
      const plans = [STANDARD, ...(saved.plans ?? [])];
      state = { activeId: plans.some(plan => plan.id === saved.activeId) ? saved.activeId! : STANDARD.id, plans, status: 'ready' };
    } else state = { ...state, status: 'ready' };
  } catch {
    if (version !== loadVersion) return;
    // Keep current plans intact; a read failure is not an empty plan collection.
    state = { ...state, status: 'error' };
  }
  emit();
}

void loadPlans();

/** Adds a plan or replaces the saved one with the same id. Returns its id. The built-in plan is never overwritten. */
export function savePlan(plan: PracticePlan) {
  const id = plan.builtIn || !plan.id ? `plan-${Date.now()}` : plan.id;
  const next = { ...plan, builtIn: undefined, id };
  const exists = state.plans.some((item) => item.id === id);
  state = { ...state, plans: exists ? state.plans.map((item) => (item.id === id ? next : item)) : [...state.plans, next] };
  emit();
  persist();
  return id;
}

export function deletePlan(id: string) {
  const plan = state.plans.find((item) => item.id === id);
  if (!plan || plan.builtIn) return;
  state = { ...state, activeId: state.activeId === id ? STANDARD.id : state.activeId, plans: state.plans.filter((item) => item.id !== id) };
  emit();
  persist();
}

export function setActivePlan(id: string) {
  if (!state.plans.some((plan) => plan.id === id)) return;
  state = { ...state, activeId: id };
  emit();
  persist();
}

export function getActivePlan() {
  return state.plans.find((plan) => plan.id === state.activeId) ?? STANDARD;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePracticePlans() {
  const store = useSyncExternalStore(subscribe, () => state, () => state);
  return { active: store.plans.find((plan) => plan.id === store.activeId) ?? STANDARD, activeId: store.activeId, plans: store.plans, status: store.status, retry: loadPlans };
}

/* ─────────────────────────────── Schedule ─────────────────────────────── */

export type Block = { kind: 'arrive' | 'work' | 'rest'; minutes: number; start: number; title: string };

/** Check-in, then work and breaks alternating until the practice length runs out, always ending on work. */
export function buildSchedule(plan: PracticePlan): Block[] {
  const blocks: Block[] = [];
  let at = plan.startMinutes;
  if (plan.checkInMinutes > 0) {
    blocks.push({ kind: 'arrive', minutes: plan.checkInMinutes, start: at, title: 'Check-in' });
    at += plan.checkInMinutes;
  }
  let remaining = plan.lengthMinutes;
  let round = 1;
  while (remaining > 0) {
    // Practice never ends on a break: if what's left after this block is no more than one break,
    // the last block runs to the end instead.
    const work = remaining - plan.workMinutes <= plan.restMinutes ? remaining : plan.workMinutes;
    blocks.push({ kind: 'work', minutes: work, start: at, title: `Block ${round}` });
    at += work;
    remaining -= work;
    if (remaining <= 0) break;
    const rest = Math.min(plan.restMinutes, remaining);
    blocks.push({ kind: 'rest', minutes: rest, start: at, title: `Break ${round}` });
    at += rest;
    remaining -= rest;
    round += 1;
  }
  return blocks;
}

export function practiceStart(plan: PracticePlan) {
  return plan.startMinutes + plan.checkInMinutes;
}

export function practiceEnd(plan: PracticePlan) {
  return practiceStart(plan) + plan.lengthMinutes;
}

/** "4:10", or "4:10 PM" with the meridiem. */
export function clockTime(minutes: number, meridiem = false) {
  const day = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(day / 60);
  const m = day % 60;
  const text = `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')}`;
  return meridiem ? `${text} ${h < 12 ? 'AM' : 'PM'}` : text;
}
