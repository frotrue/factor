import type { BuildConsoleItemSnapshot, BuildConsoleSnapshot } from '../types';
import type { BuildConsoleDisplayState } from './buildConsoleSnapshot';

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
    allowedBuildings: string[] | null;
    displayState: BuildConsoleDisplayState;
    guardDomPointer: (element: HTMLElement | null) => void;
    onCategorySelect: (category: string) => void;
    onToolSelect: (type: string) => void;
    snapshot: BuildConsoleSnapshot;
}

function createBuildButton(
    item: BuildConsoleItemSnapshot,
    isLocked: boolean,
    guardDomPointer: (element: HTMLElement | null) => void,
    onToolSelect: (type: string) => void
): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = item.key === 'REMOVE' ? 'btn-remove' : `btn-${item.key.toLowerCase()}`;
    button.className = 'build-btn';
    button.type = 'button';
    if (item.selected) button.classList.add('active');
    if (isLocked) {
        button.classList.add('build-btn-locked');
        button.style.opacity = '0.22';
        button.style.cursor = 'not-allowed';
        button.disabled = true;
    }

    if (item.hotkey) {
        const hotkeyLabel = document.createElement('div');
        hotkeyLabel.className = 'hotkey-label';
        hotkeyLabel.textContent = item.hotkey;
        button.appendChild(hotkeyLabel);
    }

    const icon = document.createElement('div');
    icon.className = 'build-swatch icon';
    icon.style.background = item.color;
    if (item.key === 'REMOVE') {
        icon.style.border = '1px solid #ff6676';
    }
    button.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'build-label';
    label.textContent = item.label;
    button.appendChild(label);

    const costLabel = document.createElement('span');
    costLabel.className = 'build-cost';
    costLabel.textContent = item.cost;
    button.appendChild(costLabel);

    guardDomPointer(button);
    button.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        onToolSelect(item.key);
    };
    return button;
}

export function renderLegacyBuildConsole(options: LegacyBuildConsoleRenderOptions): LegacyBuildConsoleRenderResult | null {
    const overlay = document.getElementById('ui-overlay');
    const tabsContainer = document.getElementById('ui-tabs');
    if (!overlay || !tabsContainer) return null;

    options.guardDomPointer(overlay);
    options.guardDomPointer(tabsContainer);

    const { categories, currentTabBuildings } = options.displayState;
    const itemByKey = new Map(options.snapshot.items.map(item => [item.key, item]));

    tabsContainer.replaceChildren();
    categories.forEach(category => {
        const tabButton = document.createElement('button');
        tabButton.className = `tab-btn ${category.active ? 'active' : ''}`;
        tabButton.textContent = category.label;
        options.guardDomPointer(tabButton);
        tabButton.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            options.onCategorySelect(category.id);
        };
        tabsContainer.appendChild(tabButton);
    });

    overlay.replaceChildren();
    const buttons: Record<string, HTMLButtonElement> = {};

    currentTabBuildings.forEach(key => {
        const item = itemByKey.get(key);
        if (!item) return;
        const isLocked = options.allowedBuildings !== null && !options.allowedBuildings.includes(key);
        const button = createBuildButton(
            item,
            isLocked,
            options.guardDomPointer,
            options.onToolSelect
        );
        overlay.appendChild(button);
        buttons[key] = button;
    });

    const removeItem = itemByKey.get('REMOVE');
    if (removeItem) {
        const removeButton = createBuildButton(
            removeItem,
            options.allowedBuildings !== null && !options.allowedBuildings.includes('REMOVE'),
            options.guardDomPointer,
            options.onToolSelect
        );
        overlay.appendChild(removeButton);
        buttons.REMOVE = removeButton;
    }

    return {
        buttons,
        buildableData: options.displayState.buildableData,
        categories,
        currentTabBuildings
    };
}

export function updateLegacySelectedToolPanel(name: string, cost: string, hint: string): void {
    const nameEl = document.getElementById('selected-tool-name');
    const costEl = document.getElementById('selected-tool-cost');
    const hintEl = document.getElementById('selected-tool-hint');
    if (nameEl) nameEl.textContent = name;
    if (costEl) costEl.textContent = cost;
    if (hintEl) hintEl.textContent = hint;
}

export function updateLegacyBuildSelection(
    buttons: Record<string, HTMLButtonElement>,
    selectedType: string
): void {
    Object.entries(buttons).forEach(([key, button]) => {
        button.classList.toggle('active', key === selectedType);
    });
}
