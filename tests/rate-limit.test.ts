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
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  await expect(rateLimit(new Request('http://localhost'), 'live-plan')).rejects.toThrow(
    /distributed/,
  );
  vi.unstubAllEnvs();
});
