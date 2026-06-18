import type { ComponentChildren } from 'preact';
import styles from './GlassPanel.module.css';

interface GlassPanelProps {
    children: ComponentChildren;
    variant?: 'default' | 'alert' | 'success';
    className?: string;
}

export default function GlassPanel({ children, variant = 'default', className = '' }: GlassPanelProps) {
    return (
        <div class={`${styles.panel} ${styles[variant]} ${className}`}>
            {children}
        </div>
    );
}
