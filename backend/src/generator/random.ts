/**
 * Deterministic Pseudo-Random Number Generator (PRNG) based on Mulberry32.
 * Guarantees bit-for-bit identical outputs for a given seed across runs.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number = 42) {
    this.state = seed >>> 0;
  }

  /** Returns a float in [0, 1) */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns a float in [min, max] */
  public nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** Pick a random item from an array */
  public pick<T>(array: readonly T[]): T {
    const idx = Math.floor(this.next() * array.length);
    return array[idx];
  }

  /** Pick n distinct items from an array without replacement */
  public sample<T>(array: readonly T[], count: number): T[] {
    const copy = [...array];
    const n = Math.min(count, copy.length);
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }

  /** Shuffle an array in-place */
  public shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /** Returns a boolean with probability p */
  public boolean(p: number = 0.5): boolean {
    return this.next() < p;
  }
}
