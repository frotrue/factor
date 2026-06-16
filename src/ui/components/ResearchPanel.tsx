import { useEffect, useRef } from 'preact/hooks';
import EventBus from '../../managers/EventBus';
import { researchPanel } from '../signals/modalState';
import Button from '../shared/Button';
import ProgressBar from '../shared/ProgressBar';
import styles from './ResearchPanel.module.css';

const MAP_SIZE = 1160;
const AXIS_BASE_RADIUS = 150;
const AXIS_RING_STEP = 132;
const POSITION_SPREAD = 154;
const CORE_RING_STEP = 150;
const CORE_POSITION_SPREAD = 220;

type ResearchAxisLayout = {
    labelX: number;
    labelY: number;
    baseX: number;
    baseY: number;
    ringX: number;
    ringY: number;
    positionX: number;
    positionY: number;
};

const AXIS_LAYOUTS: Record<string, ResearchAxisLayout> = {
    production: { labelX: -430, labelY: 0, baseX: -300, baseY: 0, ringX: -130, ringY: 0, positionX: 0, positionY: 100 },
    energy: { labelX: -330, labelY: 330, baseX: -230, baseY: 260, ringX: -90, ringY: 110, positionX: 160, positionY: 0 },
    defense: { labelX: 0, labelY: -430, baseX: 0, baseY: -300, ringX: 0, ringY: -130, positionX: 160, positionY: 0 },
    model: { labelX: 330, labelY: 330, baseX: 230, baseY: 260, ringX: 90, ringY: 110, positionX: 160, positionY: 0 },
    automation: { labelX: 430, labelY: 0, baseX: 300, baseY: 0, ringX: 130, ringY: 0, positionX: 0, positionY: 100 },
    network: { labelX: 360, labelY: -280, baseX: 280, baseY: -230, ringX: 100, ringY: -110, positionX: 160, positionY: 0 }
};

function stopResearchEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
}

