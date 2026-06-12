import EventBus from '../../managers/EventBus';
import { gameOverScreen } from '../signals/modalState';
import Button from '../shared/Button';
import styles from './GameOverScreen.module.css';

function stopGameOverEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
}

export default function GameOverScreen() {
    const snapshot = gameOverScreen.value;
    if (!snapshot.open) return null;

    const toneClass = {
        cyan: styles.cyan,
        danger: styles.danger,
        green: styles.green,
        warn: styles.warn
    };
    const modelStrength = Math.min(100, snapshot.bestModelAccuracy + snapshot.bestModelDamageBonus);

    return (
        <section
            aria-labelledby="preact-game-over-title"
            aria-modal="true"
            class={styles.screen}
            data-testid="preact-game-over-screen"
            role="dialog"
        >
            <div class={styles.panel} id="preact-game-over-panel">
                <div class={styles.header}>
                    <div>
                        <div class={styles.kicker}>{snapshot.kicker}</div>
                        <h2 class={styles.title} id="preact-game-over-title">{snapshot.title}</h2>
                    </div>
                    <div class={styles.failureCode}>{snapshot.failureCode}</div>
                </div>
                <div class={styles.integrity}>
                    <span>{snapshot.integrityLabel}</span>
                    <strong>{snapshot.coreHpPercent}%</strong>
                    <div
                        aria-label={snapshot.integrityLabel}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={snapshot.coreHpPercent}
                        aria-valuetext={`${snapshot.coreHpPercent}%`}
                        class={styles.track}
                        data-testid="preact-game-over-integrity"
                        role="progressbar"
                    >
                        <span style={{ width: `${snapshot.coreHpPercent}%` }} />
                    </div>
                </div>
                <div aria-label={snapshot.title} class={styles.grid} data-testid="preact-game-over-stats" role="list">
                    {snapshot.stats.map(stat => (
                        <div class={styles.stat} data-testid={`preact-game-over-stat-${stat.id}`} key={stat.id} role="listitem">
                            <span>{stat.label}</span>
                            <strong class={toneClass[stat.tone]}>{stat.value}</strong>
                        </div>
                    ))}
                </div>
                <div class={styles.model}>
                    <div>
                        <span>{snapshot.bestModelLabel}</span>
                        <strong>{snapshot.bestModelName}</strong>
                        <small>{snapshot.bestModelDetail}</small>
                    </div>
                    <div
                        aria-label={snapshot.bestModelLabel}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={modelStrength}
                        aria-valuetext={`${modelStrength}%`}
                        class={styles.modelMeter}
                        data-testid="preact-game-over-model-meter"
                        role="progressbar"
                    >
                        <span style={{ width: `${modelStrength}%` }} />
                    </div>
                </div>
                <div class={styles.actions}>
                    <Button
                        className={styles.action}
                        dataTestId="preact-game-over-restart"
                        onClick={event => {
                            stopGameOverEvent(event);
                            EventBus.emit('GAME_OVER_ACTION_REQUESTED', { action: 'restart' });
                        }}
                        tabIndex={0}
                    >
                        {snapshot.restartLabel}
                    </Button>
                    <Button
                        className={styles.action}
                        dataTestId="preact-game-over-main-menu"
                        onClick={event => {
                            stopGameOverEvent(event);
                            EventBus.emit('GAME_OVER_ACTION_REQUESTED', { action: 'main-menu' });
                        }}
                        tabIndex={0}
                    >
                        {snapshot.mainMenuLabel}
                    </Button>
                </div>
            </div>
        </section>
    );
}
