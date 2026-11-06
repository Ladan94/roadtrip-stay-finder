'use client';
import { useEffect, useRef, useState } from 'react';
import type { Hotel, Plan } from '@/lib/types';
import type { Translation } from '@/lib/i18n';
let googleLoader: Promise<void> | undefined;
function loadGoogle(key: string) {
  if (!googleLoader)
    googleLoader = new Promise<void>((resolve, reject) => {
      if (window.google?.maps) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=quarterly`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        googleLoader = undefined;
        reject(new Error('Map failed'));
      };
      document.head.appendChild(script);
    });
  return googleLoader;
}
export function RouteMap({
  plan,
  selected,
  onSelect,
  t,
}: {
  plan: Plan;
  selected: string | null;
  onSelect: (id: string) => void;
  t: Translation;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
    if (plan.mode !== 'live' || !key || !ref.current) return;
    let disposed = false;
    let map: google.maps.Map;
    const markers: google.maps.Marker[] = [];
    let line: google.maps.Polyline;
    let detourLine: google.maps.Polyline | undefined;
    loadGoogle(key)
      .then(() => {
        if (disposed || !ref.current) return;
        map = new google.maps.Map(ref.current, {
          center: plan.target,
          zoom: 8,
          mapTypeControl: false,
          streetViewControl: false,
        });
        const bounds = new google.maps.LatLngBounds();
        plan.route.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 32);
        line = new google.maps.Polyline({
          path: plan.route,
          map,
          strokeColor: '#476f58',
          strokeWeight: 5,
        });
        function marker(p: google.maps.LatLngLiteral, title: string, label: string, id?: string) {
          const m = new google.maps.Marker({ position: p, map, title, label });
          if (id) m.addListener('click', () => onSelect(id));
          markers.push(m);
        }
        marker(plan.route[0], plan.originLabel, 'A');
        marker(plan.route[plan.route.length - 1], plan.destinationLabel, 'B');
        plan.hotels.forEach((h, i) =>
          marker(h.location, h.name, h.id === selected ? '✓' : String(i + 1), h.id),
        );
        plan.stops.forEach((s) => marker(s.location, s.name, '☕'));
        const chosen = plan.hotels.find((h) => h.id === selected);
        if (chosen?.detourPath) {
          detourLine = new google.maps.Polyline({
            path: chosen.detourPath,
            map,
            strokeColor: '#ac5737',
            strokeWeight: 6,
          });
        }
      })
      .catch(() => {
        if (!disposed) setError(true);
      });
    return () => {
      disposed = true;
      markers.forEach((m) => m.setMap(null));
      line?.setMap(null);
      detourLine?.setMap(null);
    };
  }, [plan, selected, onSelect]);
  if (plan.mode === 'live')
    return (
      <div className="map-wrap">
        <div ref={ref} role="region" aria-label={t.map} className="live-map" />
        {(!process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || error) && (
          <p className="map-message" role="status">
            {error ? t.mapError : t.mapKey}
          </p>
        )}
        <p className="map-caption">{plan.attribution}</p>
      </div>
    );
  const project = (p: { lat: number; lng: number }) => ({
    x: 65 + (p.lng - 10.4) * 120,
    y: 55 + (52.8 - p.lat) * 70,
  });
  const route = plan.route
    .map((p) => {
      const v = project(p);
      return `${v.x},${v.y}`;
    })
    .join(' ');
  const hotelPoint = (h: Hotel, i: number) => {
    const p = project(h.location);
    return { x: p.x + (i % 2 ? 28 : -28), y: p.y + (i - 2) * 16 };
  };
  return (
    <div className="map-wrap demo-map" role="region" aria-label={t.map}>
      <svg viewBox="0 0 500 430" role="group" aria-label={t.mapDemo}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#b7c8b7" strokeWidth=".5" />
          </pattern>
        </defs>
        <rect width="500" height="430" fill="#e8eddf" />
        <rect width="500" height="430" fill="url(#grid)" />
        <g transform={`translate(${250 - 250 * zoom} ${215 - 215 * zoom}) scale(${zoom})`}>
          <path
            d="M0 80Q150 130 180 50T500 60M0 330Q180 210 270 310T500 300"
            fill="none"
            stroke="#d1ddc8"
            strokeWidth="40"
          />
          <path d="M420 0Q310 110 420 230T350 430" fill="none" stroke="#b4d3d5" strokeWidth="9" />
          <polyline
            points={route}
            fill="none"
            stroke="#fff"
            strokeWidth="12"
            strokeLinejoin="round"
          />
          <polyline
            points={route}
            fill="none"
            stroke="#3d6551"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {plan.route
            .filter((_, i) => i === 0 || i === plan.route.length - 1)
            .map((p, i) => {
              const q = project(p);
              return (
                <g key={i}>
                  <circle cx={q.x} cy={q.y} r="8" fill="#315642" stroke="white" strokeWidth="3" />
                  <text x={q.x + 14} y={q.y + 5} fill="#304435" fontSize="14" fontWeight="600">
                    {i === 0 ? 'Berlin' : 'Munich'}
                  </text>
                </g>
              );
            })}
          {plan.stops.map((s) => {
            const p = project(s.location);
            return (
              <g key={s.id}>
                <circle
                  cx={p.x - 20}
                  cy={p.y}
                  r="13"
                  fill="#e0b886"
                  stroke="white"
                  strokeWidth="2"
                />
                <text x={p.x - 27} y={p.y + 5} fontSize="14">
                  ☕
                </text>
              </g>
            );
          })}
          {plan.hotels.map((h, i) => {
            const p = hotelPoint(h, i);
            return (
              <g
                key={h.id}
                role="button"
                tabIndex={0}
                aria-label={`${t.select}: ${h.name}`}
                onClick={() => onSelect(h.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(h.id);
                  }
                }}
                className="map-pin"
              >
                <title>{h.name}</title>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={selected === h.id ? 17 : 14}
                  fill={selected === h.id ? '#ac5737' : '#315642'}
                  stroke="white"
                  strokeWidth="3"
                />
                <text x={p.x} y={p.y + 5} textAnchor="middle" fill="white" fontSize="13">
                  {i + 1}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-controls">
        <button
          type="button"
          aria-label={t.zoomIn}
          onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
        >
          +
        </button>
        <button
          type="button"
          aria-label={t.zoomOut}
          onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
        >
          −
        </button>
        <button type="button" aria-label={t.resetMap} onClick={() => setZoom(1)}>
          ↺
        </button>
      </div>
      <p className="map-caption">{t.mapDemo}</p>
    </div>
  );
}
