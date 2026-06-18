import EventBus from '../../managers/EventBus';
import { mobileActions } from '../signals/mobileState';
import styles from './MobileActionBar.module.css';

const ACTION_ICONS: Record<string, string> = {
    rotate: 'R',
    remove: 'X',
    cable: 'C',
    cancel: '!',
    defense: 'D',
    power: 'P'
};

function stopTouchEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
}

export default function MobileActionBar() {
    const snapshot = mobileActions.value;
    if (!snapshot.open) return null;
    const toolbarId = 'preact-mobile-action-toolbar';
    const cableMenuId = 'preact-mobile-cable-menu';
    const cableActionLabelId = 'preact-mobile-action-cable-label';

    return (
        <section
            aria-label={snapshot.labels.aria}
            class={styles.bar}
            data-testid="preact-mobile-action-bar"
            role="region"
        >
            <div
                aria-label={snapshot.labels.toolbar}
                class={styles.actions}
                data-testid={toolbarId}
                id={toolbarId}
                role="toolbar"
            >
                {snapshot.actions.map(action => {
                    const actionId = `preact-mobile-action-${action.id}`;
                    const labelId = `${actionId}-label`;
                    const iconId = `${actionId}-icon`;
                    return (
                        <button
                            aria-controls={action.id === 'cable' ? cableMenuId : undefined}
                            aria-expanded={action.id === 'cable' ? snapshot.cableMenuOpen : undefined}
                            aria-haspopup={action.id === 'cable' ? 'menu' : undefined}
                            aria-labelledby={labelId}
                            aria-pressed={action.active}
                            class={`${styles.button} ${action.active ? styles.active : ''}`}
                            data-action-id={action.id}
                            data-testid={actionId}
                            id={actionId}
                            key={action.id}
                            onClick={event => {
                                stopTouchEvent(event);
                                EventBus.emit('MOBILE_ACTION_REQUESTED', { id: action.id });
                            }}
                            onPointerDown={stopTouchEvent}
                            tabIndex={0}
                            type="button"
                        >
                            <span
                                aria-hidden="true"
                                class={styles.icon}
                                data-testid={iconId}
                                id={iconId}
                            >
                                {ACTION_ICONS[action.id] ?? '?'}
                            </span>
                            <span class={styles.label} data-testid={labelId} id={labelId}>{action.label}</span>
                        </button>
                    );
                })}
            </div>
            {snapshot.cableMenuOpen ? (
                <div
                    aria-label={snapshot.labels.cableMenu}
                    aria-labelledby={cableActionLabelId}
                    class={styles.cableMenu}
                    data-testid={cableMenuId}
                    id={cableMenuId}
                    role="menu"
                >
                    {snapshot.cableOptions.map(option => {
                        const optionId = `preact-mobile-cable-${option.id}`;
                        const optionLabelId = `${optionId}-label`;
                        return (
                            <button
                                aria-checked={option.selected}
                                aria-labelledby={optionLabelId}
                                class={styles.cableOption}
                                data-selected={option.selected ? 'true' : 'false'}
                                data-testid={optionId}
                                id={optionId}
                                key={option.id}
                                onClick={event => {
                                    stopTouchEvent(event);
                                    EventBus.emit('MOBILE_ACTION_REQUESTED', { id: `cable:${option.id}` });
                                }}
                                onPointerDown={stopTouchEvent}
                                role="menuitemradio"
                                type="button"
                            >
                                <span data-testid={optionLabelId} id={optionLabelId}>{option.label}</span>
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </section>
    );
}
