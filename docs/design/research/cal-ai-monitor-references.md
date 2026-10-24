# Cal AI references for Monitor and Athletes

Reviewed in Chrome on October 23, 2026. These are official product previews, not an assertion that every current app version has this exact layout. No inference about the authorship of the app or a percentage of “AI-coded” UI is possible from screenshots.

## Inspectable evidence

- [Cal AI official product page](https://www.calai.app/), dark-mode section.
- [Exact official dark Home preview](https://www.calai.app/dark-iphone-preview.webp).
- [Exact official scan and nutrition preview](https://www.calai.app/hero-image.webp).

Observed in the dark Home preview: Today / Yesterday navigation; one wide, dominant calorie summary; a smaller three-part macro breakdown; a “Recently uploaded” section with repeated rows; each row combines a photo, item name, time, and compact nutritional values. One floating add control anchors the main recording action. The scan-result preview groups the selected item and its nutritional details, then provides two explicit result actions.

The page's marketing copy and testimonials were not used as evidence that a layout improves usability or that the nutrition estimates are accurate.

## Translation to HeatSense

HeatSense's purpose is sideline heat monitoring, so the app keeps its own dark palette, Barlow figures, sentence case, navigation, and clinical state colors. The transferable structure is **one overview, then the items needing action, then the live record**. Cal AI's decorative macro rings are deliberately excluded because HeatSense's project rules reject ring trios and metric-tile grids.

| HeatSense issue | Applied change |
| --- | --- |
| A field-reading strip, alert cards, a live tile grid, and three more statistics compete equally | Plain live-band count, compact practice context, attention list, then one grouped live-athlete list |
| Every athlete repeats a large number, progress bar, percentage, phase, colored dot, and chart inside a separate tile | Full-width rows combine name and recovery state, one heart-rate value, and a small quiet trend. Details remain one tap away |
| Repeated yellow “Checked in” buttons look like parallel primary actions | Text actions sit beside the named athlete and preserve the ten-minute acknowledgement behavior |
| The roster shows search and four filters even when empty or when categories contain everyone | Search appears for eight or more athletes (or an active query); only meaningful subset filters appear, and the active filter remains available as live counts change |
| Every roster row has a placeholder avatar and an outlined status pill | Shared `Rows` / `ListRow` structure, names first, quiet acclimatization text and the band indicator |

Live heart rates and sparklines do not animate on each sample. Shared list components and attention-list transitions retain reduced-motion support. Stale samples continue to show missing values and a signal-lost state. Simulated data remains labeled. No schema, safety classifier, thresholds, or dependency changes were made.

## Verification scope

TypeScript and the two component lint checks run after the edits. Device Hub review is coordinated by the parent agent to avoid concurrent control of the simulator. The official preview supports the hierarchy comparison; the usability of the HeatSense adaptation must be judged on the actual HeatSense screens.
