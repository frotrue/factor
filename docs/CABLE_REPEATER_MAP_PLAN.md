# Cable, Repeater, And Map Boundary Implementation Plan

Updated: 2026-05-30

## Goal

Shift Gradium's map and logistics design toward factory optimization and defensive network planning.

The map should be a large finite operation area available from the start. Strategic pressure should come from enemy lanes, terrain blockers, resource placement, cable length, and powered relay infrastructure rather than from staged access locks.

## Design Decisions

- The standard campaign map should be large but finite, not unlimited.
- The player can access the whole standard map from the start.
- Enemy pressure should come from fixed spawn zones and readable lanes.
- Early lanes should include natural chokepoints.
- Mid and late lanes should include wider fronts that require player-built defenses.
- Valuable resources should be placed in neutral zones between enemy lanes.
- Higher-value resource areas do not need new resource tiers yet; use density, mixed resource proximity, risky position, and buildable space as value.
- Cables are free-angle straight lines between endpoints.
- Cables cannot cross `BLOCKER` terrain.
- Cables can cross ordinary buildings.
- Cables have type-specific max lengths.
- Cable length can receive a small research bonus.
- Cable cost is distance-based: `ceil(distance / GRID_SIZE) * COST_PER_TILE`.
- Removing a cable refunds 50% of the paid installation cost.
- Long or blocked routes should be solved by placing `REPEATER` buildings.
- `REPEATER` is available from the start.
- `REPEATER` is a separate wired relay building, not an Access Point mode.
- `REPEATER` has no buffer.
- `REPEATER` passes any data item bidirectionally using the existing automatic cable flow model.
- `REPEATER` requires power; unpowered repeaters stop data flow through attached cables.
- Destroying or removing a repeater removes its attached cables.
- `ACCESS_POINT` remains the wireless session relay building.

## Proposed Balance

Initial values can be tuned after playtesting.

| Item | Value |
|---|---:|
| Basic cable max length | 8 tiles |
| Fiber cable max length | 16 tiles |
| Cable length research bonus | +4 tiles |
| Basic cable cost | 1 Silicon / tile |
| Fiber cable cost | 3 Silicon / tile |
| Cable removal refund | 50% of `costPaid` |
| Repeater size | 1x1 |
| Repeater cost | 8 Silicon |
| Repeater power consumption | 4 |
| Repeater HP | 120 |
| Repeater category | `LOGISTICS` |

## Map Size And Lane Specification

The standard campaign map should become a large finite map that is fully reachable from the start. The boundary exists to avoid empty infinite scrolling, not to gate progression.

Initial standard map values:

| Area | Bounds |
|---|---:|
| World bounds | `-64..64` tiles on both axes |
| Camera bounds | world bounds plus 4 tiles visual padding |
| Build bounds | world bounds |
| Random resource generation bounds | `-56..56` tiles on both axes |
| Starter safe area | about `-12..12` tiles around the Core |
| High-value neutral resource bands | between enemy lane corridors, outside the starter safe area |

Implementation rules:

- Add explicit standard map bounds to the map preset instead of scattering magic numbers.
- Clamp camera movement to the standard world bounds plus a small visual padding.
- Prevent normal building placement outside the build bounds.
- Keep cable/repeater placement under the same build bounds.
- Keep enemy spawn zones near or just beyond the map edge, but route enemies through readable lane entries.
- Keep random resources inside the resource generation bounds so the outer edge has room for lanes, blockers, and combat space.
- Use `BLOCKER` terrain to create early chokepoints near the starter area.
- Use wider lane fronts farther from the starter area so late defenses require player-built lines.
- Place valuable neutral resource areas near lane intersections or between lanes, not deep in harmless corners.
- Avoid staged access locks for the standard map; distance, cable cost, repeater power, and defense exposure should create the practical expansion cost.

Suggested lane layout for the first implementation:

| Lane | Spawn/entry concept | Early shape | Late shape |
|---|---|---|---|
| North | outer north band into upper map | 1-2 chokepoints | wider front near neutral resources |
| East | outer east band into right map | one readable corridor | split pressure around blockers |
| South | outer south band into lower map | delayed or lower intensity | broader front after mid waves |
| West | outer west band into left map | secondary pressure | optional stronger late pressure |

