# Next Tasks

Updated: 2026-05-21

## Immediate Priority

### 1. Playtest Building Damage Balance

Goal: confirm that enemy building attacks add tension without making the early game frustrating.

Checklist:

- [ ] Normal Wave 1~5: one North Port defense line is enough for a new player.
- [ ] Normal Wave 6~10: damaged buildings are noticeable but recoverable.
- [ ] Normal Wave 11: East Port introduction is understandable.
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

### 3. Wave Briefing Panel

Goal: move route/threat/recommendation text out of the cramped wave timer.

Tasks:

- [ ] Add a compact "Next Wave" panel.
- [ ] Show port, threat level, special threat, recommended defense.
- [ ] Keep current timer display short.
- [ ] Add Playwright smoke coverage for the panel.

Suggested files:

- `src/managers/UIManager.ts`
- `src/styles/main.css`
- `tests/e2e/app-smoke.spec.ts`

### 4. Terrain UX

Goal: make BLOCKER terrain understandable.

Tasks:

- [ ] Add tooltip or hover text for BLOCKER terrain.
- [ ] Make BLOCKER visual distinct from resource patches and grid.
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

- [ ] Game-over stats screen
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
