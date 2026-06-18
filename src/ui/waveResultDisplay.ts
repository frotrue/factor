import { t } from '../i18n';
import type { WaveResultSnapshot } from '../types';
import type { WaveResultSummary } from '../utils/waveResultSummary';
import type { LegacyWaveResultContent } from './legacyNotifications';

export interface WaveResultDisplayPayload {
    legacyContent: LegacyWaveResultContent;
    logMessage: string;
    snapshot: WaveResultSnapshot;
}

export function createWaveResultDisplayPayload(summary: WaveResultSummary): WaveResultDisplayPayload {
    return {
        legacyContent: createLegacyWaveResultContent(summary),
        logMessage: createWaveResultLogMessage(summary),
        snapshot: createWaveResultSnapshot(summary)
    };
}

export function createWaveResultSnapshot(summary: WaveResultSummary): WaveResultSnapshot {
    const integrityTone = getWaveIntegrityTone(summary.coreHpPercent);
    const stats = createWaveResultStats(summary, integrityTone);

    return {
        open: true,
        token: Date.now(),
        wave: summary.wave,
        kicker: t('waveSummary.kicker'),
        title: t('waveSummary.title', { wave: summary.wave }),
        closeLabel: t('waveSummary.close'),
        integrityLabel: t('waveSummary.integrityLabel'),
        integrityTone,
        historyLabel: t('waveSummary.history'),
        historyWaveLabel: t('waveSummary.history.wave', { wave: summary.wave }),
        historyCoreLabel: t('waveSummary.history.core', { percent: summary.coreHpPercent }),
        historyKillsLabel: t('waveSummary.history.kills', { count: summary.enemiesDestroyed }),
        stats,
        outcome: summary.outcome,
        enemiesDestroyed: summary.enemiesDestroyed,
        dataProcessed: summary.dataProcessed,
        coreHpPercent: summary.coreHpPercent,
        coreDamage: summary.coreDamage,
        buildingsDamaged: summary.buildingsDamaged,
        buildingsDestroyed: summary.buildingsDestroyed
    };
}

export function createWaveResultStats(
    summary: WaveResultSummary,
    integrityTone = getWaveIntegrityTone(summary.coreHpPercent)
): WaveResultSnapshot['stats'] {
    return [
        {
            id: 'destroyed',
            label: t('waveSummary.destroyed', { count: summary.enemiesDestroyed }),
            value: String(summary.enemiesDestroyed),
            tone: 'good'
        },
        {
            id: 'data',
            label: t('waveSummary.data', { amount: summary.dataProcessed }),
            value: String(summary.dataProcessed),
            tone: 'default'
        },
        {
            id: 'integrity',
            label: t('waveSummary.integrity', { percent: summary.coreHpPercent, damage: summary.coreDamage }),
            value: `${summary.coreHpPercent}%`,
            tone: integrityTone
        },
        {
            id: 'buildings',
            label: t('waveSummary.buildings', { destroyed: summary.buildingsDestroyed, damaged: summary.buildingsDamaged }),
            value: `${summary.buildingsDestroyed}/${summary.buildingsDamaged}`,
            tone: summary.buildingsDestroyed > 0 ? 'warning' : 'default'
        }
    ];
}

export function getWaveIntegrityTone(coreHpPercent: number): 'good' | 'warning' | 'danger' {
    if (coreHpPercent <= 25) return 'danger';
    if (coreHpPercent <= 60) return 'warning';
    return 'good';
}

export function withWaveResultOpenState(
    snapshot: WaveResultSnapshot,
    open: boolean
): WaveResultSnapshot {
    return {
        ...snapshot,
        open
    };
}

export function createLegacyWaveResultContent(summary: WaveResultSummary): LegacyWaveResultContent {
    const stats = createWaveResultStats(summary);

    return {
        kicker: t('waveSummary.kicker'),
        title: t('waveSummary.title', { wave: summary.wave }),
        items: stats.map(stat => stat.label)
    };
}

export function createWaveResultLogMessage(summary: WaveResultSummary): string {
    return t('waveSummary.log', {
        wave: summary.wave,
        data: summary.dataProcessed,
        integrity: summary.coreHpPercent
    });
}
