# Autopilot Implementation Plan

Updated: 2026-05-23

Purpose: Convert the current direction realignment into small, sequential,
code-implementable work for Oh My Codex Autopilot.

Source evidence:

- `docs/CONCEPT.md`
- `docs/DIRECTION_REALIGNMENT_PLAN.md`
- `docs/PROJECT_ANALYSIS_AND_ROADMAP.md`
- `docs/AUTOMATED_TESTING_GUIDE.md`
- `src/config.ts`
- `src/scenes/MainScene.ts`
- `src/managers/UIManager.ts`
- `src/managers/ResearchUI.ts`
- `src/managers/TrainingLabUI.ts`
- `src/buildings/ModelTrainingLab.ts`
- `src/buildings/DefenseTower.ts`
- `src/utils/waveSimulation.ts`
- `tests/e2e/app-smoke.spec.ts`

## 1. Final Project Direction Summary

Neural Factory should target **factory automation 60 / tower defense 40**.

The player fantasy is:

```text
Build a data factory -> make defense-growth material -> survive intrusion waves
-> spend growth on research and model training -> strengthen defensive systems
-> expand the factory under stronger wave pressure
```

The core commercial direction is not pure Factorio and not pure tower defense.
The strongest identity is a compact cyber factory-defense game where production
decisions become permanent defensive growth.

Primary player decision:

- Expand the factory for stronger long-term growth, or invest immediately in
  defense to survive the next wave.

Secondary player decision:

- Choose which defense model to train first: Classifier, Anomaly Engine, or
  Firewall.

Visual target:

- 60% serious cyber terminal
- 20% cute/readable mini-factory clarity
- 20% hard-SF data-center physicality

## 2. Core Game Loop

Implementation should preserve and clarify this loop:

1. Player places data intake and basic processing.
2. Data pipeline creates `Signal Packet`, `Labeled Data`, and `Weight Update`.
3. Core receives data and generates `Confidence Score`.
4. Player places a readable defense line against the next intrusion route.
5. First successful defense opens research.
6. Player chooses between more production, more defense, or model growth.
7. `Model Training Lab` turns factory output into permanent defense model power.
8. Stronger waves force better expansion and defense specialization.

The early game should teach only:

- Core must be protected.
- Data flow matters.
- Defense placement matters.
- Research/model growth is the reward after survival.

## 3. Features To Keep

Keep these systems and avoid rewrites unless a step below explicitly touches
them:

- Core, data items, and Confidence Score.
- `Data Downloader`, `Processor`, `Weight Trainer`.
- `Model Training Lab` and shared defense model state.
- `Classifier`, `Anomaly Engine`, `Firewall`.
- Fixed intrusion ports and wave briefing.
- BLOCKER terrain and North Port onboarding lane.
- Research reveal after first successful defense.
- Save/load, save migration, language toggle, tutorial state.
- Desktop and mobile smoke coverage.

## 4. Features To Remove Or Reduce

Do not delete these systems in the first pass. Reduce their early importance and
make them support the factory-defense loop.

- Physical resource logistics:
  - `Conveyor`, `Fast Link`, `Unloader`.
  - Keep for midgame or optional expansion.
  - Do not make them the first lesson.
- Power-grid optimization:
  - Keep power warnings and basic coverage.
  - Do not increase blackout/grid puzzle complexity.
  - Early power should be mostly supportive.
- AP/Fiber:
  - Keep as midgame convenience and expansion.
  - Do not make AP wireless routing the core early puzzle.
- Overlapping buffers:
  - `Storage`, `Data Cache`, `Recycler` should be clarified before more buffer
    buildings are added.

## 5. New Features To Implement

Implement these as small additions, not a full rewrite:

- Wave result summary showing how factory growth helped defense.
- Clearer model-training payoff in UI and effects.
- Stronger expand-vs-defend decision prompts in current objective and wave
  panels.
- Game-over/run result screen with useful stats.
- Early-game exposure rules that keep physical logistics and power optimization
  secondary.
- First-pass visual readability improvements through labels, icons, simple
  accents, and existing effect hooks.

## 6. UI/UX Improvement Work

Goals:

- Make the current objective tell the player what strategic choice matters next.
- Make model growth visible without opening several modals.
- Make wave outcomes teach the factory-defense connection.
- Keep Korean-first UI and English translations in sync.

Required UI changes:

- Add a compact wave result summary panel or notification after each wave.
- Add "factory growth vs defense investment" wording to objective states after
  the first defense.
- Add model-training status to the defense status panel when unlocked or when a
  Model Training Lab exists.
- Improve `TrainingLabUI` copy so the selected target, input need, and permanent
  effect are obvious.
