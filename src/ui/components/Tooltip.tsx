import EventBus from '../../managers/EventBus';
import { tooltip } from '../signals/notificationState';
import Button from '../shared/Button';
import styles from './Tooltip.module.css';

function stopTooltipEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
}

export default function Tooltip() {
    const snapshot = tooltip.value;
    if (!snapshot.open) return null;

    const panelStyle = {
        '--tooltip-x': `${snapshot.x}px`,
        '--tooltip-y': `${snapshot.y}px`
    };
    const titleId = 'preact-tooltip-title';
    const bodyId = 'preact-tooltip-body';

    return (
        <aside
            aria-describedby={bodyId}
            aria-labelledby={titleId}
            class={styles.tooltip}
            data-testid="preact-tooltip"
            role="tooltip"
            style={panelStyle}
        >
            <div class={styles.header}>
                <div class={styles.title} id={titleId}>{snapshot.title}</div>
                <Button
                    className={styles.close}
                    dataTestId="preact-tooltip-close"
                    onClick={event => {
                        stopTooltipEvent(event);
                        EventBus.emit('TOOLTIP_CLOSE_REQUESTED');
                    }}
                    tabIndex={0}
                >
                    {snapshot.closeLabel}
                </Button>
            </div>
            <div class={styles.body} data-testid="preact-tooltip-body" id={bodyId}>
                {snapshot.lines.map((line, index) => (
                    <p key={`${index}-${line}`}>{line}</p>
                ))}
            </div>
        </aside>
    );
}
