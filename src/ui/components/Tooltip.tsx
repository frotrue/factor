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
            <div class={styles.header} data-testid="preact-tooltip-header">
                <div class={styles.title} data-testid="preact-tooltip-title" id={titleId}>{snapshot.title}</div>
                <Button
                    ariaControls={bodyId}
                    ariaDescribedBy={bodyId}
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
            <div class={styles.body} data-testid="preact-tooltip-body" id={bodyId} role="list">
                {snapshot.lines.map((line, index) => (
                    <p data-testid="preact-tooltip-line" key={`${index}-${line}`} role="listitem">{line}</p>
                ))}
            </div>
        </aside>
    );
}
