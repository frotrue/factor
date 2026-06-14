import { computed, signal } from '@preact/signals';
import type { TacticalPanelSnapshot } from '../../types';
import { getLanguage } from '../../i18n';
import { createTopHudLabels } from '../topHudDisplay';

export const language = signal(getLanguage());
export const topHudLabels = signal(createTopHudLabels());
export const score = signal(0);
export const powerProduction = signal(0);
export const powerConsumption = signal(0);
export const powerNet = signal(0);
export const powerNetworkCount = signal(0);
export const isBlackout = signal(false);
export const silicon = signal(0);
export const packets = signal(0);
export const wave = signal(0);
export const waveTimer = signal('30s');
export const tacticalPanels = signal<TacticalPanelSnapshot>({
    labels: {
        aria: '',
        expand: '',
        collapse: '',
        panelNames: {
            objective: '',
            threat: '',
            systems: ''
        },
        objective: '',
        threat: '',
        systems: '',
        powerLoad: ''
    },
    objective: {
        title: '데이터 수집 시작',
        detail: '패킷 수집기를 배치해 첫 데이터 흐름을 만드세요.'
    },
    threat: {
        title: 'Wave 1',
        detail: 'North Port | 초기 위협',
        recommendation: '방어선을 준비하세요',
        threatLevel: 'Low',
        routeNames: ['North Port'],
        special: null
    },
    defense: {
        title: '방어 준비 전',
        detail: 'Classifier 또는 Firewall을 침입 경로 근처에 배치하세요.'
    },
    powerStatus: {
        text: '전력: Core 주변 기본 공급',
        tone: 'warning'
    }
});

export const powerDisplay = computed(() => {
    const networks = powerNetworkCount.value > 0 ? ` | ${powerNetworkCount.value} grids` : '';
    return `${powerProduction.value} / ${powerConsumption.value} W${networks}`;
});

export const isLowPower = computed(() => isBlackout.value || powerNet.value < 0);
