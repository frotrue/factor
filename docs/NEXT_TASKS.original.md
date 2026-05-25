# Next Tasks

Updated: 2026-05-23

## Immediate Priority

### 1. Playtest First 15 Waves

Goal: confirm that the realigned onboarding, tactical panels, research timing,
and enemy building attacks create tension without making the early game
frustrating.

Checklist:

- [ ] Normal Wave 1~5: one North Port defense line is enough for a new player.
- [ ] Normal Wave 6~10: damaged buildings are noticeable but recoverable.
- [ ] Normal Wave 11: East Port introduction is understandable.
- [ ] Research reveal after first defense feels like a reward.
- [ ] AP/Fiber/Fast Link/Unloader being delayed makes the early build choices clearer.
- [ ] Wave result summaries make factory growth feel connected to defense outcomes.
- [ ] Post-first-defense objectives make the expand-vs-defend tradeoff clear.
- [ ] Model Training Lab copy makes permanent model growth understandable.
- [ ] Firewall feels useful as a front-line blocker.
- [ ] Conveyor/Power Node destruction does not feel random or unfair.

Suggested tuning files:

- `src/config.ts`
- `src/enemies/BaseEnemy.ts`
- `src/managers/MapManager.ts`

### 2. Improve Damage Feedback

Goal: make "what is being attacked" obvious.

Tasks:

- [ ] Add a small building status chip for `UNDER ATTACK`.
- [ ] Add stronger destroyed-building feedback.
- [ ] Add log copy using localized building names.
- [ ] Consider a short pause/flash when a critical building is destroyed.

Suggested files:

- `src/managers/EffectsManager.ts`
- `src/managers/UIManager.ts`
- `src/i18n.ts`

### 3. Tune Tactical Panels

Goal: make the new objective, wave, defense, and power panels useful during real play without becoming noisy.

Tasks:

- [ ] Confirm panel placement does not hide critical tiles on desktop.
- [ ] Confirm mobile HUD remains readable with the systems panel hidden.
- [ ] Add stronger alert state when an active wave threatens buildings.
- [ ] Consider extracting panel rendering from `UIManager` if it grows further.

Suggested files:

- `src/managers/UIManager.ts`
- `src/styles/main.css`
- `tests/e2e/app-smoke.spec.ts`

### 4. Terrain UX Follow-Up

Goal: make BLOCKER terrain understandable.

Tasks:

- [x] Add tooltip or hover text for BLOCKER terrain.
- [x] Make BLOCKER visual distinct from resource patches and grid.
- [ ] Confirm generated blockers do not hide important early placement tiles.
- [ ] Consider a future research unlock for debris removal.

Suggested files:

- `src/managers/GridRenderer.ts`
- `src/controllers/InputController.ts`
- `src/managers/MapManager.ts`

## Medium Priority

### 5. Enemy Role Differentiation

Current enemies already have distinct stats and some special behavior. Next pass should make building interaction roles clearer.

- [ ] Noise: mostly Core pressure
- [ ] Malware: infection priority
- [ ] Adversarial: disrupt defense buildings
- [ ] DDoS: stress buffers/AP/data flow
- [ ] Overfitted Model: lane pressure and aura

### 6. Save Compatibility Tests

- [ ] Test old saves without `terrainMap`.
- [ ] Test old saves without building `hp`.
- [ ] Test damaged buildings round-trip through save/load.
- [ ] Test terrain blockers round-trip through save/load.

### 7. Code Structure Cleanup

- [ ] Consider extracting wave briefing DOM rendering from `UIManager`.
- [ ] Consider extracting route guidance drawing from `EffectsManager`.
- [ ] Keep `MainScene` as orchestration only when adding new systems.

## Lower Priority

- [ ] Save reset UI
- [ ] Itch.io/PWA packaging review
- [ ] Real device mobile QA
- [ ] Screenshots/GIFs for README after visual art stabilizes

## Recently Done

- [x] Fixed onboarding ports and wave route briefing.
- [x] Added BLOCKER terrain and early lane shaping.
- [x] Added building HP, damage, destruction, and cable cleanup.
- [x] Added enemy building attack priority.
- [x] Saved/loaded terrain and damaged building HP.
- [x] Removed arrows from installed buildings while keeping placement ghost arrows.
- [x] Added tactical objective, wave, defense, and power panels.
- [x] Delayed research and advanced logistics until after first defense success.
- [x] Updated high-impact building names toward cyber/data terminology.
- [x] Added BLOCKER data-debris visual treatment.
- [x] Added wave result summary with factory-growth feedback.
- [x] Added expand-vs-defend objective states after first defense.
- [x] Improved Model Training Lab permanent-growth copy.
- [x] Added game-over run stats.
- [x] Reduced early DDoS pressure and added building category accents.
