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
    const kickerId = `preact-wave-result-kicker-${snapshot.token}`;
    const integrityId = `preact-wave-result-integrity-summary-${snapshot.token}`;
    const integrityLabelId = `preact-wave-result-integrity-label-${snapshot.token}`;
    const integrityValueId = `preact-wave-result-integrity-value-${snapshot.token}`;
    const statsId = `preact-wave-result-stats-${snapshot.token}`;
    const historyLabelId = `preact-wave-result-history-label-${snapshot.token}`;

    return (
        <section
            aria-atomic="true"
            aria-describedby={integrityId}
            aria-labelledby={titleId}
            class={`${styles.card} ${tone}`}
            data-testid="preact-wave-result-card"
            id="preact-wave-result-card"
            role="status"
        >
            <div class={styles.header} data-testid="preact-wave-result-header">
                <div>
                    <div class={styles.kicker} data-testid="preact-wave-result-kicker" id={kickerId}>{snapshot.kicker}</div>
                    <div class={styles.title} data-testid="preact-wave-result-title" id={titleId}>{snapshot.title}</div>
                </div>
                <Button
                    ariaControls="preact-wave-result-card"
                    ariaDescribedBy={integrityId}
                    className={styles.close}
                    dataTestId="preact-wave-result-close"
                    id="preact-wave-result-close"
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
                <span data-testid="preact-wave-result-integrity-label" id={integrityLabelId}>
                    {snapshot.integrityLabel}
                </span>
                <strong data-testid="preact-wave-result-integrity-value" id={integrityValueId}>
                    {snapshot.coreHpPercent}%
                </strong>
                <div
                    aria-describedby={integrityValueId}
                    aria-labelledby={integrityLabelId}
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
            <div aria-labelledby={titleId} class={styles.grid} data-testid="preact-wave-result-stats" id={statsId} role="list">
                {snapshot.stats.map(stat => {
                    const statId = stat.id.toLowerCase();
                    const labelId = `preact-wave-result-stat-${statId}-label-${snapshot.token}`;
                    const valueId = `preact-wave-result-stat-${statId}-value-${snapshot.token}`;
                    return (
                    <span
                        aria-describedby={valueId}
                        aria-labelledby={labelId}
                        class={styles.stat}
                        data-testid={`preact-wave-result-stat-${stat.id}`}
                        key={stat.id}
                        role="listitem"
                    >
                        <small data-testid={`preact-wave-result-stat-${stat.id}-label`} id={labelId}>{stat.label}</small>
                        <strong
                            class={statToneClass[stat.tone]}
                            data-testid={`preact-wave-result-stat-${stat.id}-value`}
                            id={valueId}
                        >
                            {stat.value}
                        </strong>
                    </span>
                    );
                })}
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
                        {history.map(entry => {
                            const itemLabelId = `preact-wave-result-history-${entry.wave}-label-${entry.token}`;
                            const coreId = `preact-wave-result-history-${entry.wave}-core-${entry.token}`;
                            const killsId = `preact-wave-result-history-${entry.wave}-kills-${entry.token}`;
                            return (
                            <span
                                aria-describedby={`${coreId} ${killsId}`}
                                aria-labelledby={itemLabelId}
                                class={`${styles.historyItem} ${entry.outcome === 'failed' ? styles.historyFailed : ''}`}
                                data-testid={`preact-wave-result-history-${entry.wave}`}
                                key={entry.token}
                                role="listitem"
                            >
                                <strong data-testid={`preact-wave-result-history-${entry.wave}-label`} id={itemLabelId}>
                                    {entry.historyWaveLabel}
                                </strong>
                                <small data-testid={`preact-wave-result-history-${entry.wave}-core`} id={coreId}>
                                    {entry.historyCoreLabel}
                                </small>
                                <small data-testid={`preact-wave-result-history-${entry.wave}-kills`} id={killsId}>
                                    {entry.historyKillsLabel}
                                </small>
                            </span>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </section>
    );
}
