# HeatSense design system

The maintained tokens are [theme.ts](../../../src/constants/theme.ts), [typography.ts](../../../src/constants/typography.ts) and [entry-theme.ts](../../../src/constants/entry-theme.ts). Earlier design proposals are archived; do not import the retired `design-system.ts` or `ds.tsx` modules.

## Color and type

| Role | Current token |
| --- | --- |
| Canvas | `Palette.canvas`: `#090B0C` |
| Surface | `Palette.surface`: `#131718` |
| Muted surface | `Palette.surfaceMuted`: `#1D2425` |
| Interactive surface | `Palette.interactive`: `#252B2C` |
| Primary text | `Palette.ink`: `#F4F0E8` |
| Supporting text | `Palette.inkMuted`: `#D6DAD6` |
| HeatSense peach | `Palette.coral`: `#FFB183` |
| Ice accent | `Palette.ice`: `#A9DCE8` |

Archivo700/800 supplies headings and metrics. Manrope600/700 supplies body text, labels and buttons. Fonts are bundled through the Expo Google Fonts packages; [license notices](../../../assets/fonts/licenses) remain with the project. Metric figures use tabular numerals where configured.

Heat-zone colors and calculations belong to [practice.ts](../../../src/lib/practice.ts) and [uil-wbgt.ts](../../../src/lib/uil-wbgt.ts). Do not change their colors, thresholds or chart behavior during presentation cleanup.

## Shared components

- [Text and input](../../../src/components/ui/text.tsx): bundled font resolution, readable supporting text and focus treatment.
- [ActionButton](../../../src/components/ui/action-button.tsx): primary peach, secondary dark, text and danger variants; busy/disabled semantics.
- [Surface](../../../src/components/ui/surface.tsx): shared black surfaces.
- [Data display](../../../src/components/ui/data-display.tsx): rows, facts, section titles and compact statistics.
- [Charts](../../../src/components/ui/charts.tsx): existing metric visuals.
- [Phone/modal framing](../../../src/components/layout/mobile-viewport.tsx): shared viewport bounds and explicit modal backdrops.
- [Motion](motion.md): motion implementation notes; current helpers in `src/lib/motion.ts` and `src/components/motion/` respect reduced motion.

Use visual hierarchy and concise labels. Retain safety-critical instructions, consent text and clear simulation disclosures. Keep forms in normal flow, touch targets comfortable, content above the system safe area and bottom actions reachable.
