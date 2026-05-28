# Model Training Rework Plan

Updated: 2026-05-28

Status: Approved direction, ready for implementation planning.

## Purpose

Rework model training into the main proof that Gradium is a factory-defense
game: the player should build data production, feed model training, wait for
training jobs, then see defensive systems become more accurate and later more
powerful.

This pass changes model training and adds the first GPU accelerator building.
It does not redesign Confidence Score or Research.

## Core Direction

Current model training is too immediate: one training item is consumed and the
shared model value rises right away. The new system should feel like a factory
process:

```text
Produce data -> Accumulate training data -> Run training job ->
Improve defense model -> Add GPU accelerators -> Train faster
```

The intended player feeling:

- Early: "My data line is making this defense model more accurate."
- Midgame: "Accuracy reached 100%, now training improves damage."
- Later: "Training is slow, so I need expensive high-power GPUs next to the lab."

## Locked Decisions

### Model Scope

Keep defense models by tower type:

- `CLASSIFIER`
- `FILTER`
- `FIREWALL`

Each type has separate progress, accuracy, damage bonus, data requirement, and
training state.

### Training Data Values

Training data contributes progress by item type:

| Item | Training value |
|---|---:|
| `RAW_DATA` | 1 |
| `LABELED_DATA` | 3 |
| `WEIGHT_UPDATE` | 5 |

### Training Cycle

For each model type:

1. Incoming data increases accumulated training data.
2. When accumulated data reaches the current requirement, a training job starts.
3. The job consumes the required amount from accumulated data.
4. The job runs for a fixed training duration.
5. When the job completes, the model receives its reward.
6. The next data requirement becomes `ceil(previousRequirement * 1.3)`.
7. If enough accumulated data remains, another job may start.

Training can continue accumulating new data while a job is already running.
Accumulated data has no hard cap in this pass.

### Model Rewards

Initial model accuracy is `40%`.

On training completion:

- If accuracy is below `100%`, increase accuracy by `10%`, clamped to `100%`.
- Once accuracy is `100%`, increase model damage bonus by `5%`.
- Damage bonus has no cap.

### GPU Accelerator

Add a basic GPU accelerator building.

Rules:

- Unlocks when any defense model reaches `100%` accuracy.
- Unlock is global once achieved.
- Costs a large amount of `SILICON`.
- Requires high power.
- Must be orthogonally adjacent to a `MODEL_TRAINING_LAB`.
- Only powered GPUs contribute.
- Maximum effective GPUs per lab: `4`.
- Each active adjacent GPU reduces training time by `20%`.
- Four active GPUs reduce training time by `80%`.

Future direction, not this pass:

- Higher-tier GPUs.
- GPU upgrades.
- More accelerator types.

## Explicit Non-Goals

Do not change these systems in this pass:

- Confidence Score behavior.
- Research tree behavior.
- Research unlock rules.
- Confidence or Research as a cost for GPU.
- Confidence or Research as a requirement for model training.

Reason: Confidence Score and Research may be redesigned or removed later.
This model-training rework must stand independently.

## Recommended Implementation Shape

### Config

Add model-training tuning constants to `src/config.ts` or a nearby typed config
section:

- base accuracy: `40`
- accuracy gain per completed training: `10`
- attack gain per completed training: `5`
- initial data requirement: `100`
- requirement multiplier: `1.3`
- base training duration
- training data values
- GPU max active count: `4`
- GPU speed bonus per active unit: `0.2`
- GPU unlock accuracy: `100`
- GPU building cost and power use

Keep these values easy to tune. Avoid scattering magic numbers inside
`ModelTrainingLab`.

### Types

Extend `DefenseModelState` in `src/types.ts`.

Suggested fields:

```typescript
export interface DefenseModelState {
    modelAccuracy: number;
    damageBonus: number;
    modelVersion: number;
    inferenceCharge: number;
    accumulatedTrainingData: number;
    currentRequirement: number;
    isTraining: boolean;
    trainingProgressTicks: number;
    trainingDurationTicks: number;
}
```

Compatibility note:

- Existing saves currently store `modelConfidence`.
- Migration/load paths should map old `modelConfidence` to new `modelAccuracy`.
- Preserve `modelVersion` if still useful for display, but do not make it the
  primary growth metric.

### Main Scene Model API

Update model API in `src/scenes/MainScene.ts`.

Current methods:

- `getDefenseModelState(type)`
- `trainDefenseModelType(type, itemType)`
- `syncDefenseModelType(type)`

Recommended new responsibilities:

- `getDefenseModelState(type)` initializes the new state.
- `addTrainingData(type, itemType)` adds data value to the chosen model.
- `startTrainingIfReady(type)` starts a job when enough data exists.
- `completeTraining(type)` applies accuracy or damage reward.
- `isGpuUnlocked()` returns whether any model accuracy is `100%`.
- `syncDefenseModelType(type)` pushes model state into existing towers.

Keep Confidence Score untouched.

### ModelTrainingLab

Rewrite `src/buildings/ModelTrainingLab.ts` around the new state machine.

Responsibilities:

- Store selected target model type.
- Accept `RAW_DATA`, `LABELED_DATA`, and `WEIGHT_UPDATE`.
- Convert accepted items into accumulated training data.
- Run training jobs over time.
- Count active adjacent powered GPUs.
- Apply training duration reduction.
- Emit/log training milestones.
- Expose a UI-readable summary method.

Suggested behavior:

- `onTick()` consumes buffered data into the selected model.
- If not currently training, check whether requirement is met.
- If training, advance progress by tick amount adjusted by GPU bonus.
- On completion, apply reward and immediately check whether another job can
  start.

