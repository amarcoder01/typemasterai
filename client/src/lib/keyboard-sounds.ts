// Keyboard sound system using Web Audio API
export type SoundType = 'mechanical' | 'linear' | 'typewriter' | 'cherry';

class KeyboardSoundSystem {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private soundType: SoundType = 'mechanical';

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSettings();
    }
  }

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private loadSettings() {
    const enabled = localStorage.getItem('keyboardSoundsEnabled');
    const soundType = localStorage.getItem('keyboardSoundType');
    
    this.enabled = enabled !== null ? enabled === 'true' : true;
    this.soundType = (soundType as SoundType) || 'mechanical';
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('keyboardSoundsEnabled', enabled.toString());
  }

  setSoundType(type: SoundType) {
    this.soundType = type;
    localStorage.setItem('keyboardSoundType', type);
  }

  getSettings() {
    return {
      enabled: this.enabled,
      soundType: this.soundType
    };
  }

  play() {
    if (!this.enabled) return;
    
    this.initAudioContext();
    if (!this.audioContext) return;

    const currentTime = this.audioContext.currentTime;

    switch (this.soundType) {
      case 'mechanical':
        this.playMechanicalClick(currentTime);
        break;
      case 'linear':
        this.playLinearThock(currentTime);
        break;
      case 'typewriter':
        this.playTypewriter(currentTime);
        break;
      case 'cherry':
        this.playCherryMX(currentTime);
        break;
    }
  }

  private playMechanicalClick(startTime: number) {
    if (!this.audioContext) return;

    // Create oscillator for click sound
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Sharp, high-pitched click
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, startTime);
    osc.frequency.exponentialRampToValueAtTime(800, startTime + 0.01);

    // Quick attack and decay
    gainNode.gain.setValueAtTime(0.15, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.02);

    osc.start(startTime);
    osc.stop(startTime + 0.02);
  }

  private playLinearThock(startTime: number) {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Deep thock sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, startTime);
    osc.frequency.exponentialRampToValueAtTime(80, startTime + 0.05);

    // Smooth attack and decay
    gainNode.gain.setValueAtTime(0.2, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);

    osc.start(startTime);
    osc.stop(startTime + 0.08);
  }

  private playTypewriter(startTime: number) {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Metallic clack
    osc.type = 'square';
    osc.frequency.setValueAtTime(1500, startTime);
    osc.frequency.exponentialRampToValueAtTime(600, startTime + 0.015);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, startTime);
    filter.Q.setValueAtTime(2, startTime);

    gainNode.gain.setValueAtTime(0.18, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.03);

    osc.start(startTime);
    osc.stop(startTime + 0.03);
  }

  private playCherryMX(startTime: number) {
    if (!this.audioContext) return;

    // Cherry MX Blue has a distinctive two-stage sound
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gainNode1 = this.audioContext.createGain();
    const gainNode2 = this.audioContext.createGain();

    osc1.connect(gainNode1);
    osc2.connect(gainNode2);
    gainNode1.connect(this.audioContext.destination);
    gainNode2.connect(this.audioContext.destination);

    // First stage: tactile click
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(1400, startTime);
    osc1.frequency.exponentialRampToValueAtTime(900, startTime + 0.01);

    gainNode1.gain.setValueAtTime(0.12, startTime);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, startTime + 0.015);

    // Second stage: bottom-out sound
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(150, startTime + 0.015);
    osc2.frequency.exponentialRampToValueAtTime(60, startTime + 0.04);

    gainNode2.gain.setValueAtTime(0, startTime);
    gainNode2.gain.setValueAtTime(0.15, startTime + 0.015);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);

    osc1.start(startTime);
    osc1.stop(startTime + 0.015);
    osc2.start(startTime + 0.015);
    osc2.stop(startTime + 0.05);
  }
}

// Singleton instance
export const keyboardSound = new KeyboardSoundSystem();
