import Phaser from 'phaser';
import BaseBuilding from './BaseBuilding';
import Miner from './Miner';
import Processor from './Processor';
import WeightTrainer from './WeightTrainer';
import Core from './Core';
import PowerPlant from './PowerPlant';
import PowerNode from './PowerNode';
import Storage from './Storage';
import DefenseTower, { Classifier, Filter, Firewall } from './DefenseTower';
import SolarPanel from './SolarPanel';
import NeuralTrainer from './NeuralTrainer';
import AccessPoint from './AccessPoint';
import DataDownloader from './DataDownloader';
import Recycler from './Recycler';
import DataCache from './DataCache';
import ModelTrainingLab from './ModelTrainingLab';
import ResearchLab from './ResearchLab';
import DataCenter from './DataCenter';
import GpuCluster from './GpuCluster';
import Repeater from './Repeater';
import { BuildingOptions } from '../types';

type BuildingClass = new (scene: Phaser.Scene, x: number, y: number, config?: BuildingOptions) => BaseBuilding;

const REGISTRY: Record<string, BuildingClass> = {
    MINER: Miner,
    DATA_DOWNLOADER: DataDownloader,
    PROCESSOR: Processor,
    CORE: Core,
    POWER_PLANT: PowerPlant,
    POWER_NODE: PowerNode,
    STORAGE: Storage,
    CLASSIFIER: Classifier,
    FILTER: Filter,
    FIREWALL: Firewall,
    SOLAR_PANEL: SolarPanel,
    NEURAL_TRAINER: NeuralTrainer,
    WEIGHT_TRAINER: WeightTrainer,
    MODEL_TRAINING_LAB: ModelTrainingLab,
    RESEARCH_LAB: ResearchLab,
    DATA_CENTER: DataCenter,
    GPU_CLUSTER: GpuCluster,
    RECYCLER: Recycler,
    ACCESS_POINT: AccessPoint,
    REPEATER: Repeater,
    DATA_CACHE: DataCache
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
