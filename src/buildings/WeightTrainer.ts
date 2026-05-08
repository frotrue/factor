import Phaser from 'phaser';
import AbstractProcessor from './AbstractProcessor';
import { BuildingOptions } from '../types';

export default class WeightTrainer extends AbstractProcessor {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'WEIGHT_TRAINER', 'WEIGHT_TRAINING', config);
    }
}
