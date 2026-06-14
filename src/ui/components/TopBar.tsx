import {
    isLowPower,
    packets,
    powerDisplay,
    score,
    silicon,
    topHudLabels,
    wave,
    waveTimer
} from '../signals/gameState';
import EventBus from '../../managers/EventBus';
import StatCard from '../shared/StatCard';
import styles from './TopBar.module.css';

export default function TopBar() {
    const labels = topHudLabels.value;
    const stats = [
        { id: 'score', label: labels.stats.dataReceived, value: score, variant: 'primary' },
        { id: 'power', label: labels.stats.power, value: powerDisplay, variant: 'power' },
        { id: 'silicon', label: labels.stats.silicon, value: silicon, variant: 'default' },
        { id: 'packets', label: labels.stats.packets, value: packets, variant: 'default' },
        { id: 'wave', label: labels.stats.wave, value: wave, variant: 'alert' },
        { id: 'next-wave', label: labels.stats.nextWave, value: waveTimer, variant: 'default' }
    ];

    return (
        <section class={styles.topBar} data-testid="preact-top-bar" aria-label={labels.aria}>
            <div aria-label={labels.runtimeStats} class={styles.stats} data-testid="preact-topbar-stats" role="list">
                {stats.map(stat => (
                    <StatCard
                        key={stat.id}
                        danger={stat.variant === 'power' && isLowPower.value}
                        id={stat.id}
                        label={stat.label}
                        value={stat.value.value}
                        variant={stat.variant as 'default' | 'primary' | 'power' | 'alert'}
                    />
                ))}
            </div>
            <nav class={styles.shortcuts} aria-label={labels.shortcuts}>
                <ShortcutButton label={labels.settings} testId="preact-topbar-settings" onClick={() => EventBus.emit('SETTINGS_OPEN_REQUESTED')} />
                <ShortcutButton label={labels.research} testId="preact-topbar-research" onClick={() => EventBus.emit('TRAINING_LAB_OPEN_REQUESTED', { tab: 'SYSTEM' })} />
                <ShortcutButton label={labels.lab} testId="preact-topbar-lab" onClick={() => EventBus.emit('TRAINING_LAB_OPEN_REQUESTED', { tab: 'DEFENSE' })} />
            </nav>
        </section>
    );
}

function ShortcutButton({ label, onClick, testId }: { label: string; onClick: () => void; testId: string }) {
    return (
        <button
            class={styles.shortcut}
            data-testid={testId}
            onClick={event => {
                event.preventDefault();
                event.stopPropagation();
                onClick();
            }}
            onPointerDown={event => {
                event.preventDefault();
                event.stopPropagation();
            }}
            tabIndex={0}
            type="button"
        >
            {label}
        </button>
    );
}
