import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import Miner from './Miner';
import Conveyor from './Conveyor';
import Processor from './Processor';
import Core from './Core';
import PowerPlant from './PowerPlant';
import PowerNode from './PowerNode';
import Storage from './Storage';
import Unloader from './Unloader';
import { BuildingOptions } from '../types';

type BuildingClass = new (scene: Phaser.Scene, x: number, y: number, config?: BuildingOptions) => BaseBuilding;

const REGISTRY: Record<string, BuildingClass> = {
    MINER: Miner,
    CONVEYOR: Conveyor,
    PROCESSOR: Processor,
    CORE: Core,
    POWER_PLANT: PowerPlant,
    POWER_NODE: PowerNode,
    STORAGE: Storage,
    UNLOADER: Unloader
};

export function createBuilding(scene: Phaser.Scene, x: number, y: number, type: string, config: BuildingOptions = {}): BaseBuilding | null {
    const BuildingCls = REGISTRY[type];
    if (!BuildingCls) {
        console.warn(`Unknown building type: ${type}`);
        return null;
    }
    return new BuildingCls(scene, x, y, config);
}

export function registerBuilding(type: string, BuildingCls: BuildingClass): void {
    REGISTRY[type] = BuildingCls;
}
