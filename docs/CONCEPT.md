# Neural Factory Concept

Updated: 2026-05-23

## One-Line Pitch

Neural Factory is a compact cyber factory-defense game. The player builds a
data-processing factory, places a readable defense line, survives intrusion
waves, and later uses model training to make defensive systems stronger.
Current direction weights this as factory automation 60 / tower defense 40:
factory expansion is the main growth engine, and waves validate whether that
growth was invested well enough into defense.

## Current Identity

The project should stay a hybrid of:

- Factory automation: build and connect data/resource production.
- Tower defense: place defenses against known intrusion routes.
- Resource management: keep power, buffers, and production stable.
- Strategy: decide when to expand, defend, research, and train models.

It should not become a pure idle game, pure tower defense game, or pure factory
sandbox. The core identity is the link between production decisions and defense
outcomes.

## Core Loop

```text
Build data flow -> Place defense -> Survive wave -> Unlock growth ->
Improve factory -> Train defense models -> Handle stronger intrusions
```

In play, this means:

1. Check nearby Silicon, Energy, route, and terrain.
2. Build a small resource/data pipeline.
3. Place basic defense on the expected intrusion route.
4. Survive the wave through placement and coverage.
5. Unlock research after the first successful defense.
6. Expand power, logistics, production, and defense.
7. Use processed data and model training to improve defensive capability.
8. Read wave result summaries to understand how factory growth affected the
   defense outcome.

## Early Game Direction

The first few minutes should teach only the systems required for the
factory-defense loop:

- Neural Core is the protected center.
- Packet Ingestor and Labeling Pipeline establish data flow.
- Classifier and Firewall establish the first defense line.
- North Port is the first clear intrusion route.
- Research, advanced logistics, and model training appear after the player has
  survived an initial defense.
- After the first defense, objectives should present the main tradeoff:
  expand production for long-term growth or invest in immediate defense.

Advanced systems should remain in the game, but they should not compete for the
player's attention before the threat is understood.

## Implemented Systems

- `MapManager`: resource patches, blocker terrain, generated lane shaping.
- `WaveManager`: wave planning, port selection, route/threat briefings.
- `BaseEnemy`: movement, pathing, special states, building attacks.
- `BaseBuilding`: common HP, damage, destruction, infection state.
- `CableManager`: data transfer, Fiber/AP logistics, cleanup after destruction.
- `PowerManager`: power network calculation, blackout state, placement preview.
- `ResearchManager`: unlocks and upgrade effects.
- `TutorialManager`: first-loop checklist and saved progress.
- `UIManager`: tactical panels, build bar, wave/status feedback, tooltips.
- `waveResultSummary`, `progressionGates`, `modelTrainingSummary`, and
  `runResultSummary`: focused helpers for feedback, objective gating, model
  payoff copy, and game-over stats.

## Visual Direction

The target style is:

- dark cyber terminal
- neon grid
- readable 2D top-down modules
- compact factory/tower-defense objects
- data, network, and security identity visible at small tile sizes

Prefer simple silhouettes with distinctive accents over complex illustration.
Buildings and enemies must remain readable at 32x32 or 64x64 scale.

## Naming Direction

Visible names should lean on computer science, AI, networking, and security:

- data ingestion
- labeling pipeline
- cache/buffer
- firewall
- packet filter
- inference node
- anomaly detector
- rate limiter
- scheduler
- load balancer

Avoid generic industrial names when a cyber/data term can explain the same
gameplay role more clearly.

## Current Product Rule

When adding or changing systems, preserve the current playable prototype first.
Prefer small clarifications, better sequencing, better names, and clearer UI
before adding large new mechanics.
