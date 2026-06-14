import EventBus from '../../managers/EventBus';
import type { TrainingLabRowSnapshot, TrainingRewardPreference } from '../../types';
import { trainingLabModal } from '../signals/modalState';
import Button from '../shared/Button';
import ProgressBar from '../shared/ProgressBar';
import styles from './TrainingLabModal.module.css';

function parseProgressPair(progress: string): [number, number] {
    const values = progress
        .split('/')
        .map(part => Number(part.replace('%', '').trim()))
        .filter(value => Number.isFinite(value));
    return [values[0] ?? 0, values[1] ?? 0];
}

function stopLabEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
}

function getRowTone(row: TrainingLabRowSnapshot, workProgress: number): 'active' | 'complete' | 'training' | 'locked' | 'idle' {
    if (row.active) return 'active';
    if (row.disabled) return 'locked';
    if (/완료|Completed/i.test(row.detail)) return 'complete';
    if (/잠김|Locked/i.test(row.detail)) return 'locked';
    if (workProgress > 0 || /Researching|학습 진행/i.test(row.detail)) return 'training';
    return 'idle';
}

function selectRow(row: TrainingLabRowSnapshot): void {
    if (row.disabled) return;
    EventBus.emit('TRAINING_LAB_JOB_SELECT_REQUESTED', { kind: row.kind, id: row.id });
}

function requestReward(row: TrainingLabRowSnapshot, reward: TrainingRewardPreference): void {
    if (row.kind !== 'DEFENSE' || row.disabled) return;
    EventBus.emit('TRAINING_LAB_REWARD_REQUESTED', { type: row.id, reward });
}

