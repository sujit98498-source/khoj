/**
 * lib/soundManager.ts
 *
 * Call audio using the Web Audio API with AudioBufferSourceNode.loop = true.
 * Buffers are synthesized once and cached — no MP3 files required.
 *
 * Loop sounds (play until explicitly stopped):
 *   playRingbackLoop()  — US 440+480 Hz, 2 s ring / 4 s silence (caller waiting)
 *   playIncomingLoop()  — Triple 800 Hz beep, 3×0.35 s / 3.5 s silence (receiver)
 *   stopRingback()
 *   stopIncoming()
 *
 * One-shot sounds:
 *   playConnectedOnce() — Ascending C5-E5-G5 chime
 *   playEndOnce()       — Descending G4-C4 drop
 *
 * stopAllCallSounds()   — Stops everything immediately
 *
 * Rules:
 *  - Each loop has its own independent gain+source node pair.
 *  - stopAll* is synchronous and idempotent.
 *  - SSR-safe: all functions are no-ops when window is undefined.
 *  - AudioContext is created lazily (requires a prior user gesture).
 */

// ── AudioContext ──────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    try { ctx = new AudioContext() } catch { return null }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// ── Buffer cache ─────────────────────────────────────────────────────────────

let ringbackBuf: AudioBuffer | null = null
let incomingBuf: AudioBuffer | null = null

/**
 * Build a PCM AudioBuffer for the ringback tone.
 * 6-second cycle: 2 s of 440+480 Hz dual-tone, 4 s silence.
 */
function buildRingbackBuffer(ac: AudioContext): AudioBuffer {
  const sr = ac.sampleRate
  const total = 6 * sr           // 6-second loop
  const ringLen = 2 * sr         // 2-second tone
  const buf = ac.createBuffer(1, total, sr)
  const ch = buf.getChannelData(0)
  for (let i = 0; i < ringLen; i++) {
    const t = i / sr
    const env = Math.min(t / 0.02, 1) * Math.min((2 - t) / 0.02, 1)
    ch[i] = env * 0.18 * (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 480 * t))
  }
  // Remaining samples stay 0 (silence)
  return buf
}

/**
 * Build a PCM AudioBuffer for the incoming ringtone.
 * ~5-second cycle: 3 beeps of 800 Hz (0.35 s each, 0.15 s gap), then 3.5 s silence.
 */
function buildIncomingBuffer(ac: AudioContext): AudioBuffer {
  const sr = ac.sampleRate
  const beepDur = 0.35
  const gap = 0.15
  const total = Math.ceil(5 * sr)
  const buf = ac.createBuffer(1, total, sr)
  const ch = buf.getChannelData(0)

  for (let b = 0; b < 3; b++) {
    const start = b * (beepDur + gap)
    const startSample = Math.floor(start * sr)
    const beepSamples = Math.floor(beepDur * sr)
    for (let i = 0; i < beepSamples; i++) {
      const t = i / sr
      const env = Math.min(t / 0.01, 1) * Math.min((beepDur - t) / 0.01, 1)
      ch[startSample + i] = env * 0.22 * Math.sin(2 * Math.PI * 800 * t)
    }
  }
  return buf
}

function getRingbackBuf(ac: AudioContext): AudioBuffer {
  if (!ringbackBuf) ringbackBuf = buildRingbackBuffer(ac)
  return ringbackBuf
}

function getIncomingBuf(ac: AudioContext): AudioBuffer {
  if (!incomingBuf) incomingBuf = buildIncomingBuffer(ac)
  return incomingBuf
}

// ── Active loop nodes ─────────────────────────────────────────────────────────

let ringbackNode: AudioBufferSourceNode | null = null
let ringbackGain: GainNode | null = null
let incomingNode: AudioBufferSourceNode | null = null
let incomingGain: GainNode | null = null

function stopNode(
  node: AudioBufferSourceNode | null,
  gain: GainNode | null
): void {
  if (gain) {
    try { gain.disconnect() } catch { /* already disconnected */ }
  }
  if (node) {
    try { node.stop() } catch { /* already stopped */ }
    try { node.disconnect() } catch { /* already disconnected */ }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Start the ringback loop (caller waits). Replaces any existing ringback. */
export function playRingbackLoop(): void {
  const ac = getCtx()
  if (!ac) return
  stopRingback() // ensure no duplicate

  const gain = ac.createGain()
  gain.gain.value = 0.7
  gain.connect(ac.destination)

  const src = ac.createBufferSource()
  src.buffer = getRingbackBuf(ac)
  src.loop = true
  src.connect(gain)
  src.start()

  ringbackNode = src
  ringbackGain = gain
}

/** Stop the ringback immediately. */
export function stopRingback(): void {
  stopNode(ringbackNode, ringbackGain)
  ringbackNode = null
  ringbackGain = null
}

/** Start the incoming ringtone loop (receiver). Replaces any existing incoming tone. */
export function playIncomingLoop(): void {
  const ac = getCtx()
  if (!ac) return
  stopIncoming()

  const gain = ac.createGain()
  gain.gain.value = 0.8
  gain.connect(ac.destination)

  const src = ac.createBufferSource()
  src.buffer = getIncomingBuf(ac)
  src.loop = true
  src.connect(gain)
  src.start()

  incomingNode = src
  incomingGain = gain
}

/** Stop the incoming ringtone immediately. */
export function stopIncoming(): void {
  stopNode(incomingNode, incomingGain)
  incomingNode = null
  incomingGain = null
}

/** Stop all looping call sounds immediately. */
export function stopAllCallSounds(): void {
  stopRingback()
  stopIncoming()
}

// ── One-shot helpers ──────────────────────────────────────────────────────────

function playTone(
  ac: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume = 0.22,
  type: OscillatorType = 'sine'
): void {
  const g = ac.createGain()
  g.gain.setValueAtTime(0, startTime)
  g.gain.linearRampToValueAtTime(volume, startTime + 0.015)
  g.gain.setValueAtTime(volume, startTime + duration - 0.03)
  g.gain.linearRampToValueAtTime(0, startTime + duration)
  g.connect(ac.destination)

  const osc = ac.createOscillator()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(g)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

/** Play once: ascending C5-E5-G5 chime (call connected). */
export function playConnectedOnce(): void {
  stopAllCallSounds()
  const ac = getCtx()
  if (!ac) return
  const t = ac.currentTime
  const d = 0.18, gap = 0.05
  playTone(ac, 523.25, t,               d) // C5
  playTone(ac, 659.25, t + d + gap,     d) // E5
  playTone(ac, 783.99, t + (d+gap)*2,   d) // G5
}

/** Play once: descending G4-C4 drop (call ended / declined). */
export function playEndOnce(): void {
  stopAllCallSounds()
  const ac = getCtx()
  if (!ac) return
  const t = ac.currentTime
  playTone(ac, 392.00, t,        0.22) // G4
  playTone(ac, 261.63, t + 0.26, 0.28) // C4
}
