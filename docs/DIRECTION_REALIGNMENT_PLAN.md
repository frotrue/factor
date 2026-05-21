# Neural Factory Direction Realignment Plan

Updated: 2026-05-21

Status: Active product direction. The first implementation pass is complete as
of 2026-05-21.

## Purpose

This document captures the agreed direction for the current realignment pass.
The goal is not to remake the game from scratch. The goal is to preserve the
current playable factory-defense prototype, clarify its core experience, and
reduce early-game ambiguity through onboarding, UI structure, terminology, and
system exposure order.

## Agreed Core Direction

Neural Factory is a compact cyber factory-defense game where the player builds a
data-processing factory, places defensive infrastructure, and survives intrusion
waves. Early play should reward good building placement and defensive line
construction. Later play should make the data pipeline and model training feel
like a second-stage defense growth engine.

Short direction statement:

> Build the data factory, place a readable defense line, survive intrusion waves,
> then use the data pipeline and model training to make the defense AI stronger.

## Genre Position

The project should remain a balanced hybrid:

- Factory automation: high importance
- Tower defense: high importance
- Resource management: medium importance
- Strategy: medium importance
- Idle/resource-only progression: low importance

The game should not drift into pure tower defense or pure factory automation.
The strongest identity is the connection between production decisions and
defense outcomes.

## Player Experience Target

The player should feel:

- In the first minutes: "My placement and defense line decisions matter."
- After the first successful defense: "I can grow stronger by improving the
  factory."
- In the midgame: "My data pipeline is feeding better defense models."
- Under pressure: "The next intrusion wave forces me to adjust production,
  power, logistics, or defense."

The main moment to protect is:

> A player builds a small working system, sees it help the defense survive, then
> understands why expanding the data pipeline matters.

## Core Loop

Recommended loop:

1. Place initial data and resource infrastructure.
2. Build a small data-processing line.
3. Place a readable defense line against the known intrusion route.
4. Survive the first wave through building placement and defense coverage.
5. Open research after the first defense success.
6. Expand production, power, logistics, and defense in response to wave pressure.
7. Unlock model training so processed data upgrades defensive models.

Condensed loop:

```text
Build data flow -> Place defense -> Survive wave -> Unlock growth ->
Improve factory -> Train defense models -> Handle stronger intrusions
```

## Early Game Priorities

The first five minutes should emphasize only the systems needed to understand the
core experience.

### Show Early

- Neural Core as the protected center
- Data Downloader / basic data production
- Processor or Weight Trainer as the first data-processing step
- Classifier and/or Firewall as the first obvious defense tools
- North Port as the first intrusion route
- Basic wave warning and route guidance

### De-Emphasize Early

- AP relays
- Fiber cable
- Fast Link
- Complex research tree choices
- Blackout optimization
- Advanced model training
- Solar or auxiliary power optimization

These systems should not be removed. They should be introduced after the player
understands that production and defense are connected.

## Research Timing

Research should open after the first successful defense, not before the player
understands the threat.

Recommended behavior:

- First wave success unlocks or highlights the research UI.
- The first research choices should reinforce the factory-defense identity.
- Research should feel like a reward for survival, not another system competing
  for attention during onboarding.

## Defense Growth Timing

Early defense growth should come primarily from building placement and defense
line construction.

Model training should be introduced later as a second-stage growth layer:

- Before model training: "Good placement helped me survive."
- After model training: "My data pipeline makes the same defense smarter."

This preserves the value of `Model Training Lab` while preventing the early game
from becoming too abstract.

## Power System Direction

Power should remain, but early burden should be reduced.

Recommended early behavior:

- Core-adjacent power is enough for the first learning loop.
- Power status should be visible but not dominant.
- Warnings should appear only when power becomes a practical problem.
- Blackout and grid optimization should become meaningful in the midgame.

Power is a support pressure, not the first lesson.

## UI Realignment Scope

UI changes are allowed and likely necessary. The terminal/cyber identity should
remain, but the information structure can be reorganized.

