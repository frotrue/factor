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
        return;
    }

    delete modal.dataset.preactShadow;
    modal.removeAttribute('aria-hidden');
}

export function renderLegacyTrainingLabShell(
    modal: HTMLElement,
    options: LegacyTrainingLabShellOptions
): HTMLElement {
    modal.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'training-lab-header';
    header.innerHTML = `
        <div>
            <div class="training-lab-kicker">${textForKey('trainingLab.kicker')}</div>
            <h2>${textForKey('trainingLab.title')}</h2>
        </div>
    `;

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
    header.appendChild(closeButton);
    modal.appendChild(header);

    const overview = document.createElement('div');
    overview.className = 'training-lab-buffer';
    overview.textContent = options.overviewText;
    modal.appendChild(overview);

    const autoPanel = document.createElement('div');
    autoPanel.className = 'training-lab-buffer training-auto-panel';
    autoPanel.innerHTML = `
        <span>${options.autoModeText}</span>
        <span class="training-target-effect">${options.plannerReasonText}</span>
    `;
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
    autoPanel.appendChild(autoButton);
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
        row.innerHTML = `
            <span class="training-target-name">${rowState.name}</span>
            <span class="training-target-stat">${rowState.statText}</span>
            <span class="training-target-effect">${rowState.nextRewardText}</span>
            <span class="training-reward-toggle" role="group" aria-label="${rowState.rewardModeText}">
                <span class="training-target-effect">${rowState.rewardModeText}</span>
                <button type="button" class="training-reward-btn ${rowState.rewardPreference === 'accuracy' ? 'active' : ''}" data-reward="accuracy">${rowState.rewardAccuracyText}</button>
                <button type="button" class="training-reward-btn ${rowState.rewardPreference === 'damage' ? 'active' : ''}" data-reward="damage">${rowState.rewardDamageText}</button>
            </span>
            <span class="training-target-effect">${rowState.dataProgressText}</span>
            <span class="training-progress-track"><span style="width:${rowState.dataPercent}%"></span></span>
            <span class="training-target-effect">${rowState.trainingStatusText}</span>
            <span class="training-progress-track training-progress-work"><span style="width:${rowState.trainingPercent}%"></span></span>
        `;
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
        row.innerHTML = `
            <span class="training-target-name">${rowState.name}</span>
            <span class="training-target-stat">${rowState.statText}</span>
            <span class="training-target-effect">${rowState.effectText}</span>
            <span class="training-progress-track"><span style="width:${rowState.progressPercent}%"></span></span>
            <span class="training-target-effect">${rowState.statusText}</span>
            <span class="training-progress-track training-progress-work"><span style="width:${rowState.trainingPercent}%"></span></span>
        `;
        options.guardDomPointer(row);
        row.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            options.onSelect(rowState.id);
        };
        list.appendChild(row);
    });
}