Avoid using the building `inputBuffer` as the only long-term store, because
training data must be unlimited and persisted per model.

### GPU Building

Add a new building class, for example:

- `src/buildings/GpuCluster.ts`

Possible visible names:

- `GPU Cluster`
- `Accelerator Rack`
- `Compute Node`

Recommendation: `GPU Cluster`, because it is immediately understandable.

Required integration:

- `CONFIG.BUILDINGS.GPU_CLUSTER`
- `BuildingType` typing if needed
- `BuildingFactory` registry
- i18n name/description
- build menu category placement
- power consumption
- save/load compatibility through existing building save path

Unlock rule:

- Do not use Research.
- Build menu should show/enable GPU only when `scene.isGpuUnlocked()` is true.
- If hidden UI patterns already exist for first-defense gating, reuse that style
  without coupling to Research.

### Defense Towers

Update `src/buildings/DefenseTower.ts`.

Current model value:

- `modelConfidence`

New model effects:

- Accuracy controls hit chance.
- Damage bonus controls damage multiplier.

Recommended mapping:

- Rename runtime field to `modelAccuracy` if practical.
- If broad rename is risky, keep `modelConfidence` internally but present it as
  accuracy in UI. Prefer actual rename if tests are updated cleanly.
- Damage formula should include `1 + damageBonus / 100`.

Keep existing enemy-specific hit chance behavior, such as Adversarial resistance.

### Training Lab UI

Full UI rewrite is allowed.

The new model-training UI should clearly show:

- model rows for `Classifier`, `Filter`, `Firewall`
- current selected target
- accuracy
- damage bonus
- accumulated data / next requirement
- training state
- remaining time or progress
- next reward
- GPU unlock state
- adjacent GPU count
- active powered GPU count
- final training speed multiplier

Recommended structure:

- Top summary: selected lab, GPU status, current target.
- Three model cards or rows.
- Each row has progress bars:
  - data progress
  - training progress
- Footer explains active GPU acceleration only when unlocked.

Do not surface Research or Confidence in this UI.

### Save And Migration

Update:

- `src/types.ts`
- `src/managers/SaveManager.ts`
- `src/utils/saveMigration.ts`
- `src/utils/saveMigration.test.ts`

Migration expectations:

- Old save with `modelConfidence` loads as `modelAccuracy`.
- Missing `damageBonus` defaults to `0`.
- Missing `accumulatedTrainingData` defaults to `0`.
- Missing `currentRequirement` defaults to `100`.
- Missing training state defaults to idle.
- GPU unlock can be derived from any loaded model at `100%` accuracy, or stored
  explicitly if easier.

Prefer deriving GPU unlock from model states unless UI/build-menu code needs a
cached flag.

### Documentation

After implementation, update:

- `docs/PROJECT_MAP.md`
- `docs/ARCHITECTURE.md`
- `docs/GAME_BALANCE_MAP.md`
- `docs/FILE_ROLE_MAP.md`
- `docs/TEST_MAP.md`

Keep updates small and specific.

## Test Plan

### Unit Tests

Add or update tests for:

- training data values
- requirement scaling by `1.3`
- accuracy reward before `100%`
- damage reward after `100%`
- unlimited data accumulation during active training
- GPU speed bonus calculation
- GPU max count of `4`
- inactive/unpowered GPU does not contribute
- old save migration from `modelConfidence`

Likely files:

- `src/utils/modelTrainingSummary.test.ts`
- new `src/utils/modelTrainingProgress.test.ts` if pure helpers are extracted
- `src/utils/saveMigration.test.ts`
- `src/config.test.ts`

### E2E / Smoke

Add focused smoke coverage only if feasible:

- model-training modal opens
- model rows render accuracy/data/training/GPU state
- GPU button remains hidden or disabled before any model reaches `100%`

Do not make E2E depend on long real-time training unless test hooks already make
that cheap.

### Verification Commands

Run:

```powershell
npm test
npm run build
```

If UI/build menu changed substantially, also run:

```powershell
npm run test:e2e -- --workers=1
```

## Implementation Order

1. Add config constants and type fields.
2. Add pure helper functions for training requirement, data value, reward, and
   GPU speed calculation.
3. Add unit tests for helper behavior.
4. Update `MainScene` model state initialization and training APIs.
5. Rewrite `ModelTrainingLab` state machine.
6. Update `DefenseTower` to use accuracy and damage bonus.
7. Add GPU building config/class/factory/i18n/build menu gating.
8. Rewrite `TrainingLabUI`.
9. Update save/migration.
10. Update docs.
11. Run tests and build.

## Risks

- Existing save data uses `modelConfidence`; migration must be careful.
- Build menu gating may currently assume Research-style unlocks; GPU must avoid
  that path.
- Unlimited accumulated data should not live only in `inputBuffer`, or save/load
  and UI will become awkward.
- Four GPUs at `-80%` training time is a large multiplier. Keep base training
  time and GPU bonus in config for easy tuning.
- Renaming `modelConfidence` widely may touch UI, save, summaries, tests, and
  docs. A compatibility shim may reduce first-pass risk.

## Done Criteria

- Data-fed training replaces immediate item-to-confidence training.
- Type-specific models show accuracy, damage bonus, data progress, and training
  progress.
- Accuracy reaches `100%` through training.
- After `100%`, repeated training increases attack bonus with no cap.
- GPU unlocks when any model reaches `100%`.
- Powered adjacent GPUs reduce training time, max `4`.
- Research and Confidence behavior remain unchanged.
- Tests and build pass.
