import { CONFIG } from '../config';
import type MainScene from '../scenes/MainScene';
import EventBus from '../managers/EventBus';
import {
    ensureLegacyMobileRefs,
    renderLegacyMobileActions,
    renderLegacyMobileCableMenu,
    setLegacyMobileCableMenuOpen,
    syncLegacyMobileShadowState,
    updateLegacyMobileActionState,
    updateLegacyMobileBuildSummary,
    type LegacyMobileRefs
} from './legacyMobileControls';
import { guardDomPointer, isMobileLayoutActive, isShortLandscapeLayout } from './domEnvironment';
import {
    createMobileActionActiveMap,
    createMobileActionDisplayPayload,
    createMobileActionItems,
    createMobileCableOptions,
    isMobileTransientTool,
    type MobileActionDisplayPayload,
    type MobileActionActiveMap,
    type MobileActionId
} from './mobileActionDisplay';

const OWNER = 'MobileActionController';

export default class MobileActionController {
    private legacyRefs: LegacyMobileRefs | null = null;
    private cableMenuOpen: boolean = false;
    private mobileActionStatus: string | null = null;
    private selectedBuildingType: string = 'DATA_DOWNLOADER';
    private previousBuildSelection: string = 'DATA_DOWNLOADER';

    constructor(private scene: MainScene) {}

    setup(): void {
        EventBus.offAll(OWNER);
        this.scene.events.once('shutdown', () => this.teardown());
        EventBus.on('MOBILE_ACTION_REQUESTED', ({ id }) => this.handleAction(id), OWNER);
        EventBus.on('BUILDING_SELECTED', ({ type }) => this.syncSelectedBuilding(type), OWNER);
        EventBus.on('MOBILE_ACTION_REFRESH_REQUESTED', () => {
            this.updateControls();
        }, OWNER);
        EventBus.on('MOBILE_BUILD_SUMMARY_REFRESH_REQUESTED', () => {
            this.updateBuildSummary();
        }, OWNER);
        EventBus.on('MOBILE_UI_REBUILD_REQUESTED', () => {
            this.setup();
        }, OWNER);
        EventBus.on('MOBILE_ACTION_CANCEL_REQUESTED', () => {
            this.cancelAction();
        }, OWNER);
        EventBus.on('MOBILE_ACTION_STATUS_REQUESTED', ({ status }: { status: string | null }) => {
            this.setActionStatus(status);
        }, OWNER);

        this.legacyRefs = ensureLegacyMobileRefs(guardDomPointer);
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

    private handleAction(id: string): void {
        if (id.startsWith('cable:')) {
            this.setCableMenuOpen(false);
            this.requestToolSelection(id.slice('cable:'.length));
        } else if (id === 'rotate') {
            this.scene.rotateCursor();
        } else if (id === 'remove') {
            this.requestToolSelection('REMOVE');
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

        renderLegacyMobileCableMenu(this.legacyRefs, createMobileCableOptions(this.selectedBuildingType).map(option => ({
            label: option.label,
            onPress: () => {
                this.setCableMenuOpen(false);
                this.requestToolSelection(option.id);
            }
        })));
    }

    openCableMenu(): void {
        const fiberUnlocked = !CONFIG.CABLES.FIBER.UNLOCK_REQUIRED || this.scene.researchManager?.isUnlocked(CONFIG.CABLES.FIBER.UNLOCK_REQUIRED);
        if (!fiberUnlocked) {
            this.requestToolSelection('BASIC');
            this.publishSnapshot();
            return;
        }

        this.setCableMenuOpen(!this.cableMenuOpen);
        this.publishSnapshot();
    }

    cancelAction(): void {
        this.setCableMenuOpen(false);
        this.mobileActionStatus = null;
        this.scene.mobileActionStatus = null;
        if (isMobileTransientTool(this.selectedBuildingType)) {
            this.requestToolSelection(this.previousBuildSelection || 'DATA_DOWNLOADER');
        } else {
            this.updateBuildSummary();
            this.updateControls();
        }
        this.publishSnapshot();
    }

    setActionStatus(status: string | null): void {
        this.mobileActionStatus = status;
        this.scene.mobileActionStatus = status;
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

    private requestToolSelection(type: string): void {
        EventBus.emit('BUILD_TOOL_SELECT_REQUESTED', { type });
    }

    private syncSelectedBuilding(type: string): void {
        this.selectedBuildingType = type;
        this.setCableMenuOpen(false);
        if (!isMobileTransientTool(type)) {
            this.previousBuildSelection = type;
        }
        this.renderCableMenu();
        this.updateBuildSummary();
        this.updateControls();
    }

    private updateControls(): void {
        const display = this.createDisplayPayload();
        updateLegacyMobileActionState(display.legacyActiveMap);
        this.publishSnapshot(display);
    }

    private updateBuildSummary(): void {
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
            mobileActionStatus: this.mobileActionStatus,
            open: isMobileLayoutActive(),
            selectedType: this.selectedBuildingType,
            showDefenseRange: Boolean(this.scene.showDefenseRange),
            showPowerGrid: Boolean(this.scene.showPowerGrid)
        });
    }

    private getActiveMap(): MobileActionActiveMap {
        return createMobileActionActiveMap({
            mobileActionStatus: this.mobileActionStatus,
            selectedType: this.selectedBuildingType,
            showDefenseRange: Boolean(this.scene.showDefenseRange),
            showPowerGrid: Boolean(this.scene.showPowerGrid)
        });
    }

    private teardown(): void {
        EventBus.offAll(OWNER);
    }
}
