import { signal } from '@preact/signals';
import type { ActivityLogSnapshot, TooltipSnapshot, WaveResultSnapshot } from '../../types';

export const waveResult = signal<WaveResultSnapshot>({
    open: false,
    token: 0,
    wave: 0,
    kicker: '',
    title: '',
    closeLabel: '',
    integrityLabel: '',
    integrityTone: 'good',
    historyLabel: '',
    historyWaveLabel: '',
    historyCoreLabel: '',
    historyKillsLabel: '',
    stats: [],
    outcome: 'survived',
    enemiesDestroyed: 0,
    dataProcessed: 0,
    coreHpPercent: 0,
    coreDamage: 0,
    buildingsDamaged: 0,
    buildingsDestroyed: 0
});

export const waveResultHistory = signal<WaveResultSnapshot[]>([]);

export const activityLog = signal<ActivityLogSnapshot>({
    ariaLabel: '',
    title: '',
    alertCountLabel: '',
    historyLabel: '',
    lessLabel: '',
    noAlertsLabel: '',
    entries: []
});

export const tooltip = signal<TooltipSnapshot>({
    open: false,
    title: '',
    closeLabel: '',
    lines: [],
    x: 0,
    y: 0
});
