# Next Tasks

Updated: 2026-05-23

## Immediate Priority

### 1. Playtest First 15 Waves

Goal: verify realigned onboarding, tactical panels, research timing, enemy building attacks create tension without early frustration.

Checklist:

- [ ] Normal Wave 1~5: one North Port defense line enough for new player.
- [ ] Normal Wave 6~10: damaged buildings visible but recoverable.
- [ ] Normal Wave 11: East Port intro understandable.
- [ ] Research reveal after first defense feels rewarding.
- [ ] Delayed AP/Fiber/Fast Link/Unloader clarifies early build choices.
- [ ] Wave summaries connect factory growth to defense outcomes.
- [ ] Post-first-defense objectives clarify expand-vs-defend tradeoff.
- [ ] Model Training Lab copy explains permanent model growth.
- [ ] Firewall useful as front-line blocker.
- [ ] Conveyor/Power Node destruction feels fair, not random.

Suggested tuning files:

- `src/config.ts`
- `src/enemies/BaseEnemy.ts`
- `src/managers/MapManager.ts`

### 2. Improve Damage Feedback

Goal: make attacked targets obvious.

Tasks:

- [ ] Add small building status chip for `UNDER ATTACK`.
- [ ] Add stronger destroyed-building feedback.
- [ ] Add log copy with localized building names.
- [ ] Consider short pause/flash when critical building destroyed.

Suggested files:

- `src/managers/EffectsManager.ts`
- `src/managers/UIManager.ts`
- `src/i18n.ts`

### 3. Tune Tactical Panels

Goal: keep objective/wave/defense/power panels useful in real play, not noisy.

Tasks:

- [ ] Confirm panel placement does not hide critical desktop tiles.
- [ ] Confirm mobile HUD readable with systems panel hidden.
- [ ] Add stronger alert state when active wave threatens buildings.
- [ ] Consider extracting panel rendering from `UIManager` if it grows.

Suggested files:

- `src/managers/UIManager.ts`
- `src/styles/main.css`
- `tests/e2e/app-smoke.spec.ts`

### 4. Terrain UX Follow-Up

Goal: make BLOCKER terrain understandable.

Tasks:

- [x] Add tooltip/hover text for BLOCKER terrain.
- [x] Make BLOCKER distinct from resources + grid.
- [ ] Confirm generated blockers do not hide important early placement tiles.
- [ ] Consider future research unlock for debris removal.

Suggested files:

- `src/managers/GridRenderer.ts`
- `src/controllers/InputController.ts`
- `src/managers/MapManager.ts`

## Medium Priority

### 5. Enemy Role Differentiation

Enemies have distinct stats + some specials. Next pass: clearer building-interaction roles.

- [ ] Noise: mostly Core pressure
- [ ] Malware: infection priority
- [ ] Adversarial: disrupt defense buildings
- [ ] DDoS: stress buffers/AP/data flow
- [ ] Overfitted Model: lane pressure + aura

### 6. Save Compatibility Tests

- [ ] Test old saves without `terrainMap`.
- [ ] Test old saves without building `hp`.
- [ ] Test damaged buildings save/load round-trip.
- [ ] Test terrain blockers save/load round-trip.

### 7. Code Structure Cleanup

- [ ] Consider extracting wave briefing DOM rendering from `UIManager`.
- [ ] Consider extracting route guidance drawing from `EffectsManager`.
- [ ] Keep `MainScene` orchestration-only when adding systems.

## Lower Priority

- [ ] Save reset UI
- [ ] Itch.io/PWA packaging review
- [ ] Real device mobile QA
- [ ] Screenshots/GIFs for README after visual art stabilizes

## Recently Done

- [x] Fixed onboarding ports + wave route briefing.
- [x] Added BLOCKER terrain + early lane shaping.
- [x] Added building HP, damage, destruction, cable cleanup.
- [x] Added enemy building attack priority.
- [x] Saved/loaded terrain + damaged building HP.
- [x] Removed installed-building arrows, kept placement ghost arrows.
- [x] Added tactical objective, wave, defense, power panels.
- [x] Delayed research + advanced logistics until first defense success.
- [x] Updated high-impact building names toward cyber/data terms.
- [x] Added BLOCKER data-debris visual treatment.
- [x] Added wave result summary with factory-growth feedback.
- [x] Added expand-vs-defend objective states after first defense.
- [x] Improved Model Training Lab permanent-growth copy.
- [x] Added game-over run stats.
- [x] Reduced early DDoS pressure + added building category accents.
