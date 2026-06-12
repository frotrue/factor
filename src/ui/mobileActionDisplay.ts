import { getCableName, t } from '../i18n';
import type { MobileActionSnapshot } from '../types';
import {
    getBuildableCostText,
    getBuildableData,
    getSelectedToolName
} from './buildConsoleSnapshot';

export type MobileActionId = 'rotate' | 'remove' | 'cable' | 'cancel' | 'defense' | 'power';
export type MobileActionActiveMap = Record<MobileActionId, boolean>;

export type MobileActionDisplayPayloadInput = {
    cableMenuOpen: boolean;
    mobileActionStatus: string | null;
    open: boolean;
    selectedType: string;
    showDefenseRange: boolean;
    showPowerGrid: boolean;
};

export type MobileActionDisplayPayload = {
    legacyActiveMap: MobileActionActiveMap;
    legacyBuildSummary: { title: string; detail: string };
    snapshot: MobileActionSnapshot;
};

export function createMobileActionActiveMap({
    mobileActionStatus,
    selectedType,
    showDefenseRange,
    showPowerGrid
}: {
    mobileActionStatus: string | null;
    selectedType: string;
    showDefenseRange: boolean;
    showPowerGrid: boolean;
}): MobileActionActiveMap {
    return {
        rotate: false,
        remove: selectedType === 'REMOVE',
        cable: selectedType === 'BASIC' || selectedType === 'FIBER',
        cancel: Boolean(mobileActionStatus),
        defense: showDefenseRange,
        power: showPowerGrid
    };
}

export function createMobileBuildSummary(
    selectedType: string,
    actionStatus: string | null
): { title: string; detail: string } {
    const data = getBuildableData(selectedType, {});
    if (!data) {
        return {
            title: selectedType === 'REMOVE' ? t('action.removeMode') : '',
            detail: actionStatus || ''
        };
    }

    return {
        title: getSelectedToolName(selectedType),
        detail: actionStatus || getBuildableCostText(data)
    };
}

export function createMobileCableOptions(selectedType: string): MobileActionSnapshot['cableOptions'] {
    return (['BASIC', 'FIBER'] as const).map(type => ({
        id: type,
        label: getCableName(type),
        selected: selectedType === type
    }));
}

export function createMobileActionItems(activeMap: MobileActionActiveMap): MobileActionSnapshot['actions'] {
    return [
        { id: 'rotate', label: t('action.rotate'), active: activeMap.rotate },
        { id: 'remove', label: t('action.remove'), active: activeMap.remove },
        { id: 'cable', label: t('action.cable'), active: activeMap.cable },
        { id: 'cancel', label: t('action.cancel'), active: activeMap.cancel },
        { id: 'defense', label: t('action.defense'), active: activeMap.defense },
        { id: 'power', label: t('action.power'), active: activeMap.power }
    ];
}

export function createMobileActionSnapshot({
    activeMap,
    cableMenuOpen,
    open,
    selectedType,
    summary
}: {
    activeMap: MobileActionActiveMap;
    cableMenuOpen: boolean;
    open: boolean;
    selectedType: string;
    summary: { title: string; detail: string };
}): MobileActionSnapshot {
    return {
        open,
        labels: {
            aria: t('mobileAction.aria'),
            toolbar: t('mobileAction.toolbar'),
            cableMenu: t('mobileAction.cableMenu')
        },
        summaryTitle: summary.title,
        summaryDetail: summary.detail,
        cableMenuOpen,
        cableOptions: createMobileCableOptions(selectedType),
        actions: createMobileActionItems(activeMap)
    };
}

export function createMobileActionDisplayPayload(input: MobileActionDisplayPayloadInput): MobileActionDisplayPayload {
    const legacyActiveMap = createMobileActionActiveMap({
        mobileActionStatus: input.mobileActionStatus,
        selectedType: input.selectedType,
        showDefenseRange: input.showDefenseRange,
        showPowerGrid: input.showPowerGrid
    });
    const legacyBuildSummary = createMobileBuildSummary(input.selectedType, input.mobileActionStatus);

    return {
        legacyActiveMap,
        legacyBuildSummary,
        snapshot: createMobileActionSnapshot({
            activeMap: legacyActiveMap,
            cableMenuOpen: input.cableMenuOpen,
            open: input.open,
            selectedType: input.selectedType,
            summary: legacyBuildSummary
        })
    };
}
