# Project Analysis And Roadmap

Updated: 2026-05-21

## Current Status

Neural Factory is now a playable Phaser 3 + TypeScript factory-defense prototype with automated regression coverage. The core loop, early onboarding, fixed intrusion ports, terrain blockers, destructible buildings, AP relay logistics, power networks, research, save/load, mobile controls, and first-pass tactical HUD realignment are implemented.

## Implemented Systems

### Core Factory Loop

- Silicon and Energy resource patches
- Extractor and Data Downloader
- Processor, Weight Trainer, Neural Trainer, Model Training Lab
- Confidence Score gained through Core data delivery
- Recycler and Data Cache support buildings

### Logistics

- Conveyor and Fast Link for physical Silicon movement
- Ethernet and Fiber Cable for data movement
- AP Access Point session relay for nearby producers/receivers
- Storage/Data Cache exclusion rules for AP source selection
- Cable cleanup when buildings are destroyed

### Power

- Core, Power Plant, Power Node, Solar Panel
- Power network merging and blackout state
- Power grid overlay and placement previews

### Defense And Waves

- Classifier, Filter, Firewall
- Enemy types: Noise, Malware, Adversarial, DDoS Packet, Overfitted Model
- Fixed onboarding port policy:
  - Normal Wave 1~10: North Port
  - Normal Wave 11+: North + East
- Wave briefing metadata: route names, threat level, special threat, recommended defense
- Wave-start route labels and corridor hints
- Enemies attack non-core buildings when encountered or adjacent
- Building target priority: Firewall, defense buildings, utility buildings

### Terrain

- BLOCKER terrain
- Blocks building placement
- Blocks enemy pathing
- Generated around the North Port opening lane without covering Core or guaranteed resource patches
- Saved and loaded through `terrainMap`

### UI/UX

- Korean-first UI with English language toggle
- Tutorial checklist for the first factory-defense loop
- Tactical panels for current objective, next wave, defense status, and power state
- Research is hidden until the first successful defense
- AP, Fiber, and Fast Link are hidden from early build choices until first defense success
- Compact mobile controls
- Tooltip/status information for power, buffers, AP relay, model training, defense stats
- Placement ghost displays direction; installed buildings do not show extra direction arrows
- Visible building labels have been moved toward data/network/security terminology

### Persistence

- `localStorage` save/load
- Save migration through `CURRENT_SAVE_VERSION = 1.1.0`
- Saves wave state, buildings, building HP, items, cables, terrain, resources, research, language, audio, tutorial state

### Tests

- Vitest unit/config/simulation tests
- Playwright desktop/mobile smoke tests
- Current standard commands:
  - `npm test`
  - `npm run test:e2e`
  - `npm run build`

## Current Risks

### Balance Risk

Building HP and enemy building attacks are implemented, but the exact damage pacing still needs real playtesting. If regular buildings break too often, the early game may feel punitive.

### Visual Clarity Risk

BLOCKER terrain now has a small data-debris visual treatment, but the broader building/enemy art direction is still simple. It may need a stronger pass once the interaction model is stable.

### Documentation Encoding History

Some archived documents contain old mojibake text. Active documents have been rewritten for the current project state; archive files should be treated as historical references.

### Code Size

`MainScene`, `UIManager`, and `EffectsManager` remain large coordination files. They are manageable now, but future feature work should prefer small helper modules when possible.

## Recommended Roadmap

### P0: Manual Playtest And Tuning

- Play Normal Wave 1~15 and record:
  - first failure point
  - buildings most frequently destroyed
  - whether North Port defense is understandable
  - whether Wave 11 second-port introduction feels fair
- Tune:
  - building HP
  - enemy building attack interval/damage
  - BLOCKER layout
  - early rewards

### P1: Damage And Threat UX

- Add clearer "under attack" status chips for buildings.
- Add stronger destroyed-building feedback.
- Add localized log copy for damaged and destroyed buildings.
- Review whether the tactical panels need additional alert states during active waves.

### P1: Save Compatibility Hardening

- Add tests for loading saves with missing `terrainMap` and missing building `hp`.
- Consider bumping save version when terrain and building HP become permanent.

### P2: Terrain Expansion

- Add optional removable debris after a research unlock.
- Add positive terrain such as Signal Conduit tiles.
- Add map seeds for reproducible testing.

### P2: Enemy Role Differentiation

- Noise: Core pressure
- Malware: infection and production disruption
- Adversarial: defense disruption
- DDoS: buffer/AP stress
- Overfitted Model: aura and lane-breaking pressure

### P3: Release Prep

- Add game-over stats screen.
- Add reset-save UI.
- Refresh README screenshots or GIFs after visual art stabilizes.
- Review mobile layout on physical devices.

## Recently Completed

- Onboarding intrusion ports
- Wave briefing metadata
- Route guidance overlays
- BLOCKER terrain
- Building HP and destruction
- Enemy building attacks
- Save/load for terrain and damaged HP
- Removal of installed-building direction arrows while preserving ghost direction arrows
- Direction realignment report and implementation plan
- Tactical objective/wave/defense/power panels
- Research and advanced logistics gating after first defense success
- Cyber/data terminology pass for high-impact building names
- BLOCKER data-debris visual treatment
