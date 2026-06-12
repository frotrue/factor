export function showLegacyGameOverScreen(): void {
    const gameOverScreen = document.getElementById('game-over-screen');
    if (!gameOverScreen) return;

    gameOverScreen.style.display = 'flex';
    gameOverScreen.dataset.preactShadow = 'true';
    gameOverScreen.setAttribute('aria-hidden', 'true');
}

export function bindLegacyGameOverRestart(onRestart: () => void): void {
    const btnRestart = document.getElementById('btn-restart');
    if (!btnRestart) return;

    btnRestart.onclick = onRestart;
}

export function updateLegacyGameOverStats(lines: string[]): boolean {
    const statsEl = document.getElementById('game-over-stats');
    if (!statsEl) return false;

    statsEl.innerHTML = lines.map(line => `<div>${line}</div>`).join('');
    return true;
}
