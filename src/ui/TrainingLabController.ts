import ModelTrainingLab from '../buildings/ModelTrainingLab';
import type MainScene from '../scenes/MainScene';
import { CONFIG } from '../config';
import { getBuildingName, textForKey } from '../i18n';
import EventBus from '../managers/EventBus';
import {
    ensureLegacyTrainingLabModal,
    renderLegacyTrainingLabDefenseRows,
    renderLegacyTrainingLabShell,
    renderLegacyTrainingLabSystemRows,
    setLegacyTrainingLabOpen,
    syncLegacyTrainingLabControls
} from './legacyTrainingLab';
import {
    createTrainingLabDefenseRowSnapshots,
    createTrainingLabDefenseRows,
    createTrainingLabDisplayPayload,
    createTrainingLabShellDisplay,
    createTrainingLabSystemRowSnapshots,
    createTrainingLabSystemRows
} from './trainingLabDisplay';
import type { TrainingLabRowSnapshot } from '../types';
import { guardDomPointer, restoreGameCanvasFocus } from './domEnvironment';
import { createTrainingLabMissingLogMessage } from './notificationDisplay';

const OWNER = 'TrainingLabController';

export default class TrainingLabController {
    private activeTrainingLab: ModelTrainingLab | null = null;
    private activeTab: 'DEFENSE' | 'SYSTEM' = 'DEFENSE';
    private modal: HTMLElement | null = null;

    constructor(private scene: MainScene) {}

    setup(): void {
        this.modal = ensureLegacyTrainingLabModal(guardDomPointer);
        EventBus.offAll(OWNER);
        this.scene.events.once('shutdown', () => this.teardown());
        EventBus.on('TRAINING_LAB_RENDER_REQUESTED', () => {
            this.render();
        }, OWNER);
        EventBus.on('TRAINING_LAB_OPEN_REQUESTED', ({ lab, tab }: { lab?: ModelTrainingLab; tab?: 'DEFENSE' | 'SYSTEM' }) => {
            if (tab) {
                this.setActiveTab(tab);
            }
            if (lab) {
                this.open(lab);
                return;
            }
            this.openFirstLab(tab);
        }, OWNER);
        EventBus.on('TRAINING_LAB_TAB_REQUESTED', ({ tab }) => {
            this.activeTab = tab;
            this.render();
        }, OWNER);
        EventBus.on('TRAINING_LAB_CLOSE_REQUESTED', () => {
            this.close();
        }, OWNER);
        EventBus.on('TRAINING_LAB_AUTO_REQUESTED', ({ enabled }) => {
            this.scene.trainingPlanner.setAutoEnabled(enabled);
            this.render();
        }, OWNER);
        EventBus.on('TRAINING_LAB_JOB_SELECT_REQUESTED', ({ kind, id }) => {
            if (kind === 'DEFENSE') {
                this.selectDefenseJob(id);
            } else {
                this.selectSystemJob(id);
            }
        }, OWNER);
        EventBus.on('TRAINING_LAB_REWARD_REQUESTED', ({ type, reward }) => {
            this.setDefenseReward(type, reward);
        }, OWNER);
    }

    setActiveTab(tab: 'DEFENSE' | 'SYSTEM'): void {
        this.activeTab = tab;
        this.render();
    }

    open(lab: ModelTrainingLab): void {
        this.activeTrainingLab = lab;
        setLegacyTrainingLabOpen(this.modal, true);
        this.render();
    }

    private openFirstLab(tab: 'DEFENSE' | 'SYSTEM' = 'DEFENSE'): void {
        const lab = (this.scene.buildingManager?.getByType('MODEL_TRAINING_LAB') || [])
            .find(building => building instanceof ModelTrainingLab) as ModelTrainingLab | undefined;
        if (!lab) {
            this.logMessage(createTrainingLabMissingLogMessage());
            return;
        }
        this.setActiveTab(tab);
        this.open(lab);
    }

