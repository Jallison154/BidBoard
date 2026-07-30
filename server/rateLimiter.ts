interface Bucket {
  count: number;
  windowStart: number;
}

/** Simple in-memory fixed-window rate limiter, keyed by an arbitrary string
 * (typically a socket id or remote IP). Used to slow down PIN brute-forcing. */
export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
  ) {}

  /** Records an attempt and returns whether it should be allowed. */
  attempt(key: string): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now - bucket.windowStart > this.windowMs) {
      this.buckets.set(key, { count: 1, windowStart: now });
      return { allowed: true, retryAfterMs: 0 };
    }

    if (bucket.count >= this.maxAttempts) {
      return { allowed: false, retryAfterMs: this.windowMs - (now - bucket.windowStart) };
    }

    bucket.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }
}
