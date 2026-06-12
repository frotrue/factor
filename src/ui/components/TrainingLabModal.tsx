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

    return (
        <aside
            aria-labelledby="preact-training-lab-title"
            class={styles.panel}
            data-testid="preact-training-lab-modal"
            role="dialog"
        >
            <div class={styles.header}>
                <div>
                    <span class={styles.kicker}>{snapshot.kicker}</span>
                    <strong id="preact-training-lab-title">{snapshot.title}</strong>
                </div>
                <button
                    class={styles.close}
                    data-testid="preact-training-lab-close"
                    type="button"
                    onClick={event => {
                        stopLabEvent(event);
                        EventBus.emit('TRAINING_LAB_CLOSE_REQUESTED');
                    }}
                >
                    {snapshot.closeLabel}
                </button>
            </div>

            <div class={styles.status}>{snapshot.overview}</div>
            <div class={styles.planner}>
                <span>{snapshot.plannerStatus}</span>
                <small>{snapshot.plannerReason}</small>
                <Button
                    active={snapshot.autoEnabled}
                    ariaPressed={snapshot.autoEnabled}
                    className={styles.autoButton}
                    dataTestId="preact-training-lab-auto"
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

            <div aria-label={snapshot.title} class={styles.tabs} role="tablist">
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

            <div aria-labelledby={activeTabId} class={styles.rows} id={panelId} role="tabpanel">
                {visibleRows.map((row, index) => {
                    const [dataProgress, workProgress] = parseProgressPair(row.progress);
                    const tone = getRowTone(row, workProgress);
                    const rowBaseId = `preact-training-lab-row-${row.id}`;
                    const titleId = `${rowBaseId}-title`;
                    const detailId = `${rowBaseId}-detail`;
                    return (
                        <div
                            aria-describedby={detailId}
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
                                <span class={styles.badge} data-testid={`${rowBaseId}-tone`}>{snapshot.toneLabels[tone]}</span>
                            </div>
                            <span class={styles.detail} data-testid={`${rowBaseId}-detail`} id={detailId}>{row.detail}</span>
                            {row.kind === 'DEFENSE' && row.rewardPreference ? (
                                <div class={styles.rewardControls} aria-label={snapshot.rewardModeLabel} role="group">
                                    {(['accuracy', 'damage'] as TrainingRewardPreference[]).map(reward => (
                                        <button
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

            <div class={styles.duration}>{snapshot.duration}</div>
        </aside>
    );
}
