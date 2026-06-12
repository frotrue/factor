import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import styles from './StatCard.module.css';

interface StatCardProps {
    danger?: boolean;
    id: string;
    label: string;
    value: ComponentChildren;
    variant?: 'default' | 'primary' | 'power' | 'alert';
}

const STREAM_DURATION_MS = 360;

export default function StatCard({ danger = false, id, label, value, variant = 'default' }: StatCardProps) {
    const valueSignature = String(value);
    const labelId = `preact-stat-label-${id}`;
    const valueId = `preact-stat-value-${id}`;
    const previousValue = useRef(valueSignature);
    const [isStreaming, setIsStreaming] = useState(false);

    useEffect(() => {
        if (previousValue.current === valueSignature) return;
        previousValue.current = valueSignature;
        setIsStreaming(true);
        const timer = window.setTimeout(() => setIsStreaming(false), STREAM_DURATION_MS);
        return () => window.clearTimeout(timer);
    }, [valueSignature]);

    return (
        <div
            aria-describedby={valueId}
            aria-labelledby={labelId}
            class={`${styles.card} ${styles[variant]} ${danger ? styles.danger : ''} ${isStreaming ? styles.streaming : ''}`}
            data-testid={`preact-stat-card-${id}`}
            role="listitem"
        >
            <span class={styles.label} data-testid={`preact-stat-label-${id}`} id={labelId}>{label}</span>
            <span class={styles.value} data-testid={`preact-stat-value-${id}`} data-value={valueSignature} id={valueId}>{value}</span>
        </div>
    );
}
