import ModelTrainingLab from '../buildings/ModelTrainingLab';
import type MainScene from '../scenes/MainScene';
import type UIManager from './UIManager';
import { CONFIG } from '../config';
import { getBuildingName, textForKey } from '../i18n';
import EventBus from './EventBus';
import {
    ensureLegacyTrainingLabModal,
    renderLegacyTrainingLabDefenseRows,
    renderLegacyTrainingLabShell,
    renderLegacyTrainingLabSystemRows,
    setLegacyTrainingLabOpen
} from '../ui/legacyTrainingLab';
import {
    createTrainingLabDefenseRowSnapshots,
    createTrainingLabDefenseRows,
    createTrainingLabDisplayPayload,
    createTrainingLabShellDisplay,
    createTrainingLabSystemRowSnapshots,
    createTrainingLabSystemRows
} from '../ui/trainingLabDisplay';
import type { TrainingLabRowSnapshot } from '../types';

export default class TrainingLabUI {
    private activeTrainingLab: ModelTrainingLab | null = null;
    private activeTab: 'DEFENSE' | 'SYSTEM' = 'DEFENSE';
    private modal: HTMLElement | null = null;

    constructor(
        private scene: MainScene,
        private uiManager: UIManager
    ) {}

    setup(): void {
        this.modal = ensureLegacyTrainingLabModal(element => this.uiManager.guardDomPointer(element));
        EventBus.on('TRAINING_LAB_TAB_REQUESTED', ({ tab }) => {
            this.activeTab = tab;
            this.render();
        }, 'TrainingLabUI');
        EventBus.on('TRAINING_LAB_CLOSE_REQUESTED', () => {
            this.close();
        }, 'TrainingLabUI');
        EventBus.on('TRAINING_LAB_AUTO_REQUESTED', ({ enabled }) => {
            this.scene.trainingPlanner.setAutoEnabled(enabled);
            this.render();
        }, 'TrainingLabUI');
        EventBus.on('TRAINING_LAB_JOB_SELECT_REQUESTED', ({ kind, id }) => {
            if (kind === 'DEFENSE') {
                this.selectDefenseJob(id);
            } else {
                this.selectSystemJob(id);
            }
        }, 'TrainingLabUI');
        EventBus.on('TRAINING_LAB_REWARD_REQUESTED', ({ type, reward }) => {
            this.setDefenseReward(type, reward);
        }, 'TrainingLabUI');
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
                guardDomPointer: element => this.uiManager.guardDomPointer(element),
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
                guardDomPointer: element => this.uiManager.guardDomPointer(element),
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
                guardDomPointer: element => this.uiManager.guardDomPointer(element),
                onSelect: id => this.selectSystemJob(id)
            });
        }
        return createTrainingLabSystemRowSnapshots(rows);
    }

    private selectDefenseJob(type: string): void {
        const lab = this.activeTrainingLab;
        if (!lab || !CONFIG.MODEL_TRAINING.TARGET_TYPES.includes(type as any)) return;
        lab.setTarget(type);
        this.uiManager.logMessage(textForKey('trainingLab.targetSet', { name: getBuildingName(type) }));
        this.render();
    }

    private selectSystemJob(id: string): void {
        const lab = this.activeTrainingLab;
        if (!lab || !CONFIG.RESEARCH[id]) return;
        const progress = this.scene.researchManager.getJobProgress(id);
        const available = this.scene.researchManager.isJobAvailable(id);
        if (!available && !progress.completed) return;
        lab.setSystemJob(id);
        this.uiManager.logMessage(textForKey('trainingLab.jobSet', { name: textForKey(`research.${id}.name`) }));
        this.render();
    }

    private setDefenseReward(type: string, reward: 'accuracy' | 'damage'): void {
        const lab = this.activeTrainingLab;
        if (!lab || !CONFIG.MODEL_TRAINING.TARGET_TYPES.includes(type as any)) return;
        lab.setTrainingRewardPreference(type, reward);
        this.uiManager.logMessage(textForKey('trainingLab.rewardSet', {
            name: getBuildingName(type),
            reward: reward === 'accuracy'
                ? textForKey('trainingLab.rewardAccuracy')
                : textForKey('trainingLab.rewardDamage')
        }));
        this.render();
    }

    private close(): void {
        setLegacyTrainingLabOpen(this.modal, false);
        EventBus.emit('TRAINING_LAB_OPEN_CHANGED', { open: false });
        this.uiManager.restoreCanvasFocus();
    }
}
