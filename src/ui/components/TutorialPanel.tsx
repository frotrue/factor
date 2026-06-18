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
    const isComplete = snapshot.mode === 'complete';
    const progressPercent = snapshot.totalCount > 0
        ? Math.round((snapshot.completeCount / snapshot.totalCount) * 100)
        : 0;
    const activeStep = snapshot.steps.find(step => step.active);
    const visibleSteps = snapshot.steps.slice(0, 8);
    const hiddenCount = Math.max(0, snapshot.steps.length - visibleSteps.length);
    const typedDetail = snapshot.detail.slice(0, typedLength);
    const isTyping = typedLength < snapshot.detail.length;
    const titleId = 'preact-tutorial-title';
    const detailId = 'preact-tutorial-detail';
    const currentLabelId = 'preact-tutorial-current-label';
    const currentTitleId = 'preact-tutorial-current-title';
    const displayTitle = isComplete ? snapshot.completedTitle : snapshot.title;

    return (
        <section
            aria-describedby={!isComplete && activeStep ? `${detailId} ${currentTitleId}` : detailId}
            aria-labelledby={titleId}
            aria-live="polite"
            class={styles.panel}
            data-active-step={snapshot.activeStepId}
            data-mode={snapshot.mode}
            data-testid="preact-tutorial-panel"
            role="status"
        >
            <div class={styles.header} data-testid="preact-tutorial-header">
                <div>
                    <div class={styles.kicker} data-testid="preact-tutorial-kicker">{snapshot.kicker}</div>
                    <div class={styles.title} data-testid="preact-tutorial-title" id={titleId}>{displayTitle}</div>
                </div>
                <div class={styles.headerActions}>
                    <div class={styles.progress} data-testid="preact-tutorial-progress-count">
                        {snapshot.completeCount}/{snapshot.totalCount}
                    </div>
                    {!isComplete ? (
                        <Button
                            ariaDescribedBy={detailId}
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
                    ) : null}
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
            <p
                class={`${styles.detail} ${isTyping ? styles.typing : ''}`}
                data-testid="preact-tutorial-detail"
                data-typing={isTyping ? 'true' : 'false'}
                id={detailId}
            >
                {typedDetail}
                {isTyping ? <span class={styles.caret} /> : null}
            </p>
            {!isComplete && activeStep ? (
                <div
                    aria-labelledby={`${currentLabelId} ${currentTitleId}`}
                    class={styles.current}
                    data-testid="preact-tutorial-current"
                    role="group"
                >
                    <span data-testid="preact-tutorial-current-label" id={currentLabelId}>
                        {snapshot.labels.currentObjective}
                    </span>
                    <strong data-testid="preact-tutorial-current-title" id={currentTitleId}>{activeStep.title}</strong>
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
                        <span data-testid={`preact-tutorial-step-${step.id}-marker`}>
                            {step.completed ? snapshot.labels.ok : String(index + 1).padStart(2, '0')}
                        </span>
                        <strong data-testid={`preact-tutorial-step-${step.id}-title`}>{step.title}</strong>
                    </div>
                ))}
                {hiddenCount > 0 ? (
                    <div class={styles.more} data-testid="preact-tutorial-more" role="listitem">
                        +{hiddenCount} {snapshot.labels.moreSteps}
                    </div>
                ) : null}
            </div>
            {isComplete ? (
                <Button
                    ariaDescribedBy={detailId}
                    className={styles.continue}
                    dataTestId="preact-tutorial-continue"
                    onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        EventBus.emit('TUTORIAL_CAMPAIGN_START_REQUESTED');
                    }}
                    tabIndex={0}
                >
                    {snapshot.continueLabel}
                </Button>
            ) : null}
        </section>
    );
}
