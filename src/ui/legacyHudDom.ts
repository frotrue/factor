function getOrCreateLegacyShell(): HTMLElement {
    let shell = document.getElementById('game-hud-shell');
    if (!shell) {
        shell = document.createElement('div');
        shell.id = 'game-hud-shell';
        document.body.appendChild(shell);
    }
    return shell;
}

function ensureLegacyTopBar(shell: HTMLElement): void {
    if (document.getElementById('hud-top-bar')) return;

    const topBar = document.createElement('div');
    topBar.id = 'hud-top-bar';
    topBar.className = 'hud-panel';

    const topHud = document.createElement('div');
    topHud.id = 'top-hud';
    topHud.style.display = 'grid';
    topHud.replaceChildren(
        createHudStat('hud.dataReceived', '수신 데이터', 'hud-score', '0', 'hud-stat-primary'),
        createHudStat('hud.power', '전력 출력', 'hud-power', '0 W'),
        createHudStat('hud.silicon', '실리콘', 'hud-silicon', '0'),
        createHudStat('hud.packets', '데이터 패킷', 'hud-packets', '0'),
        createHudStat('hud.wave', '웨이브', 'hud-wave', '0', 'hud-stat-alert'),
        createHudStat('hud.nextWave', '다음 웨이브', 'hud-wave-timer', '30s')
    );

    const topActions = document.createElement('div');
    topActions.id = 'top-actions';

    const settingsButton = document.createElement('button');
    settingsButton.id = 'btn-settings';
    settingsButton.className = 'icon-action-btn';
    settingsButton.dataset.i18n = 'top.settings';
    settingsButton.textContent = '설정';
    topActions.appendChild(settingsButton);

    topBar.replaceChildren(topHud, topActions);
    shell.appendChild(topBar);
}

function createHudStat(
    i18nKey: string,
    labelText: string,
    valueId: string,
    valueText: string,
    toneClass?: string
): HTMLDivElement {
    const stat = document.createElement('div');
    stat.className = toneClass ? `hud-stat ${toneClass}` : 'hud-stat';

    const label = document.createElement('div');
    label.className = 'hud-label';
    label.dataset.i18n = i18nKey;
    label.textContent = labelText;

    const value = document.createElement('div');
    value.className = 'hud-value';
    value.id = valueId;
    value.textContent = valueText;

    stat.replaceChildren(label, value);
    return stat;
}

function ensureLegacyRightRail(shell: HTMLElement): void {
    if (document.getElementById('hud-right-rail')) return;

    const rightRail = document.createElement('aside');
    rightRail.id = 'hud-right-rail';
    rightRail.replaceChildren(
        createTacticalPanel('mission-panel', [
            createPanelText('panel-kicker', '현재 목표', undefined, 'panel.objective'),
            createPanelText('panel-title', '데이터 수집 시작', 'current-objective-title'),
            createPanelText('panel-detail', '패킷 수집기를 배치해 첫 데이터 흐름을 만드세요.', 'current-objective-detail')
        ]),
        createTacticalPanel('threat-panel', [
            createPanelText('panel-kicker', '다음 침입', undefined, 'panel.nextWave'),
            createPanelText('panel-title', 'Wave 1', 'next-wave-title'),
            createPanelText('panel-detail', 'North Port | 초기 위협', 'next-wave-detail'),
            createPanelText('panel-chip', '방어선을 준비하세요', 'next-wave-recommendation')
        ]),
        createTacticalPanel('systems-panel', [
            createPanelText('panel-kicker', '방어 시스템', undefined, 'panel.systems'),
            createPanelText('panel-title', '방어 준비 전', 'defense-status-title'),
            createPanelText('panel-detail', 'Classifier 또는 Firewall을 침입 경로 근처에 배치하세요.', 'defense-status-detail'),
            createPanelText('panel-chip panel-chip-warning', '전력: Core 주변 기본 공급', 'power-status-chip')
        ])
    );
    shell.appendChild(rightRail);
}

function createTacticalPanel(id: string, children: HTMLElement[]): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = id;
    panel.className = 'hud-panel tactical-panel';
    panel.style.display = 'none';
    panel.replaceChildren(...children);
    return panel;
}

