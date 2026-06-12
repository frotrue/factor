export type LegacyMobileRefs = {
    actionBar: HTMLElement;
    cableMenu: HTMLElement;
    infoSheet: HTMLElement;
    buildSummary: HTMLElement;
};

export type LegacyMobileAction = {
    id: string;
    label: string;
    onPress: () => void;
};

export type LegacyMobileCableOption = {
    label: string;
    onPress: () => void;
};

function getOrCreateBodyElement(id: string, className?: string): HTMLElement {
    let element = document.getElementById(id);
    if (!element) {
        element = document.createElement('div');
        element.id = id;
        if (className) element.className = className;
        document.body.appendChild(element);
    }
    return element;
}

function guardButtonPointer(button: HTMLButtonElement): void {
    button.addEventListener('pointerdown', event => {
        event.preventDefault();
        event.stopPropagation();
    });
}

export function ensureLegacyMobileRefs(guardDomPointer: (element: HTMLElement | null) => void): LegacyMobileRefs {
    const actionBar = getOrCreateBodyElement('mobile-action-bar');
    guardDomPointer(actionBar);

    let cableMenu = document.getElementById('mobile-cable-menu');
    if (!cableMenu) {
        cableMenu = document.createElement('div');
        cableMenu.id = 'mobile-cable-menu';
        cableMenu.className = 'glass-panel';
        actionBar.appendChild(cableMenu);
    }
    guardDomPointer(cableMenu);

    const infoSheet = getOrCreateBodyElement('mobile-info-sheet', 'glass-panel');
    guardDomPointer(infoSheet);

    const buildSummary = getOrCreateBodyElement('mobile-build-summary', 'glass-panel');
    guardDomPointer(buildSummary);

    return { actionBar, cableMenu, infoSheet, buildSummary };
}

export function renderLegacyMobileActions(refs: LegacyMobileRefs, actions: LegacyMobileAction[]): void {
    refs.actionBar.innerHTML = '';
    refs.actionBar.appendChild(refs.cableMenu);

    actions.forEach(action => {
        const button = document.createElement('button');
        button.id = `mobile-action-${action.id}`;
        button.className = 'mobile-action-btn';
        button.type = 'button';
        button.textContent = action.label;
        button.setAttribute('aria-label', action.label);
        guardButtonPointer(button);
        button.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            action.onPress();
        };
        refs.actionBar.appendChild(button);
    });
}

export function renderLegacyMobileCableMenu(refs: LegacyMobileRefs, options: LegacyMobileCableOption[]): void {
    refs.cableMenu.innerHTML = '';
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'mobile-cable-option';
        button.type = 'button';
        button.textContent = option.label;
        button.setAttribute('aria-label', option.label);
        guardButtonPointer(button);
        button.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            option.onPress();
        };
        refs.cableMenu.appendChild(button);
    });
}

export function setLegacyMobileCableMenuOpen(refs: LegacyMobileRefs | null, open: boolean): void {
    refs?.cableMenu.classList.toggle('open', open);
}

export function syncLegacyMobileShadowState(
    refs: LegacyMobileRefs | null,
    isMobileLayout: boolean,
    isShortLandscape: boolean
): void {
    if (!refs) return;
    const shadow = isMobileLayout && !isShortLandscape;
    [refs.actionBar, refs.buildSummary, refs.cableMenu].forEach(element => {
        if (shadow) {
            element.dataset.preactShadow = 'true';
            element.setAttribute('aria-hidden', 'true');
        } else {
            delete element.dataset.preactShadow;
            element.removeAttribute('aria-hidden');
        }
    });
}

export function updateLegacyMobileActionState(activeMap: Record<string, boolean>): void {
    Object.entries(activeMap).forEach(([id, active]) => {
        const button = document.getElementById(`mobile-action-${id}`);
        if (button) button.classList.toggle('active', active);
    });
}

export function updateLegacyMobileBuildSummary(
    refs: LegacyMobileRefs | null,
    summary: { title: string; detail: string }
): void {
    if (!refs) return;
    if (!summary.title && !summary.detail) {
        refs.buildSummary.textContent = '';
        return;
    }
    refs.buildSummary.innerHTML = `
        <strong>${summary.title}</strong>
        <span>${summary.detail}</span>
    `;
}
