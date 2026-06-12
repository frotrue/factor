import { createLegacyMobileTooltipHtml } from './notificationDisplay';

export interface LegacyWaveResultContent {
    kicker: string;
    title: string;
    items: string[];
}

export interface LegacyTooltipPosition {
    x: number;
    y: number;
}

export function showLegacyWaveResultCard(content: LegacyWaveResultContent): boolean {
    const container = document.getElementById('notification-container');
    if (!container) return false;

    const card = document.createElement('div');
    card.className = 'wave-result-card glass-panel';
    card.dataset.preactShadow = 'true';
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML = `
        <div class="wave-result-kicker">${content.kicker}</div>
        <div class="wave-result-title">${content.title}</div>
        <div class="wave-result-grid">
            ${content.items.map(item => `<span>${item}</span>`).join('')}
        </div>
    `;
    container.appendChild(card);

    setTimeout(() => {
        if (card.parentNode === container) container.removeChild(card);
    }, 7000);
    return true;
}

export function showLegacyDesktopTooltip(x: number, y: number, title: string, content: string): LegacyTooltipPosition | null {
    const tooltip = document.getElementById('tooltip');
    if (!tooltip) return null;

    tooltip.style.display = 'block';
    tooltip.dataset.preactShadow = 'true';
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.innerHTML = `<div class="tooltip-title">${title}</div><div>${content}</div>`;
    tooltip.style.left = '0px';
    tooltip.style.top = '0px';

    const rect = tooltip.getBoundingClientRect();
    const margin = 12;
    const offset = 15;
    let left = x + offset;
    let top = y + offset;
    const bottomUi = document.getElementById('bottom-ui-container')?.getBoundingClientRect();

    if (left + rect.width > window.innerWidth - margin) {
        left = x - rect.width - offset;
    }
    if (top + rect.height > window.innerHeight - margin) {
        top = y - rect.height - offset;
    }
    if (bottomUi && top + rect.height > bottomUi.top - margin && y < bottomUi.top) {
        top = bottomUi.top - rect.height - margin;
    }

    tooltip.style.left = `${Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin))}px`;
    tooltip.style.top = `${Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin))}px`;

    return {
        x: Number.parseFloat(tooltip.style.left),
        y: Number.parseFloat(tooltip.style.top)
    };
}

function getMobileInfoSheet(): HTMLElement | null {
    return document.getElementById('mobile-info-sheet');
}

export function showLegacyMobileTooltip(formattedHtml: string): void {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
        delete tooltip.dataset.preactShadow;
        tooltip.removeAttribute('aria-hidden');
    }

    const mobileInfoSheet = getMobileInfoSheet();
    if (!mobileInfoSheet) return;
    mobileInfoSheet.style.display = 'block';
    mobileInfoSheet.dataset.preactShadow = 'true';
    mobileInfoSheet.setAttribute('aria-hidden', 'true');
    mobileInfoSheet.innerHTML = formattedHtml;
}

export function formatLegacyMobileTooltipInfo(title: string, content: string): string {
    return createLegacyMobileTooltipHtml(title, content);
}

export function hideLegacyTooltipSurfaces(): void {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
        delete tooltip.dataset.preactShadow;
        tooltip.removeAttribute('aria-hidden');
    }
    const mobileInfoSheet = getMobileInfoSheet();
    if (mobileInfoSheet) {
        mobileInfoSheet.style.display = 'none';
        delete mobileInfoSheet.dataset.preactShadow;
        mobileInfoSheet.removeAttribute('aria-hidden');
    }
}

export function appendLegacyActivityLogEntry(message: string, isAlert: boolean): void {
    const logContainer = document.getElementById('activity-log');
    if (!logContainer) return;

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.dataset.preactShadow = 'true';
    entry.setAttribute('aria-hidden', 'true');
    if (isAlert) {
        entry.style.borderLeftColor = '#ff4444';
        entry.style.color = '#ffaaaa';
    }
    entry.innerText = `> ${message}`;
    logContainer.appendChild(entry);

    setTimeout(() => {
        if (entry.parentNode === logContainer) {
            logContainer.removeChild(entry);
        }
    }, 5000);
}