- Improve game-over modal with run stats instead of only restart.
- Keep mobile layout readable; avoid adding another persistent mobile panel if
  existing space is not enough.

## 7. Graphics And Art Direction Improvement Work

Do not do a full art reset. Work in low-risk passes:

- Use existing building PNGs where available.
- For buildings without strong texture support, add simple category accents or
  status visuals rather than large new assets first.
- Improve visual separation between:
  - production buildings
  - defense buildings
  - power buildings
  - logistics buildings
- Strengthen model-training feedback using existing `EffectsManager` patterns.
- Keep dark cyber terminal styling, but improve readability at 32x32 and 64x64.
- Avoid adding large illustration work before the first 15-minute loop is tuned.

## 8. Game Balance Improvement Work

Balance target:

- Waves 1-3 teach defense placement.
- Waves 4-7 create expand-vs-defend pressure.
- Wave 8 introduces special pressure without surprise unfairness.
- Wave 10 boss checks whether the player invested in growth and defense.
- Wave 11 route expansion should feel like a fair escalation.

Tuning priorities:

- Make early defense viable without model training.
- Make midgame defense noticeably better with model training.
- Make pure defense spam weaker than a working data-growth economy by midgame.
- Keep power outages punishing but not the first major failure cause.
- Keep building damage readable before increasing enemy structure damage.

## 9. Code Structure Improvement Work

Avoid large refactors. Extract only where it directly supports the planned
features.

Preferred small helpers:

- `src/utils/waveResultSummary.ts`
  - Pure functions for wave/run summary calculations.
- `src/utils/progressionGates.ts`
  - Pure functions for early/midgame visibility gates if UI gating grows beyond
    current inline checks.
- Optional `src/utils/modelTrainingSummary.ts`
  - Pure formatting/math for model training effect summaries if needed.

Do not split `MainScene`, `UIManager`, or `EffectsManager` broadly in this pass.
Only add small helpers when tests can cover them.

## 10. Test And QA Plan

Use the existing test baseline:

```powershell
npm test
npm run build
npm run test:e2e -- --workers=1
```

Add or update tests by risk:

- Vitest:
  - wave result summary calculation
  - progression gates for early/midgame build visibility
  - model-training summary math/copy helpers if extracted
  - wave tuning config or simulation expectations
- Playwright:
  - wave result summary appears after a simulated wave end
  - research/model training UI remains reachable
  - early advanced logistics gating still hides AP/Fast Link/Fiber
  - mobile startup and action controls remain usable
- Manual QA:
  - Play Normal Wave 1-10.
  - Record first failure point.
  - Record whether the player can understand why data growth matters.
  - Confirm Wave 11 second route is readable.

## 11. Autopilot Execution Order

Autopilot should execute in this order. Do not merge steps unless a step is
trivially required by the previous one.

### Step 1: Add Wave Result Summary Foundation

Intent:

- Give the player feedback that connects factory growth, defense, and survival.

Checklist:

- [ ] Add pure summary helper for wave outcome data.
- [ ] Track enough runtime stats to show a useful result:
  - wave number
  - enemies destroyed
  - Core HP or damage taken
  - Confidence Score gained during the wave or since previous wave
  - buildings destroyed or damaged if already available
- [ ] Display a concise summary after `WAVE_ENDED`.
- [ ] Keep summary non-blocking.
- [ ] Add Korean and English text.

Expected files:

- `src/utils/waveResultSummary.ts`
- `src/utils/waveResultSummary.test.ts`
- `src/scenes/MainScene.ts`
- `src/managers/UIManager.ts`
- `src/i18n.ts`
- `tests/e2e/app-smoke.spec.ts`

Completion conditions:

- Summary appears after wave completion.
- Summary does not cover essential controls.
- Summary explains at least one production/growth signal, not only kill count.
- Existing startup, placement, save, and modal flows still pass.

Test commands:

```powershell
npm test
npm run build
npm run test:e2e -- --workers=1
```

Rollback or stop criteria:

- Stop if wave stats require invasive enemy/combat rewrites.
- Roll back to a simpler summary if UI placement breaks mobile layout.

### Step 2: Clarify Expand-Vs-Defend Objective Flow

Intent:

- Make the main decision visible: expand production or invest in defense.

Checklist:

- [ ] Update objective logic after first defense.
- [ ] Add objective states for:
  - build more data production
  - add/upgrade defense before next wave
  - choose model training target
- [ ] Keep early objective sequence intact:
  - data intake
  - processing
  - defense
  - first wave
  - research
- [ ] Avoid adding a new modal.
- [ ] Keep mobile panel text short.

