/**
 * Web Audio API Sound Synthesizer for Bitcoin Simulator
 * Standalone procedurally synthesized audio (no external asset dependencies)
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.volume = 0.5;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    ensureContext() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    playClick() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04);

        gain.gain.setValueAtTime(0.15 * this.volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.04);
    }

    playMineBlock() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        
        // Chime note 1
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
        osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.2); // C6

        gain1.gain.setValueAtTime(0.3 * this.volume, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.4);
    }

    playBuy() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

        gain.gain.setValueAtTime(0.25 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playSell() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.15);

        gain.gain.setValueAtTime(0.25 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
    }

    playLiquidation() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        
        // Alarm Siren Sawtooth
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(150, now + 0.4);

        gain.gain.setValueAtTime(0.4 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
    }

    playHalving() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
        const now = this.ctx.currentTime;

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;

            const startTime = now + idx * 0.08;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3 * this.volume, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.4);
        });
    }

    playAchievement() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const notes = [440, 554.37, 659.25, 880]; // A Major arpeggio
        const now = this.ctx.currentTime;

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const st = now + i * 0.07;
            gain.gain.setValueAtTime(0.2 * this.volume, st);
            gain.gain.exponentialRampToValueAtTime(0.001, st + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(st);
            osc.stop(st + 0.25);
        });
    }
}

export const audio = new SoundEngine();