export default function TrainingLabModal() {
    const snapshot = trainingLabModal.value;
    if (!snapshot.open) return null;
    const visibleRows = snapshot.rows;
    const panelId = 'preact-training-lab-panel';
    const activeTabId = `preact-training-lab-tab-${snapshot.activeTab}`;
    const titleId = 'preact-training-lab-title';
    const overviewId = 'preact-training-lab-overview';
    const plannerId = 'preact-training-lab-planner';
    const durationId = 'preact-training-lab-duration';

    return (
        <aside
            aria-describedby={`${overviewId} ${plannerId} ${durationId}`}
            aria-labelledby={titleId}
            class={styles.panel}
            data-testid="preact-training-lab-modal"
            role="dialog"
        >
            <div class={styles.header} data-testid="preact-training-lab-header">
                <div>
                    <span class={styles.kicker} data-testid="preact-training-lab-kicker">{snapshot.kicker}</span>
                    <strong data-testid="preact-training-lab-title" id={titleId}>{snapshot.title}</strong>
                </div>
                <button
                    aria-controls={panelId}
                    aria-describedby={plannerId}
                    class={styles.close}
                    data-testid="preact-training-lab-close"
                    id="preact-training-lab-close"
                    type="button"
                    onClick={event => {
                        stopLabEvent(event);
                        EventBus.emit('TRAINING_LAB_CLOSE_REQUESTED');
                    }}
                >
                    {snapshot.closeLabel}
                </button>
            </div>

            <div class={styles.status} data-testid="preact-training-lab-overview" id={overviewId}>{snapshot.overview}</div>
            <div
                aria-labelledby="preact-training-lab-planner-status"
                class={styles.planner}
                data-testid="preact-training-lab-planner"
                id={plannerId}
                role="status"
            >
                <span data-testid="preact-training-lab-planner-status" id="preact-training-lab-planner-status">
                    {snapshot.plannerStatus}
                </span>
                <small data-testid="preact-training-lab-planner-reason" id="preact-training-lab-planner-reason">
                    {snapshot.plannerReason}
                </small>
                <Button
                    active={snapshot.autoEnabled}
                    ariaControls={plannerId}
                    ariaDescribedBy="preact-training-lab-planner-reason"
                    ariaPressed={snapshot.autoEnabled}
                    className={styles.autoButton}
                    dataTestId="preact-training-lab-auto"
                    id="preact-training-lab-auto"
                    onClick={event => {
                        stopLabEvent(event);
                        EventBus.emit('TRAINING_LAB_AUTO_REQUESTED', { enabled: !snapshot.autoEnabled });
                    }}
                    onPointerDown={stopLabEvent}
                    tabIndex={0}
                    variant="ghost"
                >
                    {snapshot.autoToggleLabel}
                </Button>
            </div>

            <div aria-labelledby={titleId} class={styles.tabs} data-testid="preact-training-lab-tabs" role="tablist">
                {[
                    { id: 'DEFENSE' as const, label: snapshot.tabs.defense },
                    { id: 'SYSTEM' as const, label: snapshot.tabs.system }
                ].map(tab => (
                    <Button
                        active={snapshot.activeTab === tab.id}
                        ariaControls={panelId}
                        ariaSelected={snapshot.activeTab === tab.id}
                        dataTestId={`preact-training-lab-tab-${tab.id}`}
                        id={`preact-training-lab-tab-${tab.id}`}
                        key={tab.id}
                        onClick={event => {
                            stopLabEvent(event);
                            EventBus.emit('TRAINING_LAB_TAB_REQUESTED', { tab: tab.id });
                        }}
                        onPointerDown={stopLabEvent}
                        role="tab"
                        tabIndex={0}
                        variant="tab"
                    >
                        {tab.label}
                    </Button>
                ))}
            </div>

            <div
                aria-describedby={plannerId}
                aria-labelledby={activeTabId}
                class={styles.rows}
                data-testid="preact-training-lab-panel"
                id={panelId}
                role="tabpanel"
            >
                {visibleRows.map((row, index) => {
                    const [dataProgress, workProgress] = parseProgressPair(row.progress);
                    const tone = getRowTone(row, workProgress);
                    const rowBaseId = `preact-training-lab-row-${row.id}`;
                    const titleId = `${rowBaseId}-title`;
                    const detailId = `${rowBaseId}-detail`;
                    const toneId = `${rowBaseId}-tone`;
                    const rewardGroupId = `${rowBaseId}-reward-group`;
                    const rewardLabelId = `${rowBaseId}-reward-label`;
                    return (
                        <div
                            aria-describedby={`${detailId} ${toneId}`}
                            aria-disabled={row.disabled ? 'true' : 'false'}
                            aria-labelledby={titleId}
                            aria-pressed={row.active ? 'true' : 'false'}
                            class={`${styles.row} ${styles[tone]} ${row.disabled ? styles.disabled : ''}`}
                            data-testid={rowBaseId}
                            key={`${row.kind}-${row.id}-${index}`}
                            onClick={event => {
                                stopLabEvent(event);
                                selectRow(row);
                            }}
                            onKeyDown={event => {
                                if (event.key !== 'Enter' && event.key !== ' ') return;
                                stopLabEvent(event);
                                selectRow(row);
                            }}
                            role="button"
                            tabIndex={row.disabled ? -1 : 0}
                        >
                            <div class={styles.rowHeader}>
                                <strong data-testid={`${rowBaseId}-title`} id={titleId}>{row.title}</strong>
                                <span class={styles.badge} data-testid={`${rowBaseId}-tone`} id={toneId}>{snapshot.toneLabels[tone]}</span>
                            </div>
                            <span class={styles.detail} data-testid={`${rowBaseId}-detail`} id={detailId}>{row.detail}</span>
                            {row.kind === 'DEFENSE' && row.rewardPreference ? (
                                <div
                                    aria-labelledby={rewardLabelId}
                                    class={styles.rewardControls}
                                    data-testid={rewardGroupId}
                                    id={rewardGroupId}
                                    role="group"
                                >
                                    <span class={styles.rewardLabel} data-testid={rewardLabelId} id={rewardLabelId}>
                                        {snapshot.rewardModeLabel}
                                    </span>
                                    {(['accuracy', 'damage'] as TrainingRewardPreference[]).map(reward => (
                                        <button
                                            aria-describedby={rewardLabelId}
                                            aria-pressed={row.rewardPreference === reward}
                                            class={`${styles.rewardButton} ${row.rewardPreference === reward ? styles.rewardActive : ''}`}
                                            data-testid={`preact-training-lab-reward-${row.id}-${reward}`}
                                            key={reward}
                                            onClick={event => {
                                                stopLabEvent(event);
                                                requestReward(row, reward);
                                            }}
                                            type="button"
                                        >
                                            {reward === 'accuracy' ? snapshot.rewardAccuracyShortLabel : snapshot.rewardDamageShortLabel}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                            <ProgressBar
                                dataTestId={`${rowBaseId}-data-progress`}
                                id={`${rowBaseId}-data-progress`}
                                label={snapshot.dataProgressLabel}
                                value={dataProgress}
                                valueText={`${snapshot.dataProgressLabel}: ${dataProgress}%`}
                                tone={tone === 'active' || tone === 'complete' ? 'success' : 'default'}
                            />
                            <ProgressBar
                                dataTestId={`${rowBaseId}-work-progress`}
                                id={`${rowBaseId}-work-progress`}
                                label={snapshot.workProgressLabel}
                                value={workProgress}
                                valueText={`${snapshot.workProgressLabel}: ${workProgress}%`}
                                tone={workProgress > 0 ? 'warning' : 'default'}
                            />
                        </div>
                    );
                })}
            </div>

            <div class={styles.duration} data-testid="preact-training-lab-duration" id={durationId}>{snapshot.duration}</div>
        </aside>
    );
}
