import { create } from 'zustand';

export type Theme = 'professional' | 'stark';

interface ThemeState {
  theme: Theme;
  soundEnabled: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSound: () => void;
  playSound: (type: 'click' | 'success' | 'alert' | 'whoosh') => void;
}

// Synthetic sound generator using Web Audio API (no external MP3 dependencies)
const playSyntheticSound = (type: 'click' | 'success' | 'alert' | 'whoosh') => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'alert') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(440, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'whoosh') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch {
    // Ignore audio errors if audio context blocked before user interaction
  }
};

const initialTheme: Theme = (localStorage.getItem('dataforge_theme') as Theme) || 'professional';
const initialSound = localStorage.getItem('dataforge_sound') === 'true';

// Apply theme to document element
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', initialTheme);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  soundEnabled: initialSound,
  setTheme: (theme) => {
    localStorage.setItem('dataforge_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  toggleTheme: () => {
    const nextTheme: Theme = get().theme === 'professional' ? 'stark' : 'professional';
    localStorage.setItem('dataforge_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    set({ theme: nextTheme });
    if (get().soundEnabled) playSyntheticSound('whoosh');
  },
  toggleSound: () => {
    const next = !get().soundEnabled;
    localStorage.setItem('dataforge_sound', String(next));
    set({ soundEnabled: next });
    if (next) playSyntheticSound('click');
  },
  playSound: (type) => {
    if (get().soundEnabled) {
      playSyntheticSound(type);
    }
  }
}));
