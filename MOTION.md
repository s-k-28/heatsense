# MOTION.md: living illustrations in this project

> HeatSense's motion notes. Part 1 is the rossark-motion-skill method and stays as it is. Part 2 is this project's rules and overrides Part 1.

---

## Part 1. The method

**The goal:** anything drawn (a character, a plant, a flame, a street, a logo, a chart) feels alive and calm. Nothing teleports, nothing bounces, nothing shouts.

### Principles
1. **Never teleport:** interpolate everything; never swap drawings.
2. **Calm by default:** strong curves, no bouncy overshoot.
3. **Small amplitudes:** when unsure, halve it.
4. **Arcs and pivots:** each moving part is a layer rotating around its joint (stem base, hinge, neck, hook).
5. **Overlap and follow-through:** tips and trailing parts move later and further; give each part the same wave with a growing phase delay.
6. **Variety without chaos:**
   - repeated items get a seeded phase, speed and size;
   - nothing moves in sync, and there's no random value per frame.
7. **One main action per scene, plus two or three idle loops.** Side things stay quiet.
8. **Opacity only to appear or disappear.**
9. **The layout never moves:** motion lives inside the drawing.
10. **Reduced motion:** loops freeze on a good frame 0, and one-shots show their final frame.
11. **Nothing runs unseen:** pause off screen, when hidden and in the background.
12. **Enough frames:** anything under ~100 ms flickers at 30 fps; render and export at 60 when you can. Blinks close in ~110 ms and reopen in ~190 ms.
13. **Interface rules:**
    - frequency decides how much (often seen = barely moves; rare moments get the delight);
    - every motion has a purpose;
    - shared elements travel, never teleport;
    - interface moves stay under 300 ms;
    - exits are faster than entrances;
    - nothing appears from scale 0;
    - interruptions continue from the current value.

### The engine
- **Clocks:** a loop clock for idle life, a one-shot clock for a scene that tells an action. One per character, group or scene.
- **Tracks:** keyframes `[ms, value, 'out'?]` read with `track(t, keys)`. The last key equals the first. `track` stops at every key, so use it for one move (a blink, a lid). For acting (a chain of poses), use `flow(t, keys)`, which passes through the keys without stopping and never overshoots.
- **Helpers:**
  - `wave` (−1 to 1), for sway and breathing;
  - `loop` (0 to 1), for drift and falling;
  - `bell`, to fade in and out;
  - `seg`, for one beat of a one-shot;
  - `seeded(i)`, for per-item variety.
- **Curves:**
  - travel uses ease-in-out `(0.77, 0, 0.175, 1)`;
  - open and arrive use ease-out `(0.23, 1, 0.32, 1)`;
  - leaving uses ease-in;
  - endless loops are linear.

### Quick recipes
| Subject | Recipe |
|---|---|
| Character | breathing 1–2 units over 3–5 s; a blink every 3–4 s; pupils glide; head tilt 3–6° |
| Waiting to be tapped | a jiggle every ~270 ms: squash 2%, widen 2%, the bulge trading sides |
| Floating figure | rises in from 30% of its height below, drifts 5% down and up, leaves rising |
| Tail, hair, ears | rotation around the root, phase delayed along the chain, 4–10° |
| Plant | sway 1.5–4° around the base over 3–6 s; leaves on seeded phases |
| Cloth, flag | a wave that travels along the length, growing away from the fixed edge |
| Fire | a lean of 2–4° and a 3–6% stretch on two waves of different periods |
| Smoke, steam | rises 8–14 units and fades in and out with `bell` |
| Water | ripples grow and fade; floating things bob 1–2 units and rock 2° |
| Rain, snow | seeded `loop`s; snow sways sideways |
| Sky | clouds drift over 20–60 s with parallax; sun rays take 30–60 s per turn |
| Lights | a glow of 2–5% over 2–4 s; stars twinkle at seeded times |
| Machines | gears turn linearly by ratio; a clock hand steps with ease-out |
| Phone | ±3° bursts, then a pause |
| Icon, logo | plays once on appear, then rests |
| Chart | a one-shot draw-on, with bars staggered 40–80 ms |

### Acting (a whole character)
- **Every channel:** key pose (`flow`) + idle (`wave`s, never off while on stage) + follow-through (the parent read 90–140 ms earlier) + accents (a `wave` inside a `seg` window).
- **Arms:** an upper arm and a forearm share a round elbow; the forearm points at shoulder angle + elbow bend.
- **Head turns:** slide the face toward the turn (eyes 10, nose 13 in a 100-wide head) and the ears the other way. Blink on the turn.
- **Weight:** the hips shift and carry the upper body, and the legs angle to keep the feet under it.
- **Landing:** hover, then fall with gravity and stretch; squash hard (0.8) on contact and keep the volume (`width = 1 / height^0.6`).
- **In the air:** limp feet (toes down, one knee folded, trading slowly). The shadow stays on the floor and scales with the height.
- **Props:** enter from off screen already moving and roll by distance / radius. The eyes follow them. A kick hits at the middle of the swing; the prop leaves as a throw, spinning, with a short squash.
- **Asymmetry:** the arms never mirror each other.
- **Camera:** a view from a little above is a whole build, not a tweak: the head is 40–50% of the height, the torso is short and narrower than the head, the legs are short, the feet are round from above, and the shadow is a wide oval with the feet in its lower half. Keep it in one `build` object. A flat view keeps a thin pill shadow.
- **Framing:** on a phone, as big as the screen allows, with the feet low.