function createPanelText(className: string, text: string, id?: string, i18nKey?: string): HTMLDivElement {
    const element = document.createElement('div');
    element.className = className;
    if (id) element.id = id;
    if (i18nKey) element.dataset.i18n = i18nKey;
    element.textContent = text;
    return element;
}

function ensureLegacyInfoLayer(shell: HTMLElement): void {
    if (document.getElementById('info-layer')) return;

    const infoLayer = document.createElement('div');
    infoLayer.id = 'info-layer';
    infoLayer.className = 'hud-panel';
    infoLayer.style.display = 'block';
    const title = document.createElement('h2');
    title.textContent = 'Gradium.OS v1.0';

    infoLayer.replaceChildren(
        title,
        createControlHint('W A S D', 'info.pan', '카메라 이동'),
        createControlHint('Scroll', 'info.zoom', '줌'),
        createControlHint('R', 'info.rotate', '회전'),
        createControlHint('F1', 'info.defenseRange', '방어 범위'),
        createControlHint('F2', 'info.powerGrid', '전력망'),
        createControlHint('R-Click', 'info.demolish', '철거')
    );
    shell.appendChild(infoLayer);
}

function createControlHint(keyText: string, i18nKey: string, labelText: string): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'control-hint';

    const key = document.createElement('span');
    key.className = 'control-key';
    key.textContent = keyText;

    const label = document.createElement('span');
    label.dataset.i18n = i18nKey;
    label.textContent = labelText;

    row.replaceChildren(key, label);
    return row;
}

function ensureLegacyBuildConsole(shell: HTMLElement): void {
    if (document.getElementById('bottom-ui-container')) return;

    const bottomUi = document.createElement('div');
    bottomUi.id = 'bottom-ui-container';
    bottomUi.style.display = 'flex';

    const buildConsole = document.createElement('div');
    buildConsole.id = 'build-console';
    buildConsole.className = 'hud-panel';

    const tabs = document.createElement('div');
    tabs.id = 'ui-tabs';

    const overlay = document.createElement('div');
    overlay.id = 'ui-overlay';

    const selectedToolPanel = document.createElement('div');
    selectedToolPanel.id = 'selected-tool-panel';
    selectedToolPanel.replaceChildren(
        createPanelText('panel-kicker', '선택 도구', undefined, 'build.selectedTool'),
        createPanelText('', '패킷 수집기', 'selected-tool-name'),
        createPanelText('', '5 실리콘', 'selected-tool-cost'),
        createPanelText('', '1-9 선택 | R 회전 | 0 철거', 'selected-tool-hint', 'build.defaultHint')
    );

    buildConsole.replaceChildren(tabs, overlay, selectedToolPanel);
    bottomUi.appendChild(buildConsole);
    shell.appendChild(bottomUi);
}