Open tuning questions:

- Whether all four lane zones are active from wave 1 or unlocked by wave tier.
- Whether enemy spawn zones should be stored in `CONFIG.MAP_PRESETS.standard` or remain owned by `WaveManager`.
- Whether blockers should be generated from named terrain layouts such as `earlyLaneBlockers` plus new standard lane layouts.

## Implementation Phases

### Phase 1: Types And Config

- Add `MAX_LENGTH_TILES` to `CableConfig` in `src/types.ts`.
- Add optional `costPaid` to `CableConnection` for save compatibility.
- Add `REPEATER` to `BuildingType`.
- Add `REPEATER` config to `CONFIG.BUILDINGS`.
- Add max length values to `CONFIG.CABLES.BASIC` and `CONFIG.CABLES.FIBER`.
- Add or reuse a research effect key for cable length bonus, such as `CABLE_LENGTH_BONUS`.
- Add map bounds fields to `MapPresetConfig`, such as `WORLD_BOUNDS`, `BUILD_BOUNDS`, `RESOURCE_BOUNDS`, and optional `SPAWN_ZONES`.

Relevant files:

- `src/types.ts`
- `src/config.ts`
- `src/i18n.ts`

### Phase 2: Repeater Building

- Add `src/buildings/Repeater.ts`.
- Extend `BaseBuilding` with no production, no input buffer role, and no output buffer role if the current base class permits it cleanly.
- Ensure repeater can be placed like other logistics buildings.
- Ensure repeater can be selected as a cable endpoint.
- Ensure existing building removal flow deletes attached cables.

Relevant files:

- `src/buildings/Repeater.ts`
- `src/managers/BuildingManager.ts`
- `src/managers/UIManager.ts`
- `src/managers/MobileUIManager.ts`
- `src/controllers/InputController.ts`

### Phase 3: Cable Validation API

Add a validation method to `CableManager` and make `connect()` depend on it.

Suggested shape:

```ts
type CableBlockReason =
    | 'same-endpoint'
    | 'duplicate'
    | 'too-far'
    | 'blocked'
    | 'missing-endpoint';

interface CableValidationResult {
    ok: boolean;
    reason?: CableBlockReason;
    distanceTiles: number;
    maxLengthTiles: number;
    cost: number;
    blockedTile?: { x: number; y: number };
}
```

Rules:

- Normalize endpoint keys before validation.
- Distance is Euclidean center-to-center distance in grid tiles.
- `distanceTiles = Math.ceil(distancePixels / CONFIG.GRID_SIZE)`.
- Max length is `CONFIG.CABLES[type].MAX_LENGTH_TILES + research bonus`.
- Cost is `distanceTiles * COST_PER_TILE`.
- Duplicate cable checks still use `makeCableId()`.
- Save loading should be able to bypass cost payment but not create invalid impossible runtime data unless doing migration repair intentionally.

Relevant files:

- `src/managers/CableManager.ts`
- `src/controllers/InputController.ts`
- `src/managers/SaveManager.ts`

### Phase 4: Terrain Collision

Implement a grid raycast/supercover line helper for cable collision.

Requirements:

- Check every grid tile touched by the straight segment between endpoint centers.
- Treat `BLOCKER` terrain as blocking.
- Ignore ordinary buildings.
- Ignore the endpoint buildings' own occupied tiles.
- Return the first blocking tile for preview feedback.

Suggested helper location:

- `src/utils/cablePath.ts`

Test targets:

- horizontal blocker collision
- vertical blocker collision
- diagonal/free-angle blocker collision
- line passing near a blocker without touching it
- endpoint tile ignored
- building tile ignored

### Phase 5: Data Transfer Through Repeaters

The current cable transfer model assumes both cable endpoints are buildings that can produce or accept items. A no-buffer repeater needs network traversal or relay behavior.

Preferred implementation:

- Treat repeater as a transparent powered node in cable graph traversal.
- On each tick, move data from producer buildings to valid receiver buildings through powered cable paths.
- A path is valid only if every intermediate repeater has power.
- Preserve cable bandwidth and queue semantics per cable segment where practical.
- Avoid giving repeater its own inventory or buffer.

Conservative first implementation:

