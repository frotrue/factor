# Project Analysis And Roadmap

Updated: 2026-05-23

## Current Status

Gradium now playable Phaser 3 + TypeScript factory-defense prototype with regression coverage. Core loop, onboarding, fixed intrusion ports, terrain blockers, destructible buildings, AP relay logistics, power networks, research, save/load, mobile controls, tactical HUD pass, wave results, model-training payoff, game-over stats done.

## Implemented Systems

### Core Factory Loop

- Silicon + Energy patches
- Extractor + Data Downloader
- Processor, Weight Trainer, Neural Trainer, Model Training Lab
- Core delivery -> Confidence Score
- Recycler + Data Cache support

### Logistics

- Conveyor + Fast Link move physical Silicon
- Ethernet + Fiber Cable move data
- AP Access Point relays nearby producers/receivers
- Storage/Data Cache excluded from AP source selection
- Destroyed buildings clean cables

### Power

- Core, Power Plant, Power Node, Solar Panel
- Network merge + blackout state
- Power overlay + placement preview

### Defense And Waves

- Classifier, Filter, Firewall
- Enemies: Noise, Malware, Adversarial, DDoS Packet, Overfitted Model
- Fixed onboarding ports:
  - Normal Wave 1~10: North Port
  - Normal Wave 11+: North + East
- Wave briefing: route names, threat level, special threat, recommended defense
- Wave result summary: enemies removed, Confidence gained, Core integrity, damaged/lost buildings
- Wave-start route labels + corridor hints
- Enemies attack non-core buildings when encountered/adjacent
- Target priority: Firewall, defense buildings, utility buildings

### Terrain

- BLOCKER terrain blocks placement + enemy pathing
- Generated around North Port opening lane, avoids Core + guaranteed resources
- Saved/loaded through `terrainMap`

### UI/UX

- Korean-first UI + English toggle
- Tutorial checklist for first factory-defense loop
- Tactical panels: objective, next wave, defense, power
- Post-first-defense objectives frame expand-production vs immediate-defense
- Model Training Lab UI explains training input + permanent growth
- Game-over stats: reached wave, Core integrity, Confidence, research count, strongest model
- Research hidden until first successful defense
- AP, Fiber, Fast Link, Unloader hidden until first defense success
- Compact mobile controls
- Tooltips/status for power, buffers, AP relay, model training, defense stats
- Placement ghost shows direction; installed buildings no extra arrows
- Visible labels moved toward data/network/security terms

### Persistence

- `localStorage` save/load
- Save migration through `CURRENT_SAVE_VERSION = 1.1.0`
- Saves wave state, buildings, HP, items, cables, terrain, resources, research, language, audio, tutorial state

### Tests

- Vitest unit/config/simulation tests: wave result, progression gates, model training summary, run result helpers
- Playwright desktop/mobile smoke tests
- Standard commands:
  - `npm test`
  - `npm run test:e2e`
  - `npm run build`

## Current Risks

### Balance Risk

Building HP + enemy building attacks work, but pacing still needs real play. If regular buildings break too often, early game feels punitive.

### Visual Clarity Risk

BLOCKER has data-debris treatment, but building/enemy art remains simple. Stronger pass likely after interaction model stabilizes.

### Documentation Encoding History

Some archive docs have old mojibake. Active docs rewritten for current state; treat archive as historical.

### Code Size

`MainScene`, `UIManager`, `EffectsManager` still large coordination files. Manageable now; future features should use small helpers.

## Recommended Roadmap

### P0: Manual Playtest And Tuning

- Play Normal Wave 1~15, record:
  - first failure point
  - most destroyed buildings
  - North Port defense readability
  - Wave 11 second-port fairness
- Tune:
  - building HP
  - enemy building attack interval/damage
  - BLOCKER layout
  - early rewards
  - whether reduced Wave 8 DDoS pressure still stresses midgame enough

### P1: Damage And Threat UX

- Add clearer `under attack` building status chips.
- Strengthen destroyed-building feedback.
- Localize damaged/destroyed logs.
- Check tactical panel alert states during active waves.

### P1: Save Compatibility Hardening

- Test loading saves with missing `terrainMap`.
- Test loading saves with missing building `hp`.
- Consider save version bump when terrain + building HP become permanent.

### P2: Terrain Expansion

- Optional removable debris after research unlock.
- Positive terrain: Signal Conduit tiles.
- Map seeds for reproducible tests.

### P2: Enemy Role Differentiation

- Noise: Core pressure
- Malware: infection + production disruption
- Adversarial: defense disruption
- DDoS: buffer/AP stress
- Overfitted Model: aura + lane-breaking pressure

### P3: Release Prep

- Add reset-save UI.
- Refresh README screenshots/GIFs after art stabilizes.
- Test mobile layout on physical devices.

## Recently Completed

- Onboarding intrusion ports
- Wave briefing metadata
- Route guidance overlays
- BLOCKER terrain
- Building HP/destruction
- Enemy building attacks
- Terrain + damaged HP save/load
- Removed installed-building direction arrows; kept ghost arrows
- Direction realignment report + implementation plan
- Tactical objective/wave/defense/power panels
- Research + advanced logistics gating after first defense
- Cyber/data terminology pass for high-impact building names
- BLOCKER data-debris visual treatment
- Wave result summary + factory-growth feedback
- Expand-vs-defend objective states after first defense
- Model Training Lab permanent-growth copy + defense status training line
- Early Unloader gating with advanced logistics
- Game-over run stats
- Reduced default DDoS pressure for Wave 8+ from 10/8-12 to 6/6-8
- Category accent marks on building visuals
