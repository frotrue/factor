# Gameplay UX Critique

Updated: 2026-05-21

## Summary

The project has moved from a broad prototype into a playable factory-defense loop. The strongest recent UX improvements are fixed onboarding ports, wave briefing data, terrain lane shaping, and building damage feedback. The biggest remaining UX risk is not missing functionality; it is whether new combat pressure is readable and fair.

## Strengths

### Clearer First Objective

Normal Wave 1~10 focuses on North Port, giving players a specific place to defend before multi-port pressure begins.

### Better Tactical Readability

Wave briefing data communicates:

- next wave number
- active route names
- threat level
- special threat
- recommended defense

Wave start effects label active ports and draw a corridor toward the Core.

### More Meaningful Defense Lines

BLOCKER terrain creates a defendable lane. Enemies can attack buildings, so Firewall and forward defense placement matter more than before.

### Stronger System Feedback

Tooltips and status markers communicate power, buffers, AP relay state, model confidence, and damage. Building HP bars appear when damaged.

### Mobile Baseline Exists

Mobile portrait/landscape controls are covered by Playwright smoke tests and support placement, cable mode, rotate, remove, defense, and power toggles.

## Main Friction Points

### Wave Briefing Is Too Compressed

The wave timer currently carries too much information. A dedicated compact panel would reduce scanning friction.

### Building Damage Needs Better Triage

HP bars and flashes exist, but a player may still miss which building is under attack during a busy wave.

Recommended:

- `UNDER ATTACK` chip
- critical building alert
- clearer destroyed-building log

### Terrain Needs Explanation

BLOCKER terrain is functional but may be visually ambiguous. It needs hover/tooltip text or a distinct style pass.

### Installed Versus Ghost Direction

Current intended behavior:

- placement ghost shows direction
- installed buildings do not show extra arrows

This keeps planning clarity without adding visual noise after placement.

## Recommended UX Next Steps

1. Add dedicated next-wave briefing panel.
2. Add building under-attack chips.
3. Add BLOCKER terrain tooltip.
4. Playtest Wave 1~15 and tune enemy building damage.
5. Add a game-over stats screen that explains what failed.

## Watch List

- If building destruction feels random, reduce regular enemy building damage.
- If Firewall feels mandatory too early, increase Wave 1~3 leniency.
- If BLOCKER terrain hides resource planning, reduce blocker density near Core.
- If mobile UI feels crowded, collapse wave briefing into a small icon + drawer.
