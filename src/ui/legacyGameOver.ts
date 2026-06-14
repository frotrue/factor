export function showLegacyGameOverScreen(): void {
    const gameOverScreen = document.getElementById('game-over-screen');
    if (!gameOverScreen) return;

    gameOverScreen.style.display = 'flex';
    gameOverScreen.dataset.preactShadow = 'true';
    gameOverScreen.setAttribute('aria-hidden', 'true');
    syncLegacyGameOverControls(gameOverScreen, true);
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

function syncLegacyGameOverControls(root: HTMLElement | null, shadow: boolean): void {
    if (!root) return;
    root.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
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
}

export function bindLegacyGameOverRestart(onRestart: () => void): void {
    const btnRestart = document.getElementById('btn-restart');
    if (!btnRestart) return;

    btnRestart.onclick = onRestart;
}

export function updateLegacyGameOverStats(lines: string[]): boolean {
    const statsEl = document.getElementById('game-over-stats');
    if (!statsEl) return false;

    statsEl.replaceChildren(...lines.map(line => {
        const row = document.createElement('div');
        row.textContent = line;
        return row;
    }));
    return true;
}
