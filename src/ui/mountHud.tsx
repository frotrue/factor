import type Phaser from 'phaser';
import { render } from 'preact';
import HudApp from './HudApp';
import { connectGameStateBridge } from './signals/bridge';

let activeUnmount: (() => void) | null = null;

export function mountHud(game: Phaser.Game): void {
    const root = document.getElementById('preact-hud');
    if (!root) {
        console.warn('Preact HUD root #preact-hud was not found.');
        return;
    }

    activeUnmount?.();
    const disconnectBridge = connectGameStateBridge();
    render(<HudApp game={game} />, root);

    const unmount = () => {
        if (activeUnmount !== unmount) return;
        disconnectBridge();
        render(null, root);
        activeUnmount = null;
    };
    activeUnmount = unmount;
    game.events.once('destroy', unmount);
}
