# Comprehensive Diagnostic Report

Updated: 2026-05-21

## Overall Assessment

The project is in a functional prototype state with a meaningful automated safety net. Core gameplay systems are connected, and recent work improved onboarding and combat readability. The next stage should focus on playtest-driven tuning rather than adding many new systems.

## Current Health

| Area | Status | Notes |
| --- | --- | --- |
| Core loop | Implemented | Data pipeline to Confidence Score works. |
| Logistics | Implemented | Conveyor, cable, Fiber, AP relay are available. |
| Power | Implemented | Networks, range, blackout state, overlays. |
| Defense | Implemented | Towers, model confidence, waves, special enemies. |
| Terrain | Implemented | BLOCKER terrain shapes early lanes. |
| Building damage | Implemented | HP, damage, destruction, cable cleanup. |
| Save/load | Implemented | Includes terrain and building HP. |
| Mobile | Baseline implemented | Needs physical device QA. |
| Tests | Good baseline | Vitest + Playwright smoke. |
| Balance | Needs playtest | Damage and wave pressure need real runs. |

## Important Technical Details

### Save Version

`CURRENT_SAVE_VERSION` is `1.1.0`. Current save data includes:

- wave state
- Core state
- buildings and building HP
- items
- cables
- terrain map
- resource map
- research
- settings
- tutorial state

### Combat Lanes

Normal mode uses a guided opening:

- Wave 1~10: North Port
- Wave 11+: North + East

This is implemented in `src/utils/waveSimulation.ts`.

### Enemy Building Attacks

Enemy target priority is implemented in `src/utils/enemyBuildingInteraction.ts`:

1. Firewall
2. Classifier / Filter
3. Other non-Core buildings

Core damage still uses the existing Core damage/game-over path.

### Terrain

`MapManager` owns:

- `resourceMap`
- `terrainMap`

BLOCKER terrain blocks both building placement and enemy pathing.

## Main Risks

### Balance

The combination of building destruction and terrain blockers can create strong pressure. This is valuable, but it needs tuning.

### UX Clarity

Damage, route, terrain, and production state can compete visually. The next UX pass should separate these into clearer layers.

### Large Coordination Classes

`MainScene`, `UIManager`, and `EffectsManager` are broad. Future work should keep new logic in small helpers when practical.

## Recommended Verification

Before merging feature work:

```powershell
npm test
npm run test:e2e
npm run build
```

Before changing wave/combat balance:

- Run Normal Wave 1~15 manually.
- Record building losses and failure points.
- Compare Easy/Normal/Hard early wave pressure.

## Conclusion

The project is ready for a focused balance/UX pass. Avoid adding major new content until the current terrain, building damage, and onboarding combat flow are tuned through playtesting.
