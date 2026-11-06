import { describe, it, expect } from 'vitest';
import { tripSchema } from '@/lib/validation';
import { breakCount, decodePolyline, pointAtTime, rankHotels } from '@/lib/planning';
import { demoPlan } from '@/lib/providers/demo';
import { trip } from './fixtures';
describe('validation', () => {
  it.each([
    ['DE', '10115'],
    ['AT', '1010'],
    ['NL', '1012 AB'],
    ['GB', 'SW1A 1AA'],
    ['PL', '00-001'],
  ])('accepts %s postal format', (country, postalCode) =>
    expect(tripSchema.safeParse({ ...trip, country, postalCode }).success).toBe(true),
  );
  it.each([
    ['DE', '123'],
    ['AT', 'ABCD'],
    ['NL', '10115'],
    ['GB', '12345'],
  ])('rejects %s invalid postal format', (country, postalCode) =>
    expect(tripSchema.safeParse({ ...trip, country, postalCode }).success).toBe(false),
  );
  it('allows direction-only input for exploratory handling', () =>
    expect(tripSchema.safeParse({ ...trip, destination: '' }).success).toBe(true));
  it('rejects malformed dates and checkout before checkin', () => {
    expect(tripSchema.safeParse({ ...trip, checkIn: '2028-02-30' }).success).toBe(false);
    expect(tripSchema.safeParse({ ...trip, checkOut: trip.checkIn }).success).toBe(false);
  });
  it('rejects implausible resource and time inputs', () => {
    expect(tripSchema.safeParse({ ...trip, driveHours: 99 }).success).toBe(false);
    expect(tripSchema.safeParse({ ...trip, departureTime: '25:00' }).success).toBe(false);
    expect(tripSchema.safeParse({ ...trip, children: -1 }).success).toBe(false);
  });
});
describe('route timing', () => {
  const route = [
    { lat: 50, lng: 10, seconds: 0, meters: 0 },
    { lat: 51, lng: 12, seconds: 3600, meters: 80000 },
    { lat: 53, lng: 12, seconds: 10800, meters: 200000 },
  ];
  it('uses timed segments rather than route distance fraction', () =>
    expect(pointAtTime(route, 7200)).toEqual({ lat: 52, lng: 12, seconds: 7200, meters: 140000 }));
  it('clamps to route endpoints', () => {
    expect(pointAtTime(route, 99999)).toEqual(route[2]);
    expect(pointAtTime(route, -20)).toEqual(route[0]);
  });
  it('does not schedule a break at the overnight arrival', () => {
    expect(breakCount(240, 2)).toBe(1);
    expect(breakCount(241, 2)).toBe(2);
    expect(breakCount(60, 2)).toBe(0);
  });
  it('decodes route geometry and rejects truncated input', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')[0]).toEqual({ lat: 38.5, lng: -120.2 });
    expect(() => decodePolyline('_p')).toThrow();
  });
});
describe('hotel discovery and demo', () => {
  const all = demoPlan({
    ...trip,
    budget: 300,
    breakfast: false,
    maxDetour: 60,
    minRating: 0,
  }).hotels;
  it('filters total nightly budget and verified breakfast', () => {
    const h = rankHotels(all, { ...trip, budget: 110 });
    expect(h).toHaveLength(1);
    expect(h[0].nightlyPrice).toBe(98);
    expect(h[0].breakfast).toBe('included');
  });
  it('keeps official stars separate from guest rating', () => {
    const h = rankHotels(all, { ...trip, minStars: 4 });
    expect(h.every((v) => (v.stars ?? 0) >= 4)).toBe(true);
    expect(h.some((v) => v.stars === null)).toBe(false);
  });
  it('returns an honest empty state', () =>
    expect(demoPlan({ ...trip, budget: 30 }).hotels).toHaveLength(0));
  it('uses explicit opt-in to include unverified discovery fields', () => {
    const unknown = { ...all[0], nightlyPrice: null, breakfast: 'unknown' as const };
    expect(rankHotels([unknown], trip)).toHaveLength(0);
    expect(rankHotels([unknown], trip, true)).toHaveLength(1);
  });
  it('excludes unmeasured detours', () =>
    expect(rankHotels([{ ...all[0], detourMinutes: null }], trip, true)).toHaveLength(0));
  it('labels fictional data and never generates booking links', () => {
    const plan = demoPlan({ ...trip, destination: '' });
    expect(plan.exploratory).toBe(true);
    expect(
      plan.hotels.every((h) => h.source === 'demo' && h.priceStatus === 'sample' && !h.url),
    ).toBe(true);
    expect(plan.bookingConnected).toBe(false);
  });
});
