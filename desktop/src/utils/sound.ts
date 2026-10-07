let ctx: AudioContext | null = null;

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, at: number, dur: number, vol = 0.3, type: OscillatorType = 'sine'): void {
  const c = audio();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + at;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** 3 loud beeps — 5 minutes warning */
export function playWarning(): void {
  try {
    tone(880, 0, 0.18, 0.4, 'square');
    tone(880, 0.28, 0.18, 0.4, 'square');
    tone(1174.66, 0.56, 0.3, 0.45, 'square');
  } catch {
    /* audio unavailable */
  }
}

/** Rising chime — session ended */
export function playEnd(): void {
  try {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.13, 0.55, 0.35));
  } catch {
    /* audio unavailable */
  }
}

/** Short blip — session started / time added */
export function playStart(): void {
  try {
    tone(659.25, 0, 0.12, 0.3);
    tone(987.77, 0.12, 0.2, 0.3);
  } catch {
    /* audio unavailable */
  }
}