First UI goals:

1. Separate wave briefing from the cramped wave timer.
2. Show defensive readiness and growth more clearly.
3. Improve current objective/tutorial guidance.

Recommended first-pass panels:

- Current Objective: the next action the player should understand
- Next Wave: route, threat type, special threat, recommended response
- Defense Status: active defense tools, coverage, model confidence when unlocked
- Power Status: compact summary and warning state

Avoid a full visual reset until the interaction structure is clearer.

## Terminology Direction

Keep existing systems where possible, but improve names that feel too generic or
too much like a traditional factory game.

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

Do not rename everything at once. Rename only when the new term improves player
understanding.

## System Classification

### Keep

- Neural Core
- Data pipeline items: Signal Packet, Labeled Data, Weight Update
- Confidence Score
- Classifier, Anomaly Engine, Firewall
- Fixed intrusion ports and wave pressure
- Building damage and enemy attacks

### Keep But Improve

- Tutorial/current objective flow
- Wave briefing
- Defense model state display
- Power warning UX
- BLOCKER terrain explanation
- Building role icons and silhouettes

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
- Advanced model training
- Complex research choices
- Power-grid optimization

### Avoid For This Pass

- Large new building sets
- Large new enemy sets
- Removing existing systems
- Converting the game into pure tower defense
- Converting the game into pure factory automation
- Full art reset before UX structure is settled

## Visual Direction

Target style:

- Dark cyber terminal
- Neon grid
- Readable 2D top-down modules
- Compact factory/tower-defense objects
- Data/network/factory identity visible at small scale
- Simple shapes, but not generic placeholder icons
- Avoid overly detailed sci-fi illustration

Visual rules to keep:

- Strong neon cyan/magenta/green accent language
- Compact grid-based building silhouettes
- Data pulses and route guidance
- Clear contrast between buildings, terrain, enemies, and UI

Visual rules to improve:

- Buildings should communicate category through silhouette, not only color.
- Defense buildings should read differently from production buildings at 32x32.
- Enemy types should be distinguishable by motion/marker as well as color.
- BLOCKER terrain needs a clearer "data debris / blocked route" identity.

## Recommended Implementation Order

Completed first pass:

1. Documented and locked the first five-minute intended flow.
2. Added Current Objective, Next Wave, Defense Status, and Power Status panels.
3. Improved objective/tutorial guidance around the first defense success.
4. Added defense readiness and compact model-confidence status.
5. Moved research reveal to after first successful defense.
6. Reduced early exposure of AP, Fiber, Fast Link, and advanced systems.
7. Renamed high-impact generic visible labels toward data/network/security terms.
8. Tuned visual language for BLOCKER terrain as data debris.

Next pass should focus on manual playtest tuning, damage feedback, and clearer
midgame model-training payoff.

## Immediate Next Decisions

User decisions from the interview:

- Early defense growth comes from building placement first.
- Model training opens later and should feel like a second-stage power increase.
- Research opens after the first successful defense.
- UI needs a tactical-panel restructure instead of only text tweaks.

Remaining product decisions:

- Which exact visible names should ship for every building after another
  playtest pass.
- How strongly model training should change tower behavior once it becomes the
  midgame growth layer.
- Whether damaged building triage should be solved with status chips, stronger
  effects, or both.

## Non-Goals

- Do not delete major systems as the first response to ambiguity.
- Do not add a large amount of new content before clarifying existing content.
- Do not reframe the game as pure tower defense.
- Do not reframe the game as pure factory automation.
- Do not perform a full art reset before the UI and onboarding structure are
  decided.

## Success Criteria

The realignment pass is successful when:

- A new player understands within five minutes that building and defense are
  connected.
- The first wave is readable and fair.
- Research feels like a reward after survival.
- Model training feels like a meaningful second-stage defense growth system.
- Power, logistics, and advanced networking support the core loop instead of
  obscuring it.
- Existing implemented systems are preserved wherever practical.
