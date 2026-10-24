# Shared coach and athlete Home

The coach Home design from main commit `5f5ccbb` is the shared layout for coach and athlete. `HomeOverview` renders the field-photo WBGT card, condition rings, practice rhythm, pulse metrics, seven-day heat and current field-check status.

Athlete neutral surfaces stay black and supporting text uses the athlete appearance layer. Staff retain the coach palette. Both roles use the same layout components rather than separate copies.

Athlete actions open read-only UIL practice guidance. Athlete Home never mounts staff roster subscriptions or recording controls. Its pulse comes from the athlete’s own simulated band, explicitly labelled; its schedule section explains when no schedule is shared. Device-local staff plans are not presented as a shared team plan.

Runtime verification on local Firebase emulators:
- Coach Home opened in Device Hub; current field-photo and concentric rings displayed. The main action opened the existing practice recording/guidance sheet, and Done returned Home. No reading was saved or acknowledged.
- Athlete Home rendered the same composition in Chrome at 320 × 740. View guidance opened current UIL guidance with no recording or acknowledgement controls; Done returned Home.
- Athlete weekly heat selection updated the displayed reading. Sessions → Home navigation retained the new composition.
- Closing guidance no longer leaves the ring layout positioned above the following sections. Section layout remains static; local ring fills retain reduced-motion support.

TypeScript, focused ESLint, UIL classification and recheck checks passed. These checks cover the focused Home update; they are not a claim of a complete app-wide runtime audit.
