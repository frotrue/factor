# Playability Hardening Plan

Updated: 2026-05-21

## Goal

Make the current build understandable and stable for a new player in the first 10 minutes, while preserving enough tactical pressure for midgame play.

## Completed Hardening

- Mobile layout and action bar
- Desktop and mobile smoke tests
- Camera starts centered on Core
- Modal focus restoration
- Tooltip viewport clamping
- Power and defense range overlays
- Building placement range preview
- Cable connection state feedback
- Tutorial flow for core factory loop
- Fixed onboarding intrusion ports
- Wave briefing data and route overlays
- BLOCKER terrain lane shaping
- Building HP and destruction
- Enemy building attacks
- Save/load for terrain and damaged building HP
- Installed-building arrows removed; placement ghost arrows kept

## Current Hardening Targets

### 1. Early Combat Fairness

Risk: Enemies can now destroy buildings, which may feel harsh if damage pacing is too high.

Manual checks:

- [ ] Wave 1 does not destroy critical buildings before the player understands the threat.
- [ ] Firewall absorbs pressure better than utility buildings.
- [ ] Damage indicators are visible enough.
- [ ] Destroyed building/cable consequences are understandable.

### 2. Threat Readability

Risk: Route, terrain, damage, and wave information may compete for attention.

Planned improvements:

- [ ] Dedicated next-wave briefing panel
- [ ] `UNDER ATTACK` status chip
- [ ] Better destroyed-building message
- [ ] Terrain tooltip for BLOCKER

### 3. Mobile Usability

Risk: Combat lane, terrain, and tooltips may crowd small screens.

Manual checks:

- [ ] 390x844 portrait
- [ ] 844x390 landscape
- [ ] 768x1024 tablet portrait
- [ ] Pinch/drag does not accidentally place buildings
- [ ] Action bar states remain clear during cable/defense/power modes

### 4. Save Robustness

Risk: New terrain and building HP fields must not break older saves.

Planned tests:

- [ ] Old save without `terrainMap`
- [ ] Old save without building `hp`
- [ ] Damaged building round-trip
- [ ] Terrain blocker round-trip

## Completion Criteria For Current Hardening Pass

- `npm test` passes.
- `npm run test:e2e` passes.
- `npm run build` passes.
- Normal Wave 1~10 can be completed by a new player following tutorial hints.
- Wave 11 second-port introduction is understandable.
- Building damage increases tension without causing confusing sudden failure.
