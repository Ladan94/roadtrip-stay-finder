import { afterEach, describe, it, expect, vi } from 'vitest';
import { autocomplete, livePlan } from '@/lib/providers/google';
import { trip } from './fixtures';
const geometry = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
function mockProvider(fail = false) {
  let calls = 0;
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const u = String(url);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (fail) throw new Error('network unavailable');
    if (u.includes('geocode'))
      return Response.json({
        status: 'OK',
        results: [
          { formatted_address: 'Test town', geometry: { location: { lat: 38.5, lng: -120.2 } } },
        ],
      });
    if (u.includes('timezone'))
      return Response.json({ status: 'OK', rawOffset: 3600, dstOffset: 3600 });
    if (u.includes('computeRoutes')) {
      calls++;
      const duration = calls === 1 ? 18000 : body.intermediates ? 1300 : 1000;
      return Response.json({
        routes: [
          {
            duration: `${duration}s`,
            distanceMeters: 500000,
            polyline: { encodedPolyline: geometry },
            legs: [
              {
                steps: [
                  {
                    staticDuration: `${duration}s`,
                    distanceMeters: 500000,
                    polyline: { encodedPolyline: geometry },
                  },
                ],
              },
            ],
          },
        ],
      });
    }
    if (u.includes('searchNearby'))
      return Response.json({
        places: [
          {
            id: body.includedTypes[0] === 'lodging' ? 'hotel-1' : 'cafe-1',
            displayName: { text: 'Provider listing' },
            location: { latitude: 40.7, longitude: -120.95 },
            rating: 4.7,
            userRatingCount: 250,
            formattedAddress: 'Provider address',
            googleMapsUri: 'https://maps.google.com/?cid=1',
            regularOpeningHours: { weekdayDescriptions: ['Monday: 08:00–18:00'] },
          },
        ],
      });
    if (u.includes('autocomplete'))
      return Response.json({
        suggestions: [{ placePrediction: { placeId: 'abc', text: { text: 'Vienna, Austria' } } }],
      });
    throw new Error('Unexpected provider request');
  });
}
afterEach(() => vi.unstubAllEnvs());
describe('Google integration with mocked provider contracts', () => {
  it('requires a destination and never invents a directional route', async () => {
    vi.stubEnv('GOOGLE_MAPS_SERVER_KEY', 'test-placeholder');
    await expect(livePlan({ ...trip, mode: 'live', destination: '' })).rejects.toThrow(
      /destination is required/,
    );
  });
  it('maps live routing and places without inventing rate or breakfast data', async () => {
    vi.stubEnv('GOOGLE_MAPS_SERVER_KEY', 'test-placeholder');
    mockProvider();
    const plan = await livePlan({ ...trip, mode: 'live' });
    expect(plan.mode).toBe('live');
    expect(plan.hotels).toHaveLength(1);
    expect(plan.hotels[0]).toMatchObject({
      nightlyPrice: null,
      stars: null,
      breakfast: 'unknown',
      priceStatus: 'unverified',
      detourMinutes: 5,
    });
    expect(plan.stops).toHaveLength(1);
    expect(plan.stops[0].openAtArrival).toBeNull();
    expect(plan.stops[0].hours).toHaveLength(1);
    expect(plan.departure).toBe('2028-06-01T07:00:00.000Z');
  });
  it('reports provider failures with safe user-facing messages', async () => {
    vi.stubEnv('GOOGLE_MAPS_SERVER_KEY', 'test-placeholder');
    mockProvider(true);
    await expect(livePlan({ ...trip, mode: 'live' })).rejects.toThrow(/could not be reached/);
  });
  it('accepts cross-border address suggestions', async () => {
    vi.stubEnv('GOOGLE_MAPS_SERVER_KEY', 'test-placeholder');
    const fetcher = mockProvider();
    expect(await autocomplete('Vienna')).toEqual([{ id: 'abc', label: 'Vienna, Austria' }]);
    const call = fetcher.mock.calls.find(([url]) => String(url).includes('autocomplete'));
    expect(JSON.parse(String(call?.[1]?.body))).not.toHaveProperty('includedRegionCodes');
  });
});
