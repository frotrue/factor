# QA Checklist

Updated: 2026-05-21

## Standard Automated Checks

Run from repository root:

```powershell
npm test
npm run build
npm run test:e2e -- --workers=1
```

## Current Automated Coverage

### Vitest

- [x] Config integrity
- [x] Building texture references
- [x] Building HP coverage
- [x] Terrain BLOCKER config
- [x] Save migration defaults
- [x] Save migration preserves building HP and terrain map
- [x] AP relay source exclusion and receiver priority
- [x] Tutorial flow order and saved progress
- [x] Wave formulas, difficulty scaling, DDoS, boss pressure
- [x] Onboarding intrusion route policy
- [x] Wave briefing metadata
- [x] Enemy building target priority
- [x] Production simulation
- [x] Power preview helpers
- [x] EventBus ownership behavior
- [x] Effects manager warning markers
- [x] i18n key behavior

### Playwright

- [x] App starts from menu
- [x] Camera starts centered on Neural Core
- [x] Settings modal opens/closes
- [x] Keyboard focus returns after modal close
- [x] Korean default UI and English switch
- [x] Mobile action controls appear in portrait/landscape
- [x] Mobile Rotate/Remove/Cable/Cancel/Defense/Power state changes
- [x] Mobile building placement and cable connection
- [x] Desktop placement, cable connection, and cable removal
- [x] Desktop build categories, hotkeys, overlays, save, research modal
- [x] Tactical objective and wave panels appear after game start
- [x] Research starts hidden before first defense success
- [x] AP/Fiber/Fast Link are hidden from early logistics choices

## Manual QA: First 10 Minutes

- [ ] New game starts with readable resource patches near Core.
- [ ] BLOCKER terrain creates a visible North Port lane without hiding the Core.
- [ ] Placement ghost shows direction arrow before placement.
- [ ] Installed buildings do not show extra direction arrows.
- [ ] Player can build a basic data pipeline before Wave 1.
- [ ] Tactical panels clearly communicate objective, North Port, low threat, defense status, and power status.
- [ ] Research is not shown until after first successful defense.
- [ ] Route guidance appears when the wave starts.
- [ ] A Classifier/Firewall near North Port can handle early waves.
- [ ] Building damage feedback is noticeable.
- [ ] Destroyed buildings disconnect their cables.
- [ ] Damage is not too punishing before Wave 5.
- [ ] Wave 11 second-port introduction is understandable.

## Manual QA: Desktop

- [ ] WASD pan works after interacting with modals.
- [ ] Mouse wheel zoom works.
- [ ] Left click places selected buildings.
- [ ] Right click removes buildings/cables.
- [ ] `R` rotates ghost direction.
- [ ] `F1` toggles defense range.
- [ ] `F2` toggles power grid.
- [ ] Remove mode works with `0`, `Delete`, and `Backspace`.
- [ ] Tooltip content stays inside viewport.
- [ ] Research and settings modals fit on screen.

## Manual QA: Mobile

### Portrait 390x844

- [ ] HUD does not cover critical play area.
- [ ] Bottom buildbar scrolls and remains usable.
- [ ] Action bar buttons are touchable.
- [ ] Tap placement works.
- [ ] Drag camera movement works.
- [ ] Pinch zoom works.
- [ ] Cable mode can start and finish a connection.
- [ ] Cancel exits cable/remove state.

### Landscape 844x390

- [ ] HUD and bottom UI do not overlap critically.
- [ ] Modals remain scrollable.
- [ ] Action bar remains accessible.
- [ ] Gameplay field remains large enough to place buildings.

## Manual QA: Save/Load

- [ ] Save and load preserves buildings.
- [ ] Save and load preserves damaged building HP.
- [ ] Save and load preserves cables and cable queues.
- [ ] Save and load preserves terrain blockers.
- [ ] Save and load preserves language, audio, speed, tutorial state.
- [ ] Old saves without terrain still load and regenerate lane blockers.

## Recent Verification Log

### 2026-05-21

- Direction realignment implementation and docs cleanup.
- Verified:
  - `npm test`: 13 files / 47 tests passed
  - `npm run build`: passed, 61 modules transformed
  - `npm run test:e2e -- --workers=1`: 14 passed / 13 skipped
- Earlier docs update baseline:
  - `npm test`: 13 files / 47 tests passed
  - `npm run build`: passed

### 2026-05-20

- Onboarding intrusion ports implemented and verified.
- Terrain and building attack foundations implemented and verified.
- Standard checks passed:
  - `npm test`
  - `npm run test:e2e`
  - `npm run build`
