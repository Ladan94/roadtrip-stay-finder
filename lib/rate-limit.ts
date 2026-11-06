import { createHash } from 'node:crypto';
const windows = new Map<string, { count: number; reset: number }>();
/** No trip data retained. Anonymous rate buckets expire after one minute. */
export async function rateLimit(request: Request, scope: string, limit = 12) {
  const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const bucket = Math.floor(Date.now() / 60000);
  const id = createHash('sha256').update(`${address}:${scope}:${bucket}`).digest('hex');
  const url = process.env.UPSTASH_REDIS_REST_URL,
    token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        'EVAL',
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],120) end; return n",
        '1',
        `rl:${id}`,
      ]),
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error('Rate limiter unavailable');
    const data = (await response.json()) as { result?: number; error?: string };
    if (typeof data.result !== 'number') throw new Error('Rate limiter unavailable');
    return data.result <= limit;
  }
  if (process.env.NODE_ENV === 'production' && (scope === 'live-plan' || scope === 'autocomplete'))
    throw new Error('Configure distributed rate limiting before enabling live production searches');
  const now = Date.now();
  for (const [k, v] of windows) if (v.reset <= now) windows.delete(k);
  const current = windows.get(id) ?? { count: 0, reset: now + 60000 };
  current.count++;
  windows.set(id, current);
  return current.count <= limit;
}
