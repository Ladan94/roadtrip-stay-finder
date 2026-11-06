import { it, expect, vi } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';
it('limits repeated requests and expires buckets', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2028-06-01T00:00:00Z'));
  const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '192.0.2.10' } });
  expect(await rateLimit(req, 'unit', 2)).toBe(true);
  expect(await rateLimit(req, 'unit', 2)).toBe(true);
  expect(await rateLimit(req, 'unit', 2)).toBe(false);
  vi.advanceTimersByTime(61000);
  expect(await rateLimit(req, 'unit', 2)).toBe(true);
  vi.useRealTimers();
});
it('fails closed for live production without shared rate limiting', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  await expect(rateLimit(new Request('http://localhost'), 'live-plan')).rejects.toThrow(
    /distributed/,
  );
  vi.unstubAllEnvs();
});

it('keeps the demo available in production without provider credentials or Redis', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  try {
    expect(await rateLimit(new Request('http://localhost'), 'demo-plan')).toBe(true);
    await expect(rateLimit(new Request('http://localhost'), 'autocomplete')).rejects.toThrow(
      /distributed/,
    );
  } finally {
    vi.unstubAllEnvs();
  }
});
