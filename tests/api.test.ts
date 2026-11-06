import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/plan/route';
import { trip } from './fixtures';
const request = (input: unknown) =>
  new Request('http://localhost/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
describe('trip API', () => {
  it('returns filtered demo results without credentials or network calls', async () => {
    const network = vi.spyOn(globalThis, 'fetch');
    const res = await POST(request(trip));
    expect(res.status).toBe(200);
    const plan = await res.json();
    expect(plan.mode).toBe('demo');
    expect(plan.route.length).toBeGreaterThan(2);
    expect(plan.hotels.length).toBeGreaterThan(0);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(network).not.toHaveBeenCalled();
  });
  it('rejects bad postal codes and exposes field validation', async () => {
    const res = await POST(request({ ...trip, postalCode: 'bad' }));
    expect(res.status).toBe(400);
    expect((await res.json()).fields.postalCode).toBeDefined();
  });
  it('rejects malformed JSON', async () =>
    expect(
      (
        await POST(
          new Request('http://localhost/api/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{',
          }),
        )
      ).status,
    ).toBe(400));
  it('rejects oversized JSON', async () =>
    expect((await POST(request({ extra: 'x'.repeat(9000) }))).status).toBe(413));
  it('reports missing live credentials without falling back to fake data', async () => {
    vi.stubEnv('GOOGLE_MAPS_SERVER_KEY', '');
    const response = await POST(request({ ...trip, mode: 'live' }));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/server key/);
    vi.unstubAllEnvs();
  });
});
