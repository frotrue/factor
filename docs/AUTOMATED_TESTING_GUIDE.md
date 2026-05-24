# Automated Testing Guide

Updated: 2026-05-23

## Commands

```powershell
npm test
npm run build
npm run test:e2e -- --workers=1
```

If Playwright browsers are missing:

```powershell
npx playwright install chromium
```

## Test Layout

### Vitest

Configured by `vitest.config.ts`.

Runs `src/**/*.test.ts`.

Current tests:

- `src/config.test.ts`
  - config references
  - building texture references
  - Core footprint
  - positive HP for every building
  - terrain BLOCKER config
- `src/i18n.test.ts`
  - language defaults and key behavior
- `src/buildings/BaseBuilding.test.ts`
  - base building behavior
- `src/managers/EventBus.test.ts`
  - owner/callback removal
- `src/managers/EffectsManager.test.ts`
  - warning marker behavior
- `src/managers/MapManager.test.ts`
  - terrain blocker creation and safe generated blockers
- `src/utils/apRelay.test.ts`
  - AP relay source/target policy
- `src/utils/enemyBuildingInteraction.test.ts`
  - enemy building target priority
- `src/utils/powerPreview.test.ts`
  - power coverage helper behavior
- `src/utils/productionSimulation.test.ts`
  - long-running production loop simulation
- `src/utils/saveMigration.test.ts`
  - save defaults, buffers, HP, terrain, settings
- `src/utils/tutorialFlow.test.ts`
  - tutorial order and progress
- `src/utils/waveSimulation.test.ts`
  - wave counts, difficulty, DDoS/boss pressure, route policy, wave briefing
- `src/utils/waveResultSummary.test.ts`
  - wave-end summary math and readable lines
- `src/utils/progressionGates.test.ts`
  - first-loop objective order and early advanced-system gating
- `src/utils/modelTrainingSummary.test.ts`
  - permanent model-training input effects and target summary copy
- `src/utils/runResultSummary.test.ts`
  - game-over/run result summary math

### Playwright

Configured by `playwright.config.ts`.

Runs `tests/e2e/app-smoke.spec.ts`.

Projects:

- `desktop-chromium`
- `mobile-portrait`
- `mobile-landscape`

Covered flows:

- app startup
- camera centering
- settings/research modal smoke
- language switch
- desktop placement/cable/remove
- hotkeys and overlays
- save smoke
- mobile action bar and touch placement
- tactical objective and wave panel startup smoke
- research/advanced-logistics early-game gating smoke
- Unloader early-game gating smoke
- wave result summary render smoke

## E2E Notes

- Main menu and game field are Phaser canvas areas, so tests use coordinate clicks where needed.
- DOM UI readiness should be checked before clicking DOM buttons.
- The game exposes `window.__NEURAL_FACTORY_GAME__` for smoke assertions.
- Keep Playwright tests under `tests/e2e/**`; Vitest should only collect `src/**/*.test.ts`.
- Use `--workers=1` for the reliable local baseline. Full parallel e2e may be
  sensitive to browser startup timing and audio unlock behavior.

## When Adding Tests

Prefer Vitest when behavior can be isolated:

- route policy
- terrain generation
- save migration
- AP relay choice
- enemy target priority
- research/config relationships

Use Playwright when the behavior depends on canvas + DOM interaction:

- placement through real pointer input
- mobile action controls
- modal focus behavior
- startup smoke

## Current Verification Baseline

As of 2026-05-21, the expected clean result is:

- `npm test`: all Vitest tests pass
- `npm run build`: Vite production build succeeds
- `npm run test:e2e -- --workers=1`: desktop/mobile smoke tests pass, with expected project-specific skips
