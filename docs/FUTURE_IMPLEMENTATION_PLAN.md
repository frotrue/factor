# Future Implementation Plan

Updated: 2026-05-21

## Progress Log

### 2026-05-21

- Updated active documentation to match current implementation.
- Clarified that installed buildings no longer show extra direction arrows, while placement ghosts still do.

### 2026-05-20

- Added onboarding intrusion ports and wave briefing metadata.
- Added route guidance overlays for active ports.
- Added BLOCKER terrain and early North Port lane shaping.
- Added building HP, damage, destruction, and cable cleanup.
- Added enemy building attack target priority.
- Added terrain and damaged building HP save/load support.
- Added tests for terrain, enemy targeting, wave briefing, and save migration.
- Verified `npm test`, `npm run test:e2e`, and `npm run build`.

### 2026-05-19

- Hardened UI/UX: modal focus, tooltip clamping, blackout/buffer warnings, placement previews.
- Added Playwright and Vitest coverage for the main smoke paths.

### 2026-05-18

- Added Korean-first language support and settings language switch.
- Added camera centering regression coverage.
- Added save migration coverage.

### 2026-05-17

- Added Vitest and Playwright baseline testing.
- Added AP relay tests, tutorial flow tests, wave simulation tests, and production simulation tests.
- Exposed `window.__NEURAL_FACTORY_GAME__` for Playwright assertions.

## Near-Term Plan

### Phase 1: Balance And Readability

- Manual playtest Normal Wave 1~15.
- Tune building HP and enemy attack damage.
- Tune North Port blocker layout.
- Improve building "under attack" and destroyed feedback.
- Move next-wave briefing into a dedicated compact panel.

### Phase 2: Save/Load Hardening

- Add explicit tests for old saves without `terrainMap`.
- Add tests for old saves without building `hp`.
- Add round-trip save tests for damaged buildings and terrain blockers.
- Decide whether to bump `CURRENT_SAVE_VERSION` after the next compatibility pass.

### Phase 3: Terrain And Enemy Roles

- Add optional debris removal after research.
- Add positive terrain such as Signal Conduit.
- Make enemy roles more explicit:
  - Noise: Core pressure
  - Malware: infection
  - Adversarial: defense disruption
  - DDoS: logistics/buffer pressure
  - Overfitted Model: lane and aura pressure

### Phase 4: UX Finish

- Add game-over stats.
- Add reset-save UI.
- Add screenshots/GIFs after art stabilizes.
- Verify on physical mobile devices.

## Current Technical Debt

- `MainScene`, `UIManager`, and `EffectsManager` are still broad orchestration files.
- Some archived docs contain historical mojibake text.
- Manual balance data is still missing for building destruction.
- Wave briefing UI is functional but too compressed in the timer area.

## Do Not Prioritize Yet

- New tower types before current combat economy is tuned
- Large visual redesign while building art is still in progress
- Deep save-version migration work before the next save compatibility test pass
