import type { Hotel, Point, RouteSample, Trip } from './types';
export function pointAtTime(route: RouteSample[], seconds: number): RouteSample {
  if (!route.length) throw new Error('Route has no samples');
  if (seconds <= 0) return route[0];
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1],
      b = route[i];
    if (b.seconds >= seconds) {
      const f = b.seconds === a.seconds ? 0 : (seconds - a.seconds) / (b.seconds - a.seconds);
      return {
        lat: a.lat + (b.lat - a.lat) * f,
        lng: a.lng + (b.lng - a.lng) * f,
        seconds,
        meters: a.meters + (b.meters - a.meters) * f,
      };
    }
  }
  return route[route.length - 1];
}
export function distance(a: Point, b: Point) {
  const rad = Math.PI / 180,
    dlat = (b.lat - a.lat) * rad,
    dlng = (b.lng - a.lng) * rad;
  return (
    6371000 *
    2 *
    Math.atan2(
      Math.sqrt(
        Math.sin(dlat / 2) ** 2 +
          Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dlng / 2) ** 2,
      ),
      Math.sqrt(
        1 -
          (Math.sin(dlat / 2) ** 2 +
            Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dlng / 2) ** 2),
      ),
    )
  );
}
export function rankHotels(hotels: Hotel[], trip: Trip, allowUnknown = false): Hotel[] {
  return hotels
    .filter(
      (h) =>
        (h.nightlyPrice === null ? allowUnknown : h.nightlyPrice <= trip.budget) &&
        (!trip.breakfast ||
          h.breakfast === 'included' ||
          (allowUnknown && h.breakfast === 'unknown')) &&
        (!trip.minStars || (h.stars !== null && h.stars >= trip.minStars)) &&
        (!trip.minRating || (h.rating !== null && h.rating >= trip.minRating)) &&
        h.detourMinutes !== null &&
        h.detourMinutes <= trip.maxDetour,
    )
    .map((h) => ({
      ...h,
      score:
        (h.rating ?? 0) * 12 +
        Math.log1p(h.reviews ?? 0) * 2 +
        (h.breakfast === 'included' ? 8 : 0) -
        (h.detourMinutes ?? 60) +
        (h.nightlyPrice === null ? 0 : 10 * (1 - h.nightlyPrice / trip.budget)),
    }))
    .sort((a, b) => b.score - a.score);
}
export function breakCount(drivingMinutes: number, everyHours: number) {
  return Math.max(0, Math.ceil(drivingMinutes / (everyHours * 60)) - 1);
}
export function decodePolyline(encoded: string): Point[] {
  const points: Point[] = [];
  let index = 0,
    lat = 0,
    lng = 0;
  const read = () => {
    let shift = 0,
      result = 0,
      b: number;
    do {
      if (index >= encoded.length || shift > 30) throw new Error('Invalid route geometry');
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 31) << shift;
      shift += 5;
    } while (b >= 32);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += read();
    lng += read();
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}
