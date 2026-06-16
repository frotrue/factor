import { CONFIG } from '../config';
import { getBuildingName, getCableName, getItemName, textForKey } from '../i18n';
import type { BuildingConfig, BuildConsoleSnapshot, CableConfig } from '../types';
import { shouldHideEarlyAdvancedSystem } from '../utils/progressionGates';

const BUILD_CONSOLE_ICON_SRC: Record<string, string> = {
    CLASSIFIER: '/assets/buildings/building-classifier.png',
    FILTER: '/assets/buildings/building-filter.png',
    FIREWALL: '/assets/buildings/building-firewall.png',
    MINER: '/assets/buildings/building-miner.png',
    POWER_NODE: '/assets/buildings/building-power-node.png',
    POWER_PLANT: '/assets/buildings/building-power-plant.png',
    PROCESSOR: '/assets/buildings/building-processor.png',
    STORAGE: '/assets/buildings/building-storage.png'
};

export type BuildConsoleSnapshotInput = {
    activeCategory: string;
    buildableData: Record<string, any>;
    categories?: BuildConsoleSnapshot['categories'];
    currentTabBuildings: string[];
    hotkeys: string[];
    selectedBuildingType: string;
};

export type BuildConsoleDisplayPayload = {
    legacySelectedTool: BuildConsoleSnapshot['selectedTool'];
    snapshot: BuildConsoleSnapshot;
};

export type BuildConsoleDisplayStateInput = {
    activeCategory: string;
    hasFirstDefenseSuccess: boolean;
    isResearchUnlocked: (researchId: string) => boolean;
};

export type BuildConsoleDisplayState = {
    buildableData: Record<string, any>;
    categories: BuildConsoleSnapshot['categories'];
    currentTabBuildings: string[];
};

export const BUILD_CATEGORY_IDS = ['EXTRACTION', 'LOGISTICS', 'PRODUCTION', 'POWER', 'DEFENSE'];

export function createBuildableMap(): Record<string, any> {
    const buildables: Record<string, any> = { ...CONFIG.BUILDINGS };
    if (CONFIG.CABLES) {
        Object.entries(CONFIG.CABLES).forEach(([key, cable]) => {
            buildables[key] = {
                ...cable,
                CATEGORY: 'LOGISTICS',
                COST: cable.COST_PER_TILE ? [{ resource: 'SILICON', amount: cable.COST_PER_TILE }] : []
            };
        });
    }
    return buildables;
}

export function createBuildConsoleDisplayState(input: BuildConsoleDisplayStateInput): BuildConsoleDisplayState {
    const categories = BUILD_CATEGORY_IDS.map(id => ({
        id,
        label: textForKey(`category.${id}`),
        active: input.activeCategory === id
    }));
    const buildableData: Record<string, any> = {};
    const currentTabBuildings: string[] = [];
    const buildables = createBuildableMap();

    Object.entries(buildables).forEach(([key, data]) => {
        buildableData[key] = data;
        if (shouldHideEarlyAdvancedSystem(key, input.hasFirstDefenseSuccess)) return;
        if (data.CATEGORY !== input.activeCategory && data.CATEGORY !== 'ALL') return;
        if (data.UNLOCK_REQUIRED && !input.isResearchUnlocked(data.UNLOCK_REQUIRED)) return;

        currentTabBuildings.push(key);
    });

    return {
        buildableData,
        categories,
        currentTabBuildings
    };
}

export function getBuildableCostText(data: any): string {
    if (!data) return '';
    if (data.COST && data.COST.length > 0) {
        return data.COST.map((cost: any) => `${cost.amount} ${getItemName(cost.resource)}`).join(', ');
    }
    if (data.COST_PER_TILE) {
        return textForKey('action.costPerTile', { amount: data.COST_PER_TILE });
    }
    return textForKey('action.noCost');
}

function getBuildableDescription(data: BuildingConfig | CableConfig | undefined): string {
    if (!data) return '';
    if ('DESCRIPTION' in data && data.DESCRIPTION) return data.DESCRIPTION;
    if ('BANDWIDTH' in data) return `${data.NAME} data link.`;
    return '';
}

