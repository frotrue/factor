# Gradium Direction Realignment Plan

Updated: 2026-05-23

Status: Active product direction. Second implementation pass complete as of 2026-05-23.

## Purpose

Capture agreed direction for current realignment pass. Do not remake game from scratch. Preserve playable factory-defense prototype, clarify core experience, reduce early-game ambiguity through onboarding, UI structure, terminology, system exposure order.

## Agreed Core Direction

Gradium: compact cyber factory-defense game. Player builds data-processing factory, places defensive infrastructure, survives intrusion waves. Early play rewards placement + readable defense line. Later play makes data pipeline + model training feel like second-stage defense growth.

Current weight: factory automation 60 / tower defense 40. Factory = long-term power source; waves = pressure + validation.

Short direction statement:

> Build the data factory, place a readable defense line, survive intrusion waves,
> then use the data pipeline and model training to make the defense AI stronger.

## Genre Position

Balanced hybrid:

- Factory automation: high importance
- Tower defense: high importance
- Resource management: medium importance
- Strategy: medium importance
- Idle/resource-only progression: low importance

Do not drift into pure tower defense or pure factory automation. Strongest identity: production decisions connect to defense outcomes.

## Player Experience Target

Player should feel:

- First minutes: "My placement and defense line decisions matter."
- After first successful defense: "I can grow stronger by improving the factory."
- Midgame: "My data pipeline is feeding better defense models."
- Under pressure: "Next intrusion wave forces production, power, logistics, or defense adjustment."

Main moment to protect:

> A player builds a small working system, sees it help the defense survive, then
> understands why expanding the data pipeline matters.

## Core Loop

Recommended loop:

1. Place initial data + resource infrastructure.
2. Build small data-processing line.
3. Place readable defense line against known intrusion route.
4. Survive first wave through placement + coverage.
5. Open research after first defense success.
6. Expand production, power, logistics, defense in response to waves.
7. Unlock model training so processed data upgrades defense models.
8. Review wave results: factory growth, defense outcome, Core integrity.

Condensed loop:

```text
Build data flow -> Place defense -> Survive wave -> Unlock growth ->
Improve factory -> Train defense models -> Handle stronger intrusions
```

## Early Game Priorities

First five minutes show only systems needed for core experience.

### Show Early

- Neural Core as protected center
- Data Downloader / basic data production
- Processor or Weight Trainer as first data-processing step
- Classifier and/or Firewall as obvious first defense tools
- North Port as first intrusion route
- Basic wave warning + route guidance

### De-Emphasize Early

- AP relays
- Fiber cable
- Fast Link
- Complex research choices
- Blackout optimization
- Advanced model training
- Solar/auxiliary power optimization

Do not remove these systems. Introduce after player understands production-defense link.

## Research Timing

Research opens after first successful defense, not before threat is understood.

Recommended behavior:

- First wave success unlocks/highlights research UI.
- First research choices reinforce factory-defense identity.
- Research feels like survival reward, not onboarding attention tax.

## Defense Growth Timing

Early defense growth comes from placement + defense line construction.

Model training introduced later as second-stage growth:

- Before model training: "Good placement helped me survive."
- After model training: "My data pipeline makes the same defense smarter."

Preserve `Model Training Lab` value while avoiding abstract early game.

## Power System Direction

Power remains, but early burden reduced.

Recommended early behavior:

- Core-adjacent power enough for first learning loop.
- Power status visible, not dominant.
- Warnings only when power becomes practical problem.
- Blackout/grid optimization becomes meaningful midgame.

Power = support pressure, not first lesson.

## UI Realignment Scope

UI changes allowed. Keep terminal/cyber identity; reorganize information.

First UI goals:

1. Separate wave briefing from cramped wave timer.
2. Show defensive readiness + growth clearly.
3. Improve current objective/tutorial guidance.

Recommended first-pass panels:

- Current Objective: next action player should understand
- Next Wave: route, threat type, special threat, recommended response
- Defense Status: active defense tools, coverage, model confidence when unlocked
- Power Status: compact summary + warning state

Avoid full visual reset until interaction structure clearer.

## Terminology Direction

Keep systems where possible; improve names that feel generic/traditional-factory.

Candidates for later naming review:

