// A small seeded random source (mulberry32): the same seed always deals the same night,
// so a screenshot scene staged from a seed is the same frame every time it is taken.

export function createRandom(seed) {
  let state = seed >>> 0;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    /** A float in [min, max). */
    range(min, max) {
      return min + next() * (max - min);
    },
    /** A whole number in [min, max], both ends included. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
  };
}