function getBuildableStats(data: BuildingConfig | CableConfig | undefined): BuildConsoleSnapshot['items'][number]['stats'] {
    if (!data) return [];
    const stats: NonNullable<BuildConsoleSnapshot['items'][number]['stats']> = [];

    if ('POWER' in data) {
        if (data.POWER.PRODUCTION > 0) {
            stats.push({ label: '전력 생산', value: `+${data.POWER.PRODUCTION}`, tone: 'good' });
        }
        if (data.POWER.CONSUMPTION > 0) {
            stats.push({ label: '전력 소비', value: `-${data.POWER.CONSUMPTION}`, tone: 'warning' });
        }
        if (data.POWER.RANGE) {
            stats.push({ label: '전력 범위', value: `${data.POWER.RANGE} tiles` });
        }
    }

    if ('PRODUCTION_RATE' in data && data.PRODUCTION_RATE) {
        stats.push({ label: '생산량', value: `${data.PRODUCTION_RATE}/tick`, tone: 'good' });
    }
    if ('DEFENSE' in data && data.DEFENSE) {
        stats.push({ label: '피해', value: String(data.DEFENSE.DAMAGE), tone: 'good' });
        stats.push({ label: '사거리', value: `${data.DEFENSE.RANGE} tiles` });
    }
    if ('BANDWIDTH' in data) {
        stats.push({ label: '대역폭', value: `${data.BANDWIDTH}/tick`, tone: 'good' });
        stats.push({ label: '최대 길이', value: `${data.MAX_LENGTH_TILES} tiles` });
        stats.push({ label: '큐', value: String(data.MAX_QUEUE) });
    }
    if ('MAX_BUFFER' in data && data.MAX_BUFFER) {
        stats.push({ label: '버퍼', value: String(data.MAX_BUFFER) });
    }
    if ('HP' in data && data.HP) {
        stats.push({ label: 'HP', value: String(data.HP) });
    }
    if ('WIDTH' in data || 'HEIGHT' in data) {
        stats.push({ label: '크기', value: `${data.WIDTH ?? 1}x${data.HEIGHT ?? 1}` });
    }

    return stats.slice(0, 6);
}

export function getBuildableData(type: string, buildableData: Record<string, any>): any {
    if (type === 'REMOVE') return null;
    return buildableData[type] || CONFIG.BUILDINGS[type] || CONFIG.CABLES[type];
}

export function getSelectedToolName(type: string): string {
    if (type === 'REMOVE') return textForKey('action.removeMode');
    if (CONFIG.BUILDINGS[type]) return getBuildingName(type);
    if (CONFIG.CABLES[type]) return getCableName(type);
    return type;
}

export function getSelectedToolCost(type: string, buildableData: Record<string, any>): string {
    if (type === 'REMOVE') return textForKey('action.noCost');
    return getBuildableCostText(getBuildableData(type, buildableData));
}

export function createSelectedToolDisplay(
    type: string,
    buildableData: Record<string, any>
): BuildConsoleSnapshot['selectedTool'] {
    return {
        type,
        name: getSelectedToolName(type),
        cost: getSelectedToolCost(type, buildableData),
        hint: type === 'REMOVE'
            ? textForKey('build.removeHint')
            : textForKey('build.defaultHint')
    };
}

export function createBuildConsoleSnapshot(input: BuildConsoleSnapshotInput): BuildConsoleSnapshot {
    const categories = input.categories ?? [
        { id: 'EXTRACTION', label: textForKey('category.EXTRACTION'), active: input.activeCategory === 'EXTRACTION' },
        { id: 'LOGISTICS', label: textForKey('category.LOGISTICS'), active: input.activeCategory === 'LOGISTICS' },
        { id: 'PRODUCTION', label: textForKey('category.PRODUCTION'), active: input.activeCategory === 'PRODUCTION' },
        { id: 'POWER', label: textForKey('category.POWER'), active: input.activeCategory === 'POWER' },
        { id: 'DEFENSE', label: textForKey('category.DEFENSE'), active: input.activeCategory === 'DEFENSE' }
    ];
    const items: BuildConsoleSnapshot['items'] = input.currentTabBuildings.map((key, index) => {
        const data = input.buildableData[key] || CONFIG.BUILDINGS[key] || CONFIG.CABLES[key];
        const color = typeof data?.COLOR === 'number' ? `#${data.COLOR.toString(16).padStart(6, '0')}` : '#2b3038';
        return {
            key,
            label: CONFIG.BUILDINGS[key] ? getBuildingName(key) : getCableName(key),
            cost: getBuildableCostText(data),
            color,
            iconSrc: BUILD_CONSOLE_ICON_SRC[key],
            description: getBuildableDescription(data),
            stats: getBuildableStats(data),
            hotkey: index < input.hotkeys.length ? input.hotkeys[index] : undefined,
            selected: key === input.selectedBuildingType
        };
    });

    items.push({
        key: 'REMOVE',
        label: textForKey('action.remove'),
        cost: textForKey('action.removeMode'),
        color: '#2b3038',
        description: textForKey('build.removeHint'),
        stats: [],
        hotkey: '0',
        selected: input.selectedBuildingType === 'REMOVE'
    });

    return {
        activeCategory: input.activeCategory,
        labels: {
            aria: textForKey('build.aria'),
            categories: textForKey('build.categories'),
            tools: textForKey('build.tools'),
            toolInfo: textForKey('build.toolInfo'),
            selectedTool: textForKey('build.selectedTool'),
            more: textForKey('build.more'),
            commandSelect: textForKey('build.command.select'),
            commandRotate: textForKey('build.command.rotate'),
            commandRemove: textForKey('build.command.remove')
        },
        categories,
        items,
        selectedTool: createSelectedToolDisplay(input.selectedBuildingType, input.buildableData)
    };
}

export function createBuildConsoleDisplayPayload(input: BuildConsoleSnapshotInput): BuildConsoleDisplayPayload {
    const snapshot = createBuildConsoleSnapshot(input);

    return {
        legacySelectedTool: snapshot.selectedTool,
        snapshot
    };
}
