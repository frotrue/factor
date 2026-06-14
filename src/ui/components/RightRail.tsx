import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { powerConsumption, powerProduction, tacticalPanels } from '../signals/gameState';
import GlassPanel from '../shared/GlassPanel';
import ProgressBar from '../shared/ProgressBar';
import styles from './RightRail.module.css';

type RailPanelId = 'objective' | 'threat' | 'systems';

const THREAT_VALUE = {
    Low: 24,
    Medium: 50,
    High: 76,
    Critical: 100
};

interface RailSectionProps {
    id: RailPanelId;
    title: string;
    labels: {
        expand: string;
        collapse: string;
        panelName: string;
    };
    collapsed: boolean;
    variant?: 'default' | 'alert' | 'success';
    onToggle: (id: RailPanelId) => void;
    children: ComponentChildren;
}

function RailSection({ id, title, labels, collapsed, variant = 'default', onToggle, children }: RailSectionProps) {
    const bodyId = `preact-right-rail-${id}`;
    const titleId = `${bodyId}-title`;
    return (
        <section
            aria-labelledby={titleId}
            class={styles.section}
            data-collapsed={collapsed ? 'true' : 'false'}
            data-testid={`preact-right-rail-panel-${id}`}
            role="region"
        >
            <GlassPanel className={styles.panel} variant={variant}>
                <div class={styles.panelHeader}>
                    <div class={styles.kicker} data-testid={`preact-right-rail-title-${id}`} id={titleId}>{title}</div>
                    <button
                        aria-controls={bodyId}
                        aria-expanded={!collapsed}
                        aria-label={`${collapsed ? labels.expand : labels.collapse} ${labels.panelName}`}
                        class={styles.collapseButton}
                        data-testid={`preact-right-rail-toggle-${id}`}
                        onClick={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            onToggle(id);
                        }}
                        onPointerDown={event => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                        tabIndex={0}
                        type="button"
                    >
                        {collapsed ? '+' : '-'}
                    </button>
                </div>
                {collapsed ? null : (
                    <div aria-labelledby={titleId} class={styles.panelBody} data-testid={`preact-right-rail-body-${id}`} id={bodyId}>
                        {children}
                    </div>
                )}
            </GlassPanel>
        </section>
    );
}

export default function RightRail() {
    const panels = tacticalPanels.value;
    const [collapsed, setCollapsed] = useState<Record<RailPanelId, boolean>>({
        objective: false,
        threat: false,
        systems: false
    });
    const powerLoad = powerProduction.value > 0
        ? Math.min(100, (powerConsumption.value / powerProduction.value) * 100)
        : 0;
    const powerTone = panels.powerStatus.tone === 'danger'
        ? 'danger'
            : panels.powerStatus.tone === 'warning'
            ? 'warning'
            : 'success';
    const threatValue = THREAT_VALUE[panels.threat.threatLevel] ?? 24;
    const threatTone = panels.threat.threatLevel === 'Critical'
        ? 'danger'
        : panels.threat.threatLevel === 'High'
            ? 'warning'
            : 'default';
    const togglePanel = (id: RailPanelId) => {
        setCollapsed(current => ({ ...current, [id]: !current[id] }));
    };

    return (
        <aside class={styles.rail} data-testid="preact-right-rail" aria-label={panels.labels.aria}>
            <RailSection
                id="objective"
                title={panels.labels.objective}
                labels={{
                    expand: panels.labels.expand,
                    collapse: panels.labels.collapse,
                    panelName: panels.labels.panelNames.objective
                }}
                collapsed={collapsed.objective}
                onToggle={togglePanel}
            >
                <div class={styles.title}>{panels.objective.title}</div>
                <div class={styles.detail}>{panels.objective.detail}</div>
            </RailSection>

            <RailSection
                id="threat"
                title={panels.labels.threat}
                labels={{
                    expand: panels.labels.expand,
                    collapse: panels.labels.collapse,
                    panelName: panels.labels.panelNames.threat
                }}
                collapsed={collapsed.threat}
                onToggle={togglePanel}
                variant="alert"
            >
                <div class={styles.title}>{panels.threat.title}</div>
                <div class={styles.detail}>{panels.threat.detail}</div>
                <div class={styles.threatRows}>
                    <div
                        aria-label={panels.labels.threat}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={threatValue}
                        aria-valuetext={panels.threat.threatLevel}
                        class={styles.threatMeter}
                        data-testid="preact-right-rail-threat-meter"
                        data-tone={threatTone}
                        role="progressbar"
                    >
                        <span style={{ width: `${threatValue}%` }} />
                    </div>
                    <div class={styles.threatMeta}>
                        <span>{panels.threat.threatLevel}</span>
                        {panels.threat.special ? <span>{panels.threat.special}</span> : null}
                    </div>
                    <div aria-label={panels.threat.title || panels.labels.threat} class={styles.routes} data-testid="preact-right-rail-threat-routes" role="list">
                        {panels.threat.routeNames.map(route => <span data-testid={`preact-right-rail-threat-route-${route}`} key={route} role="listitem">{route}</span>)}
                    </div>
                </div>
                <div class={styles.chip}>{panels.threat.recommendation}</div>
            </RailSection>

            <RailSection
                id="systems"
                title={panels.labels.systems}
                labels={{
                    expand: panels.labels.expand,
                    collapse: panels.labels.collapse,
                    panelName: panels.labels.panelNames.systems
                }}
                collapsed={collapsed.systems}
                onToggle={togglePanel}
            >
                <div class={styles.title}>{panels.defense.title}</div>
                <div class={styles.detail}>{panels.defense.detail}</div>
                <ProgressBar dataTestId="preact-right-rail-power-load" label={panels.labels.powerLoad} value={powerLoad} tone={powerTone} />
                <div class={`${styles.chip} ${styles[panels.powerStatus.tone]}`}>{panels.powerStatus.text}</div>
            </RailSection>
        </aside>
    );
}