    render(): void {
        const lab = this.activeTrainingLab;
        const modal = this.modal;
        if (!lab) return;

        const summary = lab.getSummary();
        const planner = this.scene.trainingPlanner;
        const display = createTrainingLabShellDisplay({
            gpuUnlocked: this.scene.isGpuUnlocked(),
            planner,
            summary
        });
        const list = modal
            ? renderLegacyTrainingLabShell(modal, {
                activeTab: this.activeTab,
                autoActive: display.autoActive,
                autoModeText: display.plannerStatusText,
                autoToggleText: display.autoToggleText,
                durationText: display.durationText,
                guardDomPointer,
                onAutoToggle: () => {
                    planner.setAutoEnabled(!display.autoActive);
                    this.render();
                },
                onClose: () => this.close(),
                onTabSelect: tab => {
                    this.activeTab = tab;
                    this.render();
                },
                overviewText: display.overviewText,
                plannerReasonText: display.plannerReasonText
            })
            : null;

        let rows: TrainingLabRowSnapshot[];
        if (this.activeTab === 'DEFENSE') {
            rows = this.renderDefenseJobs(list, lab);
        } else {
            rows = this.renderSystemJobs(list);
        }
        syncLegacyTrainingLabControls(modal, Boolean(modal?.dataset.preactShadow));
        this.publishDisplayPayload({
            activeTab: this.activeTab,
            open: true,
            rows
        }, display);
    }

    private publishDisplayPayload({
        activeTab,
        open,
        rows
    }: {
        activeTab: 'DEFENSE' | 'SYSTEM';
        open: boolean;
        rows: TrainingLabRowSnapshot[];
    }, shell: ReturnType<typeof createTrainingLabShellDisplay>): void {
        const payload = createTrainingLabDisplayPayload({
            activeTab,
            open,
            rows,
            shell
        });
        EventBus.emit('TRAINING_LAB_UPDATED', payload.snapshot);
    }

    private renderDefenseJobs(list: HTMLElement | null, lab: ModelTrainingLab): TrainingLabRowSnapshot[] {
        const rows = createTrainingLabDefenseRows({
            activeJobId: this.scene.trainingPlanner.activeJobId,
            getDefenseJobId: type => lab.getDefenseJobId(type),
            getDefenseModelState: type => this.scene.getDefenseModelState(type)
        });
        if (list) {
            renderLegacyTrainingLabDefenseRows(list, rows, {
                guardDomPointer,
                onRewardSelect: (id, reward) => this.setDefenseReward(id, reward),
                onSelect: id => this.selectDefenseJob(id)
            });
        }
        return createTrainingLabDefenseRowSnapshots(rows);
    }

    private renderSystemJobs(list: HTMLElement | null): TrainingLabRowSnapshot[] {
        const rows = createTrainingLabSystemRows({
            activeJobId: this.scene.trainingPlanner.activeJobId,
            getJobProgress: id => this.scene.researchManager.getJobProgress(id),
            isJobAvailable: id => this.scene.researchManager.isJobAvailable(id)
        });
        if (list) {
            renderLegacyTrainingLabSystemRows(list, rows, {
                guardDomPointer,
                onSelect: id => this.selectSystemJob(id)
            });
        }
        return createTrainingLabSystemRowSnapshots(rows);
    }

    private selectDefenseJob(type: string): void {
        const lab = this.activeTrainingLab;
        if (!lab || !CONFIG.MODEL_TRAINING.TARGET_TYPES.includes(type as any)) return;
        lab.setTarget(type);
        this.logMessage(textForKey('trainingLab.targetSet', { name: getBuildingName(type) }));
        this.render();
    }

    private selectSystemJob(id: string): void {
        const lab = this.activeTrainingLab;
        if (!lab || !CONFIG.RESEARCH[id]) return;
        const progress = this.scene.researchManager.getJobProgress(id);
        const available = this.scene.researchManager.isJobAvailable(id);
        if (!available && !progress.completed) return;
        lab.setSystemJob(id);
        this.logMessage(textForKey('trainingLab.jobSet', { name: textForKey(`research.${id}.name`) }));
        this.render();
    }

    private setDefenseReward(type: string, reward: 'accuracy' | 'damage'): void {
        const lab = this.activeTrainingLab;
        if (!lab || !CONFIG.MODEL_TRAINING.TARGET_TYPES.includes(type as any)) return;
        lab.setTrainingRewardPreference(type, reward);
        this.logMessage(textForKey('trainingLab.rewardSet', {
            name: getBuildingName(type),
            reward: reward === 'accuracy'
                ? textForKey('trainingLab.rewardAccuracy')
                : textForKey('trainingLab.rewardDamage')
        }));
        this.render();
    }

    private logMessage(message: string): void {
        EventBus.emit('ACTIVITY_LOG_ENTRY_REQUESTED', { message });
    }

    private close(): void {
        this.activeTrainingLab = null;
        setLegacyTrainingLabOpen(this.modal, false);
        EventBus.emit('TRAINING_LAB_OPEN_CHANGED', { open: false });
        restoreGameCanvasFocus();
    }

    private teardown(): void {
        EventBus.offAll(OWNER);
    }
}
