# Onboarding Intrusion Ports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first 10 minutes calmer and clearer by teaching the factory loop through mission-style onboarding and predictable intrusion ports that players can deliberately defend.

**Architecture:** Keep the feature small and data-driven. `waveSimulation.ts` owns deterministic port policy and spawn anchors, `WaveManager.ts` emits upcoming/current wave threat metadata, `UIManager.ts` renders the next-wave briefing, and `EffectsManager.ts` visualizes port/defense guidance without touching building art.

**Tech Stack:** Phaser 3, TypeScript, Vitest, DOM HUD.

---

## File Structure

- Modify: `src/utils/waveSimulation.ts`
  - Add stable intrusion port metadata, early-wave route policy, spawn anchors, threat labels, and next-wave briefing helpers.
- Modify: `src/utils/waveSimulation.test.ts`
  - Cover fixed early North Port behavior, later second-port introduction, and anchored spawn points.
- Modify: `src/managers/EventBus.ts`
  - Add `WAVE_BRIEFING_UPDATED` event payload.
- Modify: `src/managers/WaveManager.ts`
  - Use the briefing helper, emit next-wave briefing during cooldown, and spawn enemies near stable port anchors.
- Modify: `src/managers/UIManager.ts`
  - Render a compact next-wave briefing in the existing wave timer HUD.
- Modify: `src/managers/EffectsManager.ts`
  - Render persistent port labels and a suggested defense corridor near active ports.
- Modify: `src/utils/tutorialFlow.ts`
  - Rename the defense tutorial step intent to port defense without changing the saved step model.
- Test: `src/utils/waveSimulation.test.ts`
- Verify: `npm test`, `npm run build`

---

### Task 1: Wave Port Policy Tests

**Files:**
- Modify: `src/utils/waveSimulation.test.ts`
- Modify: `src/utils/waveSimulation.ts`

- [ ] **Step 1: Write failing tests for early fixed port behavior**

Add imports:

```ts
import {
    createWaveBriefing,
    getSpawnPointForRoute,
    selectActiveIntrusionRoutes
} from './waveSimulation';
```

Add tests:

```ts
it('keeps the first three normal waves focused on the North Port', () => {
    expect(selectActiveIntrusionRoutes(1, 'NORMAL').map(route => route.id)).toEqual(['NORTH']);
    expect(selectActiveIntrusionRoutes(2, 'NORMAL').map(route => route.id)).toEqual(['NORTH']);
    expect(selectActiveIntrusionRoutes(3, 'NORMAL').map(route => route.id)).toEqual(['NORTH']);
});

it('introduces a second normal port after the guided opening', () => {
    expect(selectActiveIntrusionRoutes(11, 'NORMAL').map(route => route.id)).toEqual(['NORTH', 'EAST']);
});

it('creates readable next-wave briefings for the HUD', () => {
    expect(createWaveBriefing(1, 'NORMAL')).toMatchObject({
        wave: 1,
        threat: 'Low',
        recommendedDefense: '1 Classifier near North Port'
    });
    expect(createWaveBriefing(8, 'NORMAL')).toMatchObject({
        wave: 8,
        special: 'DDoS risk'
    });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/utils/waveSimulation.test.ts`

Expected: FAIL because `createWaveBriefing` is not exported and early normal waves currently include more than one route.

- [ ] **Step 3: Implement minimal wave policy**

In `src/utils/waveSimulation.ts`, add:

```ts
export type ThreatLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface WaveBriefing {
    wave: number;
    difficultyId: string;
    routes: IntrusionRoute[];
    routeNames: string[];
    threat: ThreatLevel;
    special: string | null;
    recommendedDefense: string;
}

export function createWaveBriefing(wave: number, difficultyId = 'NORMAL'): WaveBriefing {
    const routes = selectActiveIntrusionRoutes(wave, difficultyId);
    const threat = getThreatLevel(wave);
    return {
        wave: Math.max(1, Math.floor(wave)),
        difficultyId: getDifficultyConfig(difficultyId).ID,
        routes,
        routeNames: routes.map(route => route.label),
        threat,
        special: wave >= 8 && wave % 10 !== 0 ? 'DDoS risk' : wave % 10 === 0 ? 'Boss signal' : null,
        recommendedDefense: getRecommendedDefense(wave, routes)
    };
}
```

