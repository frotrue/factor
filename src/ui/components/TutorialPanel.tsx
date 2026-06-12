import { useEffect, useMemo, useState } from 'preact/hooks';
import EventBus from '../../managers/EventBus';
import Button from '../shared/Button';
import { tutorialPanel } from '../signals/tutorialState';
import styles from './TutorialPanel.module.css';

const TYPEWRITER_INTERVAL_MS = 18;

export default function TutorialPanel() {
    const snapshot = tutorialPanel.value;
    const [typedLength, setTypedLength] = useState(snapshot.detail.length);
    const typewriterKey = useMemo(
        () => `${snapshot.activeStepId}:${snapshot.detail}`,
        [snapshot.activeStepId, snapshot.detail]
    );

    useEffect(() => {
        if (!snapshot.open) return;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion || snapshot.detail.length === 0) {
            setTypedLength(snapshot.detail.length);
            return;
        }

        setTypedLength(0);
        let nextLength = 0;
        const timer = window.setInterval(() => {
            nextLength = Math.min(snapshot.detail.length, nextLength + 2);
            setTypedLength(nextLength);
            if (nextLength >= snapshot.detail.length) {
                window.clearInterval(timer);
            }
        }, TYPEWRITER_INTERVAL_MS);

        return () => window.clearInterval(timer);
    }, [snapshot.open, snapshot.detail, typewriterKey]);

    if (!snapshot.open) return null;
    const progressPercent = snapshot.totalCount > 0
        ? Math.round((snapshot.completeCount / snapshot.totalCount) * 100)
        : 0;
    const activeStep = snapshot.steps.find(step => step.active);
    const visibleSteps = snapshot.steps.slice(0, 8);
    const hiddenCount = Math.max(0, snapshot.steps.length - visibleSteps.length);
    const typedDetail = snapshot.detail.slice(0, typedLength);
    const isTyping = typedLength < snapshot.detail.length;

    return (
        <section
            aria-labelledby="preact-tutorial-title"
            class={styles.panel}
            data-active-step={snapshot.activeStepId}
            data-testid="preact-tutorial-panel"
            aria-live="polite"
            role="status"
        >
            <div class={styles.header}>
                <div>
                    <div class={styles.kicker}>{snapshot.kicker}</div>
                    <div class={styles.title} id="preact-tutorial-title">{snapshot.title}</div>
                </div>
                <div class={styles.headerActions}>
                    <div class={styles.progress} data-testid="preact-tutorial-progress-count">
                        {snapshot.completeCount}/{snapshot.totalCount}
                    </div>
                    <Button
                        className={styles.skip}
                        dataTestId="preact-tutorial-skip"
                        onClick={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            EventBus.emit('TUTORIAL_SKIP_REQUESTED');
                        }}
                        tabIndex={0}
                    >
                        {snapshot.labels.skip}
                    </Button>
                </div>
            </div>
            <div
                aria-label={snapshot.labels.progress}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={progressPercent}
                aria-valuetext={`${snapshot.completeCount}/${snapshot.totalCount}`}
                class={styles.progressTrack}
                data-testid="preact-tutorial-progress"
                role="progressbar"
            >
                <span style={{ width: `${progressPercent}%` }} />
            </div>
            <p class={`${styles.detail} ${isTyping ? styles.typing : ''}`} data-testid="preact-tutorial-detail">
                {typedDetail}
                {isTyping ? <span class={styles.caret} /> : null}
            </p>
            {activeStep ? (
                <div class={styles.current} data-testid="preact-tutorial-current">
                    <span>{snapshot.labels.currentObjective}</span>
                    <strong>{activeStep.title}</strong>
                </div>
            ) : null}
            <div
                class={styles.steps}
                aria-label={snapshot.labels.steps}
                data-testid="preact-tutorial-steps"
                role="list"
            >
                {visibleSteps.map((step, index) => (
                    <div
                        aria-current={step.active ? 'step' : undefined}
                        class={`${styles.step} ${step.active ? styles.active : ''} ${step.completed ? styles.complete : ''}`}
                        data-testid={`preact-tutorial-step-${step.id}`}
                        key={step.id}
                        role="listitem"
                    >
                        <span>{step.completed ? snapshot.labels.ok : String(index + 1).padStart(2, '0')}</span>
                        <strong>{step.title}</strong>
                    </div>
                ))}
                {hiddenCount > 0 ? <div class={styles.more}>+{hiddenCount} {snapshot.labels.moreSteps}</div> : null}
            </div>
        </section>
    );
}
