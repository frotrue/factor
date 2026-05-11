import Miner from './Miner';
import Processor from './Processor';
import WeightTrainer from './WeightTrainer';
import Core from './Core';
import PowerPlant from './PowerPlant';
import PowerNode from './PowerNode';
import Storage from './Storage';
import Unloader from './Unloader';
import { Classifier, Filter, Firewall } from './DefenseTower';
import SolarPanel from './SolarPanel';
import NeuralTrainer from './NeuralTrainer';
import AccessPoint from './AccessPoint';
const REGISTRY = {
    MINER: Miner,
    PROCESSOR: Processor,
    CORE: Core,
    POWER_PLANT: PowerPlant,
    POWER_NODE: PowerNode,
    STORAGE: Storage,
    UNLOADER: Unloader,
    CLASSIFIER: Classifier,
    FILTER: Filter,
    FIREWALL: Firewall,
    SOLAR_PANEL: SolarPanel,
    NEURAL_TRAINER: NeuralTrainer,
    WEIGHT_TRAINER: WeightTrainer,
    ACCESS_POINT: AccessPoint
};
export function createBuilding(scene, x, y, type, config = {}) {
    const BuildingCls = REGISTRY[type];
    if (!BuildingCls) {
        console.warn(`Unknown building type: ${type}`);
        return null;
    }
    return new BuildingCls(scene, x, y, config);
}
export function registerBuilding(type, BuildingCls) {
    REGISTRY[type] = BuildingCls;
}
//# sourceMappingURL=BuildingFactory.js.map