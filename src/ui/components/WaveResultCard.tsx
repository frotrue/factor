import EventBus from '../../managers/EventBus';
import { waveResult, waveResultHistory } from '../signals/notificationState';
import Button from '../shared/Button';
import styles from './WaveResultCard.module.css';

function stopCardEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
}

export default function WaveResultCard() {
    const snapshot = waveResult.value;
    if (!snapshot.open) return null;
    const history = waveResultHistory.value.slice(0, 3);

    const tone = snapshot.outcome === 'failed' ? styles.failed : styles.survived;
    const statToneClass = {
        default: styles.default,
        danger: styles.danger,
        good: styles.good,
        warning: styles.warning
    };

    const titleId = `preact-wave-result-title-${snapshot.token}`;
    const integrityId = `preact-wave-result-integrity-summary-${snapshot.token}`;
    const historyLabelId = `preact-wave-result-history-label-${snapshot.token}`;

    return (
        <section
            aria-describedby={integrityId}
            aria-labelledby={titleId}
            class={`${styles.card} ${tone}`}
            data-testid="preact-wave-result-card"
            id="preact-wave-result-card"
            role="status"
        >
            <div class={styles.header}>
                <div>
                    <div class={styles.kicker}>{snapshot.kicker}</div>
                    <div class={styles.title} data-testid="preact-wave-result-title" id={titleId}>{snapshot.title}</div>
                </div>
                <Button
                    ariaControls="preact-wave-result-card"
                    className={styles.close}
                    dataTestId="preact-wave-result-close"
                    onClick={event => {
                        stopCardEvent(event);
                        EventBus.emit('WAVE_RESULT_CLOSE_REQUESTED');
                    }}
                    tabIndex={0}
                >
                    {snapshot.closeLabel}
                </Button>
            </div>
            <div class={styles.integrity} data-testid="preact-wave-result-integrity-summary" id={integrityId}>
                <span>{snapshot.integrityLabel}</span>
                <strong>{snapshot.coreHpPercent}%</strong>
                <div
                    aria-label={snapshot.integrityLabel}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={snapshot.coreHpPercent}
                    aria-valuetext={`${snapshot.coreHpPercent}%`}
                    class={styles.integrityTrack}
                    data-testid="preact-wave-result-integrity"
                    role="progressbar"
                >
                    <span class={statToneClass[snapshot.integrityTone]} style={{ width: `${snapshot.coreHpPercent}%` }} />
                </div>
            </div>
            <div aria-label={snapshot.title} class={styles.grid} data-testid="preact-wave-result-stats" role="list">
                {snapshot.stats.map(stat => (
                    <span class={styles.stat} data-testid={`preact-wave-result-stat-${stat.id}`} key={stat.id} role="listitem">
                        <small>{stat.label}</small>
                        <strong class={statToneClass[stat.tone]}>{stat.value}</strong>
                    </span>
                ))}
            </div>
            {history.length > 1 ? (
                <div class={styles.history}>
                    <div class={styles.historyLabel} data-testid="preact-wave-result-history-label" id={historyLabelId}>{snapshot.historyLabel}</div>
                    <div
                        aria-labelledby={historyLabelId}
                        class={styles.historyList}
                        data-testid="preact-wave-result-history"
                        role="list"
                    >
                        {history.map(entry => (
                            <span
                                class={`${styles.historyItem} ${entry.outcome === 'failed' ? styles.historyFailed : ''}`}
                                data-testid={`preact-wave-result-history-${entry.wave}`}
                                key={entry.token}
                                role="listitem"
                            >
                                <strong>{entry.historyWaveLabel}</strong>
                                <small>{entry.historyCoreLabel}</small>
                                <small>{entry.historyKillsLabel}</small>
                            </span>
                        ))}
                    </div>
                </div>
            ) : null}
        </section>
    );
}