export default function ResearchPanel() {
    const snapshot = researchPanel.value;
    const mapRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !snapshot.open) return;
        map.scrollLeft = (map.scrollWidth - map.clientWidth) / 2;
        map.scrollTop = (map.scrollHeight - map.clientHeight) / 2;
    }, [snapshot.open]);

    if (!snapshot.open) return null;

    const selected = snapshot.nodes.find(node => node.id === snapshot.selectedId) ?? snapshot.nodes[0];

    return (
        <aside class={styles.panel} data-testid="preact-research-panel" role="dialog" aria-labelledby="preact-research-title">
            <header class={styles.header}>
                <div>
                    <span class={styles.kicker}>Research Matrix</span>
                    <strong id="preact-research-title">{snapshot.title}</strong>
                </div>
                <button
                    class={styles.close}
                    data-testid="preact-research-close"
                    type="button"
                    onClick={event => {
                        stopResearchEvent(event);
                        EventBus.emit('RESEARCH_CLOSE_REQUESTED');
                    }}
                >
                    {snapshot.closeLabel}
                </button>
            </header>

            <section class={styles.status} aria-label="Research data">
                <div class={styles.meta}>
                    <span>{snapshot.queueText}</span>
                    <span>{snapshot.throughputText}</span>
                </div>
                <div class={styles.queueSummary}>
                    <span>{snapshot.activeResearch ? `Active: ${snapshot.activeResearch.name}` : 'Active: Idle'}</span>
                    {snapshot.researchQueue.length > 0 ? (
                        <span>Next: {snapshot.researchQueue.map(item => item.name).join(' / ')}</span>
                    ) : null}
                    {snapshot.blockedData.blocked ? (
                        <span class={styles.blocked}>{snapshot.blockedData.message}</span>
                    ) : null}
                </div>
                <div class={styles.dataBalances}>
                    {snapshot.dataBalances.map(balance => (
                        <ProgressBar
                            dataTestId={`preact-research-data-${balance.id}`}
                            id={`preact-research-data-${balance.id}`}
                            key={balance.id}
                            label={`${balance.label} ${Math.floor(balance.value)}/${balance.capacity}`}
                            tone={balance.percent > 70 ? 'success' : 'default'}
                            value={balance.percent}
                            valueText={`${balance.label}: ${Math.floor(balance.value)} / ${balance.capacity}`}
                        />
                    ))}
                </div>
            </section>

            <section class={styles.body}>
                <div class={styles.map} data-testid="preact-research-map" ref={mapRef}>
                    <div
                        class={styles.mapCanvas}
                        style={{
                            '--map-size': `${MAP_SIZE}px`
                        } as any}
                    >
                        <div class={styles.core}>CORE</div>
                        {snapshot.axes.map(axis => (
                            <span
                                class={styles.axis}
                                key={axis.id}
                                style={{
                                    '--axis-color': axis.color,
                                    '--axis-x': `${AXIS_LAYOUTS[axis.id]?.labelX ?? Math.cos(axis.angle * Math.PI / 180) * 470}px`,
                                    '--axis-y': `${AXIS_LAYOUTS[axis.id]?.labelY ?? Math.sin(axis.angle * Math.PI / 180) * 470}px`
                                } as any}
                            >
                                {axis.label}
                            </span>
                        ))}
                        {snapshot.nodes.map(node => {
                            const axis = snapshot.axes.find(item => item.id === node.axis);
                            const layout = axis ? AXIS_LAYOUTS[axis.id] : undefined;
                            const angle = axis?.angle ?? 0;
                            const isCoreNode = node.axis === 'core';
                            const distance = AXIS_BASE_RADIUS + node.ring * AXIS_RING_STEP;
                            const offset = (node.position - 0.5) * POSITION_SPREAD;
                            const radians = angle * Math.PI / 180;
                            const x = isCoreNode
                                ? (node.ring === 1 ? (node.position - 0.5) * CORE_POSITION_SPREAD : 0)
                                : layout
                                    ? layout.baseX + Math.max(0, node.ring - 1) * layout.ringX + (node.position - 0.5) * layout.positionX
                                : Math.cos(radians) * distance + Math.cos(radians + Math.PI / 2) * offset;
                            const y = isCoreNode
                                ? node.ring * CORE_RING_STEP - 88
                                : layout
                                    ? layout.baseY + Math.max(0, node.ring - 1) * layout.ringY + (node.position - 0.5) * layout.positionY
                                : Math.sin(radians) * distance + Math.sin(radians + Math.PI / 2) * offset;
                            return (
                                <button
                                    class={`${styles.node} ${styles[node.status]} ${snapshot.selectedId === node.id ? styles.selected : ''}`}
                                    data-testid={`preact-research-node-${node.id}`}
                                    key={node.id}
                                    onClick={event => {
                                        stopResearchEvent(event);
                                        EventBus.emit('RESEARCH_SELECT_REQUESTED', { id: node.id });
                                    }}
                                    style={{
                                        '--node-x': `${x}px`,
                                        '--node-y': `${y}px`,
                                        '--node-color': axis?.color ?? '#dbeafe'
                                    } as any}
                                    type="button"
                                >
                                    <span>{node.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <section class={styles.detail} data-testid="preact-research-detail">
                    {selected ? (
                        <>
                            <div class={styles.detailHeader}>
                                <strong>{selected.name}</strong>
                                <span>{selected.status}</span>
                            </div>
                            <p>{selected.description}</p>
                            <div class={styles.tags}>
                                {selected.tagLabels.map(tag => <span key={tag}>{tag}</span>)}
                            </div>
                            <span class={styles.cost}>{selected.costText}</span>
                            <ProgressBar
                                dataTestId={`preact-research-progress-${selected.id}`}
                                id={`preact-research-progress-${selected.id}`}
                                label="Progress"
                                tone={selected.status === 'completed' ? 'success' : 'warning'}
                                value={selected.progressPercent}
                                valueText={`Progress: ${selected.progressPercent}%`}
                            />
                            <ul class={styles.effects}>
                                {selected.effectsText.map(effect => <li key={effect}>{effect}</li>)}
                            </ul>
                            <Button
                                disabled={selected.status === 'locked' || selected.status === 'gated' || selected.status === 'completed' || selected.status === 'active' || selected.status === 'queued'}
                                dataTestId="preact-research-start"
                                onClick={event => {
                                    stopResearchEvent(event);
                                    EventBus.emit('RESEARCH_SLOT_ASSIGN_REQUESTED', { id: selected.id });
                                }}
                                onPointerDown={stopResearchEvent}
                                variant="primary"
                            >
                                Start
                            </Button>
                        </>
                    ) : null}
                </section>
            </section>
        </aside>
    );
}