Expected files:

- `src/managers/UIManager.ts`
- `src/i18n.ts`
- `tests/e2e/app-smoke.spec.ts`
- optional `src/utils/progressionGates.ts`
- optional `src/utils/progressionGates.test.ts`

Completion conditions:

- Before first defense, existing tutorial/objective flow remains recognizable.
- After first defense, objective communicates the strategic tradeoff.
- AP/Fast Link/Fiber are still hidden before first defense.
- Mobile portrait does not overlap core controls at startup.

Test commands:

```powershell
npm test
npm run build
npm run test:e2e -- --workers=1
```

Rollback or stop criteria:

- Stop if objective logic starts duplicating tutorial state in a brittle way.
- Extract pure progression helper instead of adding more nested conditions.

### Step 3: Strengthen Model Training Lab Payoff

Intent:

- Keep the existing Model Training Lab concept, but make it feel like the main
  permanent defense-growth system.

Checklist:

- [ ] Improve Training Lab target rows with clear permanent-effect copy.
- [ ] Show input requirement and available input state clearly.
- [ ] Add or improve visible feedback when a model level/confidence increases.
- [ ] Show trained model state in defense status panel when relevant.
- [ ] Preserve existing shared model state behavior.
- [ ] Do not convert towers into ammo-fed systems.

Expected files:

- `src/managers/TrainingLabUI.ts`
- `src/buildings/ModelTrainingLab.ts`
- `src/buildings/DefenseTower.ts`
- `src/managers/UIManager.ts`
- `src/managers/EffectsManager.ts`
- `src/i18n.ts`
- optional `src/utils/modelTrainingSummary.ts`
- optional `src/utils/modelTrainingSummary.test.ts`

Completion conditions:

- Player can tell which defense model is being trained.
- Player can tell training is permanent/shared by tower type.
- Existing `trainDefenseModelType` flow still works.
- Existing save/load custom state remains valid.

Test commands:

```powershell
npm test
npm run build
npm run test:e2e -- --workers=1
```

Rollback or stop criteria:

- Stop if changes require save format breakage.
- Stop if the implementation changes model training into consumable ammo.

### Step 4: Reduce Early Physical Logistics And Power Complexity

Intent:

- Keep systems, but ensure early play focuses on data factory and defense.

Checklist:

- [ ] Review build button visibility gates.
- [ ] Keep `Conveyor`, `Fast Link`, `Unloader`, AP, and Fiber from dominating
  early choices.
- [ ] Consider moving `Unloader` and possibly `Storage` variants later if
  current UI shows too many early logistics choices.
- [ ] Keep power status visible but not dominant.
- [ ] Update research descriptions if unlock timing changes.
- [ ] Do not remove save compatibility for existing buildings.

Expected files:

- `src/config.ts`
- `src/managers/UIManager.ts`
- `src/managers/ResearchUI.ts`
- `src/i18n.ts`
- `src/utils/progressionGates.ts`
- `src/utils/progressionGates.test.ts`
- `tests/e2e/app-smoke.spec.ts`

Completion conditions:

- New player sees a smaller set of early build choices.
- Core data loop remains buildable without advanced logistics.
- Existing saved games with reduced-exposure buildings still load.
- Research tree still exposes midgame expansion options.

Test commands:

```powershell
npm test
npm run build
npm run test:e2e -- --workers=1
```

Rollback or stop criteria:

- Stop if gating prevents required tutorial progression.
- Stop if saved buildings become unknown or unloadable.

### Step 5: Add Game-Over And Run Result Stats

Intent:

- Make failure informative and more release-ready.

Checklist:

- [ ] Expand game-over screen with run stats:
  - reached wave
  - Core damage or remaining HP
  - total Confidence Score earned
  - unlocked research count
  - model confidence highlights
- [ ] Keep restart behavior.
- [ ] Add Korean and English text.
- [ ] Keep modal usable on mobile.

Expected files:

- `index.html`
- `src/managers/UIManager.ts`
- `src/scenes/MainScene.ts`
- `src/i18n.ts`
- `src/styles/main.css`
- `tests/e2e/app-smoke.spec.ts`

Completion conditions:

- Game-over screen gives actionable run information.
- Restart still works.
- Existing smoke tests still pass.
- Mobile modal fits within viewport.

Test commands:

```powershell
npm test
npm run build
npm run test:e2e -- --workers=1
```

Rollback or stop criteria:

- Stop if game-over stats require broad save/run-state refactor.
- Use minimal live-state stats first.

### Step 6: First Balance Pass For Waves 1-11

Intent:

- Make first 15 minutes match the new direction.

