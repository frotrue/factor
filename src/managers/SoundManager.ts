import EventBus from './EventBus';

export default class SoundManager {
    private context: AudioContext | null = null;
    private masterVolume = 0.6;
    private muted = false;
    private unlocked = false;

    constructor() {
        this.masterVolume = this.readNumber('neural_factory_master_volume', 0.6);
        this.muted = localStorage.getItem('neural_factory_muted') === 'true';

        window.addEventListener('pointerdown', () => this.unlock(), { once: true });
        window.addEventListener('keydown', () => this.unlock(), { once: true });

        EventBus.on('BUILDING_PLACED', () => this.play('build'));
        EventBus.on('BUILDING_REMOVED', () => this.play('remove'));
        EventBus.on('CABLE_CONNECTED', () => this.play('connect'));
        EventBus.on('WAVE_STARTED', () => this.play('wave'));
        EventBus.on('ENEMY_KILLED', () => this.play('kill'));
        EventBus.on('RESEARCH_UNLOCKED', () => this.play('research'));
        EventBus.on('CORE_DAMAGED', () => this.play('alert'));
        EventBus.on('AUDIO_SETTINGS_CHANGED', ({ masterVolume, muted }) => {
            this.setSettings(masterVolume, muted);
        });
    }

    getSettings(): { masterVolume: number; muted: boolean } {
        return { masterVolume: this.masterVolume, muted: this.muted };
    }

    setSettings(masterVolume: number, muted: boolean): void {
        this.masterVolume = Math.max(0, Math.min(1, masterVolume));
        this.muted = muted;
        localStorage.setItem('neural_factory_master_volume', String(this.masterVolume));
        localStorage.setItem('neural_factory_muted', String(this.muted));
    }

    unlock(): void {
        if (!this.context) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            this.context = new AudioCtx();
        }
        if (this.context.state === 'suspended') {
            void this.context.resume();
        }
        this.unlocked = true;
    }

    play(kind: 'build' | 'remove' | 'connect' | 'wave' | 'kill' | 'research' | 'alert' | 'shot'): void {
        if (this.muted) return;
        this.unlock();
        if (!this.context || !this.unlocked) return;

        const patterns: Record<typeof kind, [number, number, number][]> = {
            build: [[220, 0.05, 0.08], [440, 0.06, 0.07]],
            remove: [[180, 0.06, 0.08], [90, 0.08, 0.06]],
            connect: [[520, 0.04, 0.06], [760, 0.04, 0.05]],
            wave: [[110, 0.1, 0.09], [82, 0.18, 0.07]],
            kill: [[620, 0.04, 0.05], [930, 0.04, 0.04]],
            research: [[392, 0.06, 0.07], [587, 0.07, 0.07], [784, 0.1, 0.06]],
            alert: [[120, 0.08, 0.1], [120, 0.08, 0.1]],
            shot: [[880, 0.03, 0.035]]
        };

        let offset = 0;
        patterns[kind].forEach(([frequency, duration, gain]) => {
            this.tone(frequency, duration, gain, offset);
            offset += duration * 0.75;
        });
    }

    private tone(frequency: number, duration: number, gainValue: number, delay: number): void {
        if (!this.context) return;
        const now = this.context.currentTime + delay;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(gainValue * this.masterVolume, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        oscillator.connect(gain);
        gain.connect(this.context.destination);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.02);
    }

    private readNumber(key: string, fallback: number): number {
        const value = Number(localStorage.getItem(key));
        return Number.isFinite(value) ? value : fallback;
    }
}
