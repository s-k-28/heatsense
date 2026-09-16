# HeatSense

HeatSense is a heat-safety companion for school athletics. Its primary product is a WBGT compliance and practice-management experience; an optional wristband adds individual athlete context such as heart-rate recovery, skin-temperature trends, sweat response, and movement.

The wristband complements the environmental picture. The app remains useful without hardware and does not present itself as a medical diagnostic device.

## Current build

The current implementation contains the first production UI slice: a seven-page onboarding experience with:

- The warm cream and coral HeatSense design system
- Animated athlete and heart-signal visualization
- UIL-oriented WBGT risk presentation
- Coach-ready practice adjustments for work, rest, water, and equipment
- Reusable icon-led vital cards and miniature charts
- Movement context and the four-level alert behavior
- Coach, athletic trainer, and athlete role selection
- Working forward, back, skip, and completion navigation
- Reduced-motion support for purposeful chart and athlete transitions
- A documented PRD-to-interface review contract in `docs/ui-product-contract.md`

The completion screen intentionally marks the five-tab dashboard as the next build step rather than exposing unfinished product screens.

## Run locally

Requirements: Node.js 22.13 or newer and an Expo-compatible iOS Simulator, Android emulator, or Expo Go device.

```bash
npm install
npm run ios
```

Other targets:

```bash
npm run android
npm run web
```

## Verification

```bash
npx tsc --noEmit
npm run lint
npx expo install --check
```

## Architecture

- `src/app/` — Expo Router screens and navigation
- `src/components/onboarding-visuals.tsx` — reusable animated onboarding illustrations and data cards
- `src/components/heat-icon.tsx` — cross-platform symbol wrapper
- `src/constants/theme.ts` — HeatSense color, type, spacing, and radius tokens

Built with Expo 57, React Native, Expo Router, Reanimated, Expo Symbols, and React Native SVG.
