export interface LegacyTopHudRefs {
    scoreEl: HTMLElement | null;
    packetsEl: HTMLElement | null;
    powerEl: HTMLElement | null;
    waveEl: HTMLElement | null;
    waveTimerEl: HTMLElement | null;
    siliconEl: HTMLElement | null;
}

export interface LegacyPowerDisplay {
    production: number;
    consumption: number;
    isDeficit: boolean;
    networks?: Array<{ satisfaction?: number }>;
}

export function getLegacyTopHudRefs(): LegacyTopHudRefs {
    return {
        scoreEl: document.getElementById('hud-score'),
        packetsEl: document.getElementById('hud-packets'),
        powerEl: document.getElementById('hud-power'),
        waveEl: document.getElementById('hud-wave'),
        waveTimerEl: document.getElementById('hud-wave-timer'),
        siliconEl: document.getElementById('hud-silicon')
    };
}

export function updateLegacyScore(refs: LegacyTopHudRefs, score: number): void {
    if (refs.scoreEl) refs.scoreEl.textContent = String(score);
}

export function updateLegacyPower(refs: LegacyTopHudRefs, data: LegacyPowerDisplay): void {
    if (!refs.powerEl) return;

    const networkText = data.networks ? ` | ${data.networks.length} grids` : '';
    const average = data.consumption > 0 && data.networks?.length
        ? data.networks.reduce((sum, network) => sum + (network.satisfaction ?? 1), 0) / data.networks.length
        : 1;
    const efficiencyText = data.consumption > 0 ? ` | ${Math.round(average * 100)}%` : '';
    refs.powerEl.textContent = `${data.production} / ${data.consumption} W${efficiencyText}${networkText}`;
    refs.powerEl.style.color = data.isDeficit ? '#ef4444' : '#fde047';
    refs.powerEl.style.textShadow = data.isDeficit ? '0 0 10px #ef4444' : '0 0 10px #fde047';
}

export function updateLegacyWave(refs: LegacyTopHudRefs, wave: number): void {
    if (refs.waveEl) refs.waveEl.textContent = String(wave);
}

export function updateLegacyWaveTimer(refs: LegacyTopHudRefs, waveTimer: string): void {
    if (refs.waveTimerEl) refs.waveTimerEl.textContent = waveTimer;
}

export function updateLegacyPackets(refs: LegacyTopHudRefs, packets: number): void {
    if (refs.packetsEl) refs.packetsEl.textContent = String(packets);
}

export function updateLegacySilicon(refs: LegacyTopHudRefs, silicon: number): void {
    if (refs.siliconEl) refs.siliconEl.textContent = String(silicon);
}
