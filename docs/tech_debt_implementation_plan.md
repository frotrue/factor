# Technical Debt Implementation Plan

Updated: 2026-05-21

## Current Debt Summary

The project is stable enough for feature iteration, but a few files still carry broad responsibility.

## Highest-Value Debt Items

### 1. UIManager Split

Current issue: `UIManager` coordinates HUD, tactical panels, build bar, research,
settings, mobile controls, wave text, and tooltips.

Suggested split:

- `TacticalPanelsUI`
- `BuildBarUI`
- `TooltipUI`
- keep `UIManager` as facade

Priority: Medium. Do this when adding more tactical panel states or tooltip work.

### 2. EffectsManager Split

Current issue: `EffectsManager` handles build effects, wave route hints, damage flashes, power warnings, buffer warnings, and inference locks.

Suggested split:

- `RouteEffects`
- `BuildingStatusEffects`
- `CombatEffects`

Priority: Medium. Do this when adding stronger damage/terrain visuals.

### 3. Save Migration Tests

Current issue: migration exists, but newer terrain/building HP compatibility needs deeper round-trip tests.

Add tests for:

- missing `terrainMap`
- missing building `hp`
- damaged building round-trip
- terrain blocker round-trip

Priority: High.

### 4. Balance Simulation

Current issue: production simulation exists, but combat/building destruction balance is mostly manual.

Add pure helpers where possible:

- expected wave HP
- expected building damage over time
- early defense survival estimates

Priority: Medium.

### 5. Type Tightening

Current issue: some manager boundaries still use `any`, especially event payloads and custom save state.

Targets:

- EventBus payloads
- Building custom state
- Training lab state
- save/load building state

Priority: Low to Medium.

## Recently Resolved Debt

- Config integrity tests
- Save migration defaults
- AP relay pure tests
- Tutorial flow pure tests
- Wave simulation pure tests
- Terrain blocker tests
- Enemy building target priority tests
- Playwright smoke tests across desktop/mobile
- `IMainScene` interface used by many building/manager boundaries
- Tactical panel smoke coverage for objective/wave UI
- Early-game research and advanced-logistics gate coverage

## Recommended Order

1. Add save compatibility round-trip tests.
2. Playtest and tune early damage pacing.
3. Extract `TacticalPanelsUI` if panel alert states increase `UIManager` size.
4. Improve building damage feedback.
5. Extract effects helpers if `EffectsManager` grows again.
