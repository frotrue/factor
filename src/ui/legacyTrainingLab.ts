import { textForKey } from '../i18n';

export type LegacyTrainingLabShellOptions = {
    activeTab: 'DEFENSE' | 'SYSTEM';
    autoActive: boolean;
    autoModeText: string;
    autoToggleText: string;
    durationText: string;
    guardDomPointer: (element: HTMLElement | null) => void;
    onAutoToggle: () => void;
    onClose: () => void;
    onTabSelect: (tab: 'DEFENSE' | 'SYSTEM') => void;
    overviewText: string;
    plannerReasonText: string;
};

export type LegacyTrainingLabDefenseRow = {
    dataPercent: number;
    dataProgressText: string;
    id: string;
    name: string;
    nextRewardText: string;
    rewardAccuracyText: string;
    rewardDamageText: string;
    rewardModeText: string;
    rewardPreference: 'accuracy' | 'damage';
    selected: boolean;
    statText: string;
    trainingPercent: number;
    trainingStatusText: string;
};

export type LegacyTrainingLabSystemRow = {
    disabled: boolean;
    effectText: string;
    id: string;
    name: string;
    progressPercent: number;
    selected: boolean;
    statText: string;
    statusText: string;
    trainingPercent: number;
};

export function ensureLegacyTrainingLabModal(guardDomPointer: (element: HTMLElement | null) => void): HTMLElement {
    let modal = document.getElementById('training-lab-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'training-lab-modal';
        modal.className = 'glass-panel';
        document.body.appendChild(modal);
    }
    guardDomPointer(modal);
    return modal;
}

export function setLegacyTrainingLabOpen(modal: HTMLElement | null, open: boolean): void {
    if (!modal) return;
    modal.style.display = open ? 'block' : 'none';
    if (open) {
        modal.dataset.preactShadow = 'true';
        modal.setAttribute('aria-hidden', 'true');
        syncLegacyTrainingLabControls(modal, true);
        return;
    }

    syncLegacyTrainingLabControls(modal, false);
    delete modal.dataset.preactShadow;
    modal.removeAttribute('aria-hidden');
}

function syncShadowTabIndex(element: HTMLElement, shadow: boolean): void {
    if (shadow) {
        if (element.dataset.preactShadowTabindex === undefined) {
            element.dataset.preactShadowTabindex = element.getAttribute('tabindex') ?? '';
        }
        element.setAttribute('tabindex', '-1');
        return;
    }

    const previous = element.dataset.preactShadowTabindex;
    if (previous === undefined) return;
    if (previous) {
        element.setAttribute('tabindex', previous);
    } else {
        element.removeAttribute('tabindex');
    }
    delete element.dataset.preactShadowTabindex;
}

export function syncLegacyTrainingLabControls(modal: HTMLElement | null, shadow: boolean): void {
    if (!modal) return;
    modal.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'button,input,select,textarea'
    ).forEach(control => {
        if (shadow && control.dataset.preactShadowDisabled === undefined) {
            control.dataset.preactShadowDisabled = control.disabled ? 'true' : 'false';
        }
        if (!shadow && control.dataset.preactShadowDisabled !== undefined) {
            control.disabled = control.dataset.preactShadowDisabled === 'true';
            delete control.dataset.preactShadowDisabled;
        } else if (shadow) {
            control.disabled = true;
        }
        syncShadowTabIndex(control, shadow);
    });

    modal.querySelectorAll<HTMLElement>('[role="button"],[tabindex]').forEach(element => {
        syncShadowTabIndex(element, shadow);
    });
}

export function renderLegacyTrainingLabShell(
    modal: HTMLElement,
    options: LegacyTrainingLabShellOptions
): HTMLElement {
    modal.replaceChildren();

    const header = document.createElement('div');
    header.className = 'training-lab-header';

    const headingGroup = document.createElement('div');
    const kicker = document.createElement('div');
    kicker.className = 'training-lab-kicker';
    kicker.textContent = textForKey('trainingLab.kicker');
    const title = document.createElement('h2');
    title.textContent = textForKey('trainingLab.title');
    headingGroup.replaceChildren(kicker, title);

    const closeButton = document.createElement('button');
    closeButton.id = 'btn-close-training-lab';
    closeButton.className = 'training-lab-close';
    closeButton.type = 'button';
    closeButton.textContent = textForKey('trainingLab.close');
    options.guardDomPointer(closeButton);
    closeButton.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        options.onClose();
    };
    header.replaceChildren(headingGroup, closeButton);
    modal.appendChild(header);

    const overview = document.createElement('div');
    overview.className = 'training-lab-buffer';
    overview.textContent = options.overviewText;
    modal.appendChild(overview);

    const autoPanel = document.createElement('div');
    autoPanel.className = 'training-lab-buffer training-auto-panel';
    const autoMode = document.createElement('span');
    autoMode.textContent = options.autoModeText;
    const plannerReason = document.createElement('span');
    plannerReason.className = 'training-target-effect';
    plannerReason.textContent = options.plannerReasonText;
    const autoButton = document.createElement('button');
    autoButton.type = 'button';
    autoButton.className = `training-reward-btn ${options.autoActive ? 'active' : ''}`;
    autoButton.textContent = options.autoToggleText;
    options.guardDomPointer(autoButton);
    autoButton.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        options.onAutoToggle();
    };
    autoPanel.replaceChildren(autoMode, plannerReason, autoButton);
    modal.appendChild(autoPanel);

    const list = document.createElement('div');
    list.id = 'training-target-list';
    list.className = 'training-target-list';
    modal.appendChild(list);

    const tabs = document.createElement('div');
    tabs.className = 'training-target-list';
    tabs.style.gridTemplateColumns = '1fr 1fr';
    [
        { id: 'DEFENSE' as const, label: textForKey('trainingLab.tab.defense') },
        { id: 'SYSTEM' as const, label: textForKey('trainingLab.tab.system') }
    ].forEach(tab => {
        const tabButton = document.createElement('button');
        tabButton.className = `training-target-row ${options.activeTab === tab.id ? 'active' : ''}`;
        tabButton.type = 'button';
        tabButton.textContent = tab.label;
        options.guardDomPointer(tabButton);
        tabButton.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            options.onTabSelect(tab.id);
        };
        tabs.appendChild(tabButton);
    });
    modal.insertBefore(tabs, list);

    const footer = document.createElement('div');
    footer.className = 'training-lab-buffer';
    footer.textContent = options.durationText;
    modal.appendChild(footer);

    return list;
}

