# Intrusion Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fully random edge spawning with difficulty-based fixed intrusion routes: Easy 1, Normal 2, Hard 3, Nightmare 4.

**Architecture:** Keep route math in `src/utils/waveSimulation.ts` so it can be tested without Phaser. `WaveManager` owns the active wave route plan and asks the utility for each spawn point, preserving the existing enemy creation flow.

**Tech Stack:** TypeScript, Phaser 3, Vitest.

---

## File Structure

- Modify `src/utils/waveSimulation.ts`: add route IDs, route count by difficulty, route selection per wave, and spawn coordinate helpers.
- Modify `src/utils/waveSimulation.test.ts`: cover route count, deterministic active route selection, and route-constrained spawn points.
- Modify `src/managers/WaveManager.ts`: store `activeRoutes`, choose routes at wave start, and spawn enemies only from those routes.

## Tasks

### Task 1: Route Planning Tests

**Files:**
- Test: `src/utils/waveSimulation.test.ts`

- [ ] Add tests that expect Easy/Normal/Hard/Nightmare to expose 1/2/3/4 route slots.
- [ ] Add tests that expect active routes to be deterministic for the same wave and difficulty.
- [ ] Add tests that expect generated spawn positions to sit on the selected route edge only.
- [ ] Run `npm test -- src/utils/waveSimulation.test.ts` and confirm RED because the route APIs do not exist yet.

### Task 2: Route Planning Utilities

**Files:**
- Modify: `src/utils/waveSimulation.ts`

- [ ] Add `IntrusionRouteId`, `IntrusionRoute`, `getIntrusionRoutesForDifficulty`, `selectActiveIntrusionRoutes`, and `getSpawnPointForRoute`.
- [ ] Keep map-size assumptions local to the helper using the same `60 * CONFIG.GRID_SIZE` span currently used by `WaveManager`.
- [ ] Run `npm test -- src/utils/waveSimulation.test.ts` and confirm GREEN.

### Task 3: WaveManager Integration

**Files:**
- Modify: `src/managers/WaveManager.ts`

- [ ] Add `activeRoutes` state.
- [ ] Set `activeRoutes = selectActiveIntrusionRoutes(currentWave, difficultyId)` in `startWave`.
- [ ] Replace random edge selection in `spawnEnemy` with a selected active route and `getSpawnPointForRoute`.
- [ ] Keep DDoS and boss type selection unchanged.
- [ ] Run `npm test -- src/utils/waveSimulation.test.ts`.

### Task 4: Full Verification

**Files:**
- No code changes expected.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Report the exact commands and outcomes.

