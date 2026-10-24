# HeatSense interface refinement — principles before implementation

## Research and decisions

Reviewed 23 October 2026 before implementation. Official sources are linked below. Apple HIG Markdown was read from Apple's `.md` endpoints when the HTML required JavaScript; local reference copies are outside the repository.

- [Apple HIG typography](https://developer.apple.com/design/human-interface-guidelines/typography): use a small, consistent family set and a clear scale; retain font scaling and readable line heights. HeatSense uses Archivo for athletic headings/metrics and Manrope for actions, forms, labels and prose. Bundle fonts locally so loading does not depend on a font CDN.
- [Apple HIG accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): support larger text, meaningful labels, sufficient contrast and adequate interactive targets. Use at least 44-point targets where practical, visible keyboard focus, text with validation states, wrapping rather than clipped essential content, and no status conveyed by color alone.
- [Apple HIG buttons](https://developer.apple.com/design/human-interface-guidelines/buttons): make actions understandable and distinguish primary from secondary actions. Use peach pill actions, quiet elevated secondary pills, and compact text actions where hierarchy calls for them. Busy/disabled states preserve an understandable label.
- [Apple HIG layout](https://developer.apple.com/design/human-interface-guidelines/layout): establish hierarchy with alignment and space. Keep content in normal flow, honor safe areas, reserve bottom-navigation clearance, and allow keyboard-aware forms to scroll.
- [Apple HIG charts](https://developer.apple.com/design/human-interface-guidelines/charts): labels, axes and color should convey meaning. Preserve HeatSense's current charts, ring types, colors, ranges, calculations and interactions; refine only type, spacing and their surrounding containers.
- [Apple HIG motion](https://developer.apple.com/design/human-interface-guidelines/motion): use purposeful, comfortable feedback and respect accessibility preferences. Reuse Rossark's calm motion discipline: 300ms route transitions, 170ms press/release, 250ms segmented movement, no decorative bounce or layout-position animation that can strand content after a modal closes.
- [Apple Health](https://www.apple.com/health/) and [Apple Fitness+](https://www.apple.com/apple-fitness-plus/): observed visual emphasis on understandable current metrics, trends and activity progress. HeatSense keeps colorful metrics as the focal point and moves supporting detail behind clear actions. This is a design inference from product presentation, not an Apple endorsement or copied screen.
- [Nike Running](https://www.nike.com/running): observed strong athletic type, selective action copy and meaningful field photography. Apply confidence and image hierarchy without copying Nike assets, logos, layouts or proprietary type.
- [Material text-field guidance](https://m3.material.io/components/text-fields/guidelines): use a visible label, clear focus/error states and a consistent field structure. Existing React Native form semantics and validation stay intact.

## Compact token system

| Role | Specification |
| --- | --- |
| Canvas | `#090B0C` |
| Floating surface | `#131718` |
| Secondary surface | `#1D2425` |
| Interactive surface | `#252B2C` |
| Primary / supporting ink | `#F4F0E8` / `#D6DAD6` |
| Brand / support | Existing HeatSense peach `#FFB183`; ice blue `#A9DCE8` |
| Page | Archivo 800, 40/44, tight tracking |
| Section | Archivo 700, 26/32 |
| Card | Manrope 700, 20/26 |
| Body | Manrope 600, 16/24 |
| Label | Manrope 600, 14/20 |
| Metric | Archivo 800, existing size, tabular numerals |
| Button | Manrope 700, 16/22, 56pt primary/secondary pill |
| Containers | 28pt major cards, 22pt fields, restrained ambient shadow; no decorative thick outlines |

Use the same token vocabulary in shared, coach and entry components. Remove the athlete-only font/color rewrite that weakened headings; roles differ by responsibility, not by competing design systems. Keep safety, heat-zone and chart colors exactly as they are. Light screens, if intentionally retained, must use a complete coordinated light palette rather than changing individual foreground colors.

## Composition and restraint

```
Page title / essential action
Primary existing metric or task
Open section or grouped rows
Relevant next action
Disclosure for secondary detail
```

Coach emphasizes field conditions, practice decisions and team oversight. Athlete emphasizes current guidance, personal band signals, practice history and learning. Their shared components retain consistent type, surfaces and controls; privileged controls remain role-specific. Keep safety instructions, consent, provenance and medical limitations. Remove repeated filler, not context needed to act safely.

## Implementation and evidence order

1. Source map and role inventories, including nested forms, menus and modal states.
2. Shared fonts, tokens, surfaces, controls, input and motion foundation.
3. Coach main pages and reachable descendants.
4. Athlete main pages and reachable descendants.
5. Runtime interaction checklist: navigation, forms, validation, loading/empty/error behavior, scroll and modal return.
6. Visual inspection at 375×667, 390×844, 430×932 and desktop, with screenshots and fixes.
7. Final route/state checklist and honest limits. Source review is never counted as an opened screen. Native OS permission, call and share flows are recorded separately from web behavior; no real emergency call or production test readings.

## Font licensing

Use official Google Fonts packages for [Archivo](https://github.com/google/fonts/tree/main/ofl/archivo) and [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope), distributed under SIL Open Font License 1.1. Preserve the bundled license files and record package versions. Static weight faces provide predictable native rendering; custom fonts keep accessibility scaling enabled.
