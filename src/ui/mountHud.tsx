import type Phaser from 'phaser';
import { render } from 'preact';
import HudApp from './HudApp';
import { connectGameStateBridge } from './signals/bridge';

export function mountHud(game: Phaser.Game): void {
    const root = document.getElementById('preact-hud');
    if (!root) {
        console.warn('Preact HUD root #preact-hud was not found.');
        return;
    }

    connectGameStateBridge();
    render(<HudApp game={game} />, root);
}
