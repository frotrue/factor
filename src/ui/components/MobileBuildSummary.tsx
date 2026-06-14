import { mobileActions } from '../signals/mobileState';
import styles from './MobileBuildSummary.module.css';

export default function MobileBuildSummary() {
    const snapshot = mobileActions.value;
    if (!snapshot.open || (!snapshot.summaryTitle && !snapshot.summaryDetail)) return null;
    const titleId = 'preact-mobile-build-summary-title';
    const detailId = 'preact-mobile-build-summary-detail';
    const contentId = 'preact-mobile-build-summary-content';
    const hasDetail = snapshot.summaryDetail.length > 0;

    return (
        <section
            aria-atomic="true"
            aria-describedby={hasDetail ? detailId : undefined}
            aria-labelledby={titleId}
            aria-live="polite"
            class={styles.summary}
            data-has-detail={hasDetail ? 'true' : 'false'}
            data-testid="preact-mobile-build-summary"
            role="status"
        >
            <span class={styles.handle} aria-hidden="true" data-testid="preact-mobile-build-summary-handle" />
            <div
                aria-describedby={hasDetail ? detailId : undefined}
                aria-labelledby={titleId}
                class={styles.content}
                data-testid="preact-mobile-build-summary-content"
                id={contentId}
                role="group"
            >
                <strong data-testid="preact-mobile-build-summary-title" id={titleId}>
                    {snapshot.summaryTitle}
                </strong>
                {hasDetail ? (
                    <span data-testid="preact-mobile-build-summary-detail" id={detailId}>{snapshot.summaryDetail}</span>
                ) : null}
            </div>
        </section>
    );
}