| Current | Possible Direction |
| --- | --- |
| Storage | Resource Buffer |
| Unloader | Buffer Emitter / Output Gate |
| Recycler | Data Reclaimer / Garbage Collector |
| Power Plant | Energy Converter |
| Power Node | Grid Relay / Power Relay |
| Solar Panel | Auxiliary Power Cell |
| Processor | Labeling Pipeline |
| Data Downloader | Packet Ingestor |
| Fast Link | High-Speed Bus |

Do not rename everything at once. Rename only when new term improves player understanding.

## System Classification

### Keep

- Neural Core
- Data pipeline items: Signal Packet, Labeled Data, Weight Update
- Confidence Score
- Classifier, Anomaly Engine, Firewall
- Fixed intrusion ports + wave pressure
- Building damage + enemy attacks

### Keep But Improve

- Tutorial/current objective flow
- Wave briefing
- Defense model state display
- Power warning UX
- BLOCKER terrain explanation
- Building role icons/silhouettes

### Rename Or Clarify

- Storage
- Unloader
- Recycler
- Power Plant
- Solar Panel
- Power Node

### Defer In Early Game

- AP
- Fiber
- Fast Link
- Unloader
- Advanced model training
- Complex research choices
- Power-grid optimization

### Avoid For This Pass

- Large new building sets
- Large new enemy sets
- Removing existing systems
- Pure tower-defense conversion
- Pure factory-automation conversion
- Full art reset before UX structure settled

## Visual Direction

Target style:

- Dark cyber terminal
- Neon grid
- Readable 2D top-down modules
- Compact factory/tower-defense objects
- Data/network/factory identity visible at small scale
- Simple shapes, not generic placeholder icons
- Avoid overly detailed sci-fi illustration

Visual rules to keep:

- Strong neon cyan/magenta/green accents
- Compact grid-based building silhouettes
- Data pulses + route guidance
- Clear contrast among buildings, terrain, enemies, UI

Visual rules to improve:

- Buildings communicate category through silhouette, not only color.
- Defense buildings differ from production at 32x32.
- Enemy types distinguish by motion/marker plus color.
- BLOCKER terrain needs clearer "data debris / blocked route" identity.

## Recommended Implementation Order

Completed first pass:

1. Documented + locked first five-minute flow.
2. Added Current Objective, Next Wave, Defense Status, Power Status panels.
3. Improved objective/tutorial guidance around first defense success.
4. Added defense readiness + compact model-confidence status.
5. Moved research reveal after first successful defense.
6. Reduced early exposure of AP, Fiber, Fast Link, advanced systems.
7. Renamed high-impact generic labels toward data/network/security terms.
8. Tuned BLOCKER terrain visual language as data debris.

Second pass completed:

1. Added wave result summaries.
2. Added post-first-defense expand-vs-defend objective states.
3. Improved Model Training Lab permanent-growth explanation.
4. Added defense status training line for active model training.
5. Delayed Unloader exposure until after first defense success.
6. Added game-over run stats.
7. Reduced Wave 8+ DDoS pressure for readability.
8. Added small category accent marks to buildings.

Next pass: manual playtest tuning, stronger damaged/destroyed building feedback, release-readiness polish.

## Immediate Next Decisions

User interview decisions:

- Early defense growth from placement first.
- Model training opens later as second-stage power increase.
- Research opens after first successful defense.
- UI needs tactical-panel restructure, not text-only tweaks.

Remaining product decisions:

- Exact visible names for every building after another playtest pass.
- Whether reduced DDoS pressure creates enough midgame stress.
- Whether damaged building triage uses status chips, stronger effects, or both.
- Whether game-over stats need deeper economy metrics beyond current live-state values.

## Non-Goals

- Do not delete major systems as first response to ambiguity.
- Do not add lots of new content before clarifying existing content.
- Do not reframe as pure tower defense.
- Do not reframe as pure factory automation.
- Do not full-art-reset before UI/onboarding structure decided.

## Success Criteria

Realignment successful when:

- New player understands within five minutes that building + defense connect.
- First wave readable + fair.
- Research feels like reward after survival.
- Model training feels like meaningful second-stage defense growth.
- Power, logistics, advanced networking support core loop instead of obscuring it.
- Existing implemented systems preserved wherever practical.
