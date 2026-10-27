/** Samples older than this (ms) don't count towards the velocity. */
const WINDOW = 100

/** A pointer resting longer than this (ms) before release has no velocity. */
const STALE = 50

export interface VelocityTracker {
  /** Forget every sample. */
  reset: () => void
  /** Record `position` (px) at `time` (ms). */
  add: (time: number, position: number) => void
  /** Velocity (px/ms) over the last samples, as of `time`. */
  velocity: (time: number) => number
}

/** Estimates how fast a pointer moves from its most recent positions. */
export function createVelocityTracker(): VelocityTracker {
  const samples: { time: number; position: number }[] = []

  return {
    reset() {
      samples.length = 0
    },
    add(time, position) {
      // A sample that did not move (such as the release) says nothing about the speed: the
      // pointer resting is noticed from the time since the last movement instead.
      if (samples.at(-1)?.position === position) return
      samples.push({ time, position })
      while (samples.length > 2 && time - samples[0]!.time > WINDOW) samples.shift()
    },
    velocity(time) {
      const first = samples[0]
      const last = samples.at(-1)
      if (!first || !last || first === last || time - last.time > STALE) return 0
      const elapsed = last.time - first.time
      return elapsed > 0 ? (last.position - first.position) / elapsed : 0
    },
  }
}
