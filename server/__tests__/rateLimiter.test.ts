import { describe, expect, it, vi } from 'vitest';
import { RateLimiter } from '../rateLimiter';

describe('RateLimiter', () => {
  it('allows attempts up to the configured maximum', () => {
    const limiter = new RateLimiter(3, 60_000);
    expect(limiter.attempt('a').allowed).toBe(true);
    expect(limiter.attempt('a').allowed).toBe(true);
    expect(limiter.attempt('a').allowed).toBe(true);
  });

  it('blocks attempts beyond the maximum within the window', () => {
    const limiter = new RateLimiter(2, 60_000);
    limiter.attempt('a');
    limiter.attempt('a');
    const result = limiter.attempt('a');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('tracks separate keys independently', () => {
    const limiter = new RateLimiter(1, 60_000);
    limiter.attempt('a');
    expect(limiter.attempt('b').allowed).toBe(true);
  });

  it('resets a key so it can attempt again immediately', () => {
    const limiter = new RateLimiter(1, 60_000);
    limiter.attempt('a');
    limiter.reset('a');
    expect(limiter.attempt('a').allowed).toBe(true);
  });

  it('allows attempts again once the window has passed', () => {
    vi.useFakeTimers();
    try {
      const limiter = new RateLimiter(1, 1000);
      limiter.attempt('a');
      expect(limiter.attempt('a').allowed).toBe(false);
      vi.advanceTimersByTime(1001);
      expect(limiter.attempt('a').allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
