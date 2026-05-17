export class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxPerSecond: number;

  constructor(maxPerSecond: number = 100) {
    this.maxPerSecond = maxPerSecond;
  }

  public check(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < 1000);
    if (this.timestamps.length >= this.maxPerSecond) {
      return false;
    }
    this.timestamps.push(now);
    return true;
  }
}
