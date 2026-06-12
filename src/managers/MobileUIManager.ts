import { CONFIG } from '../config';
import type MainScene from '../scenes/MainScene';
import EventBus from './EventBus';
import type UIManager from './UIManager';
import {
    ensureLegacyMobileRefs,
    renderLegacyMobileActions,
    renderLegacyMobileCableMenu,
    setLegacyMobileCableMenuOpen,
    syncLegacyMobileShadowState,
    updateLegacyMobileActionState,
    updateLegacyMobileBuildSummary,
    type LegacyMobileRefs
} from '../ui/legacyMobileControls';
import { isMobileLayoutActive, isShortLandscapeLayout } from '../ui/domEnvironment';
import {
    createMobileActionActiveMap,
    createMobileActionDisplayPayload,
    createMobileActionItems,
    createMobileCableOptions,
    type MobileActionDisplayPayload,
    type MobileActionActiveMap,
    type MobileActionId
} from '../ui/mobileActionDisplay';

export default class MobileUIManager {
    private legacyRefs: LegacyMobileRefs | null = null;
    private cableMenuOpen: boolean = false;

    constructor(
        private scene: MainScene,
        private uiManager: UIManager
    ) {}

    setup(): void {
        EventBus.off('MOBILE_ACTION_REQUESTED', 'MobileUIManager');
        EventBus.on('MOBILE_ACTION_REQUESTED', ({ id }) => this.handleAction(id), 'MobileUIManager');

        this.legacyRefs = ensureLegacyMobileRefs(element => this.uiManager.guardDomPointer(element));
        this.setCableMenuOpen(false);

        renderLegacyMobileActions(this.legacyRefs, createMobileActionItems(this.getActiveMap()).map(action => ({
            id: action.id,
            label: action.label,
            onPress: () => this.handleAction(action.id as MobileActionId)
        })));

        this.renderCableMenu();
        this.updateControls();
        this.updateBuildSummary();
        this.updateLegacyShadowState();
    }

    closeCableMenu(): void {
        this.setCableMenuOpen(false);
    }

    private handleAction(id: string): void {
        if (id.startsWith('cable:')) {
            this.setCableMenuOpen(false);
            this.uiManager.selectBuilding(id.slice('cable:'.length));
        } else if (id === 'rotate') {
            this.scene.rotateCursor();
        } else if (id === 'remove') {
            this.uiManager.selectBuilding('REMOVE');
        } else if (id === 'cable') {
            this.openCableMenu();
        } else if (id === 'cancel') {
            this.scene.cancelCurrentAction();
        } else if (id === 'defense') {
            this.scene.toggleDefenseRange();
        } else if (id === 'power') {
            this.scene.togglePowerGrid();
        }
    }

    renderCableMenu(): void {
        if (!this.legacyRefs) return;

        renderLegacyMobileCableMenu(this.legacyRefs, createMobileCableOptions(this.uiManager.selectedBuildingType).map(option => ({
            label: option.label,
            onPress: () => {
                this.setCableMenuOpen(false);
                this.uiManager.selectBuilding(option.id);
            }
        })));
    }

    openCableMenu(): void {
        const fiberUnlocked = !CONFIG.CABLES.FIBER.UNLOCK_REQUIRED || this.scene.researchManager?.isUnlocked(CONFIG.CABLES.FIBER.UNLOCK_REQUIRED);
        if (!fiberUnlocked) {
            this.uiManager.selectBuilding('BASIC');
            this.publishSnapshot();
            return;
        }

        this.setCableMenuOpen(!this.cableMenuOpen);
        this.publishSnapshot();
    }

    cancelAction(): void {
        this.setCableMenuOpen(false);
        this.uiManager.mobileActionStatus = null;
        if (this.uiManager.selectedBuildingType === 'REMOVE' || this.uiManager.selectedBuildingType === 'BASIC' || this.uiManager.selectedBuildingType === 'FIBER') {
            this.uiManager.selectBuilding(this.uiManager.previousBuildSelection || 'DATA_DOWNLOADER');
        } else {
            this.updateBuildSummary();
            this.updateControls();
        }
        this.publishSnapshot();
    }

    setActionStatus(status: string | null): void {
        this.uiManager.mobileActionStatus = status;
        this.updateBuildSummary();
        this.updateControls();
    }

    private updateLegacyShadowState(): void {
        syncLegacyMobileShadowState(
            this.legacyRefs,
            isMobileLayoutActive(),
            isShortLandscapeLayout()
        );
    }

    private setCableMenuOpen(open: boolean): void {
        this.cableMenuOpen = open;
        setLegacyMobileCableMenuOpen(this.legacyRefs, open);
    }

    updateControls(): void {
        const display = this.createDisplayPayload();
        updateLegacyMobileActionState(display.legacyActiveMap);
        this.publishSnapshot(display);
    }

    updateBuildSummary(): void {
        const display = this.createDisplayPayload();
        updateLegacyMobileBuildSummary(this.legacyRefs, display.legacyBuildSummary);
        this.publishSnapshot(display);
    }

    private publishSnapshot(display: MobileActionDisplayPayload = this.createDisplayPayload()): void {
        this.updateLegacyShadowState();

        EventBus.emit('MOBILE_ACTION_UPDATED', display.snapshot);
    }

    private createDisplayPayload(): MobileActionDisplayPayload {
        return createMobileActionDisplayPayload({
            cableMenuOpen: this.cableMenuOpen,
            mobileActionStatus: this.uiManager.mobileActionStatus,
            open: isMobileLayoutActive(),
            selectedType: this.uiManager.selectedBuildingType,
            showDefenseRange: Boolean(this.scene.showDefenseRange),
            showPowerGrid: Boolean(this.scene.showPowerGrid)
        });
    }

    private getActiveMap(): MobileActionActiveMap {
        return createMobileActionActiveMap({
            mobileActionStatus: this.uiManager.mobileActionStatus,
            selectedType: this.uiManager.selectedBuildingType,
            showDefenseRange: Boolean(this.scene.showDefenseRange),
            showPowerGrid: Boolean(this.scene.showPowerGrid)
        });
    }
}