### From a reference video
- Contact sheets at the full frame rate (`tools/sheet.sh`).
- Measure motion with numbers (`tools/track_edges.py`): a 2% jiggle or a 5% float doesn't show to the eye.
- Sample colors from pixels (`tools/sample_colors.py`).
- Go part by part: feet, shadow, hands, head.
- Compare proportions as ratios of one unit (head widths). "Stretched" means a ratio is far off.
- Compare your render with the reference at the same moments.
- Don't publish a copy of someone else's art.

### Performance
- Everything is a function of one clock's time.
- Draw many items in one SVG or `Canvas`.
- Reset repeating animations to 0 before starting, and cancel them on cleanup.
- Declare curves at the top of the module.

### Workflow
1. Read Part 2 and the art file's header comments.
2. List what could live in the drawing.
3. Pick one main action and two or three idle loops.
4. Split the art into layers at their pivots.
5. Put the numbers in tokens.
6. Check frame 0, the final frames and the loop seams. For a character, look at a contact sheet of every 4th frame of your own render.
7. Run the checks.
8. Hand off: what moves, and what hasn't been seen on a real device.

---

## Part 2. This project

### Where the code is
- **Platform:** React Native 0.86 (Expo SDK 57), Reanimated 4.5, react-native-svg.
- **Motion engine:** `src/lib/motion-engine.ts` (clocks, `track`/`flow`, `wave`, `seg`, `seeded`, curves). Interface helpers built on it live in `src/lib/motion.ts` (`enter`, `leave`, `settle`, `swap`) and `src/components/motion/` (sliding segmented control, press scale, draw-on fills, the floating band, the heartbeat dot).
- **Art:** the HeatSense Band render (`assets/images/heatsense-band-refined.png`, `wristband-hero.webp`) is one flat image: it can float, tilt and cast a breathing shadow, nothing inside it moves. Charts are react-native-svg paths and plain Views.
- **Existing pieces to copy from:** `src/components/band-journey.tsx` (the onboarding band flies between screens, 700 ms, ease (0.77, 0, 0.175, 1)).

### The owner's rules
- "It needs to feel ALIVE" and "NO TELEPORTING in the animation" (onboarding, Oct 2026).
- "Use the animation motion skill for all of the screens, apply it throughout the entire app" (Oct 23, 2026).
- "Make sure that it's actually looking very clean and elegant ... not vibe coded" (Oct 23, 2026): calm, small, purposeful; nothing decorative on screens people use all day.
- Welcome and onboarding design belong to Saatvik: motion there changes only to fix bugs.

### Interface decisions (HeatSense)
| What | Motion | Why |
|---|---|---|
| Live numbers (heart rate, countdowns, timers) | none: they change in place | updated every second; motion would jitter |
| Charts (lines, sparklines, bars, zone bars) | draw on once when they appear (lines trace, bars grow from the base, 40 ms stagger), then hold | shows the data arriving; never redraws on each update |
| Progress fills (effort, battery, immersion clock, readiness) | grow from the left; later changes glide (600 ms ease-out) | continuity: a value moves, it never jumps |
| Segmented controls | the selected pill slides to the tapped option (220 ms ease-in-out) | shows where the selection went |
| Zone scale | the lit segment travels to the new zone and changes color on the way | the field changing zone is the most important state change |
| WBGT reading | glides from the old reading to the new one (700 ms ease-out) | rare, meaningful change |
| Press | 0.97 scale on buttons, tiles and cards (120 ms in, 160 ms out) | confirms the touch |
| Checks | the tick pops in from 0.9 | confirms the step |
| The band render (empty states, device card) | floats: 1.5% bob over 3.6 s, ±1.2° tilt over 5.2 s, shadow breathing with the height | the product is alive; only on rare screens |
| Live status dots on Monitor | beat at the athlete's heart rate (a small 18% pulse) | says the tile is live |
| Header, tab bar | still | chrome people see constantly |

### Rig limits
- The band is one flat image: no separate pod or strap layers.
- Charts are drawn in View or SVG coordinates that change with layout, so draw-ons start after `onLayout`.

### How changes are checked
- iOS Simulator (iPhone 17 Pro Max) with Maestro screenshots; sample mode for data.
- `npx tsc --noEmit`, `npx eslint src`, `node scripts/check-*.ts`, `npm run test:invites`.
- Reduce Motion on: every screen must read at its final frame.

### Oct 23 dashboard refinement
- Applied the installed Rossark skill to the existing engine; no second animation library.
- Loop eligibility now follows app active state, route focus and live Reduce Motion changes (`motion-activity.ts`). Orb repeats reset explicitly; SVG gradient IDs are per instance.
- Reading lists appear immediately, without a second cascade after section transitions. Their mutation layout still settles. Profile sections fade once over 180 ms; Monitor sparklines trace once over 280 ms, then live samples update in place.
- Shared action buttons retain 120/160 ms press feedback; unused spinner slots no longer squeeze labels. Alerts and Plan Editor use these controls.
- Captured Metro-backed iPhone 17 Pro Max recordings in `~/HeatSense-motion-review-2026-10-23/`. Orb recording spans over one 8-second shape cycle. Profile recording covers Overview → Settings → Overview; its frame review prompted removal of nested row arrival staggering afterward.
- Limitations: no measured 60-fps performance claim; simulator recordings use variable frame rate. Large-text/physical-device matrix and scroll-viewport loop culling remain unverified. App background/route focus gating is implemented, not a claim that every scrolled-off illustration is culled.
