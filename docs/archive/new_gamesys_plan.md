# ⚙️ Logistics & Resource System Overhaul

This plan addresses the user's feedback regarding the realism of the current system. We will differentiate between **Physical Resources** (Silicon) and **Virtual Data**, implementing appropriate logistics for each.

## User Review Required

> [!IMPORTANT]
> - **Dual Logistics System**: We will have both **Conveyors** (for Silicon) and **Cables** (for Data). 
> - **Resource Rebranding**: "Raw Data Patches" will be rebranded as "Signal Nodes" or "Data Ports".
> - **Miner Rebranding**: The "Miner" building will behave differently depending on the resource it's on (e.g., "Silcon Drill" vs "Data Uplink").

## Proposed Changes

### 1. Logistics System Separation

#### [DONE] [Conveyor.ts](file:///c:/Users/user/Desktop/react/factor/src/buildings/Conveyor.ts)
- Implemented a physical belt system.
- Silicon moves along belt direction on ticks.
- Supports 4-way rotation.
- Only accepts physical items (Silicon).

#### [DONE] [CableManager.ts](file:///c:/Users/user/Desktop/react/factor/src/managers/CableManager.ts)
- Restricted Cables to only transport **Data-type items** (Signal Packet, Labeled Data, Weight Updates, etc.).
- Prevented Silicon from being injected into Cables.

### 2. Resource & Building Rebranding

#### [DONE] [config.ts](file:///c:/Users/user/Desktop/react/factor/src/config.ts)
- Removed Signal Source as a map resource. Data now comes from the Data Downloader building, while the internal `RAW_DATA` item id remains for recipe compatibility.
- Updated building descriptions to reflect dual extraction behavior.
- Re-enabled `CONVEYOR` and `FAST_LINK` in the config.

#### [DONE] [Miner.ts](file:///c:/Users/user/Desktop/react/factor/src/buildings/Miner.ts)
- Visually changes based on the resource type below it.
- If on Silicon: uses a drill/miner look and outputs Silicon for Conveyors.
- Data Downloader uses an antenna/uplink look and outputs Signal Packets for Cables anywhere it has power.

### 3. Core Gameplay Loop Adjustments

#### [DONE] [TickSystem.ts](file:///c:/Users/user/Desktop/react/factor/src/managers/TickSystem.ts)
- Conveyors are processed through building ticks.
- Cables continue to be processed through `CableManager`.
- Smooth sub-tick belts remain a future visual polish item.

## Verification Plan

### Automated Tests
- Build a Silicon patch with a Miner + Conveyor -> Verify Silicon moves on the belt.
- Build a Data patch with a Miner + Cable -> Verify Data packets move through the cable.
- Try to put Silicon on a Cable -> Verify it's blocked.
- Try to put Data on a Conveyor -> Verify it's blocked.

### Manual Verification
- Visual check: Does the belt animation look smooth?
- UX check: Does the "Data Receiving" theme feel better than "Data Mining"?
