export class RateLimiter {
  private head = 0;
  private tail = 0;
  private readonly maxPerSecond: number;
  private readonly buffer: number[];

  constructor(maxPerSecond: number = 50) {
    this.maxPerSecond = maxPerSecond;
    this.buffer = new Array(maxPerSecond);
  }

  public check(): boolean {
    const now = Date.now();
    // Remove expired entries from the front
    while (this.head !== this.tail && now - this.buffer[this.head] >= 1000) {
      this.head = (this.head + 1) % this.maxPerSecond;
    }
    // Check if buffer is full
    const count = (this.tail - this.head + this.maxPerSecond) % this.maxPerSecond;
    if (count >= this.maxPerSecond - 1) {
      return false;
    }
    this.buffer[this.tail] = now;
    this.tail = (this.tail + 1) % this.maxPerSecond;
    return true;
  }
}
