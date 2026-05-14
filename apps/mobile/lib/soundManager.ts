// apps/mobile/lib/soundManager.ts
// Manages the incoming-call ringtone using expo-av.
// Stage 3 — ringtone starts when IncomingCallModal appears and stops on
// accept, reject, or 30-second timeout.

import { Audio } from 'expo-av'

let soundObject: Audio.Sound | null = null

/**
 * Starts the ringtone loop.
 * Uses a bundled asset — drop ringtone.mp3 into apps/mobile/assets/sounds/.
 * Gracefully silences when the asset is missing (dev builds without asset).
 */
export async function startRingtone(): Promise<void> {
  try {
    await stopRingtone() // stop any previous sound first

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    })

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const asset = require('../assets/sounds/ringtone.mp3') as number
    const { sound } = await Audio.Sound.createAsync(asset, {
      shouldPlay:    true,
      isLooping:     true,
      volume:        1.0,
    })
    soundObject = sound
  } catch {
    // Missing asset or device audio error — fail silently
    soundObject = null
  }
}

/** Stops and unloads the ringtone. Safe to call even if not playing. */
export async function stopRingtone(): Promise<void> {
  if (soundObject) {
    try {
      await soundObject.stopAsync()
      await soundObject.unloadAsync()
    } catch {
      // ignore
    }
    soundObject = null
  }
}
