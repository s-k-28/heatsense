// Heat acclimatization: the first 14 days of practice in the heat, when exertional heat illness is
// most likely. Phases follow the NATA preseason heat-acclimatization guidelines for secondary
// schools (Casa et al., 2009), simplified to what a trainer checks on the sideline.

export const ACCLIMATIZATION_DAYS = 14;

export type AcclimatizationPhase = { title: string; rule: string };

export function acclimatizationPhase(day: number): AcclimatizationPhase {
  if (day >= ACCLIMATIZATION_DAYS) return { title: 'Acclimatized', rule: 'Full practice and equipment.' };
  if (day <= 0) return { title: 'Starts at the first practice', rule: 'Days 1 and 2: one practice a day, 3 hours at most, helmets as the only protective equipment.' };
  if (day <= 2) return { title: `Day ${day}: helmets only`, rule: 'One practice a day, 3 hours at most. Helmets as the only protective equipment.' };
  if (day <= 5) return { title: `Day ${day}: helmets and shoulder pads`, rule: 'One practice a day, 3 hours at most. Add shoulder pads; no full contact.' };
  return { title: `Day ${day}: full equipment`, rule: 'Full equipment and contact. Double-practice days need 3 hours of rest between sessions in a cool place.' };
}

/** Practice days so far, counting only practices after the athlete joined, capped at 14. */
export function practiceDaysSince(joinedAt: Date | null, practiceStarts: Date[]) {
  if (!joinedAt) return 0;
  const days = new Set(practiceStarts.filter((d) => d >= joinedAt).map((d) => d.toDateString()));
  return Math.min(ACCLIMATIZATION_DAYS, days.size);
}