Update `selectActiveIntrusionRoutes` so Normal waves 1-10 return `['NORTH']`, Normal wave 11+ returns `['NORTH', 'EAST']`, and Hard/Nightmare still scale upward.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- src/utils/waveSimulation.test.ts`

Expected: PASS.

---

### Task 2: WaveManager Briefing Events

**Files:**
- Modify: `src/managers/EventBus.ts`
- Modify: `src/managers/WaveManager.ts`
- Modify: `src/utils/waveSimulation.test.ts`

- [ ] **Step 1: Add event payload type**

In `src/managers/EventBus.ts`, import `WaveBriefing` and add:

```ts
'WAVE_BRIEFING_UPDATED': WaveBriefing;
```

- [ ] **Step 2: Emit briefing during cooldown and wave start**

In `src/managers/WaveManager.ts`, import `createWaveBriefing`.

Add:

```ts
private emitNextWaveBriefing(): void {
    EventBus.emit('WAVE_BRIEFING_UPDATED', createWaveBriefing(this.currentWave + 1, this.difficultyId));
}
```

Call it in `setDifficulty`, after `endWave`, and while cooldown updates before `WAVE_UPDATE`.

- [ ] **Step 3: Use active route anchors for spawning**

Change `spawnEnemy()` to use `this.activeRoutes` and a narrow progress band around the port anchor:

```ts
const route = this.activeRoutes[(this.enemiesSpawned - 1) % this.activeRoutes.length];
const progress = 0.5 + Phaser.Math.FloatBetween(-0.08, 0.08);
const { x, y } = getSpawnPointForRoute(route.id, progress);
```

- [ ] **Step 4: Run unit tests**

Run: `npm test -- src/utils/waveSimulation.test.ts`

Expected: PASS.

---

### Task 3: HUD Briefing

**Files:**
- Modify: `src/managers/UIManager.ts`

- [ ] **Step 1: Render next-wave briefing text**

In `setupEvents()`, add:

```ts
EventBus.on('WAVE_BRIEFING_UPDATED', briefing => {
    if (!this.waveTimerEl) return;
    const routeText = briefing.routeNames.join(' + ');
    const specialText = briefing.special ? ` | ${briefing.special}` : '';
    this.waveTimerEl.innerText = `${routeText} | ${briefing.threat}${specialText}`;
}, 'UIManager');
```

- [ ] **Step 2: Preserve active wave display**

Keep the existing `WAVE_STARTED` handler setting `hud.waveActive`, so the briefing only owns the cooldown/readiness state.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: PASS.

---

### Task 4: Port Labels and Defense Corridor

**Files:**
- Modify: `src/managers/EffectsManager.ts`

- [ ] **Step 1: Add persistent route hint cleanup**

Add private properties:

```ts
private routeHintObjects: Phaser.GameObjects.GameObject[] = [];
```

Add method:

```ts
private clearRouteHints(): void {
    this.routeHintObjects.forEach(object => object.destroy());
    this.routeHintObjects = [];
}
```

- [ ] **Step 2: Draw active route guidance**

In `playRouteWarnings(routes)`, call `clearRouteHints()` and draw a scroll-fixed label plus world-space corridor for each route. Use simple text/graphics only; do not touch building images.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: PASS.

---

### Task 5: Tutorial Defense Copy

**Files:**
- Modify: `src/i18n.ts`
- Test: `src/utils/tutorialFlow.test.ts`

- [ ] **Step 1: Update English defense tutorial detail**

Change `tutorial.DEFENSE.detail` in English to:

```ts
'Defend the marked intrusion port first. A Classifier near the highlighted route is enough for the opening waves.'
```

- [ ] **Step 2: Leave step IDs unchanged**

Do not change `TutorialStepId`; existing saves depend on the step sequence.

- [ ] **Step 3: Run tutorial tests**

Run: `npm test -- src/utils/tutorialFlow.test.ts`

Expected: PASS.

---

### Task 6: Final Verification

**Files:**
- No new files.

- [ ] **Step 1: Run unit tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Review changed files**

Run: `git -c safe.directory=C:/Users/user/Desktop/react/factor diff --stat`

Expected: only planned files changed.

---

## Self-Review

- Spec coverage: first-10-minute guidance is covered by tutorial copy and HUD briefing; fixed defendable route is covered by wave policy and spawn anchors; midgame route expansion is covered by route policy.
- Placeholder scan: no task contains unresolved TODO/TBD language.
- Type consistency: `WaveBriefing`, `ThreatLevel`, and `WAVE_BRIEFING_UPDATED` are introduced before use.
