import { CONFIG } from '../config';
import { getBuildingName, getCableName, textForKey } from '../i18n';
import {
    createBuildConsoleDisplayState,
    getBuildableCostText
} from './buildConsoleSnapshot';

export interface LegacyBuildCategory {
    id: string;
    label: string;
    active: boolean;
}

export interface LegacyBuildConsoleRenderResult {
    buttons: Record<string, HTMLButtonElement>;
    buildableData: Record<string, any>;
    categories: LegacyBuildCategory[];
    currentTabBuildings: string[];
}

interface LegacyBuildConsoleRenderOptions {
    activeCategory: string;
    allowedBuildings: string[] | null;
    guardDomPointer: (element: HTMLElement | null) => void;
    hasFirstDefenseSuccess: boolean;
    hotkeys: string[];
    isGpuUnlocked: boolean;
    isResearchUnlocked: (researchId: string) => boolean;
    onCategorySelect: (category: string) => void;
    onToolSelect: (type: string) => void;
    selectedBuildingType: string;
}

function createBuildButton(
    key: string,
    data: any,
    hotkey: string | undefined,
    isLocked: boolean,
    selectedBuildingType: string,
    guardDomPointer: (element: HTMLElement | null) => void,
    onToolSelect: (type: string) => void
): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = `btn-${key.toLowerCase()}`;
    button.className = 'build-btn';
    button.type = 'button';
    if (key === selectedBuildingType) button.classList.add('active');
    if (isLocked) {
        button.classList.add('build-btn-locked');
        button.style.opacity = '0.22';
        button.style.cursor = 'not-allowed';
        button.disabled = true;
    }

    if (hotkey) {
        const hotkeyLabel = document.createElement('div');
        hotkeyLabel.className = 'hotkey-label';
        hotkeyLabel.innerText = hotkey;
        button.appendChild(hotkeyLabel);
    }

    const icon = document.createElement('div');
    icon.className = 'build-swatch icon';
    icon.style.background = `#${data.COLOR.toString(16).padStart(6, '0')}`;
    button.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'build-label';
    label.innerText = CONFIG.BUILDINGS[key] ? getBuildingName(key) : getCableName(key);
    button.appendChild(label);

    const costLabel = document.createElement('span');
    costLabel.className = 'build-cost';
    costLabel.innerText = getBuildableCostText(data);
    button.appendChild(costLabel);

    guardDomPointer(button);
    button.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        onToolSelect(key);
    };
    return button;
}

function createRemoveButton(
    isLocked: boolean,
    selectedBuildingType: string,
    guardDomPointer: (element: HTMLElement | null) => void,
    onToolSelect: (type: string) => void
): HTMLButtonElement {
    const removeButton = document.createElement('button');
    removeButton.id = 'btn-remove';
    removeButton.className = 'build-btn';
    removeButton.type = 'button';
    if (selectedBuildingType === 'REMOVE') removeButton.classList.add('active');
    if (isLocked) {
        removeButton.classList.add('build-btn-locked');
        removeButton.style.opacity = '0.22';
        removeButton.style.cursor = 'not-allowed';
        removeButton.disabled = true;
    }
    removeButton.innerHTML = `
        <div class="hotkey-label">0</div>
        <div class="build-swatch icon" style="background:#2b3038; border:1px solid #ff6676"></div>
        <span class="build-label">${textForKey('action.remove')}</span>
        <span class="build-cost">${textForKey('action.removeMode')}</span>
    `;
    guardDomPointer(removeButton);
    removeButton.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        onToolSelect('REMOVE');
    };
    return removeButton;
}

export function renderLegacyBuildConsole(options: LegacyBuildConsoleRenderOptions): LegacyBuildConsoleRenderResult | null {
    const overlay = document.getElementById('ui-overlay');
    const tabsContainer = document.getElementById('ui-tabs');
    if (!overlay || !tabsContainer) return null;

    options.guardDomPointer(overlay);
    options.guardDomPointer(tabsContainer);

    const displayState = createBuildConsoleDisplayState({
        activeCategory: options.activeCategory,
        hasFirstDefenseSuccess: options.hasFirstDefenseSuccess,
        isGpuUnlocked: options.isGpuUnlocked,
        isResearchUnlocked: options.isResearchUnlocked
    });
    const { categories, currentTabBuildings } = displayState;

    tabsContainer.innerHTML = '';
    categories.forEach(category => {
        const tabButton = document.createElement('button');
        tabButton.className = `tab-btn ${category.active ? 'active' : ''}`;
        tabButton.innerText = category.label;
        options.guardDomPointer(tabButton);
        tabButton.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            options.onCategorySelect(category.id);
        };
        tabsContainer.appendChild(tabButton);
    });

    overlay.innerHTML = '';
    const buttons: Record<string, HTMLButtonElement> = {};

    currentTabBuildings.forEach((key, index) => {
        const data = displayState.buildableData[key];
        const isLocked = options.allowedBuildings !== null && !options.allowedBuildings.includes(key);
        const button = createBuildButton(
            key,
            data,
            index < options.hotkeys.length ? options.hotkeys[index] : undefined,
            isLocked,
            options.selectedBuildingType,
            options.guardDomPointer,
            options.onToolSelect
        );
        overlay.appendChild(button);
        buttons[key] = button;
    });

    const removeButton = createRemoveButton(
        options.allowedBuildings !== null && !options.allowedBuildings.includes('REMOVE'),
        options.selectedBuildingType,
        options.guardDomPointer,
        options.onToolSelect
    );
    overlay.appendChild(removeButton);
    buttons.REMOVE = removeButton;

    return {
        buttons,
        buildableData: displayState.buildableData,
        categories,
        currentTabBuildings
    };
}

export function updateLegacySelectedToolPanel(name: string, cost: string, hint: string): void {
    const nameEl = document.getElementById('selected-tool-name');
    const costEl = document.getElementById('selected-tool-cost');
    const hintEl = document.getElementById('selected-tool-hint');
    if (nameEl) nameEl.innerText = name;
    if (costEl) costEl.innerText = cost;
    if (hintEl) hintEl.innerText = hint;
}

export function updateLegacyBuildSelection(
    buttons: Record<string, HTMLButtonElement>,
    selectedType: string
): void {
    Object.entries(buttons).forEach(([key, button]) => {
        button.classList.toggle('active', key === selectedType);
    });
}
