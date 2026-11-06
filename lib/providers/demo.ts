import type { Hotel, Plan, RouteSample, Trip } from '../types';
import { breakCount, pointAtTime, rankHotels } from '../planning';
// Entirely fictional fixtures. Not representations of real businesses or current rates.
export function demoPlan(trip: Trip): Plan {
  const points = [
    [52.52, 13.405],
    [52.1, 12.7],
    [51.5, 12.0],
    [50.96, 11.6],
    [50.3, 11.0],
    [49.55, 11.0],
    [48.8, 11.45],
    [48.137, 11.576],
  ];
  const route: RouteSample[] = points.map(([lat, lng], i) => ({
    lat,
    lng,
    seconds: i * 2880,
    meters: i * 82000,
  }));
  const targetMinutes = Math.min(trip.driveHours * 60, 336);
  const target = pointAtTime(route, targetMinutes * 60);
  const names = [
    'Linden House',
    'The Orchard Inn',
    'Atelier Stay',
    'Riverside Rooms',
    'The Little Posthouse',
    'Forest & Field',
  ];
  const hotels: Hotel[] = names.map((name, i) => ({
    id: `demo-hotel-${i}`,
    name: `${name} · Sample`,
    address: 'Fictional address · illustrative Germany corridor',
    location: { lat: target.lat + (i - 2) * 0.035, lng: target.lng + (i % 2 ? 0.055 : -0.045) },
    rating: [4.8, 4.6, 4.7, 4.3, 4.5, 4.9][i],
    reviews: [428, 216, 691, 108, 340, 82][i],
    stars: [4, 3, 4, 3, null, 5][i],
    nightlyPrice: [139, 98, 174, 82, 119, 239][i],
    taxesIncluded: true,
    breakfast: i === 3 ? 'available' : 'included',
    drivingMinutes: targetMinutes,
    detourMinutes: [6, 9, 12, 5, 17, 21][i],
    url: '',
    priceStatus: 'sample',
    source: 'demo',
  }));
  const departure = `${trip.departureDate}T${trip.departureTime}:00+01:00`;
  return {
    mode: 'demo',
    exploratory: !trip.destination,
    route,
    originLabel: 'Berlin · sample origin',
    destinationLabel: 'Munich · sample destination',
    distanceKm: 574,
    drivingMinutes: 336,
    breakMinutes: breakCount(targetMinutes, trip.breakEvery) * trip.breakMinutes,
    target,
    targetMinutes,
    departure,
    attribution: 'Fictional sample data · schematic route, not for navigation',
    bookingConnected: false,
    towns: [-1, 0, 1].map((n, i) => ({
      name: ['North valley · sample', 'Old town · sample', 'Southern hills · sample'][i],
      location: pointAtTime(route, (targetMinutes + n * trip.stopWindow) * 60),
      drivingMinutes: Math.min(336, Math.max(0, targetMinutes + n * trip.stopWindow)),
    })),
    hotels: rankHotels(hotels, trip),
    stops: Array.from({ length: breakCount(targetMinutes, trip.breakEvery) }, (_, i) => {
      const minute = (i + 1) * trip.breakEvery * 60;
      return {
        id: `demo-stop-${i}`,
        name: [
          'Butter & Crumb · Sample',
          'The Coffee Garden · Sample',
          'Little Bread Stop · Sample',
          'Oak Rest Area · Sample',
          'Corner Café · Sample',
        ][i % 5],
        category: i % 2 ? 'Café' : 'Bakery',
        address: 'Fictional stop · sample corridor',
        location: pointAtTime(route, minute * 60),
        rating: 4.7,
        reviews: 156,
        detourMinutes: 4,
        arrival: new Date(
          +new Date(departure) + (minute + i * trip.breakMinutes) * 60000,
        ).toISOString(),
        hours: ['Sample opening hours 07:00–18:00; not verified'],
        openAtArrival: null,
        url: '',
      };
    }),
    warnings: [
      'Demo: every business, price, rating and opening-hour entry is fictional. The Berlin–Munich sample does not change with your entered addresses.',
      'Sample arrival times use UTC+01:00. Live planning asks Google to resolve the origin time zone.',
      ...(trip.driveHours * 60 > 336
        ? ['The sample destination is reached before your chosen driving duration.']
        : []),
    ],
  };
}
