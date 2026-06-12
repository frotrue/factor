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
    topBar.innerHTML = `
        <div id="top-hud" style="display: grid;">
            <div class="hud-stat hud-stat-primary">
                <div class="hud-label" data-i18n="hud.dataReceived">수신 데이터</div>
                <div class="hud-value" id="hud-score">0</div>
            </div>
            <div class="hud-stat">
                <div class="hud-label" data-i18n="hud.power">전력 출력</div>
                <div class="hud-value" id="hud-power">0 W</div>
            </div>
            <div class="hud-stat">
                <div class="hud-label" data-i18n="hud.silicon">실리콘</div>
                <div class="hud-value" id="hud-silicon">0</div>
            </div>
            <div class="hud-stat">
                <div class="hud-label" data-i18n="hud.packets">데이터 패킷</div>
                <div class="hud-value" id="hud-packets">0</div>
            </div>
            <div class="hud-stat hud-stat-alert">
                <div class="hud-label" data-i18n="hud.wave">웨이브</div>
                <div class="hud-value" id="hud-wave">0</div>
            </div>
            <div class="hud-stat">
                <div class="hud-label" data-i18n="hud.nextWave">다음 웨이브</div>
                <div class="hud-value" id="hud-wave-timer">30s</div>
            </div>
        </div>
        <div id="top-actions">
            <button id="btn-settings" class="icon-action-btn" data-i18n="top.settings">설정</button>
        </div>
    `;
    shell.appendChild(topBar);
}

function ensureLegacyRightRail(shell: HTMLElement): void {
    if (document.getElementById('hud-right-rail')) return;

    const rightRail = document.createElement('aside');
    rightRail.id = 'hud-right-rail';
    rightRail.innerHTML = `
        <div id="mission-panel" class="hud-panel tactical-panel" style="display: none;">
            <div class="panel-kicker" data-i18n="panel.objective">현재 목표</div>
            <div id="current-objective-title" class="panel-title">데이터 수집 시작</div>
            <div id="current-objective-detail" class="panel-detail">패킷 수집기를 배치해 첫 데이터 흐름을 만드세요.</div>
        </div>
        <div id="threat-panel" class="hud-panel tactical-panel" style="display: none;">
            <div class="panel-kicker" data-i18n="panel.nextWave">다음 침입</div>
            <div id="next-wave-title" class="panel-title">Wave 1</div>
            <div id="next-wave-detail" class="panel-detail">North Port | 초기 위협</div>
            <div id="next-wave-recommendation" class="panel-chip">방어선을 준비하세요</div>
        </div>
        <div id="systems-panel" class="hud-panel tactical-panel" style="display: none;">
            <div class="panel-kicker" data-i18n="panel.systems">방어 시스템</div>
            <div id="defense-status-title" class="panel-title">방어 준비 전</div>
            <div id="defense-status-detail" class="panel-detail">Classifier 또는 Firewall을 침입 경로 근처에 배치하세요.</div>
            <div id="power-status-chip" class="panel-chip panel-chip-warning">전력: Core 주변 기본 공급</div>
        </div>
    `;
    shell.appendChild(rightRail);
}

function ensureLegacyInfoLayer(shell: HTMLElement): void {
    if (document.getElementById('info-layer')) return;

    const infoLayer = document.createElement('div');
    infoLayer.id = 'info-layer';
    infoLayer.className = 'hud-panel';
    infoLayer.style.display = 'block';
    infoLayer.innerHTML = `
        <h2>Gradium.OS v1.0</h2>
        <div class="control-hint"><span class="control-key">W A S D</span> <span data-i18n="info.pan">카메라 이동</span></div>
        <div class="control-hint"><span class="control-key">Scroll</span> <span data-i18n="info.zoom">줌</span></div>
        <div class="control-hint"><span class="control-key">R</span> <span data-i18n="info.rotate">회전</span></div>
        <div class="control-hint"><span class="control-key">F1</span> <span data-i18n="info.defenseRange">방어 범위</span></div>
        <div class="control-hint"><span class="control-key">F2</span> <span data-i18n="info.powerGrid">전력망</span></div>
        <div class="control-hint"><span class="control-key">R-Click</span> <span data-i18n="info.demolish">철거</span></div>
    `;
    shell.appendChild(infoLayer);
}