Checklist:

- [ ] Tune only config/simulation numbers first.
- [ ] Review:
  - initial wave delay
  - early enemy count
  - enemy HP multiplier
  - early rewards
  - first boss pressure
  - Wave 11 route expansion
- [ ] Update wave simulation tests to reflect intended pacing.
- [ ] Keep difficulty identities distinct.
- [ ] Record manual QA notes in docs after playtest.

Expected files:

- `src/config.ts`
- `src/utils/waveSimulation.ts`
- `src/utils/waveSimulation.test.ts`
- `docs/QA_CHECKLIST.md`
- `docs/NEXT_TASKS.md`

Completion conditions:

- Normal Wave 1-3 is readable and survivable with basic defense.
- Normal Wave 4-7 pressures expansion vs defense.
- Wave 8 DDoS warning is understandable.
- Wave 10 boss is a clear checkpoint.
- Wave 11 second route is not a surprise failure.

Test commands:

```powershell
npm test
npm run build
npm run test:e2e -- --workers=1
```

Manual QA command:

```powershell
npm run dev
```

Rollback or stop criteria:

- Stop if tuning hides the need for factory growth.
- Stop if early waves require advanced logistics or model training.

### Step 7: Visual Readability Pass

Intent:

- Improve art readability without a full art reset.

Checklist:

- [ ] Audit buildings without strong texture/silhouette support.
- [ ] Add small category accents or status markers where low-risk.
- [ ] Improve model training and defense-growth effects.
- [ ] Improve enemy type readability through markers/motion/effects if needed.
- [ ] Keep current neon terminal style.
- [ ] Avoid replacing all building assets in this pass.

Expected files:

- `src/buildings/BaseBuilding.ts`
- `src/buildings/ModelTrainingLab.ts`
- `src/buildings/DefenseTower.ts`
- `src/managers/EffectsManager.ts`
- `src/styles/main.css`
- `public/assets/buildings/*` only if small targeted replacements are needed

Completion conditions:

- Production/defense/power/logistics categories are more distinguishable.
- Model training feedback is visible at normal zoom.
- No asset path breaks.
- Existing config texture tests pass.

Test commands:

```powershell
npm test
npm run build
npm run test:e2e -- --workers=1
```

Rollback or stop criteria:

- Stop if asset work becomes a full art direction reset.
- Stop if visuals reduce small-screen readability.

### Step 8: Documentation And Release-Readiness Cleanup

Intent:

- Keep docs aligned with implementation after Autopilot changes.

Checklist:

- [ ] Update current project direction docs after implementation.
- [ ] Update QA checklist with new manual checks.
- [ ] Update next tasks with remaining release blockers.
- [ ] Document any changed unlock timing or balance constants.
- [ ] Keep archived docs untouched unless explicitly needed.

Expected files:

- `docs/CONCEPT.md`
- `docs/DIRECTION_REALIGNMENT_PLAN.md`
- `docs/PROJECT_ANALYSIS_AND_ROADMAP.md`
- `docs/NEXT_TASKS.md`
- `docs/QA_CHECKLIST.md`
- `docs/AUTOMATED_TESTING_GUIDE.md` if commands or coverage changes
- `README.md` only if player-facing features materially change

Completion conditions:

- Docs describe the implemented state, not only intended state.
- QA checklist includes wave summary, model training payoff, game-over stats,
  and early gating checks.
- Autopilot final report can point to updated docs and passing commands.

Test commands:

```powershell
npm test
npm run build
npm run test:e2e -- --workers=1
```

Rollback or stop criteria:

- Stop if docs claim features that were not implemented.
- Keep docs conservative and evidence-based.

## 12. Step File Map

| Step | Main files | Tests |
| --- | --- | --- |
| 1. Wave result summary | `src/utils/waveResultSummary.ts`, `src/managers/UIManager.ts`, `src/scenes/MainScene.ts`, `src/i18n.ts` | `src/utils/waveResultSummary.test.ts`, `tests/e2e/app-smoke.spec.ts` |
| 2. Objective flow | `src/managers/UIManager.ts`, `src/i18n.ts`, optional `src/utils/progressionGates.ts` | optional `src/utils/progressionGates.test.ts`, `tests/e2e/app-smoke.spec.ts` |
| 3. Model training payoff | `src/managers/TrainingLabUI.ts`, `src/buildings/ModelTrainingLab.ts`, `src/buildings/DefenseTower.ts`, `src/managers/EffectsManager.ts` | optional helper tests, e2e smoke |
| 4. Early complexity reduction | `src/config.ts`, `src/managers/UIManager.ts`, `src/managers/ResearchUI.ts`, `src/i18n.ts` | `src/config.test.ts`, optional gate tests, e2e smoke |
| 5. Game-over stats | `index.html`, `src/managers/UIManager.ts`, `src/scenes/MainScene.ts`, `src/i18n.ts`, `src/styles/main.css` | e2e smoke |
| 6. Balance pass | `src/config.ts`, `src/utils/waveSimulation.ts` | `src/utils/waveSimulation.test.ts` |
| 7. Visual readability | `src/buildings/*`, `src/managers/EffectsManager.ts`, `src/styles/main.css`, optional assets | `src/config.test.ts`, e2e smoke |
| 8. Docs | `docs/*.md`, `README.md` if needed | command verification only |

