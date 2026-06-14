import { signal } from '@preact/signals';
import { activityLog } from '../signals/notificationState';
import Button from '../shared/Button';
import styles from './ActivityLog.module.css';

const expanded = signal(false);
const alertsOnly = signal(false);

export default function ActivityLog() {
    const snapshot = activityLog.value;
    const allEntries = snapshot.entries;
    const alertCount = allEntries.filter(entry => entry.isAlert).length;
    const filteredEntries = alertsOnly.value ? allEntries.filter(entry => entry.isAlert) : allEntries;
    const entries = expanded.value ? filteredEntries : filteredEntries.slice(-5);
    if (allEntries.length === 0) return null;
    const titleId = 'preact-activity-log-title';
    const entriesId = 'preact-activity-log-entries';
    const controlsId = 'preact-activity-log-controls';

    return (
        <section
            aria-labelledby={titleId}
            class={styles.log}
            data-testid="preact-activity-log"
            role="region"
        >
            <div class={styles.header}>
                <span data-testid="preact-activity-log-title" id={titleId}>
                    {snapshot.title} <small data-testid="preact-activity-log-count">{allEntries.length}</small>
                </span>
                <div
                    aria-label={snapshot.ariaLabel}
                    class={styles.controls}
                    data-testid="preact-activity-log-controls"
                    id={controlsId}
                    role="group"
                >
                    {alertCount > 0 ? (
                        <Button
                            active={alertsOnly.value}
                            ariaControls={entriesId}
                            ariaPressed={alertsOnly.value}
                            className={styles.toggle}
                            dataTestId="preact-activity-log-alerts"
                            onClick={event => {
                                event.preventDefault();
                                event.stopPropagation();
                                alertsOnly.value = !alertsOnly.value;
                            }}
                            tabIndex={0}
                        >
                            {snapshot.alertCountLabel} {alertCount}
                        </Button>
                    ) : null}
                    {filteredEntries.length > 5 ? (
                        <Button
                            ariaControls={entriesId}
                            ariaExpanded={expanded.value}
                            className={styles.toggle}
                            dataTestId="preact-activity-log-history"
                            onClick={event => {
                                event.preventDefault();
                                event.stopPropagation();
                                expanded.value = !expanded.value;
                            }}
                            tabIndex={0}
                        >
                            {expanded.value ? snapshot.lessLabel : snapshot.historyLabel}
                        </Button>
                    ) : null}
                </div>
            </div>
            {alertsOnly.value && entries.length === 0 ? (
                <div class={`${styles.entry} ${styles.empty}`}>
                    <span aria-hidden="true">&gt;</span>
                    <p>{snapshot.noAlertsLabel}</p>
                </div>
            ) : null}
            <div
                aria-labelledby={titleId}
                aria-live="polite"
                aria-relevant="additions text"
                class={styles.entries}
                data-testid="preact-activity-log-entries"
                id={entriesId}
                role="log"
            >
                {entries.map(entry => (
                    <div
                        class={`${styles.entry} ${entry.isAlert ? styles.alert : ''}`}
                        data-testid={`preact-activity-log-entry-${entry.id}`}
                        key={entry.id}
                        role="article"
                    >
                        <span aria-hidden="true">{entry.isAlert ? '!' : '>'}</span>
                        <p>{entry.message}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
