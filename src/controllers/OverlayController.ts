import { CONFIG } from '../config';
import type MainScene from '../scenes/MainScene';
import { VISUAL_THEME } from '../visuals/visualTheme';

export default class OverlayController {
    constructor(private scene: MainScene) {}

    drawDefenseRangeOverlay(): void {
        const { scene } = this;
        scene.defenseRangeGraphics.clear();
        if (!scene.showDefenseRange) return;

        scene.buildingManager.forEach(building => {
            const bConfig = CONFIG.BUILDINGS[building.type];
            if (bConfig && bConfig.DEFENSE && bConfig.DEFENSE.RANGE > 0) {
                const range = bConfig.DEFENSE.RANGE + scene.researchManager.getEffectValue('TOWER_RANGE_BONUS', 0);
                const centerX = building.x + CONFIG.GRID_SIZE / 2;
                const centerY = building.y + CONFIG.GRID_SIZE / 2;
                const radius = range * CONFIG.GRID_SIZE;
                scene.defenseRangeGraphics.fillStyle(VISUAL_THEME.overlays.defense, 0.07);
                scene.defenseRangeGraphics.fillCircle(centerX, centerY, radius);
                scene.defenseRangeGraphics.lineStyle(3, VISUAL_THEME.overlays.defense, 0.14);
                scene.defenseRangeGraphics.strokeCircle(centerX, centerY, radius + 2);
                scene.defenseRangeGraphics.lineStyle(1, VISUAL_THEME.overlays.defense, 0.58);
                scene.defenseRangeGraphics.strokeCircle(centerX, centerY, radius);
            }
        });
    }

    drawPowerGridOverlay(): void {
        const { scene } = this;
        scene.powerGridGraphics.clear();
        if (!scene.showPowerGrid || !scene.powerManager) return;

        const networks = scene.powerManager.networks || [];
        if (networks.length > 0) {
            networks.forEach(network => {
                const color = network.isBlackout ? VISUAL_THEME.buildings.danger : network.color;
                scene.powerGridGraphics.fillStyle(color, network.isBlackout ? 0.2 : 0.1);
                scene.powerGridGraphics.lineStyle(1, color, network.isBlackout ? 0.72 : 0.38);

                network.tiles.forEach(key => {
                    const [x, y] = key.split(',').map(Number);
                    scene.powerGridGraphics.fillRect(x, y, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
                    scene.powerGridGraphics.strokeRect(x, y, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
                });
            });
            return;
        }

        scene.powerGridGraphics.fillStyle(VISUAL_THEME.overlays.power, 0.12);
        scene.powerGridGraphics.lineStyle(1, VISUAL_THEME.overlays.power, 0.48);
        scene.powerManager.poweredArea.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            scene.powerGridGraphics.fillRect(x, y, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
            scene.powerGridGraphics.strokeRect(x, y, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
        });
    }
}
