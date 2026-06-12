import { textForKey } from '../i18n';
import type { GameOverSnapshot } from '../types';
import type { RunResultSummary } from '../utils/runResultSummary';

export interface GameOverDisplayPayload {
    legacyStatLines: string[];
    snapshot: GameOverSnapshot;
}

export function createGameOverDisplayPayload(summary: RunResultSummary): GameOverDisplayPayload {
    return {
        legacyStatLines: createLegacyGameOverStatLines(summary),
        snapshot: createGameOverSnapshot(summary)
    };
}

export function createLegacyGameOverStatLines(summary: RunResultSummary): string[] {
    return [
        textForKey('gameOver.stat.wave', { wave: summary.wave }),
        textForKey('gameOver.stat.core', { percent: summary.coreHpPercent }),
        textForKey('gameOver.stat.data', { amount: summary.totalDataReceived }),
        textForKey('gameOver.stat.research', { count: summary.unlockedResearchCount }),
        textForKey('gameOver.stat.model', {
            name: summary.bestModelName,
            confidence: summary.bestModelAccuracy,
            damage: summary.bestModelDamageBonus,
            version: summary.bestModelVersion
        })
    ];
}

export function createGameOverSnapshot(summary: RunResultSummary): GameOverSnapshot {
    return {
        open: true,
        kicker: textForKey('gameOver.title'),
        title: textForKey('gameOver.screenTitle'),
        failureCode: textForKey('gameOver.failureCode', { percent: summary.coreHpPercent }),
        integrityLabel: textForKey('gameOver.integrity'),
        bestModelLabel: textForKey('gameOver.bestModel'),
        bestModelDetail: textForKey('gameOver.modelDetail', {
            version: summary.bestModelVersion,
            confidence: summary.bestModelAccuracy,
            damage: summary.bestModelDamageBonus
        }),
        restartLabel: textForKey('gameOver.restart'),
        mainMenuLabel: textForKey('gameOver.mainMenu'),
        stats: [
            {
                id: 'wave',
                label: textForKey('gameOver.statLabel.wave'),
                value: String(summary.wave),
                tone: 'warn'
            },
            {
                id: 'core',
                label: textForKey('gameOver.statLabel.core'),
                value: `${summary.coreHpPercent}%`,
                tone: summary.coreHpPercent <= 25 ? 'danger' : 'warn'
            },
            {
                id: 'data',
                label: textForKey('gameOver.statLabel.data'),
                value: String(summary.totalDataReceived),
                tone: 'cyan'
            },
            {
                id: 'research',
                label: textForKey('gameOver.statLabel.research'),
                value: String(summary.unlockedResearchCount),
                tone: 'green'
            }
        ],
        wave: summary.wave,
        coreHpPercent: summary.coreHpPercent,
        totalDataReceived: summary.totalDataReceived,
        unlockedResearchCount: summary.unlockedResearchCount,
        bestModelName: summary.bestModelName,
        bestModelAccuracy: summary.bestModelAccuracy,
        bestModelDamageBonus: summary.bestModelDamageBonus,
        bestModelVersion: summary.bestModelVersion
    };
}
