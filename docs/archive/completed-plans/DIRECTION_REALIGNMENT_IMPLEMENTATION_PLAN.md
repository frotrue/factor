# Direction Realignment Implementation Plan

> 모바일 개발 상태: 현재 모바일 개발은 일시 중단 상태입니다. 모바일 관련 구현, QA, 레이아웃 개선, 터치 조작 개선은 개발 재개 전까지 보류합니다.

Updated: 2026-05-21

## Goal

Implement the direction captured in `docs/DIRECTION_REALIGNMENT_PLAN.md` without
remaking the game or deleting existing systems. The first pass should make the
current prototype communicate its intended loop more clearly:

```text
Build data flow -> Place defense -> Survive wave -> Unlock growth ->
Improve factory -> Train defense models
```

## Scope For This Pass

### In Scope

- Add a clearer HUD structure for current objective, next wave, defense status,
  and power status.
- Move detailed wave briefing out of the compact timer text.
- Keep research hidden until the first successful defense.
- Hide advanced logistics before the first successful defense.
- Keep power visible but present it as a support warning, not the first lesson.
- Update tutorial/current objective copy to emphasize defense placement first and
  model training later.
- Add a small visual pass so blocker terrain reads as data debris instead of a
  generic filled tile.
- Add smoke coverage for the new UI gates.

### Out Of Scope

- Removing existing systems.
- Adding new buildings or enemies.
- Full art replacement.
- Large balance overhaul.
- Reworking save format unless unavoidable.

## Implementation Steps

1. Add static panel containers to `index.html`.
2. Add CSS for compact terminal panels in `src/styles/main.css`.
3. Extend `UIManager` so it renders:
   - current objective
   - next wave briefing
   - defense readiness / model confidence
   - compact power state
4. Gate research button visibility until the first completed wave.
5. Gate advanced logistics buttons before the first completed wave:
   - AP
   - Fiber
   - Fast Link
6. Keep basic cable, conveyor, storage, and basic defense available early.
7. Update localized UI/tutorial copy in `src/i18n.ts`.
8. Add compact data-debris markings to blocker terrain rendering.
9. Update Playwright smoke tests to verify:
   - new panels exist
   - research starts hidden
   - advanced logistics starts hidden
10. Run unit tests, e2e smoke tests, and build.

## Acceptance Criteria

- A new player sees an explicit objective panel after starting the game.
- Next wave information is shown in a dedicated panel instead of only in the
  timer.
- Defense status is visible before model training and grows into model
  confidence display later.
- Research is not available before the first successful defense.
- AP, Fiber, and Fast Link are not presented as early-game choices.
- Blocker terrain has a cyber/data-debris visual identity at small tile sizes.
- Existing systems remain in place and can still be surfaced later.
- `npm test`, `npm run test:e2e`, and `npm run build` pass.
