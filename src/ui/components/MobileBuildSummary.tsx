import { mobileActions } from '../signals/mobileState';
import styles from './MobileBuildSummary.module.css';

export default function MobileBuildSummary() {
    const snapshot = mobileActions.value;
    if (!snapshot.open || (!snapshot.summaryTitle && !snapshot.summaryDetail)) return null;
    const titleId = 'preact-mobile-build-summary-title';
    const detailId = 'preact-mobile-build-summary-detail';

    return (
        <section
            aria-describedby={snapshot.summaryDetail ? detailId : undefined}
            aria-labelledby={titleId}
            aria-live="polite"
            class={styles.summary}
            data-testid="preact-mobile-build-summary"
            role="status"
        >
            <span class={styles.handle} aria-hidden="true" />
            <strong data-testid="preact-mobile-build-summary-title" id={titleId}>
                {snapshot.summaryTitle}
            </strong>
            <span data-testid="preact-mobile-build-summary-detail" id={detailId}>{snapshot.summaryDetail}</span>
        </section>
    );
}
