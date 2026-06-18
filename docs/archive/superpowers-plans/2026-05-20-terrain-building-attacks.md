# Terrain Building Attacks Implementation Plan

> 모바일 개발 상태: 현재 모바일 개발은 일시 중단 상태입니다. 모바일 관련 구현, QA, 레이아웃 개선, 터치 조작 개선은 개발 재개 전까지 보류합니다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add destructible buildings, enemy attacks against buildings, cable cleanup on destruction, and blocker terrain that shapes early defensive lanes.

**Architecture:** Keep gameplay rules small and testable. Config defines building durability, `MapManager` owns terrain/resource maps, `BaseBuilding` owns generic HP/damage behavior, `BuildingManager` owns safe removal/cable cleanup, and `BaseEnemy` owns target selection and attack timing.

**Tech Stack:** TypeScript, Phaser 3, Vitest, Playwright smoke tests.

---

## File Structure

- Modify: `src/config.ts`
  - Add HP values for every buildable.
  - Add `TERRAIN.BLOCKER` visual metadata.
- Modify: `src/types.ts`
  - Add terrain config and saved terrain fields.
- Modify: `src/config.test.ts`
  - Assert every building has HP and blocker terrain exists.
- Modify: `src/managers/MapManager.ts`
  - Add blocker terrain map, generated North Port lane blockers, and terrain query helpers.
- Add: `src/managers/MapManager.test.ts`
  - Test safe generated blockers and blocked terrain queries.
- Modify: `src/managers/GridRenderer.ts`
  - Draw terrain blockers before resource patches.
- Modify: `src/scenes/MainScene.ts`
  - Include terrain in placement blocking.
- Modify: `src/buildings/BaseBuilding.ts`
  - Add generic HP, damage, HP bar, and destroyed state.
- Modify: `src/buildings/DefenseTower.ts`
  - Use shared HP behavior while preserving firewall research multiplier.
- Modify: `src/managers/BuildingManager.ts`
  - Disconnect cables when buildings are removed/destroyed.
- Modify: `src/enemies/BaseEnemy.ts`
  - Stop to attack current/adjacent non-core buildings, prioritizing Firewall, defense, then other buildings.
- Modify: `src/managers/EventBus.ts`
  - Add `BUILDING_DAMAGED` and `BUILDING_DESTROYED`.
- Modify: `src/managers/EffectsManager.ts`
  - Add damage flash.
- Modify: `src/managers/SaveManager.ts`
  - Save/load terrain blockers.
- Verify: `npm test`, `npm run build`, `npm run test:e2e`.

---

## Tasks

### Task 1: Durability and Terrain Config Tests

- [ ] Add failing tests to `src/config.test.ts`:
  - every `CONFIG.BUILDINGS` entry has positive `HP`
  - `CONFIG.TERRAIN.BLOCKER` exists
- [ ] Run `npm test -- src/config.test.ts` and confirm failure.
- [ ] Add HP values and terrain config to `src/config.ts`.
- [ ] Update `src/types.ts` for `TERRAIN`.
- [ ] Re-run `npm test -- src/config.test.ts`.

### Task 2: Blocker Terrain Map

- [ ] Add `src/managers/MapManager.test.ts` with tests for `addTerrainBlocker`, `isTerrainBlocked`, and generated safe-zone blockers.
- [ ] Run `npm test -- src/managers/MapManager.test.ts` and confirm failure.
- [ ] Add terrain map helpers and a North Port lane generator to `MapManager`.
- [ ] Draw blockers in `GridRenderer`.
- [ ] Update `MainScene.isBlocked` to reject terrain blockers.
- [ ] Re-run the MapManager test.

### Task 3: Building HP and Destruction

- [ ] Add failing tests through focused config/base behavior where possible.
- [ ] Add generic HP state and `takeDamage()` to `BaseBuilding`.
- [ ] Keep `Core` game-over behavior intact.
- [ ] Update `DefenseTower` to use shared HP behavior and firewall HP multiplier.
- [ ] Re-run relevant unit tests and `npm run build`.

### Task 4: Cable Cleanup and Events

- [ ] Add removal cleanup in `BuildingManager.remove`.
- [ ] Emit `BUILDING_DAMAGED` from building damage and `BUILDING_DESTROYED` when HP removal occurs.
- [ ] Add damage flash effect in `EffectsManager`.
- [ ] Re-run `npm run build`.

### Task 5: Enemy Building Attacks

- [ ] Add attack target helper behavior in `BaseEnemy`.
- [ ] Enemies stop and attack current/adjacent non-core buildings every attack interval.
- [ ] If target is Core, existing core damage behavior remains.
- [ ] Re-run `npm test`, `npm run build`, and `npm run test:e2e`.

### Task 6: Save/Load Terrain

- [ ] Save `terrainMap` next to `resourceMap`.
- [ ] Load saved terrain or regenerate for old saves.
- [ ] Re-run `npm test`, `npm run build`, and `npm run test:e2e`.

---

## Self-Review

- The plan implements the requested priority order 1-5.
- BLOCKER terrain is deliberately simple: non-buildable and non-walkable.
- Enemy attacks are readable and conservative: non-core buildings are attacked only when encountered/adjacent.
- No building art files are modified.
