'use client';
import { useMemo, useState, useCallback } from 'react';
import Image from 'next/image';
import type { Plan, Trip } from '@/lib/types';
import type { Language, Translation } from '@/lib/i18n';
import { RouteMap } from './route-map';
export function Results({
  plan,
  trip,
  t,
  language,
  onEdit,
}: {
  plan: Plan;
  trip: Trip;
  t: Translation;
  language: Language;
  onEdit: () => void;
}) {
  const [sort, setSort] = useState('recommended'),
    [budget, setBudget] = useState(trip.budget),
    [breakfast, setBreakfast] = useState(trip.breakfast),
    [selected, setSelected] = useState<string | null>(null);
  const onSelect = useCallback((id: string) => setSelected(id), []);
  const hotels = useMemo(() => {
    const filtered = plan.hotels.filter(
      (h) =>
        (h.nightlyPrice === null || h.nightlyPrice <= budget) &&
        (!breakfast || h.breakfast === 'included' || plan.mode === 'live'),
    );
    return [...filtered].sort((a, b) =>
      sort === 'rating'
        ? (b.rating ?? 0) - (a.rating ?? 0)
        : sort === 'price'
          ? (a.nightlyPrice ?? Infinity) - (b.nightlyPrice ?? Infinity)
          : sort === 'detour'
            ? (a.detourMinutes ?? Infinity) - (b.detourMinutes ?? Infinity)
            : 0,
    );
  }, [plan, sort, budget, breakfast]);
  const chosen = hotels.find((h) => h.id === selected);
  const dateFormat = new Intl.DateTimeFormat(
    language === 'fa' ? 'fa-IR' : language === 'de' ? 'de-DE' : 'en-GB',
    { dateStyle: 'medium', timeStyle: 'short' },
  );
  const fmt = (min: number) =>
    `${Math.floor(min / 60)} ${t.hours} ${Math.round(min % 60)} ${t.minutes}`;
  return (
    <section className="results" aria-labelledby="results-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t.traveler}</p>
          <h1 id="results-title" tabIndex={-1}>
            {t.results}
          </h1>
          <p>{t.resultsIntro}</p>
        </div>
        <button className="button secondary" onClick={onEdit}>
          ← {t.restart}
        </button>
      </div>
      <div className={`notice ${plan.mode === 'live' ? 'live-notice' : ''}`}>
        <strong>{plan.mode === 'demo' ? t.sample : t.unverified}</strong>
        <span>{plan.mode === 'demo' ? t.demoNotice : t.liveNotice}</span>
      </div>
      {plan.exploratory && <p className="exploratory">{t.exploratory}</p>}
      <div className="results-grid">
        <aside className="route-panel">
          <div className="panel-top">
            <h2>{t.route}</h2>
            <span className="pill">{plan.mode === 'demo' ? t.demo : t.live}</span>
          </div>
          <RouteMap plan={{ ...plan, hotels }} selected={selected} onSelect={onSelect} t={t} />
          <div className="route-addresses">
            <p>
              <span className="route-dot">A</span>
              {plan.originLabel}
            </p>
            <div className="route-dash" />
            <p>
              <span className="route-dot end">B</span>
              {plan.destinationLabel}
            </p>
          </div>
          <dl className="stats">
            <div>
              <dt>{t.distance}</dt>
              <dd>{Math.round(plan.distanceKm)} km</dd>
            </div>
            <div>
              <dt>{t.driving}</dt>
              <dd>{fmt(plan.drivingMinutes)}</dd>
            </div>
            <div>
              <dt>{t.target}</dt>
              <dd>{fmt(plan.targetMinutes)}</dd>
            </div>
            <div>
              <dt>{t.breaks}</dt>
              <dd>
                {plan.breakMinutes} {t.minutes}
              </dd>
            </div>
          </dl>
          <p className="muted small">{t.traffic}</p>
          <h3>{t.towns}</h3>
          <ul className="town-list">
            {plan.towns.map((town, i) => (
              <li key={i}>
                <span>{town.name}</span>
                <small>{fmt(town.drivingMinutes)}</small>
              </li>
            ))}
          </ul>
          {chosen && (
            <div className="selection-summary" role="status">
              <strong>{chosen.name}</strong>
              <p>
                {t.routeImpact}:{' '}
                {fmt((chosen.drivingMinutes ?? plan.targetMinutes) + (chosen.detourMinutes ?? 0))}
              </p>
              <p>
                {t.breaks}: {plan.breakMinutes} {t.minutes}
              </p>
            </div>
          )}
        </aside>
        <div className="recommendations">
          <div className="list-heading">
            <h2>
              {t.hotels} <span className="count">{hotels.length}</span>
            </h2>
            <label className="sort-label">
              {t.sort}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recommended">{t.recommended}</option>
                <option value="rating">{t.topRated}</option>
                <option value="price">{t.priceLow}</option>
                <option value="detour">{t.detourLow}</option>
              </select>
            </label>
          </div>
          <details className="filters" open>
            <summary>{t.filter}</summary>
            <div className="filter-fields">
              <label>
                {t.maxPrice}
                <input
                  type="number"
                  min={30}
                  max={3000}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  disabled={plan.mode === 'live'}
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={breakfast}
                  onChange={(e) => setBreakfast(e.target.checked)}
                  disabled={plan.mode === 'live'}
                />
                {t.onlyBreakfast}
              </label>
            </div>
            {plan.mode === 'live' && <p className="small">{t.liveFilters}</p>}
          </details>
          {!hotels.length && (
            <div className="empty">
              <span aria-hidden="true">⌂</span>
              <h3>{t.noHotels}</h3>
              <p>{t.noHotelsHint}</p>
              <button className="button secondary" onClick={onEdit}>
                {t.restart}
              </button>
            </div>
          )}
          <div className="hotel-list">
            {hotels.map((h, i) => (
              <article
                key={h.id}
                className={`hotel-card ${chosen?.id === h.id ? 'is-selected' : ''}`}
              >
                <div className="hotel-art">
                  {plan.mode === 'demo' ? (
                    <Image src="/stay.svg" alt="" width={600} height={400} />
                  ) : (
                    <div className="live-art" aria-hidden="true">
                      ⌂
                    </div>
                  )}
                  <span className="image-badge">
                    {plan.mode === 'demo' ? t.sample : t.unverified}
                  </span>
                  <span className="hotel-number">{i + 1}</span>
                </div>
                <div className="hotel-content">
                  <div className="hotel-title">
                    <div>
                      <h3>{h.name}</h3>
                      <p className="address">{h.address}</p>
                    </div>
                    {h.rating !== null && (
                      <div className="rating">
                        <strong>{h.rating.toFixed(1)}</strong>
                        <span>{t.guestRating}</span>
                        <small>
                          {h.reviews ?? t.unknown} {t.reviews}
                        </small>
                      </div>
                    )}
                  </div>
                  {h.stars !== null && (
                    <p className="stars">
                      <span aria-hidden="true">{'★'.repeat(h.stars)}</span> {h.stars}{' '}
                      {t.officialStars}
                    </p>
                  )}
                  <div className="hotel-facts">
                    <span>
                      ◷ {h.detourMinutes ?? '—'} {t.minutes} {t.extra}
                    </span>
                    <span>
                      ☕{' '}
                      {h.breakfast === 'included'
                        ? t.breakfastIncluded
                        : h.breakfast === 'available'
                          ? t.breakfastAvailable
                          : t.breakfastUnknown}
                    </span>
                  </div>
                  <div className="hotel-bottom">
                    <div>
                      {h.nightlyPrice !== null ? (
                        <>
                          <p className="price">
                            €{h.nightlyPrice} <span>{t.perNight}</span>
                          </p>
                          <small>{h.taxesIncluded ? t.taxes : t.unknown}</small>
                        </>
                      ) : (
                        <p className="unverified-price">{t.noRate}</p>
                      )}
                    </div>
                    <button
                      className={`button ${chosen?.id === h.id ? 'secondary' : ''}`}
                      aria-pressed={chosen?.id === h.id}
                      onClick={() => setSelected(h.id)}
                    >
                      {chosen?.id === h.id ? '✓ ' : ''}
                      {chosen?.id === h.id ? t.selected : t.select}
                    </button>
                  </div>
                  {h.url ? (
                    <a className="text-link" href={h.url} target="_blank" rel="noopener noreferrer">
                      {t.provider} ↗
                    </a>
                  ) : (
                    <p className="muted small">{t.demoLink}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
          <section className="stops-section">
            <p className="eyebrow">{t.feature2}</p>
            <h2>{t.stops}</h2>
            <p className="muted small">{t.demoTimezone}</p>
            {!plan.stops.length ? (
              <p className="empty">{t.noStops}</p>
            ) : (
              <div className="stop-list">
                {plan.stops.map((s) => (
                  <article key={s.id} className="stop-card">
                    <span className="coffee-icon" aria-hidden="true">
                      ☕
                    </span>
                    <div>
                      <span className="small muted">
                        {plan.mode === 'demo' ? t.sample : s.category.replaceAll('_', ' ')}
                      </span>
                      <h3>{s.name}</h3>
                      <p className="small">{s.address}</p>
                      <p className="small">
                        {t.guestRating}: {s.rating ?? t.unknown} · {s.reviews ?? t.unknown}{' '}
                        {t.reviews}
                      </p>
                      <p className="small">
                        {t.arrival}: {dateFormat.format(new Date(s.arrival))} · +
                        {s.detourMinutes ?? '—'} {t.minutes}
                      </p>
                      <details>
                        <summary>{s.hours.length ? t.data : t.hoursUnknown}</summary>
                        <ul>
                          {s.hours.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </details>
                      <p className="small muted">{t.openUnknown}</p>
                      {s.url && (
                        <a
                          className="text-link"
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t.navigation} ↗
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      <details className="data-notes">
        <summary>{t.data}</summary>
        <p>
          {t.source}: {plan.attribution}
        </p>
        <ul>
          {plan.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </details>
      <p className="privacy">{t.privacy}</p>
    </section>
  );
}
