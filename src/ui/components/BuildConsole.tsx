import EventBus from '../../managers/EventBus';
import { useMemo, useState } from 'preact/hooks';
import { buildConsole } from '../signals/buildState';
import Button from '../shared/Button';
import GlassPanel from '../shared/GlassPanel';
import styles from './BuildConsole.module.css';

function stopHudEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
}

export default function BuildConsole() {
    const state = buildConsole.value;
    const [previewKey, setPreviewKey] = useState<string | null>(null);
    const previewItem = useMemo(
        () => state.items.find(item => item.key === (previewKey ?? state.selectedTool.type)) ?? state.items.find(item => item.selected),
        [previewKey, state.items, state.selectedTool.type]
    );
    const hasOverflowHint = state.items.length > 6;
    const activeCategory = state.categories.find(category => category.active) ?? state.categories[0];
    const activeCategoryTabId = activeCategory ? `preact-build-category-tab-${activeCategory.id}` : undefined;
    const previewId = 'preact-build-console-preview';

    return (
        <section class={styles.wrap} data-testid="preact-build-console" aria-label={state.labels.aria}>
            <GlassPanel className={styles.console}>
                <div class={styles.tabs} aria-label={state.labels.categories} role="tablist">
                    {state.categories.map(category => (
                        <Button
                            active={category.active}
                            ariaControls="preact-build-console-items"
                            ariaSelected={category.active}
                            className={styles.tab}
                            dataTestId={`preact-build-category-${category.id}`}
                            id={`preact-build-category-tab-${category.id}`}
                            key={category.id}
                            onPointerDown={stopHudEvent}
                            onClick={event => {
                                stopHudEvent(event);
                                EventBus.emit('BUILD_CATEGORY_SELECT_REQUESTED', { category: category.id });
                            }}
                            role="tab"
                            tabIndex={0}
                            variant="tab"
                        >
                            {category.label}
                        </Button>
                    ))}
                </div>

                <div
                    aria-label={activeCategoryTabId ? undefined : state.labels.tools}
                    aria-labelledby={activeCategoryTabId}
                    class={styles.items}
                    data-testid="preact-build-console-items"
                    id="preact-build-console-items"
                    role="tabpanel"
                >
                    {state.items.map(item => (
                        <Button
                            ariaDescribedBy={previewId}
                            ariaPressed={item.selected}
                            active={item.selected}
                            className={styles.item}
                            dataTestId={`preact-build-tool-${item.key}`}
                            key={item.key}
                            onBlur={() => setPreviewKey(null)}
                            onPointerDown={stopHudEvent}
                            onFocus={() => setPreviewKey(item.key)}
                            onMouseEnter={() => setPreviewKey(item.key)}
                            onMouseLeave={() => setPreviewKey(null)}
                            onClick={event => {
                                stopHudEvent(event);
                                EventBus.emit('BUILD_TOOL_SELECT_REQUESTED', { type: item.key });
                            }}
                            tabIndex={0}
                            variant="tool"
                        >
                            {item.hotkey ? <span class={styles.hotkey}>{item.hotkey}</span> : null}
                            {item.iconSrc ? (
                                <span class={styles.iconFrame}>
                                    <img class={styles.iconImage} src={item.iconSrc} alt="" loading="lazy" />
                                </span>
                            ) : (
                                <span class={styles.swatch} style={{ background: item.color }} />
                            )}
                            <span class={styles.itemText}>
                                <span class={styles.itemLabel}>{item.label}</span>
                                <span class={styles.itemCost}>{item.cost}</span>
                            </span>
                        </Button>
                    ))}
                    {hasOverflowHint ? <span class={styles.scrollHint}>{state.labels.more}</span> : null}
                </div>

                <div
                    aria-atomic="true"
                    aria-live="polite"
                    class={styles.preview}
                    data-testid={previewId}
                    id={previewId}
                    role="status"
                >
                    <span class={styles.kicker} data-testid="preact-build-console-preview-kicker">
                        {previewKey ? state.labels.toolInfo : state.labels.selectedTool}
                    </span>
                    <span class={styles.selectedName} data-testid="preact-build-console-preview-name">
                        {previewItem?.label ?? state.selectedTool.name}
                    </span>
                    <span class={styles.selectedCost} data-testid="preact-build-console-preview-cost">
                        {previewItem?.cost ?? state.selectedTool.cost}
                    </span>
                    <span class={styles.hint} data-testid="preact-build-console-preview-hint">
                        {previewItem?.description || state.selectedTool.hint}
                    </span>
                    {previewItem?.stats?.length ? (
                        <div aria-label={state.labels.toolInfo} class={styles.stats} data-testid="preact-build-console-preview-stats" role="list">
                            {previewItem.stats.map(stat => (
                                <span class={`${styles.stat} ${styles[stat.tone ?? 'default']}`} key={`${stat.label}-${stat.value}`} role="listitem">
                                    <span>{stat.label}</span>
                                    <strong>{stat.value}</strong>
                                </span>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div class={styles.commandStrip}>
                    <span><kbd>1-9</kbd> {state.labels.commandSelect}</span>
                    <span><kbd>R</kbd> {state.labels.commandRotate}</span>
                    <span><kbd>0</kbd> {state.labels.commandRemove}</span>
                </div>
            </GlassPanel>
        </section>
    );
}
