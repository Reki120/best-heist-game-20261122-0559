// Tiny synthesised sound: no audio files, just a WebAudio oscillator asked for a few
// shaped blips. The context opens on the first key or click (browsers insist on a gesture),
// and every call is a no-op until then, so the screenshot scenes stay silent and safe.

export function createAudio() {
  let context = null;
  let master = null;

  function open() {
    if (context !== null) return;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      context = new AudioCtor();
      master = context.createGain();
      master.gain.value = 0.16;
      master.connect(context.destination);
    } catch {
      context = null;
    }
  }

  /** One note: frequency glides to `slideTo` over `seconds` if given. */
  function tone(frequency, seconds, type = 'sine', volume = 1, delay = 0, slideTo = null) {
    if (context === null || master === null) return;
    const start = context.currentTime + delay;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  return {
    open,
    /** A coin hits the floor: the bright double-tick the guards come to hear. */
    coin() {
      tone(1900, 0.07, 'square', 0.5);
      tone(2500, 0.09, 'square', 0.4, 0.06);
    },
    /** Loot in the bag: a soft rising blip, higher for richer hauls. */
    pickup(rich) {
      tone(rich ? 880 : 620, 0.09, 'sine', 0.8);
      tone(rich ? 1320 : 930, 0.12, 'sine', 0.7, 0.07);
    },
    /** A watcher has seen something: a short, sharp warning tick. */
    spotted() {
      tone(1180, 0.08, 'sawtooth', 0.45, 0, 880);
    },
    /** The getaway: a quick three-note climb. */
    win() {
      tone(523, 0.12, 'triangle', 0.9);
      tone(659, 0.12, 'triangle', 0.9, 0.1);
      tone(784, 0.22, 'triangle', 1, 0.2);
    },
    /** Caught: a falling slide into a low thud. */
    caught() {
      tone(420, 0.4, 'sawtooth', 0.8, 0, 90);
      tone(70, 0.3, 'sine', 1, 0.32);
    },
  };
}
