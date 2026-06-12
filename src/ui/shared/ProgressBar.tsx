import styles from './ProgressBar.module.css';

interface ProgressBarProps {
    dataTestId?: string;
    id?: string;
    label: string;
    value: number;
    valueText?: string;
    tone?: 'default' | 'warning' | 'danger' | 'success';
}

export default function ProgressBar({ dataTestId, id, label, value, valueText, tone = 'default' }: ProgressBarProps) {
    const clamped = Math.max(0, Math.min(100, value));
    const rounded = Math.round(clamped);
    const displayValue = valueText ?? `${rounded}%`;

    return (
        <div
            aria-label={label}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={rounded}
            aria-valuetext={displayValue}
            class={`${styles.wrap} ${styles[tone]}`}
            data-testid={dataTestId}
            id={id}
            role="progressbar"
        >
            <div class={styles.meta}>
                <span>{label}</span>
                <span>{displayValue}</span>
            </div>
            <div class={styles.track}>
                <div class={styles.fill} style={{ width: `${clamped}%` }} />
            </div>
        </div>
    );
}
