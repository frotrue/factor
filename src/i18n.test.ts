import { describe, expect, it } from 'vitest';
import {
    DEFAULT_LANGUAGE,
    getLanguage,
    getTranslations,
    isLanguage,
    setLanguage,
    t,
    TRANSLATIONS
} from './i18n';

describe('i18n', () => {
    it('defaults to Korean', () => {
        expect(DEFAULT_LANGUAGE).toBe('ko');
        expect(getLanguage()).toBe('ko');
        expect(t('settings.title')).toBe('시스템 설정');
    });

    it('switches between Korean and English', () => {
        setLanguage('en');
        expect(getLanguage()).toBe('en');
        expect(t('settings.title')).toBe('System Settings');

        setLanguage('ko');
        expect(getLanguage()).toBe('ko');
        expect(t('settings.title')).toBe('시스템 설정');
    });

    it('falls back to Korean when a key is missing in the selected language', () => {
        const english = getTranslations('en') as Record<string, string>;
        delete english['settings.title'];

        setLanguage('en');

        expect(t('settings.title')).toBe('시스템 설정');
        english['settings.title'] = 'System Settings';
    });

    it('rejects unsupported language ids', () => {
        expect(isLanguage('ko')).toBe(true);
        expect(isLanguage('en')).toBe(true);
        expect(isLanguage('ja')).toBe(false);
    });

    it('keeps Korean and English translation keys in sync', () => {
        const koreanKeys = Object.keys(TRANSLATIONS.ko).sort();
        const englishKeys = Object.keys(TRANSLATIONS.en).sort();

        expect(englishKeys).toEqual(koreanKeys);
    });

    it('contains localized status text used by tooltips and HUD panels', () => {
        const requiredKeys = [
            'tooltip.type',
            'tooltip.power',
            'tooltip.powerOk',
            'tooltip.powerOutage',
            'tooltip.inputBuffer',
            'tooltip.outputBuffer',
            'tooltip.bufferFull',
            'tooltip.close',
            'menu.aria',
            'top.statusHud',
            'top.runtimeStats',
            'top.shortcuts',
            'top.settings',
            'top.research',
            'hud.dataReceived',
            'hud.power',
            'hud.silicon',
            'hud.packets',
            'hud.wave',
            'hud.nextWave',
            'build.aria',
            'build.categories',
            'build.tools',
            'build.toolInfo',
            'build.more',
            'build.command.select',
            'build.command.rotate',
            'build.command.remove',
            'panel.aria',
            'panel.expand',
            'panel.collapse',
            'panel.objectivePanel',
            'panel.threatPanel',
            'panel.systemsPanel',
            'panel.powerLoad',
            'mobileAction.aria',
            'mobileAction.toolbar',
            'mobileAction.cableMenu',
            'settings.aria',
            'settings.controlTitle',
            'settings.tab.game',
            'settings.tab.audio',
            'settings.tab.graphics',
            'settings.tab.system',
            'settings.masterVolume',
            'settings.saveData',
            'settings.syncedNote',
            'settings.bloomOn',
            'settings.bloomOff',
            'tutorial.progress',
            'tutorial.currentObjective',
            'tutorial.steps',
            'tutorial.moreSteps',
            'tooltip.solarStandalone',
            'tooltip.solarNoNetwork',
            'tooltip.researchOperations',
            'tooltip.hitChance',
            'defenseStatus.research',
            'gameOver.screenTitle',
            'gameOver.failureCode',
            'gameOver.integrity',
            'gameOver.mainMenu',
            'gameOver.statLabel.wave',
            'gameOver.statLabel.core',
            'gameOver.statLabel.data',
            'gameOver.statLabel.research',
            'waveSummary.close',
            'waveSummary.integrityLabel',
            'waveSummary.history',
            'waveSummary.history.wave',
            'waveSummary.history.core',
            'waveSummary.history.kills',
            'activityLog.aria',
            'activityLog.title',
            'activityLog.alertCount',
            'activityLog.history',
            'activityLog.less',
            'activityLog.noAlerts',
            'building.SOLAR_PANEL.description'
        ];

        for (const key of requiredKeys) {
            expect(getTranslations('ko')[key], key).toBeTruthy();
            expect(getTranslations('en')[key], key).toBeTruthy();
        }
    });
});