function ensureLegacyBuildConsole(shell: HTMLElement): void {
    if (document.getElementById('bottom-ui-container')) return;

    const bottomUi = document.createElement('div');
    bottomUi.id = 'bottom-ui-container';
    bottomUi.style.display = 'flex';
    bottomUi.innerHTML = `
        <div id="build-console" class="hud-panel">
            <div id="ui-tabs"></div>
            <div id="ui-overlay"></div>
            <div id="selected-tool-panel">
                <div class="panel-kicker" data-i18n="build.selectedTool">선택 도구</div>
                <div id="selected-tool-name">패킷 수집기</div>
                <div id="selected-tool-cost">5 실리콘</div>
                <div id="selected-tool-hint" data-i18n="build.defaultHint">1-9 선택 | R 회전 | 0 철거</div>
            </div>
        </div>
    `;
    shell.appendChild(bottomUi);
}

function ensureLegacySettingsModal(): void {
    if (document.getElementById('settings-modal')) return;

    const settingsModal = document.createElement('div');
    settingsModal.id = 'settings-modal';
    settingsModal.className = 'glass-panel modal-panel';
    settingsModal.style.display = 'none';
    settingsModal.innerHTML = `
        <h2 data-i18n="settings.title">시스템 설정</h2>

        <div class="settings-section">
            <label data-i18n="settings.speed">클럭 속도</label>
            <div class="button-row">
                <button id="btn-speed-1" class="modal-action-btn active">1x</button>
                <button id="btn-speed-2" class="modal-action-btn">2x</button>
                <button id="btn-speed-3" class="modal-action-btn">3x</button>
            </div>
        </div>

        <div class="settings-section">
            <label data-i18n="settings.audio">오디오</label>
            <div class="settings-inline">
                <input id="audio-volume" type="range" min="0" max="100" value="60">
                <label class="checkbox-label">
                    <input id="audio-muted" type="checkbox">
                    <span data-i18n="settings.mute">음소거</span>
                </label>
            </div>
        </div>

        <div class="settings-section">
            <label data-i18n="settings.graphics">그래픽 효과</label>
            <div class="settings-inline">
                <label class="checkbox-label">
                    <input id="settings-bloom" type="checkbox" checked>
                    <span data-i18n="settings.bloom">네온 광원 효과 (Bloom)</span>
                </label>
            </div>
            <label data-i18n="settings.fps" style="margin-top: 8px;">프레임 제한</label>
            <div class="button-row">
                <button id="btn-fps-60" class="modal-action-btn" data-fps="60">60 FPS</button>
                <button id="btn-fps-144" class="modal-action-btn" data-fps="144">144 FPS</button>
                <button id="btn-fps-240" class="modal-action-btn active" data-fps="240">240 FPS</button>
            </div>
        </div>

        <div class="settings-section">
            <label data-i18n="settings.language">언어</label>
            <div class="button-row">
                <button id="btn-language-ko" class="modal-action-btn" data-language="ko" data-i18n="settings.language.ko">한국어</button>
                <button id="btn-language-en" class="modal-action-btn" data-language="en" data-i18n="settings.language.en">English</button>
            </div>
        </div>

        <div class="settings-section">
            <label data-i18n="settings.tutorial">튜토리얼</label>
            <button id="btn-reset-tutorial" class="modal-action-btn wide" data-i18n="settings.restartTutorial">튜토리얼 다시 시작</button>
        </div>

        <div class="button-row settings-save-row">
            <button id="btn-save" class="modal-action-btn" data-i18n="settings.save">저장</button>
            <button id="btn-load" class="modal-action-btn" data-i18n="settings.load">불러오기</button>
        </div>

        <button id="btn-close-settings" class="modal-action-btn wide" data-i18n="settings.close">닫기</button>
    `;
    document.body.appendChild(settingsModal);
}

function ensureLegacyGameOverScreen(): void {
    if (document.getElementById('game-over-screen')) return;

    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'game-over-screen';
    gameOverScreen.className = 'glass-panel modal-panel game-over-panel';
    gameOverScreen.style.display = 'none';
    gameOverScreen.innerHTML = `
        <h1 data-i18n="gameOver.title">시스템 실패</h1>
        <p data-i18n="gameOver.message">Neural Core가 침투당했습니다.</p>
        <div id="game-over-stats" class="game-over-stats"></div>
        <button id="btn-restart" class="modal-action-btn wide" data-i18n="gameOver.restart">시스템 재부팅</button>
    `;
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
    setShadowState(document.getElementById('top-hud'), !isMobileLayout);
    setShadowState(document.getElementById('hud-right-rail'), !isMobileLayout);
    setShadowState(
        document.getElementById('bottom-ui-container'),
        !isMobileLayout || (isMobileLayout && !isShortLandscape)
    );
    setShadowState(
        document.getElementById('build-console'),
        !isMobileLayout || (isMobileLayout && !isShortLandscape)
    );
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
    ['settings-modal', 'research-modal', 'training-lab-modal'].forEach(id => {
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
