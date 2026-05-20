import { describe, expect, it } from 'vitest';
import { selectEnemyBuildingTarget } from './enemyBuildingInteraction';

describe('enemy building interaction', () => {
    it('prioritizes firewall before defense and utility buildings', () => {
        const target = selectEnemyBuildingTarget([
            { key: '0,0', type: 'PROCESSOR' },
            { key: '32,0', type: 'CLASSIFIER' },
            { key: '64,0', type: 'FIREWALL' }
        ]);

        expect(target?.type).toBe('FIREWALL');
    });

    it('ignores the core so core damage keeps using the existing game-over path', () => {
        const target = selectEnemyBuildingTarget([
            { key: '0,0', type: 'CORE' },
            { key: '32,0', type: 'STORAGE' }
        ]);

        expect(target?.type).toBe('STORAGE');
    });
});
