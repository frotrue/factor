import EventBus from '../../managers/EventBus';
import { useEffect } from 'preact/hooks';
import { mainMenu } from '../signals/menuState';
import styles from './MainMenu.module.css';

export default function MainMenu() {
    const snapshot = mainMenu.value;
    const difficultyIds = snapshot.difficulties.map(option => option.id);

    useEffect(() => {
        if (!snapshot.open) return;

        const requestDifficultyOffset = (offset: number) => {
            if (!difficultyIds.length) return;
            const selectedIndex = Math.max(0, difficultyIds.indexOf(snapshot.selectedDifficulty));
            const nextIndex = (selectedIndex + offset + difficultyIds.length) % difficultyIds.length;
            EventBus.emit('MAIN_MENU_DIFFICULTY_REQUESTED', { id: difficultyIds[nextIndex] });
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                requestDifficultyOffset(-1);
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                requestDifficultyOffset(1);
            } else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                EventBus.emit('MAIN_MENU_START_REQUESTED', { loadSave: false });
            } else if ((event.key === 'c' || event.key === 'C') && snapshot.saveExists) {
                event.preventDefault();
                EventBus.emit('MAIN_MENU_START_REQUESTED', { loadSave: true });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [difficultyIds.join('|'), snapshot.open, snapshot.saveExists, snapshot.selectedDifficulty]);

    if (!snapshot.open) return null;
    const selected = snapshot.difficulties.find(option => option.id === snapshot.selectedDifficulty);
    const descriptionId = 'preact-main-menu-difficulty-description';

    return (
        <section class={styles.menu} aria-label={snapshot.labels.aria} data-testid="preact-main-menu">
            <div class={styles.titleBlock}>
                <h1>{snapshot.title}</h1>
                <p>{snapshot.subtitle}</p>
            </div>
            <div aria-live="polite" class={styles.statusStrip} data-testid="preact-main-menu-status">
                <span class={snapshot.tutorialCompleted ? styles.ready : styles.warning}>
                    {snapshot.tutorialStatusLabel}
                </span>
                <span class={snapshot.saveExists ? styles.ready : styles.idle}>
                    {snapshot.saveStatusLabel}
                </span>
            </div>
            <div class={styles.difficulty}>
                <div class={styles.label}>{snapshot.difficultyLabel}</div>
                <div
                    aria-describedby={selected ? descriptionId : undefined}
                    aria-label={snapshot.difficultyLabel}
                    class={styles.options}
                    data-testid="preact-main-menu-difficulty-group"
                    role="group"
                >
                    {snapshot.difficulties.map(option => (
                        <button
                            aria-pressed={option.selected}
                            class={`${styles.option} ${option.selected ? styles.selected : ''}`}
                            data-testid={`preact-main-menu-difficulty-${option.id.toLowerCase()}`}
                            id={`preact-main-menu-difficulty-${option.id.toLowerCase()}`}
                            key={option.id}
                            onClick={() => EventBus.emit('MAIN_MENU_DIFFICULTY_REQUESTED', { id: option.id })}
                            type="button"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                {selected ? (
                    <p class={styles.description} data-testid="preact-main-menu-difficulty-description" id={descriptionId}>
                        {selected.description}
                    </p>
                ) : null}
            </div>
            {snapshot.saveExists ? (
                <button
                    class={styles.continue}
                    data-testid="preact-main-menu-continue"
                    id="preact-main-menu-continue"
                    onClick={() => EventBus.emit('MAIN_MENU_START_REQUESTED', { loadSave: true })}
                    type="button"
                >
                    {snapshot.continueLabel}
                </button>
            ) : null}
            <button
                class={styles.start}
                data-testid="preact-main-menu-start"
                id="preact-main-menu-start"
                onClick={() => EventBus.emit('MAIN_MENU_START_REQUESTED', { loadSave: false })}
                type="button"
            >
                {snapshot.startLabel}
            </button>
            <div class={styles.keyHint}>
                {snapshot.keyHints.map(hint => <span key={hint}>{hint}</span>)}
            </div>
        </section>
    );
}
