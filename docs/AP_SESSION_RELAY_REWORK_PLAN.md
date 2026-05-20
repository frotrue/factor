# AP Session Relay Status

Updated: 2026-05-21

## Current Status

AP Access Point currently works as a wireless session relay for nearby data producers and receivers.

The rework described in older planning docs is implemented.

## Current Behavior

- AP relays data between nearby buildings without direct Ethernet/Fiber cables.
- AP has limited bandwidth per tick.
- Storage and Data Cache are excluded as automatic AP sources.
- Receiver priority favors buildings with available buffer space.
- AP tooltip shows relay sessions, relayed count this tick, range, and mode.
- Distributed AP research increases AP range and cable bandwidth.

## Relevant Files

- `src/buildings/AccessPoint.ts`
- `src/managers/CableManager.ts`
- `src/utils/apRelay.ts`
- `src/utils/apRelay.test.ts`
- `src/controllers/InputController.ts`
- `src/managers/UIManager.ts`

## Test Coverage

`src/utils/apRelay.test.ts` covers:

- Storage/Data Cache source exclusion
- receiver priority by buffer space
- AP relay selection behavior

Playwright smoke tests cover basic cable placement and app startup paths, but not deep AP-specific browser behavior yet.

## Remaining Improvements

- Add a Playwright smoke test for AP placement and visible relay tooltip.
- Add stronger in-game feedback when an AP has no valid receiver.
- Add visual AP range/relay pulse effects during active relay.
- Tune AP bandwidth/range after midgame balance playtesting.