function ensureLegacySettingsModal(): void {
    if (document.getElementById('settings-modal')) return;

    const settingsModal = document.createElement('div');
    settingsModal.id = 'settings-modal';
    settingsModal.className = 'glass-panel modal-panel';
    settingsModal.style.display = 'none';

    const title = document.createElement('h2');
    title.dataset.i18n = 'settings.title';
    title.textContent = '시스템 설정';

    const speedRow = createButtonRow([
        createModalButton('btn-speed-1', '1x', 'modal-action-btn active'),
        createModalButton('btn-speed-2', '2x'),
        createModalButton('btn-speed-3', '3x')
    ]);

    const audioInline = document.createElement('div');
    audioInline.className = 'settings-inline';
    const volumeInput = document.createElement('input');
    volumeInput.id = 'audio-volume';
    volumeInput.type = 'range';
    volumeInput.min = '0';
    volumeInput.max = '100';
    volumeInput.value = '60';
    audioInline.replaceChildren(
        volumeInput,
        createCheckboxLabel('audio-muted', false, '음소거', 'settings.mute')
    );

    const graphicsInline = document.createElement('div');
    graphicsInline.className = 'settings-inline';
    graphicsInline.appendChild(createCheckboxLabel('settings-bloom', true, '네온 광원 효과 (Bloom)', 'settings.bloom'));

    const fpsLabel = createSettingsLabel('settings.fps', '프레임 제한');
    fpsLabel.style.marginTop = '8px';
    const fpsRow = createButtonRow([
        createModalButton('btn-fps-60', '60 FPS', 'modal-action-btn', { fps: '60' }),
        createModalButton('btn-fps-144', '144 FPS', 'modal-action-btn', { fps: '144' }),
        createModalButton('btn-fps-240', '240 FPS', 'modal-action-btn active', { fps: '240' })
    ]);

    const languageRow = createButtonRow([
        createModalButton('btn-language-ko', '한국어', 'modal-action-btn', {
            language: 'ko',
            i18n: 'settings.language.ko'
        }),
        createModalButton('btn-language-en', 'English', 'modal-action-btn', {
            language: 'en',
            i18n: 'settings.language.en'
        })
    ]);

    const saveRow = createButtonRow([
        createModalButton('btn-save', '저장', 'modal-action-btn', { i18n: 'settings.save' }),
        createModalButton('btn-load', '불러오기', 'modal-action-btn', { i18n: 'settings.load' })
    ], 'settings-save-row');

    settingsModal.replaceChildren(
        title,
        createSettingsSection(
            createSettingsLabel('settings.speed', '클럭 속도'),
            speedRow
        ),
        createSettingsSection(
            createSettingsLabel('settings.audio', '오디오'),
            audioInline
        ),
        createSettingsSection(
            createSettingsLabel('settings.graphics', '그래픽 효과'),
            graphicsInline,
            fpsLabel,
            fpsRow
        ),
        createSettingsSection(
            createSettingsLabel('settings.language', '언어'),
            languageRow
        ),
        createSettingsSection(
            createSettingsLabel('settings.tutorial', '튜토리얼'),
            createModalButton('btn-reset-tutorial', '튜토리얼 다시 시작', 'modal-action-btn wide', {
                i18n: 'settings.restartTutorial'
            })
        ),
        saveRow,
        createModalButton('btn-close-settings', '닫기', 'modal-action-btn wide', { i18n: 'settings.close' })
    );
    document.body.appendChild(settingsModal);
}

function createSettingsSection(...children: HTMLElement[]): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.replaceChildren(...children);
    return section;
}

function createSettingsLabel(i18nKey: string, text: string): HTMLLabelElement {
    const label = document.createElement('label');
    label.dataset.i18n = i18nKey;
    label.textContent = text;
    return label;
}

function createButtonRow(children: HTMLButtonElement[], extraClass?: string): HTMLDivElement {
    const row = document.createElement('div');
    row.className = extraClass ? `button-row ${extraClass}` : 'button-row';
    row.replaceChildren(...children);
    return row;
}

function createModalButton(
    id: string,
    text: string,
    className = 'modal-action-btn',
    data: { fps?: string; i18n?: string; language?: string } = {}
): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = id;
    button.className = className;
    if (data.fps) button.dataset.fps = data.fps;
    if (data.i18n) button.dataset.i18n = data.i18n;
    if (data.language) button.dataset.language = data.language;
    button.textContent = text;
    return button;
}

function createCheckboxLabel(id: string, checked: boolean, text: string, i18nKey: string): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'checkbox-label';

    const input = document.createElement('input');
    input.id = id;
    input.type = 'checkbox';
    input.checked = checked;

    const textSpan = document.createElement('span');
    textSpan.dataset.i18n = i18nKey;
    textSpan.textContent = text;

    label.replaceChildren(input, textSpan);
    return label;
}

