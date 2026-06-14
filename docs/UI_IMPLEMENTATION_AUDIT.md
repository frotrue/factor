# UI Implementation Audit

Date: 2026-06-14

This audit checks the current Preact UI migration against `docs/ui__implementation_plan.md` and the user rules for the active goal.

## Status

Stable checkpoint with automated and visual evidence complete for the current migration slice.

The automated evidence shows the planned Preact DOM overlay architecture is in place and buildable. Phaser still renders the game world, and the mobile visual pass keeps the legacy compact HUD visible where Playwright compatibility still depends on those IDs.

## Requirement Evidence

| Requirement | Current evidence | Status |
|---|---|---|
| Preact only for DOM HUD overlays | `src/ui/HudApp.tsx`, `src/ui/mountHud.tsx`, `src/ui/signals/*`, Preact components under `src/ui/components/*`; `src/ui/uiBoundary.test.ts` guards runtime/UI separation | Automated evidence strong |
| Phaser continues rendering the game world | `MainMenuScene` keeps Phaser background/particles/fallback zones; gameplay classes still use Phaser objects; E2E canvas placement/cable/tutorial tests pass | Automated evidence strong |
| Do not change core simulation logic | `src/ui/uiBoundary.test.ts` blocks direct `scene.uiManager` coupling in runtime managers/InputController; searches show UI changes use EventBus request/snapshot paths. Core manager diffs observed are UI log/refresh decoupling, not formula/path/map changes | Automated evidence strong; keep reviewing future diffs |
| Preserve DOM IDs and Playwright compatibility | E2E passes for desktop/mobile projects; legacy fallback helpers preserve IDs and shadow state. `src/ui/uiBoundary.test.ts` blocks static legacy shell from returning to `index.html` | Automated evidence strong |
| Gradual migration with coexistence | `src/ui/legacy*` helpers remain, Preact components are active surfaces, and E2E checks legacy shadow/fallback behavior | Automated evidence strong |
| Phase 0 infrastructure | `src/ui/uiInfrastructure.test.ts` covers Preact dependencies, preset, TSX, chunks, CSS modules. `src/ui/uiDesignTokens.test.ts` covers tokens and `#preact-hud` overlay root | Automated evidence strong |
| Phase 1 HUD mount/bridge/top bar | `src/ui/mountHud.test.ts`, `src/ui/HudApp.test.ts`, `src/ui/signals/bridge.test.ts`, `src/ui/TopHudController.test.ts`, E2E startup/language smoke | Automated evidence strong |
| Phase 2 RightRail/BuildConsole | `src/ui/TacticalPanelController.test.ts`, `src/ui/tacticalPanelDisplay.test.ts`, `src/ui/BuildConsoleController.test.ts`, `src/ui/buildConsoleSnapshot.test.ts`, E2E build/tactical smoke | Automated evidence strong |
| Phase 3 modal system/main menu | Settings, Training Lab, GameOver, MainMenu components/controllers/display tests; `src/ui/uiBoundary.test.ts` guards MainMenuScene from Phaser Text menu regression | Automated evidence strong |
| Phase 4 mobile/notifications/tutorial/final cleanup | MobileAction, Notification, GameOver, Tutorial, WaveResult display/controller tests; `index.html` and `main.css` minimal static shell guarded by `src/ui/uiBoundary.test.ts` | Automated evidence strong |
| Visual/runtime pass | Browser screenshots captured for desktop menu/gameplay/settings and mobile portrait/landscape under `output/playwright/`. The final mobile pass confirmed no runtime errors, no duplicate Preact/legacy top HUD in portrait, and separated top HUD, tactical rail, and build console bounds in short landscape | Visual evidence strong |
| Validation after major steps | Final checkpoint passed `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run test:e2e` | Automated evidence strong |

## Latest Verified Commands

Full checkpoint result after the mobile visual fix and matching E2E contract update:

```text
npx tsc --noEmit: passed
npm test: 56 files / 208 tests passed
npm run build: passed
npm run test:e2e: 24 passed / 27 skipped
```

## Visual Evidence

```text
output/playwright/ui-audit-desktop-menu.png
output/playwright/ui-audit-desktop-gameplay.png
output/playwright/ui-audit-desktop-settings.png
output/playwright/ui-audit-mobile-portrait.png
output/playwright/ui-audit-mobile-landscape.png
```

## Remaining Before Completion Claim

- No known automated or visual blockers remain for this checkpoint.