function createTrainingText(className: string, text: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    return span;
}

function createTrainingProgressTrack(percent: number, extraClass = ''): HTMLSpanElement {
    const track = document.createElement('span');
    track.className = `training-progress-track${extraClass ? ` ${extraClass}` : ''}`;
    const fill = document.createElement('span');
    fill.style.width = `${percent}%`;
    track.appendChild(fill);
    return track;
}

export function renderLegacyTrainingLabDefenseRows(
    list: HTMLElement,
    rows: LegacyTrainingLabDefenseRow[],
    options: {
        guardDomPointer: (element: HTMLElement | null) => void;
        onRewardSelect: (id: string, reward: 'accuracy' | 'damage') => void;
        onSelect: (id: string) => void;
    }
): void {
    rows.forEach(rowState => {
        const row = document.createElement('div');
        row.className = `training-target-row ${rowState.selected ? 'active' : ''}`;
        row.dataset.trainingKind = 'DEFENSE';
        row.dataset.trainingId = rowState.id;
        row.dataset.rewardPreference = rowState.rewardPreference;
        row.tabIndex = 0;
        row.role = 'button';

        const rewardToggle = document.createElement('span');
        rewardToggle.className = 'training-reward-toggle';
        rewardToggle.setAttribute('role', 'group');
        rewardToggle.setAttribute('aria-label', rowState.rewardModeText);
        const rewardMode = createTrainingText('training-target-effect', rowState.rewardModeText);
        const accuracyButton = document.createElement('button');
        accuracyButton.type = 'button';
        accuracyButton.className = `training-reward-btn ${rowState.rewardPreference === 'accuracy' ? 'active' : ''}`;
        accuracyButton.dataset.reward = 'accuracy';
        accuracyButton.textContent = rowState.rewardAccuracyText;
        const damageButton = document.createElement('button');
        damageButton.type = 'button';
        damageButton.className = `training-reward-btn ${rowState.rewardPreference === 'damage' ? 'active' : ''}`;
        damageButton.dataset.reward = 'damage';
        damageButton.textContent = rowState.rewardDamageText;
        rewardToggle.replaceChildren(rewardMode, accuracyButton, damageButton);

        row.replaceChildren(
            createTrainingText('training-target-name', rowState.name),
            createTrainingText('training-target-stat', rowState.statText),
            createTrainingText('training-target-effect', rowState.nextRewardText),
            rewardToggle,
            createTrainingText('training-target-effect', rowState.dataProgressText),
            createTrainingProgressTrack(rowState.dataPercent),
            createTrainingText('training-target-effect', rowState.trainingStatusText),
            createTrainingProgressTrack(rowState.trainingPercent, 'training-progress-work')
        );
        options.guardDomPointer(row);
        row.querySelectorAll<HTMLButtonElement>('.training-reward-btn').forEach(btn => {
            options.guardDomPointer(btn);
            btn.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                const reward = btn.dataset.reward === 'damage' ? 'damage' : 'accuracy';
                options.onRewardSelect(rowState.id, reward);
            };
        });
        row.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            options.onSelect(rowState.id);
        };
        row.onkeydown = event => {
            if (event.target !== row || (event.key !== 'Enter' && event.key !== ' ')) return;
            event.preventDefault();
            options.onSelect(rowState.id);
        };
        list.appendChild(row);
    });
}

export function renderLegacyTrainingLabSystemRows(
    list: HTMLElement,
    rows: LegacyTrainingLabSystemRow[],
    options: {
        guardDomPointer: (element: HTMLElement | null) => void;
        onSelect: (id: string) => void;
    }
): void {
    rows.forEach(rowState => {
        const row = document.createElement('button');
        row.className = `training-target-row ${rowState.selected ? 'active' : ''}`;
        row.type = 'button';
        row.disabled = rowState.disabled;
        row.dataset.trainingKind = 'SYSTEM';
        row.dataset.trainingId = rowState.id;
        row.replaceChildren(
            createTrainingText('training-target-name', rowState.name),
            createTrainingText('training-target-stat', rowState.statText),
            createTrainingText('training-target-effect', rowState.effectText),
            createTrainingProgressTrack(rowState.progressPercent),
            createTrainingText('training-target-effect', rowState.statusText),
            createTrainingProgressTrack(rowState.trainingPercent, 'training-progress-work')
        );
        options.guardDomPointer(row);
        row.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            options.onSelect(rowState.id);
        };
        list.appendChild(row);
    });
}
