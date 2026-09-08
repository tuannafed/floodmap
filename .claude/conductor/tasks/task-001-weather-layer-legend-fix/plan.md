# Plan: Fix bottom-left radar/weather layer control buttons and legends

**Task:** task-001-weather-layer-legend-fix
**Type:** bug
**Lane:** tiny
**Created:** 2026-09-08T00:00
**Planner skills loaded via Skill tool:** create-specification (small path — bug with obvious single-phase-per-bug scope; escalation triggers for business-analyst/prd-development/user-story-splitting/prioritization-advisor/roadmap-planning did not fire)
**Rules read:** project.md (present), plan-discipline.md (present), migration-safety.md (not read — task touches no migration/DB object)
**Postmortems matched:** none (summary table in `pipeline-postmortems.md` has zero entries)

---

## Spec mandate

**Source:** user-provided bug report, this conversation, 2026-09-08 (no product spec exists for
this app per `plan-discipline.md` §1 "Bug fixes triggered by runtime errors ... Cite the bug
report ... instead of spec"). Every quote below was verified against the current file contents in
this session (see `file:line`), not taken on faith from the report.

### Phase: aqi-legend-fix
Classification: ✅ SPEC-BACKED
Bug report quote:
> "WeatherOverlay's conditional at MapView.tsx:956-968 renders `Legend` for `'rain'`, `WindLegend`
> for `'wind'`, `TemperatureLegend` for `'temp'`, but has no branch for `activeWeatherLayer ===
> 'aqi'`. Selecting "Chất lượng không khí" (air quality) leaves no legend box at all."
Verified file:line: `src/components/MapView.tsx:956-968` (confirmed in this session — the
conditional chain has exactly three branches: `'rain'` → `Legend`, `'wind'` → `WindLegend`,
`'temp'` → `TemperatureLegend`; no `'aqi'` branch exists, even though `WeatherLayer` in
`src/lib/weather.ts:1` is `'rain' | 'temp' | 'wind' | 'aqi'` and `LayerMenu.tsx:61-65` already
lets the user select `'aqi'`).

### Phase: radar-toggle-fix
Classification: ✅ SPEC-BACKED (problem statement)
Bug report quote:
> "clicking "Tạm dừng radar"/"Phát radar" while a non-rain layer is selected toggles the button
> and pulses a cosmetic "isPlaying" glow/ring on WindLegend/TemperatureLegend, but doesn't
> actually pause or animate anything real on the map."
Verified file:line: `src/components/MapView.tsx:521-525` (`isPlayingRadar` state),
`src/components/MapView.tsx:598-606` (frame-cycling `setInterval`, unconditional on
`activeWeatherLayer` — it always runs once `radarFrames` is loaded, regardless of which layer is
active), `src/components/MapView.tsx:615-617` (`tempUrl`/`windUrl`/`aqiUrl` are static
`owmTile(kind)` calls with no time/frame parameter), `src/app/api/owm-tiles/route.ts:1-108`
(proxy has no timestamp/frame handling at all — one static current-conditions tile per
z/x/y), `src/components/LayerMenu.tsx:75-91` (play/pause button rendered unconditionally,
not gated on `active`).

Classification: ⚠️ INFRA-CHOICE (which of the two fix options to take)
Why infra (not feature): the bug report explicitly asks the planner to "decide ... given the
actual data flow" rather than mandating an outcome. Verified in this session: OWM tiles
(`owmTile()` in `src/lib/weather.ts:11-14`, consumed by `src/app/api/owm-tiles/route.ts`) carry
no time dimension — one current-conditions raster per tile coordinate, cached 5 minutes
server-side. RainViewer (`getRadarTileUrl`, `fetchRainviewerTimeline`) is the only source that is
actually a sequence of frames. There is no real animated data to pause/play for `wind`/`temp`/
`aqi`, so "make the control functionally meaningful for other layers" (option b) would mean
fabricating an animation that does not exist upstream. Decision: **option (a)** — hide the
play/pause control (and the cosmetic pulse it drives) whenever `activeWeatherLayer !== 'rain'`.

---

## Spec

**Problem:**
1. Selecting "Chất lượng không khí" (AQI) in the bottom-left layer menu shows the AQI tile layer
   on the map but renders no legend box — the legend-switch conditional in `MapView.tsx` has no
   `'aqi'` branch.
2. The "Tạm dừng radar" / "Phát radar" play-pause button is always visible and always toggles
   `isPlayingRadar`, but that state only drives anything real when `activeWeatherLayer === 'rain'`
   (the RainViewer frame-cycling interval and the `rain-radar` tile source). For `wind`/`temp`/
   `aqi` — all static, single-frame OWM tiles — toggling the button does nothing to the map and
   only pulses a cosmetic glow/ring on `WindLegend`/`TemperatureLegend`, misleading the user into
   thinking something is animating.

**Solution:**
1. Add an `AqiLegend` component (same shape/pattern as `WindLegend`/`TemperatureLegend`: a
   `pointer-events-auto` rounded card with a title and a color-coded scale) and add the missing
   `activeWeatherLayer === 'aqi'` branch in `WeatherOverlay`'s legend switch in `MapView.tsx`.
2. Hide the play/pause button in `LayerMenu` when the active layer is not `'rain'` (pass
   `active` down, or a derived `canAnimate` boolean, so the control only renders for the one
   layer that actually animates). Remove the now-dead `isPlaying` prop and its pulse/ring markup
   from `WindLegend` and `TemperatureLegend` (they are single-consumer components — see
   `## Consumers` — and once the button that drives `isPlayingRadar` is hidden for their layers,
   the prop can never be `true` for them; keeping it would leave inert dead code, forbidden by
   `.claude/rules/common/coding-standards.md` "no hardcoded/speculative flexibility").

**Scope:**
- In:
  - New `AqiLegend` component + wiring into `MapView.tsx`'s legend switch.
  - Hiding the radar play/pause control for `wind`/`temp`/`aqi` layers.
  - Removing the dead `isPlaying` prop/pulse UI from `WindLegend` and `TemperatureLegend`.
- Out:
  - Adding real animation/timestamped data for OWM wind/temp/aqi tiles (no upstream source
    exists for this app's current OWM plan — out of scope, would be a feature not a bug fix).
  - Any change to the RainViewer radar animation logic itself (`radarFrameIdx` cycling,
    `rain-radar` source/layer wiring) — it already works correctly per the bug report.
  - Any change to `Legend.tsx` (rain legend) — not implicated by either bug.

## API Contract

Not applicable — this is a client-only UI bug fix. No API route, request/response shape, or
error code changes. `src/app/api/owm-tiles/route.ts` is read-only context for the INFRA-CHOICE
decision above; it is not modified by this task.

## Plan

```yaml
phases:
  - id: aqi-legend-fix
    description: "Add AqiLegend component and wire it into WeatherOverlay's legend switch"
    test_scenarios:
      - "Selecting 'Chất lượng không khí' in the layer menu renders a visible AQI legend box (not an empty gap) alongside the AQI map tiles"
      - "Switching from AQI to Rain/Wind/Temp and back does not duplicate or leave a stale AQI legend box mounted"
      - "npx tsc --noEmit and pnpm check:ci pass with no new errors"
    skills_hint: [next-best-practices, tailwind-design-system]
    depends_on: []

  - id: radar-toggle-fix
    description: "Hide the play/pause radar control outside the rain layer; remove the now-dead isPlaying pulse from WindLegend/TemperatureLegend"
    test_scenarios:
      - "With 'Lượng mưa' (rain) active, the play/pause button is visible and still toggles real radar frame-cycling exactly as before this change"
      - "Switching to 'Gió' (wind), 'Nhiệt độ' (temp), or 'Chất lượng không khí' (aqi) hides the play/pause button entirely — it is not merely disabled/greyed"
      - "WindLegend and TemperatureLegend render with no isPlaying prop, no pulse/ring markup, and no leftover unused prop/import (tsc + biome clean)"
      - "Switching back to 'Lượng mưa' from another layer re-shows the play/pause button in its correct isPlayingRadar state (not reset to a stale value)"
      - "npx tsc --noEmit and pnpm check:ci pass with no new errors"
    skills_hint: [next-best-practices, tailwind-design-system]
    depends_on: [aqi-legend-fix]

parallelization_groups:
  - [aqi-legend-fix]
  - [radar-toggle-fix]

missing_skills: []
```

Phases are sequenced (not parallel) because both touch `src/components/MapView.tsx`'s
`WeatherOverlay` function in overlapping regions (the legend-switch conditional sits directly
above the toggle-control wiring); running them in parallel risks two agents editing the same
~40-line block simultaneously.

## Consumers

Both bugs live in a small, single-consumer UI cluster: `LayerMenu`, `Legend`, `WindLegend`,
`TemperatureLegend` are each imported from exactly one place (`MapView.tsx`), and `MapView` in
turn has exactly one consumer (`page.tsx`). No other app/package/script touches any of these
symbols. Pasted below, not summarized.

```
$ grep -n "^export " src/components/LayerMenu.tsx
12:export function LayerMenu({

$ grep -rl "LayerMenu\|WindLegend\|TemperatureLegend" --glob '**/*.{ts,tsx}' .
src/components/MapView.tsx
src/components/LayerMenu.tsx
src/components/WindLegend.tsx
src/components/TemperatureLegend.tsx

$ grep -n "^import.*Legend" src/components/MapView.tsx
27:import { Legend } from './Legend'
28:import { WindLegend } from './WindLegend'
29:import { TemperatureLegend } from './TemperatureLegend'

$ grep -rl "WeatherOverlay\|MapView" --glob '**/*.{ts,tsx}' src
src/components/MapView.tsx
src/app/page.tsx
src/hooks/useRealtimeSOS.ts   # imports SosReport type only, not MapView/WeatherOverlay logic
src/components/SosPopup.tsx   # imports SosReport type only, not MapView/WeatherOverlay logic
```

| Consumer | Status | Note |
|---|---|---|
| `src/components/MapView.tsx` (`WeatherOverlay`) | cut-over | both phases — this is the only render site for the legend switch and the only place `isPlayingRadar`/`onToggleRadarPlay` are wired |
| `src/components/LayerMenu.tsx` | cut-over | phase `radar-toggle-fix` — gains the `active`/`canAnimate` gate on the play/pause button |
| `src/components/WindLegend.tsx` | cut-over | phase `radar-toggle-fix` — drops the dead `isPlaying` prop and pulse markup |
| `src/components/TemperatureLegend.tsx` | cut-over | phase `radar-toggle-fix` — drops the dead `isPlaying` prop and pulse markup |
| `src/components/Legend.tsx` | unaffected | rain legend, not implicated by either bug; its `isPlaying` prop stays because `'rain'` is the one layer that keeps the play/pause control |
| `src/app/page.tsx` | unaffected | consumes `MapView` only via `showWeather`/`center`/SOS props; does not reach into `WeatherOverlay`, `LayerMenu`, or any legend component |
| `src/hooks/useRealtimeSOS.ts`, `src/components/SosPopup.tsx` | unaffected | matched the `MapView` grep only because they import the unrelated `SosReport` type re-exported from `MapView.tsx`; no weather-layer code |

## Challenge

### Checklist

| # | Answer |
|---|---|
| 1 placeholder/default on hot path | n/a — no new default value introduced; the AQI branch is simply absent, not defaulting to a wrong value |
| 2 core-concept scope change | n/a — `WeatherLayer` stays `'rain' \| 'temp' \| 'wind' \| 'aqi'`; this task completes an already-declared union rather than changing its meaning. See risk `non-exhaustive-switch` below for the adjacent finding (the switch wasn't exhaustive against that union) |
| 3 write primitive on concurrent path | n/a — pure client `useState`, no ingestion/DB/queue path |
| 4 sequential → parallel | n/a — no batching/fan-out introduced |
| 5 free-text compared | n/a — `activeWeatherLayer` is a typed string-literal union, not free text |
| 6 exemption / skip-list | n/a — no allowlist/exemption pattern involved |
| 7 deploy ordering | n/a — no migration, DB object, or index touched |
| 8 postmortem match | none — `pipeline-postmortems.md` summary table has zero entries |
| 9 side effect after destructive step | n/a — no destructive operation in this change |

### Risks

| ID | Severity | Mitigation | Affects | Scenario added (HIGH only) |
|---|---|---|---|---|
| non-exhaustive-switch | MEDIUM | The legend-switch is a chain of independent `{cond && <X/>}` JSX blocks, not a TypeScript exhaustiveness-checked `switch`/lookup — that is *why* the `'aqi'` branch could go missing silently with no compiler error. Mitigation: implement the fix as a single lookup (`Record<WeatherLayer, ReactNode>` or a `switch` with a `never`-typed default) so adding a 5th `WeatherLayer` value in the future fails type-check instead of silently rendering nothing. | aqi-legend-fix | (not HIGH — no scenario required, but the "no stale/duplicate legend" scenario in that phase indirectly covers switch correctness) |
| dead-prop-after-hide | LOW | Removing the play/pause button for non-rain layers makes `WindLegend`/`TemperatureLegend`'s `isPlaying` prop permanently `false`-only; leaving it in place would be forbidden speculative flexibility. Mitigation: remove the prop and its pulse markup in the same phase (already in scope) rather than leaving it disconnected. | radar-toggle-fix | n/a (LOW) |

No HIGH risks identified — this is a self-contained, single-consumer client UI fix with no
auth/payment/data/migration/concurrency surface, consistent with `lane: tiny`.

### Gaps

- None identified. Both bugs and their fixes are fully traceable to code read in this session
  (see file:line citations above); no open question needs the user before implementation.

### ADRs needed

- None. The "hide vs. fake-animate" choice is recorded inline as an ⚠️ INFRA-CHOICE in `## Spec
  mandate` with its justification; it is a small, reversible, UI-only decision, not a stack/
  library/provider selection, weakened-validation change, or anything else in the
  `harness-contract.md` § ADRs trigger list. `lane: tiny` does not mandate an ADR (only `risky`
  does).

### Parallelization opportunities

- None — see "Phases are sequenced" note under `## Plan`. Both phases touch the same
  `WeatherOverlay` function in `MapView.tsx`; run `aqi-legend-fix` to completion before starting
  `radar-toggle-fix`.

## Revisions

(initial plan - none yet)
