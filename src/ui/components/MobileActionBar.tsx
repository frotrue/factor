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
    const cableMenuId = 'preact-mobile-cable-menu';

    return (
        <section class={styles.bar} aria-label={snapshot.labels.aria} data-testid="preact-mobile-action-bar">
            <div aria-label={snapshot.labels.toolbar} class={styles.actions} data-testid="preact-mobile-action-toolbar" role="toolbar">
                {snapshot.actions.map(action => (
                    <button
                        aria-controls={action.id === 'cable' ? cableMenuId : undefined}
                        aria-expanded={action.id === 'cable' ? snapshot.cableMenuOpen : undefined}
                        aria-haspopup={action.id === 'cable' ? 'menu' : undefined}
                        aria-pressed={action.active}
                        class={`${styles.button} ${action.active ? styles.active : ''}`}
                        data-testid={`preact-mobile-action-${action.id}`}
                        key={action.id}
                        onClick={event => {
                            stopTouchEvent(event);
                            EventBus.emit('MOBILE_ACTION_REQUESTED', { id: action.id });
                        }}
                        onPointerDown={stopTouchEvent}
                        tabIndex={0}
                        type="button"
                    >
                        <span class={styles.icon} aria-hidden="true">{ACTION_ICONS[action.id] ?? '?'}</span>
                        <span class={styles.label}>{action.label}</span>
                    </button>
                ))}
            </div>
            {snapshot.cableMenuOpen ? (
                <div
                    aria-label={snapshot.labels.cableMenu}
                    class={styles.cableMenu}
                    data-testid={cableMenuId}
                    id={cableMenuId}
                    role="menu"
                >
                    {snapshot.cableOptions.map(option => (
                        <button
                            aria-checked={option.selected}
                            class={styles.cableOption}
                            data-testid={`preact-mobile-cable-${option.id}`}
                            key={option.id}
                            onClick={event => {
                                stopTouchEvent(event);
                                EventBus.emit('MOBILE_ACTION_REQUESTED', { id: `cable:${option.id}` });
                            }}
                            onPointerDown={stopTouchEvent}
                            role="menuitemradio"
                            type="button"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            ) : null}
        </section>
    );
}