function ensureLegacyGameOverScreen(): void {
    if (document.getElementById('game-over-screen')) return;

    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'game-over-screen';
    gameOverScreen.className = 'glass-panel modal-panel game-over-panel';
    gameOverScreen.style.display = 'none';

    const title = document.createElement('h1');
    title.dataset.i18n = 'gameOver.title';
    title.textContent = '시스템 실패';

    const message = document.createElement('p');
    message.dataset.i18n = 'gameOver.message';
    message.textContent = 'Neural Core가 침투당했습니다.';

    const stats = document.createElement('div');
    stats.id = 'game-over-stats';
    stats.className = 'game-over-stats';

    const restart = document.createElement('button');
    restart.id = 'btn-restart';
    restart.className = 'modal-action-btn wide';
    restart.dataset.i18n = 'gameOver.restart';
    restart.textContent = '시스템 재부팅';

    gameOverScreen.replaceChildren(title, message, stats, restart);
    document.body.appendChild(gameOverScreen);
}

function ensureBodyRoot(id: string): void {
    if (document.getElementById(id)) return;

    const root = document.createElement('div');
    root.id = id;
    document.body.appendChild(root);
}

function setShadowState(el: HTMLElement | null, shadow: boolean): void {
    if (!el) return;

    if (shadow) {
        el.dataset.preactShadow = 'true';
        el.setAttribute('aria-hidden', 'true');
        return;
    }

    delete el.dataset.preactShadow;
    el.removeAttribute('aria-hidden');
}

function syncLegacyBuildConsoleControls(shadow: boolean): void {
    document
        .getElementById('build-console')
        ?.querySelectorAll<HTMLButtonElement>('button')
        .forEach(button => {
            if (button.classList.contains('build-btn-locked')) return;
            button.disabled = shadow;
            if (shadow) {
                button.setAttribute('tabindex', '-1');
            } else {
                button.removeAttribute('tabindex');
            }
        });
}

function syncLegacyTopHudControls(shadow: boolean): void {
    document
        .getElementById('top-actions')
        ?.querySelectorAll<HTMLButtonElement>('button')
        .forEach(button => {
            button.disabled = shadow;
            if (shadow) {
                button.setAttribute('tabindex', '-1');
            } else {
                button.removeAttribute('tabindex');
            }
        });
}

export function ensureLegacyHudDom(): void {
    const shell = getOrCreateLegacyShell();
    ensureLegacySettingsModal();
    ensureLegacyGameOverScreen();
    ensureBodyRoot('tooltip');
    ensureBodyRoot('activity-log');
    ensureBodyRoot('notification-container');
    ensureLegacyTopBar(shell);
    ensureLegacyRightRail(shell);
    ensureLegacyInfoLayer(shell);
    ensureLegacyBuildConsole(shell);
}

export function syncLegacyHudShellShadow(isMobileLayout: boolean, isShortLandscape: boolean): void {
    const buildConsoleShadow = !isMobileLayout || (isMobileLayout && !isShortLandscape);
    const topHudShadow = !isMobileLayout;
    setShadowState(document.getElementById('hud-top-bar'), topHudShadow);
    setShadowState(document.getElementById('top-hud'), topHudShadow);
    setShadowState(document.getElementById('top-actions'), topHudShadow);
    setShadowState(document.getElementById('hud-right-rail'), !isMobileLayout);
    setShadowState(
        document.getElementById('bottom-ui-container'),
        buildConsoleShadow
    );
    setShadowState(
        document.getElementById('build-console'),
        buildConsoleShadow
    );
    setShadowState(document.getElementById('info-layer'), true);
    syncLegacyTopHudControls(topHudShadow);
    syncLegacyBuildConsoleControls(buildConsoleShadow);
}

export function showLegacyGameplayHudSurfaces(): void {
    const topHud = document.getElementById('top-hud');
    const infoLayer = document.getElementById('info-layer');
    const bottomUiContainer = document.getElementById('bottom-ui-container');
    if (topHud) topHud.style.display = 'grid';
    if (infoLayer) infoLayer.style.display = 'block';
    if (bottomUiContainer) bottomUiContainer.style.display = 'flex';
}

export function hideLegacyModalFallbacks(): void {
    ['settings-modal', 'training-lab-modal'].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
    });
}

export function updateLegacySpeedButtons(speed: number): void {
    [1, 2, 3].forEach(s => {
        const btn = document.getElementById(`btn-speed-${s}`);
        if (btn) btn.classList.toggle('active', s === speed);
    });
}
