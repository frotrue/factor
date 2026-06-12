import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import EventBus from '../../managers/EventBus';
import { settingsModal } from '../signals/modalState';
import Button from '../shared/Button';
import ModalOverlay from '../shared/ModalOverlay';
import styles from './SettingsModal.module.css';

type SettingsTab = 'game' | 'audio' | 'graphics' | 'system';

const activeTab = signal<SettingsTab>('game');
const tabIds: SettingsTab[] = ['game', 'audio', 'graphics', 'system'];

function stopModalEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
}

export default function SettingsModal() {
    const settings = settingsModal.value;
    const panelId = 'preact-settings-panel';
    const activeTabId = `preact-settings-tab-${activeTab.value}`;
    const titleId = 'preact-settings-title';
    const noteId = 'preact-settings-note';
    const requestAudio = (next: Partial<{ volume: number; muted: boolean }>) => {
        EventBus.emit('SETTINGS_AUDIO_REQUESTED', {
            volume: next.volume ?? settings.volume,
            muted: next.muted ?? settings.muted
        });
    };

    return (
        <ModalOverlay open={settings.open} onClose={() => EventBus.emit('SETTINGS_CLOSE_REQUESTED')}>
            <section
                aria-describedby={noteId}
                aria-labelledby={titleId}
                aria-modal="true"
                class={styles.content}
                data-testid="preact-settings-modal"
                onPointerDown={event => event.stopPropagation()}
                role="dialog"
            >
                <div class={styles.header}>
                    <div>
                        <div class={styles.kicker}>{settings.labels.kicker}</div>
                        <h2 class={styles.title} data-testid={titleId} id={titleId}>{settings.labels.title}</h2>
                    </div>
                    <button
                        aria-label={settings.labels.close}
                        class={styles.close}
                        data-testid="preact-settings-close"
                        onClick={event => {
                            stopModalEvent(event);
                            EventBus.emit('SETTINGS_CLOSE_REQUESTED');
                        }}
                        type="button"
                    >
                        {settings.labels.close}
                    </button>
                </div>

                <div aria-label={settings.labels.title} class={styles.tabs} data-testid="preact-settings-tabs" role="tablist">
                    {tabIds.map(tabId => (
                        <Button
                            active={activeTab.value === tabId}
                            ariaControls={panelId}
                            ariaSelected={activeTab.value === tabId}
                            id={`preact-settings-tab-${tabId}`}
                            key={tabId}
                            onClick={event => {
                                stopModalEvent(event);
                                activeTab.value = tabId;
                            }}
                            role="tab"
                            tabIndex={0}
                            variant="tab"
                        >
                            {settings.labels.tabs[tabId]}
                        </Button>
                    ))}
                </div>

                <div aria-labelledby={activeTabId} class={styles.grid} data-testid={panelId} id={panelId} role="tabpanel">
                    {activeTab.value === 'game' ? (
                        <>
                            <SettingGroup label={settings.labels.speed}>
                                <Segmented
                                    ariaLabel={settings.labels.speed}
                                    options={[1, 2, 3].map(speed => ({ label: `${speed}x`, value: String(speed) }))}
                                    value={String(settings.speed)}
                                    onChange={value => EventBus.emit('SETTINGS_SPEED_REQUESTED', { speed: Number(value) })}
                                />
                            </SettingGroup>

                            <SettingGroup label={settings.labels.language}>
                                <Segmented
                                    ariaLabel={settings.labels.language}
                                    options={[
                                        { label: settings.labels.languageKo, value: 'ko' },
                                        { label: settings.labels.languageEn, value: 'en' }
                                    ]}
                                    value={settings.language}
                                    onChange={value => EventBus.emit('SETTINGS_LANGUAGE_REQUESTED', { language: value })}
                                />
                            </SettingGroup>
                        </>
                    ) : null}

                    {activeTab.value === 'audio' ? (
                        <SettingGroup label={settings.labels.masterVolume}>
                            <div class={styles.inline}>
                                <input
                                    aria-label={settings.labels.masterVolume}
                                    aria-valuetext={`${settings.volume}%`}
                                    class={styles.range}
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={settings.volume}
                                    onInput={event => requestAudio({ volume: Number((event.currentTarget as HTMLInputElement).value) })}
                                />
                                <Button
                                    active={settings.muted}
                                    ariaPressed={settings.muted}
                                    className={styles.toggle}
                                    onClick={event => {
                                        stopModalEvent(event);
                                        requestAudio({ muted: !settings.muted });
                                    }}
                                    tabIndex={0}
                                >
                                    {settings.muted ? settings.labels.muted : `${settings.volume}%`}
                                </Button>
                            </div>
                        </SettingGroup>
                    ) : null}

                    {activeTab.value === 'graphics' ? (
                        <>
                            <SettingGroup label={settings.labels.fps}>
                                <Segmented
                                    ariaLabel={settings.labels.fps}
                                    options={[60, 144, 240].map(fps => ({ label: `${fps}`, value: String(fps) }))}
                                    value={String(settings.fps)}
                                    onChange={value => EventBus.emit('SETTINGS_FPS_REQUESTED', { fps: Number(value) })}
                                />
                            </SettingGroup>

                            <SettingGroup label={settings.labels.graphics}>
                                <Button
                                    active={settings.bloomEnabled}
                                    ariaPressed={settings.bloomEnabled}
                                    className={styles.toggle}
                                    onClick={event => {
                                        stopModalEvent(event);
                                        EventBus.emit('SETTINGS_BLOOM_REQUESTED', { enabled: !settings.bloomEnabled });
                                    }}
                                    tabIndex={0}
                                >
                                    {settings.bloomEnabled ? settings.labels.bloomOn : settings.labels.bloomOff}
                                </Button>
                            </SettingGroup>
                        </>
                    ) : null}

                    {activeTab.value === 'system' ? (
                        <>
                            <SettingGroup label={settings.labels.saveData}>
                                <div class={styles.inline}>
                                    <Button onClick={event => {
                                        stopModalEvent(event);
                                        EventBus.emit('SAVE_REQUESTED');
                                    }} tabIndex={0}>
                                        {settings.labels.save}
                                    </Button>
                                    <Button onClick={event => {
                                        stopModalEvent(event);
                                        EventBus.emit('LOAD_REQUESTED');
                                    }} tabIndex={0}>
                                        {settings.labels.load}
                                    </Button>
                                </div>
                            </SettingGroup>

                            <SettingGroup label={settings.labels.tutorial}>
                                <Button onClick={event => {
                                    stopModalEvent(event);
                                    EventBus.emit('SETTINGS_RESET_TUTORIAL_REQUESTED');
                                }} tabIndex={0}>
                                    {settings.labels.restartTutorial}
                                </Button>
                            </SettingGroup>
                        </>
                    ) : null}
                </div>

                <div class={styles.note} data-testid={noteId} id={noteId}>{settings.labels.note}</div>
            </section>
        </ModalOverlay>
    );
}

function SettingGroup({ children, label }: { children: ComponentChildren; label: string }) {
    return (
        <div class={styles.group}>
            <span class={styles.label}>{label}</span>
            {children}
        </div>
    );
}

function Segmented({
    ariaLabel,
    onChange,
    options,
    value
}: {
    ariaLabel: string;
    onChange: (value: string) => void;
    options: Array<{ label: string; value: string }>;
    value: string;
}) {
    return (
        <div aria-label={ariaLabel} class={styles.segmented} role="group">
            {options.map(option => (
                <button
                    aria-pressed={option.value === value}
                    key={option.value}
                    type="button"
                    class={`${styles.segment} ${option.value === value ? styles.active : ''}`}
                    onClick={event => {
                        stopModalEvent(event);
                        onChange(option.value);
                    }}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
