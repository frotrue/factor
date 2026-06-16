import { textForKey } from '../i18n';
import type { GameOverSnapshot } from '../types';
import type { RunResultSummary } from '../utils/runResultSummary';

export interface GameOverDisplayPayload {
    legacyStatLines: string[];
    snapshot: GameOverSnapshot;
}

export type GameOverStatDisplay = GameOverSnapshot['stats'][number] & {
    legacyLine: string;
};

export function createGameOverDisplayPayload(summary: RunResultSummary): GameOverDisplayPayload {
    return {
        legacyStatLines: createLegacyGameOverStatLines(summary),
        snapshot: createGameOverSnapshot(summary)
    };
}

export function createGameOverStatDisplays(summary: RunResultSummary): GameOverStatDisplay[] {
    return [
        {
            id: 'wave',
            label: textForKey('gameOver.statLabel.wave'),
            value: String(summary.wave),
            tone: 'warn',
            legacyLine: textForKey('gameOver.stat.wave', { wave: summary.wave })
        },
        {
            id: 'core',
            label: textForKey('gameOver.statLabel.core'),
            value: `${summary.coreHpPercent}%`,
            tone: getGameOverCoreTone(summary.coreHpPercent),
            legacyLine: textForKey('gameOver.stat.core', { percent: summary.coreHpPercent })
        },
        {
            id: 'data',
            label: textForKey('gameOver.statLabel.data'),
            value: String(summary.totalDataReceived),
            tone: 'cyan',
            legacyLine: textForKey('gameOver.stat.data', { amount: summary.totalDataReceived })
        },
        {
            id: 'research',
            label: textForKey('gameOver.statLabel.research'),
            value: String(summary.unlockedResearchCount),
            tone: 'green',
            legacyLine: textForKey('gameOver.stat.research', { count: summary.unlockedResearchCount })
        }
    ];
}

export function createGameOverStats(summary: RunResultSummary): GameOverSnapshot['stats'] {
    return createGameOverStatDisplays(summary).map(({ legacyLine, ...stat }) => stat);
}

export function getGameOverCoreTone(coreHpPercent: number): GameOverSnapshot['stats'][number]['tone'] {
    return coreHpPercent <= 25 ? 'danger' : 'warn';
}

export function createLegacyGameOverStatLines(summary: RunResultSummary): string[] {
    return createGameOverStatDisplays(summary).map(stat => stat.legacyLine);
}

export function createGameOverSnapshot(summary: RunResultSummary): GameOverSnapshot {
    return {
        open: true,
        kicker: textForKey('gameOver.title'),
        title: textForKey('gameOver.screenTitle'),
        failureCode: textForKey('gameOver.failureCode', { percent: summary.coreHpPercent }),
        integrityLabel: textForKey('gameOver.integrity'),
        restartLabel: textForKey('gameOver.restart'),
        mainMenuLabel: textForKey('gameOver.mainMenu'),
        stats: createGameOverStats(summary),
        wave: summary.wave,
        coreHpPercent: summary.coreHpPercent,
        totalDataReceived: summary.totalDataReceived,
        unlockedResearchCount: summary.unlockedResearchCount
    };
}
