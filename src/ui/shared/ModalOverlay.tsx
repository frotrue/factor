import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import styles from './ModalOverlay.module.css';

interface ModalOverlayProps {
    children: ComponentChildren;
    onClose?: () => void;
    open: boolean;
}

export default function ModalOverlay({ children, onClose, open }: ModalOverlayProps) {
    useEffect(() => {
        if (!open || !onClose) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            onClose();
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [onClose, open]);

    if (!open) return null;

    return (
        <div
            class={styles.overlay}
            data-testid="preact-modal-overlay"
            onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                onClose?.();
            }}
            onPointerDown={event => {
                event.preventDefault();
                event.stopPropagation();
            }}
            role="presentation"
        >
            <div class={styles.panel} data-testid="preact-modal-panel" onClick={event => event.stopPropagation()}>
                {children}
            </div>
        </div>
    );
}
