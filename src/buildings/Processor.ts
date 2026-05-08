import Phaser from 'phaser';
import AbstractProcessor from './AbstractProcessor';
import { BuildingOptions } from '../types';

export default class Processor extends AbstractProcessor {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'PROCESSOR', 'LABELLING', config);
    }
}
