import { z } from 'zod';
import type { Hotel, Plan, Point, RouteSample, Stop, Trip } from '../types';
import { breakCount, decodePolyline, distance, pointAtTime, rankHotels } from '../planning';
export class ProviderError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
const location = z.object({ latitude: z.number(), longitude: z.number() });
const placeSchema = z.object({
  id: z.string(),
  displayName: z.object({ text: z.string() }).optional(),
  formattedAddress: z.string().optional(),
  location,
  rating: z.number().optional(),
  userRatingCount: z.number().optional(),
  googleMapsUri: z.string().url().optional(),
  regularOpeningHours: z.object({ weekdayDescriptions: z.array(z.string()).optional() }).optional(),
  primaryType: z.string().optional(),
});
type Place = z.infer<typeof placeSchema>;
const stepSchema = z.object({
  staticDuration: z.string().optional(),
  distanceMeters: z.number().optional(),
  polyline: z.object({ encodedPolyline: z.string() }).optional(),
});
const routesSchema = z.object({
  routes: z
    .array(
      z.object({
        duration: z.string(),
        staticDuration: z.string().optional(),
        distanceMeters: z.number(),
        polyline: z.object({ encodedPolyline: z.string() }),
        legs: z.array(z.object({ steps: z.array(stepSchema).optional() })).optional(),
      }),
    )
    .optional(),
});
const point = (p: Point) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });
const seconds = (s: string) => Number(s.replace(/s$/, ''));
function key() {
  const v = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!v)
    throw new ProviderError(
      'Live planning needs a Google Maps server key. You can use demo mode now.',
      503,
    );
  return v;
}
async function request(
  url: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
        : AbortSignal.timeout(12000),
    });
  } catch {
    throw new ProviderError(
      'The map provider could not be reached or timed out. Please try again.',
    );
  }
  if (!res.ok)
    throw new ProviderError(
      res.status === 429
        ? 'Google Maps quota has been reached. Try later or use demo mode.'
        : 'Google Maps rejected the request. Check API enablement, billing and key restrictions.',
      res.status === 429 ? 429 : 502,
    );
  return res.json();
}
export async function geocode(
  address: string,
  signal?: AbortSignal,
  components?: string,
): Promise<{ point: Point; label: string }> {
  const body = z
    .object({
      status: z.string(),
      results: z.array(
        z.object({
          formatted_address: z.string(),
          geometry: z.object({ location: z.object({ lat: z.number(), lng: z.number() }) }),
        }),
      ),
    })
    .parse(
      await request(
        `https://maps.googleapis.com/maps/api/geocode/json?${new URLSearchParams({ address, key: key(), ...(components ? { components } : {}) })}`,
        {},
        signal,
      ),
    );
  if (body.status !== 'OK' || !body.results.length)
    throw new ProviderError(
      'No matching location found. Check the postal code, country and destination.',
      422,
    );
  return { point: body.results[0].geometry.location, label: body.results[0].formatted_address };
}
async function route(
  origin: Point,
  destination: Point,
  departure: string,
  signal: AbortSignal,
  via?: Point,
) {
  const result = routesSchema.parse(
    await request(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key(),
          'X-Goog-FieldMask':
            'routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.staticDuration,routes.legs.steps.distanceMeters,routes.legs.steps.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: point(origin),
          destination: point(destination),
          ...(via ? { intermediates: [point(via)] } : {}),
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          departureTime: departure,
          computeAlternativeRoutes: false,
          languageCode: 'en',
          units: 'METRIC',
        }),
      },
      signal,
    ),
  );
  const r = result.routes?.[0];
  if (!r) throw new ProviderError('No driving route found. Try another destination.', 422);
  return r;
}
function samples(
  r: z.infer<typeof routesSchema>['routes'] extends (infer R)[] | undefined ? R : never,
): RouteSample[] {
  const steps = r.legs?.flatMap((l) => l.steps ?? []) ?? [];
  const total = seconds(r.duration),
    staticTotal = steps.reduce((n, s) => n + seconds(s.staticDuration ?? '0s'), 0);
  if (!steps.length || staticTotal <= 0)
    throw new ProviderError('The route provider returned incomplete timing data.');
  let elapsed = 0,
    meters = 0;
  const out: RouteSample[] = [];
  for (const step of steps) {
    const coords = step.polyline ? decodePolyline(step.polyline.encodedPolyline) : [];
    if (!coords.length) continue;
    const lens = coords.map((p, i) => (i ? distance(coords[i - 1], p) : 0));
    const length = lens.reduce((a, b) => a + b, 0);
    let along = 0;
    coords.forEach((p, i) => {
      along += lens[i];
      const f = length ? along / length : 0;
      out.push({
        ...p,
        seconds: elapsed + ((seconds(step.staticDuration ?? '0s') * total) / staticTotal) * f,
        meters: meters + (step.distanceMeters ?? 0) * f,
      });
    });
    elapsed += (seconds(step.staticDuration ?? '0s') * total) / staticTotal;
    meters += step.distanceMeters ?? 0;
  }
  if (!out.length) throw new ProviderError('The route provider returned no geometry.');
  return out;
}
async function nearby(
  center: Point,
  types: string[],
  signal: AbortSignal,
  maxResultCount = 5,
): Promise<Place[]> {
  const body = z.object({ places: z.array(placeSchema).optional() }).parse(
    await request(
      'https://places.googleapis.com/v1/places:searchNearby',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key(),
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.regularOpeningHours,places.primaryType',
        },
        body: JSON.stringify({
          includedTypes: types,
          maxResultCount,
          locationRestriction: {
            circle: { center: { latitude: center.lat, longitude: center.lng }, radius: 12000 },
          },
          rankPreference: 'POPULARITY',
          languageCode: 'en',
        }),
      },
      signal,
    ),
  );
  return body.places ?? [];
}
async function departureAtOrigin(trip: Trip, origin: Point, signal: AbortSignal) {
  const approximate = Date.parse(`${trip.departureDate}T${trip.departureTime}:00Z`);
  const zone = z
    .object({
      status: z.string(),
      rawOffset: z.number().optional(),
      dstOffset: z.number().optional(),
    })
    .parse(
      await request(
        `https://maps.googleapis.com/maps/api/timezone/json?${new URLSearchParams({ location: `${origin.lat},${origin.lng}`, timestamp: String(Math.floor(approximate / 1000)), key: key() })}`,
        {},
        signal,
      ),
    );
  if (zone.status !== 'OK' || zone.rawOffset === undefined || zone.dstOffset === undefined)
    throw new ProviderError(
      'Could not resolve the departure time zone. Enable the Google Time Zone API.',
    );
  const d = new Date(approximate - (zone.rawOffset + zone.dstOffset) * 1000);
  if (+d < Date.now())
    throw new ProviderError(
      'Choose a departure time in the future at your starting location.',
      422,
    );
  return d.toISOString();
}
export async function livePlan(trip: Trip): Promise<Plan> {
  key();
  if (!trip.destination)
    throw new ProviderError(
      'A destination is required for an accurate live driving route. Choose demo for an illustrative direction-only exploration.',
      422,
    );
  const signal = AbortSignal.timeout(48000);
  const [origin, dest] = await Promise.all([
    geocode('', signal, `postal_code:${trip.postalCode}|country:${trip.country}`),
    geocode(trip.destination, signal),
  ]);
  const departure = await departureAtOrigin(trip, origin.point, signal);
  const r = await route(origin.point, dest.point, departure, signal);
  const path = samples(r);
  const totalMinutes = seconds(r.duration) / 60,
    targetMinutes = Math.min(trip.driveHours * 60, totalMinutes);
  const target = pointAtTime(path, targetMinutes * 60);
  const warnings = [
    'Google Places provides discovery listings, not room inventory. Dates, guest capacity, budget, official stars and breakfast-inclusive rates are unverified. Contact the provider before booking.',
    'Traffic-adjusted route timing is approximate. Opening at predicted arrival is not confirmed. Scheduled break time excludes detour driving.',
    'Only a bounded selection of nearby places is checked; these are not exhaustive results.',
  ];
  if (targetMinutes < trip.driveHours * 60)
    warnings.push('Your destination is reached before the requested driving duration.');
  const areas = [-1, 0, 1].map((offset) => {
    const minutes = Math.min(totalMinutes, Math.max(0, targetMinutes + offset * trip.stopWindow));
    return { minutes, point: pointAtTime(path, minutes * 60) };
  });
  const [lodgingGroups, candidateTowns] = await Promise.all([
    Promise.all(
      areas.map(async (area) =>
        (await nearby(area.point, ['lodging'], signal, 2)).map((place) => ({
          place,
          minutes: area.minutes,
        })),
      ),
    ),
    Promise.all(
      areas.map(async (area) => {
        try {
          const town = await geocode(`${area.point.lat},${area.point.lng}`, signal);
          return { name: town.label, location: area.point, drivingMinutes: area.minutes };
        } catch {
          return {
            name: `Route area at ${Math.round(area.minutes)} min`,
            location: area.point,
            drivingMinutes: area.minutes,
          };
        }
      }),
    ),
  ]);
  const lodging = [...new Map(lodgingGroups.flat().map((v) => [v.place.id, v])).values()];
  async function detour(p: Point, at: number): Promise<{ minutes: number; path: Point[] } | null> {
    // Compare identical route anchors with and without the candidate waypoint.
    const a = pointAtTime(path, Math.max(0, at - 1200)),
      b = pointAtTime(path, Math.min(seconds(r.duration), at + 1200));
    const when = new Date(+new Date(departure) + a.seconds * 1000).toISOString();
    try {
      const [base, via] = await Promise.all([
        route(a, b, when, signal),
        route(a, b, when, signal, p),
      ]);
      return {
        minutes: Math.max(0, Math.ceil((seconds(via.duration) - seconds(base.duration)) / 60)),
        path: decodePolyline(via.polyline.encodedPolyline),
      };
    } catch {
      return null;
    }
  }
  const rawHotels: Hotel[] = await Promise.all(
    lodging.map(async ({ place: p, minutes }) => {
      const extra = await detour(
        { lat: p.location.latitude, lng: p.location.longitude },
        minutes * 60,
      );
      return {
        id: p.id,
        name: p.displayName?.text ?? 'Hotel',
        address: p.formattedAddress ?? '',
        location: { lat: p.location.latitude, lng: p.location.longitude },
        rating: p.rating ?? null,
        reviews: p.userRatingCount ?? null,
        stars: null,
        nightlyPrice: null,
        taxesIncluded: null,
        breakfast: 'unknown',
        detourMinutes: extra?.minutes ?? null,
        detourPath: extra?.path,
        drivingMinutes: minutes,
        url:
          p.googleMapsUri ??
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.displayName?.text ?? 'Hotel')}&query_place_id=${encodeURIComponent(p.id)}`,
        priceStatus: 'unverified',
        source: 'google',
      };
    }),
  );
  const stopCount = breakCount(targetMinutes, trip.breakEvery);
  // Limit live billable searches to four break locations per plan.
  if (stopCount > 4)
    warnings.push('Live search shows the first four break locations; add later stops manually.');
  const stops: Stop[] = (
    await Promise.all(
      Array.from({ length: Math.min(stopCount, 4) }, async (_, i) => {
        const at = (i + 1) * trip.breakEvery * 3600,
          center = pointAtTime(path, at);
        try {
          const places = await nearby(center, ['bakery', 'cafe', 'rest_stop'], signal, 3);
          const best = places.sort(
            (a, b) =>
              (b.rating ?? 0) * Math.log1p(b.userRatingCount ?? 0) -
              (a.rating ?? 0) * Math.log1p(a.userRatingCount ?? 0),
          )[0];
          if (!best) return null;
          const loc = { lat: best.location.latitude, lng: best.location.longitude };
          const extra = await detour(loc, at);
          if (extra === null || extra.minutes > trip.maxDetour) return null;
          return {
            id: best.id,
            name: best.displayName?.text ?? 'Stop',
            address: best.formattedAddress ?? '',
            location: loc,
            category: best.primaryType ?? 'cafe',
            rating: best.rating ?? null,
            reviews: best.userRatingCount ?? null,
            detourMinutes: extra.minutes,
            arrival: new Date(
              +new Date(departure) + (at + (i * trip.breakMinutes + extra.minutes) * 60) * 1000,
            ).toISOString(),
            hours: best.regularOpeningHours?.weekdayDescriptions ?? [],
            openAtArrival: null,
            url:
              best.googleMapsUri ??
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(best.displayName?.text ?? 'Stop')}&query_place_id=${encodeURIComponent(best.id)}`,
          };
        } catch {
          warnings.push('Some break locations could not be searched.');
          return null;
        }
      }),
    )
  ).filter((p) => p !== null);
  let earlierDetours = 0;
  for (const stop of stops) {
    stop.arrival = new Date(+new Date(stop.arrival) + earlierDetours * 60000).toISOString();
    earlierDetours += stop.detourMinutes ?? 0;
  }
  if (rawHotels.some((h) => h.detourMinutes === null))
    warnings.push('Hotels with an unverified driving detour were excluded.');
  return {
    mode: 'live',
    exploratory: false,
    route: path,
    originLabel: origin.label,
    destinationLabel: dest.label,
    distanceKm: r.distanceMeters / 1000,
    drivingMinutes: totalMinutes,
    breakMinutes: stopCount * trip.breakMinutes,
    target,
    targetMinutes,
    towns: candidateTowns,
    hotels: rankHotels(rawHotels, trip, true),
    stops,
    warnings,
    departure,
    attribution: 'Google Maps · Google Places',
    bookingConnected: false,
  };
}
export async function autocomplete(input: string) {
  key();
  const data = z
    .object({
      suggestions: z
        .array(
          z.object({
            placePrediction: z
              .object({ placeId: z.string(), text: z.object({ text: z.string() }) })
              .optional(),
          }),
        )
        .optional(),
    })
    .parse(
      await request('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key() },
        body: JSON.stringify({ input, languageCode: 'en' }),
      }),
    );
  return (data.suggestions ?? []).flatMap((s) =>
    s.placePrediction
      ? [{ id: s.placePrediction.placeId, label: s.placePrediction.text.text }]
      : [],
  );
}
