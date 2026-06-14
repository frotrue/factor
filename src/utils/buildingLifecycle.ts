export type BuildingRemovalReason = 'removed' | 'destroyed';
export type BuildingLifecycleEvent = 'BUILDING_REMOVED' | 'BUILDING_DESTROYED';

export function getBuildingLifecycleEvent(reason: BuildingRemovalReason): BuildingLifecycleEvent {
    return reason === 'destroyed' ? 'BUILDING_DESTROYED' : 'BUILDING_REMOVED';
}
