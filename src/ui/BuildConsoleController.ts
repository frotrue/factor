import EventBus from '../managers/EventBus';
import type MainScene from '../scenes/MainScene';
import type { BuildConsoleSnapshot } from '../types';
import {
    createBuildConsoleDisplayPayload,
    createBuildConsoleDisplayState,
    type BuildConsoleDisplayPayload
} from './buildConsoleSnapshot';
import { guardDomPointer } from './domEnvironment';
import {
    renderLegacyBuildConsole,
    updateLegacyBuildSelection,
    updateLegacySelectedToolPanel
} from './legacyBuildConsole';

const OWNER = 'BuildConsoleController';

export default class BuildConsoleController {
    private selectedBuildingType = 'DATA_DOWNLOADER';
    private buttons: Record<string, HTMLButtonElement> = {};
    private activeCategory = 'EXTRACTION';
    private currentTabBuildings: string[] = [];
    private buildableData: Record<string, any> = {};
    private categories: BuildConsoleSnapshot['categories'] = [];
    private readonly hotkeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

    constructor(private readonly scene: MainScene) {}

    setupEvents(): void {
        EventBus.offAll(OWNER);
        this.scene.events.once('shutdown', () => this.teardown());
        EventBus.on('WAVE_ENDED', () => {
            this.render();
        }, OWNER);
        EventBus.on('RESEARCH_UNLOCKED', () => {
            this.render();
        }, OWNER);
        EventBus.on('BUILD_CATEGORY_SELECT_REQUESTED', ({ category }) => {
            this.selectCategory(category);
        }, OWNER);
        EventBus.on('BUILD_CONSOLE_REFRESH_REQUESTED', () => {
            this.render();
        }, OWNER);
        EventBus.on('BUILD_TOOL_SELECT_REQUESTED', ({ type }) => {
            this.selectTool(type);
        }, OWNER);
    }

    handleKeyboard(event: KeyboardEvent): boolean {
        const key = event.key;
        if (this.hotkeys.includes(key)) {
            const index = parseInt(key, 10) - 1;
            if (index < this.currentTabBuildings.length) {
                this.selectTool(this.currentTabBuildings[index]);
                return true;
            }
            return false;
        }

        if (key === 'Delete' || key === 'Backspace' || key === '0') {
            this.selectTool('REMOVE');
            return true;
        }

        return false;
    }

    private selectCategory(category: string): void {
        if (category === this.activeCategory) return;
        this.activeCategory = category;
        this.render();
    }

    private render(): void {
        const allowed = this.scene.tutorialManager && !this.scene.tutorialManager.isCompleted()
            ? this.scene.tutorialManager.getAllowedBuildings()
            : null;
        const hasFirstDefenseSuccess = this.hasFirstDefenseSuccess();
        const displayState = createBuildConsoleDisplayState({
            activeCategory: this.activeCategory,
            hasFirstDefenseSuccess,
            isGpuUnlocked: this.scene.isGpuUnlocked(),
            isResearchUnlocked: researchId => Boolean(this.scene.researchManager?.isUnlocked(researchId))
        });
        this.currentTabBuildings = displayState.currentTabBuildings;
        this.buildableData = displayState.buildableData;
        this.categories = displayState.categories;

        const display = createBuildConsoleDisplayPayload({
            activeCategory: this.activeCategory,
            buildableData: displayState.buildableData,
            categories: displayState.categories,
            currentTabBuildings: displayState.currentTabBuildings,
            hotkeys: this.hotkeys,
            selectedBuildingType: this.selectedBuildingType
        });

        const renderResult = renderLegacyBuildConsole({
            allowedBuildings: allowed,
            displayState,
            guardDomPointer,
            onCategorySelect: category => {
                this.activeCategory = category;
                this.render();
            },
            onToolSelect: type => this.selectTool(type),
            snapshot: display.snapshot
        });

        this.buttons = renderResult?.buttons ?? {};
        this.publish(display);
        this.requestDependentRefresh();
    }

    private selectTool(type: string): void {
        this.selectedBuildingType = type;
        updateLegacyBuildSelection(this.buttons, type);
        EventBus.emit('BUILDING_SELECTED', { type });
        this.publish();
    }

    private requestDependentRefresh(): void {
        EventBus.emit('MOBILE_BUILD_SUMMARY_REFRESH_REQUESTED');
        EventBus.emit('MOBILE_ACTION_REFRESH_REQUESTED');
        EventBus.emit('HUD_SHELL_SYNC_REQUESTED');
    }

    private publish(display?: BuildConsoleDisplayPayload): void {
        const nextDisplay = display ?? createBuildConsoleDisplayPayload({
            activeCategory: this.activeCategory,
            buildableData: this.buildableData,
            categories: this.categories,
            currentTabBuildings: this.currentTabBuildings,
            hotkeys: this.hotkeys,
            selectedBuildingType: this.selectedBuildingType
        });
        updateLegacySelectedToolPanel(
            nextDisplay.legacySelectedTool.name,
            nextDisplay.legacySelectedTool.cost,
            nextDisplay.legacySelectedTool.hint
        );
        EventBus.emit('BUILD_CONSOLE_UPDATED', nextDisplay.snapshot);
    }

    private hasFirstDefenseSuccess(): boolean {
        const waveManager = this.scene.waveManager;
        if (!waveManager) return false;
        return waveManager.currentWave > 1 || (waveManager.currentWave >= 1 && !waveManager.waveActive);
    }

    private teardown(): void {
        EventBus.offAll(OWNER);
    }
}