- Allow a packet to move one cable segment per cable travel duration.
- When a packet arrives at a powered repeater, immediately enqueue it into a valid outgoing cable if one exists.
- If no outgoing destination is available, leave it pending on the incoming cable rather than storing it inside the repeater.

This keeps repeater behavior bufferless while avoiding a full network router rewrite in the first pass.

Relevant files:

- `src/managers/CableManager.ts`
- `src/buildings/BaseBuilding.ts`
- `src/buildings/Repeater.ts`

### Phase 6: Input, Preview, And Feedback

- During cable endpoint selection, draw a preview line from start endpoint to hovered endpoint.
- Use `CableManager.canConnect()` for preview and final placement.
- Show valid cable preview with the cable color.
- Show invalid cable preview in red.
- For `too-far`, show a short status message including current/max length.
- For `blocked`, show the first blocked tile with an X or glitch marker.
- For insufficient Silicon, show required total cost.
- On success, log cable type and total cost.
- On removal, refund 50% of `costPaid` and log the refund.

Relevant files:

- `src/controllers/InputController.ts`
- `src/managers/UIManager.ts`
- `src/styles/main.css`
- `src/i18n.ts`

### Phase 7: Save Migration

- Persist `costPaid` for new cables.
- When loading old saves without `costPaid`, compute a fallback from current distance and cable type.
- When loading old saves with now-invalid long or blocked cables, choose one migration policy:
  - lenient: load existing cables but new placement must obey the rules
  - strict: drop invalid cables and optionally refund fallback cost

Recommended first policy: lenient for old saves, strict for new placements.

Relevant files:

- `src/managers/SaveManager.ts`
- `src/utils/saveMigration.ts`

### Phase 8: Map And Balance Follow-Up

After cable rules and repeater work are stable:

- Apply the standard map bounds from this plan.
- Increase standard map resource generation area to the planned resource bounds.
- Add finite camera and building bounds to avoid empty infinite scrolling.
- Add fixed enemy spawn zones and lane definitions if not already explicit.
- Place high-value resource clusters in neutral zones between lanes.
- Use terrain blockers to create early chokepoints and later wider fronts.

Relevant files:

- `src/config.ts`
- `src/managers/MapManager.ts`
- `src/managers/WaveManager.ts`
- `docs/GAME_BALANCE_MAP.md`

## Tests

Add focused Vitest coverage before broad e2e coverage.

Unit tests:

- `CableManager.canConnect()` allows valid free-angle cable.
- `CableManager.canConnect()` rejects same endpoint.
- `CableManager.canConnect()` rejects duplicates.
- `CableManager.canConnect()` rejects over-length cables.
- `CableManager.canConnect()` includes research length bonus.
- cable cost uses `ceil(distance / GRID_SIZE) * COST_PER_TILE`.
- blocker raycast rejects paths crossing `BLOCKER`.
- blocker raycast ignores ordinary buildings.
- repeater without power prevents relay.
- repeater removal removes attached cables.
- old save cable without `costPaid` receives fallback cost.

E2E smoke tests:

- Place Repeater, connect Basic cable through it, observe connected cable visuals.
- Attempt too-long cable and verify invalid feedback.
- Attempt cable through blocker and verify invalid feedback.
- Remove cable and verify refund log/inventory change.

Relevant test docs to update:

- `docs/TEST_MAP.md`
- `docs/QA_CHECKLIST.md`

## Risks And Open Questions

- Repeater as a truly bufferless transparent node may require careful routing logic because current cable transfer expects endpoint buildings to accept items.
- Free-angle supercover collision must match what the player sees; too strict collision near tile corners can feel unfair.
- Lenient old-save loading can preserve invalid legacy cables, which may confuse debugging unless clearly isolated to migration behavior.
- Distance-based cable costs can punish experimentation, so the 50% refund and preview cost display are important.
- Access Point and Repeater roles must stay visually and mechanically distinct.

## Documentation Updates When Implemented

Update these docs alongside the code change:

- `docs/PROJECT_MAP.md`
- `docs/FILE_ROLE_MAP.md`
- `docs/ARCHITECTURE.md`
- `docs/TEST_MAP.md`
- `docs/GAME_BALANCE_MAP.md`