## 13. Global Completion Conditions

The full Autopilot implementation is complete only when:

- Early game still starts cleanly on desktop and mobile.
- First objective flow teaches data -> processing -> defense -> first wave.
- After first defense, player sees a clear expand-vs-defend decision.
- Model Training Lab reads as a permanent defense-growth system.
- Wave result summary connects factory growth and defense outcome.
- Game-over screen gives useful run stats.
- Physical logistics and power optimization are not early-game main lessons.
- Existing save/load compatibility is preserved.
- All standard commands pass:

```powershell
npm test
npm run build
npm run test:e2e -- --workers=1
```

## 14. Rollback Or Stop Criteria

Stop and reassess if any of these happen:

- A step requires broad rewrites of `MainScene`, `UIManager`, or
  `EffectsManager`.
- Save compatibility would break for existing saves.
- Early tutorial progression becomes blocked.
- Mobile startup UI becomes overlapped or unusable.
- Balance changes make Wave 1-3 require advanced systems.
- Model training changes into a consumable ammo system instead of permanent
  growth.
- A proposed art pass becomes a full asset replacement project.
- More than one major gameplay system must be redesigned at once.

Rollback preference:

1. Revert only the current step.
2. Keep earlier passing steps.
3. Preserve tests that captured desired behavior if they remain valid.
4. Document the reason in `docs/NEXT_TASKS.md`.

## 15. Documents To Update After Implementation

Update these when relevant:

- `docs/CONCEPT.md`
- `docs/DIRECTION_REALIGNMENT_PLAN.md`
- `docs/PROJECT_ANALYSIS_AND_ROADMAP.md`
- `docs/NEXT_TASKS.md`
- `docs/QA_CHECKLIST.md`
- `docs/AUTOMATED_TESTING_GUIDE.md`
- `README.md`

Do not rewrite archived docs unless specifically requested.

## 16. Commit-Before-Final Checklist

Before committing implementation work, verify:

- [ ] `git diff` contains only intended source, test, asset, and docs changes.
- [ ] No unrelated user changes were reverted.
- [ ] Korean text remains UTF-8 and displays correctly.
- [ ] New UI strings exist in Korean and English.
- [ ] New helpers have focused unit tests where practical.
- [ ] Desktop and mobile e2e smoke pass.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `npm run test:e2e -- --workers=1` passes.
- [ ] Manual QA notes cover Normal Wave 1-10 when balance changes are made.
- [ ] Docs are updated to match actual implemented behavior.
- [ ] Autopilot final report lists completed steps, skipped steps, test results,
  and any residual risks.

## 17. Autopilot Execution Prompt

Use this prompt for the next Autopilot handoff:

```text
[$oh-my-codex:autopilot]

Use docs/autopilot-implementation-plan.md as the source of truth.

Goal:
Implement the Neural Factory direction realignment in small sequential steps.
Preserve the existing playable prototype. Do not do a broad rewrite.

Priority order:
1. Wave result summary
2. Expand-vs-defend objective flow
3. Model Training Lab payoff clarity
4. Early physical logistics and power complexity reduction
5. Game-over/run result stats
6. Waves 1-11 balance pass
7. Visual readability pass
8. Documentation cleanup

Hard constraints:
- Keep factory automation 60 / tower defense 40.
- Keep Model Training Lab as permanent defense growth, not ammo supply.
- Keep Conveyor/AP/Fiber/power as secondary or midgame systems.
- Preserve save/load compatibility.
- Keep Korean and English UI strings aligned.
- Avoid large refactors of MainScene, UIManager, and EffectsManager.
- Stop and report if a step requires broad rewrites, breaks saves, blocks tutorial
  progression, or makes early waves depend on advanced systems.

Verification baseline after each major step:
npm test
npm run build
npm run test:e2e -- --workers=1

When done:
- Update the docs listed in the implementation plan.
- Report completed steps, changed files, verification results, and residual risks.
```
