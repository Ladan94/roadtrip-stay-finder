'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePreference } from '@/lib/preferences';
import { messages, type Language } from '@/lib/i18n';
import type { Plan, Trip } from '@/lib/types';
import { Results } from './results';
const countries: Record<string, string> = {
  DE: 'Deutschland',
  FR: 'France',
  IT: 'Italia',
  ES: 'España',
  AT: 'Österreich',
  CH: 'Schweiz / Suisse',
  BE: 'België / Belgique',
  NL: 'Nederland',
  PL: 'Polska',
  GB: 'United Kingdom',
  CZ: 'Česko',
  DK: 'Danmark',
  SE: 'Sverige',
  NO: 'Norge',
  PT: 'Portugal',
};
function initialTrip(): Trip {
  const today = new Date();
  today.setDate(today.getDate() + 1);
  const tomorrow = today.toISOString().slice(0, 10);
  today.setDate(today.getDate() + 1);
  return {
    mode: 'demo',
    postalCode: '10115',
    country: 'DE',
    destination: 'Munich, Germany',
    direction: 'south',
    driveHours: 4,
    departureDate: tomorrow,
    departureTime: '09:00',
    checkIn: tomorrow,
    checkOut: today.toISOString().slice(0, 10),
    adults: 2,
    children: 0,
    budget: 180,
    breakfast: true,
    minStars: 0,
    minRating: 4,
    maxDetour: 20,
    stopWindow: 30,
    breakEvery: 2,
    breakMinutes: 20,
  };
}
export function Planner() {
  const [savedLanguage, setLanguage] = usePreference('roadtrip-language', 'en'),
    [theme, setTheme] = usePreference('roadtrip-theme', 'light');
  const language: Language =
      savedLanguage === 'de' || savedLanguage === 'fa' ? savedLanguage : 'en',
    dark = theme === 'dark';
  const [trip, setTrip] = useState<Trip>(initialTrip),
    [step, setStep] = useState(0),
    [plan, setPlan] = useState<Plan | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; label: string }[]>([]),
    [suggestError, setSuggestError] = useState(false);
  const form = useRef<HTMLFormElement>(null),
    errorRef = useRef<HTMLDivElement>(null),
    searchSequence = useRef(0);
  const t = messages[language];
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
  }, [language]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  useEffect(() => {
    if (trip.mode !== 'live' || trip.destination.length < 3) return;
    const controller = new AbortController(),
      sequence = ++searchSequence.current;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: trip.destination, country: trip.country }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (sequence === searchSequence.current) {
          setSuggestions(response.ok ? data.suggestions : []);
          setSuggestError(!response.ok);
        }
      } catch {
        if (!controller.signal.aborted) setSuggestError(true);
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trip.destination, trip.mode, trip.country]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  const update = <K extends keyof Trip>(key: K, value: Trip[K]) => {
    setTrip((v) => ({ ...v, [key]: value }));
    setError('');
    if (key === 'destination' || key === 'mode') {
      setSuggestions([]);
      setSuggestError(false);
    }
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    if (trip.checkOut <= trip.checkIn) {
      setError(
        language === 'fa'
          ? 'تاریخ خروج باید بعد از ورود باشد.'
          : language === 'de'
            ? 'Abreise muss nach der Anreise liegen.'
            : 'Check-out must be after check-in.',
      );
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trip),
        signal: AbortSignal.timeout(58000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to plan trip');
      setPlan(data);
      setTimeout(() => document.getElementById('results-title')?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to plan trip');
    } finally {
      setLoading(false);
    }
  }
  const number = (key: keyof Trip, label: string, min: number, max: number, increment = 1) => (
    <label>
      {label}
      <input
        name={key}
        type="number"
        min={min}
        max={max}
        step={increment}
        required
        value={String(trip[key])}
        onChange={(e) => update(key, Number(e.target.value) as never)}
      />
    </label>
  );
  const date = (key: 'departureDate' | 'checkIn' | 'checkOut', label: string) => (
    <label>
      {label}
      <input
        name={key}
        type="date"
        required
        value={trip[key]}
        min={key === 'checkOut' ? trip.checkIn : undefined}
        onChange={(e) => update(key, e.target.value)}
      />
    </label>
  );
  return (
    <>
      <a className="skip-link" href="#planner">
        {t.skip}
      </a>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="RoadTrip Stay Finder">
          <span className="brand-mark" aria-hidden="true">
            ↟
          </span>
          <span>
            <strong>
              {t.brand}
              <span className="brand-period">.</span>
            </strong>
            <small>{t.tagline}</small>
          </span>
        </Link>
        <span className="header-note">{t.nav}</span>
        <div className="header-actions">
          <label className="language-select">
            <span className="sr-only">{t.language}</span>
            <select
              aria-label={t.language}
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              <option value="en">EN · English</option>
              <option value="de">DE · Deutsch</option>
              <option value="fa">FA · فارسی</option>
            </select>
          </label>
          <button
            className="theme-toggle"
            aria-label={t.theme}
            onClick={() => setTheme(dark ? 'light' : 'dark')}
          >
            {dark ? '☀' : '☾'}
          </button>
        </div>
      </header>
      <main id="planner">
        {plan ? (
          <Results
            plan={plan}
            trip={trip}
            t={t}
            language={language}
            onEdit={() => {
              setPlan(null);
              setStep(0);
            }}
          />
        ) : (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">
                  <span /> {t.eyebrow}
                </p>
                <h1>
                  {t.title}
                  <br />
                  <em>{t.titleAccent}</em>
                </h1>
                <p className="hero-description">{t.intro}</p>
                <div className="hero-features">
                  <span>⌂ {t.feature1}</span>
                  <span>☕ {t.feature2}</span>
                  <span>↝ {t.feature3}</span>
                </div>
              </div>
              <div className="hero-visual">
                <Image src="/journey.svg" alt="" width={650} height={700} priority />
                <div className="floating-note">
                  <span aria-hidden="true">✦</span>
                  <div>
                    <strong>{t.traveler}</strong>
                    <small>EUROPE · ROADTRIP</small>
                  </div>
                </div>
              </div>
            </section>
            <section className="planner-card" aria-label={t.stepRoute}>
              <div className="planner-top">
                <ol className="steps">
                  {[t.stepRoute, t.stepTime, t.stepStay].map((label, i) => (
                    <li key={i} aria-current={i === step ? 'step' : undefined}>
                      <span className={i <= step ? 'active' : ''}>{i < step ? '✓' : i + 1}</span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ol>
                <div className="mode-switch" role="group" aria-label="Data mode">
                  <button
                    type="button"
                    aria-pressed={trip.mode === 'demo'}
                    onClick={() => update('mode', 'demo')}
                  >
                    {t.demo}
                  </button>
                  <button
                    type="button"
                    aria-pressed={trip.mode === 'live'}
                    onClick={() => update('mode', 'live')}
                  >
                    {t.live}
                  </button>
                </div>
              </div>
              <p className="mode-notice">
                <span className="status-dot" />
                {trip.mode === 'demo' ? t.demoNotice : t.liveNotice}
              </p>
              {loading ? (
                <div className="loading" role="status">
                  <div className="loading-orbit" aria-hidden="true">
                    ↝
                  </div>
                  <h2>{t.loading}</h2>
                  <p>{t.loadingHint}</p>
                  <div className="skeleton-row" aria-hidden="true">
                    <div />
                    <div />
                    <div />
                  </div>
                </div>
              ) : (
                <form ref={form} onSubmit={submit}>
                  <h2 className="form-title">{[t.stepRoute, t.stepTime, t.stepStay][step]}</h2>
                  <div className="form-grid">
                    {step === 0 && (
                      <>
                        <label>
                          {t.from}
                          <input
                            name="postalCode"
                            autoComplete="postal-code"
                            maxLength={12}
                            required
                            value={trip.postalCode}
                            onChange={(e) => update('postalCode', e.target.value)}
                          />
                        </label>
                        <label>
                          {t.country}
                          <select
                            name="country"
                            value={trip.country}
                            onChange={(e) => update('country', e.target.value)}
                          >
                            {Object.entries(countries).map(([code, name]) => (
                              <option key={code} value={code}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="destination-field full">
                          <label>
                            {t.destination}
                            <input
                              name="destination"
                              autoComplete="off"
                              value={trip.destination}
                              maxLength={200}
                              aria-describedby="destination-hint"
                              onChange={(e) => update('destination', e.target.value)}
                            />
                          </label>
                          <p id="destination-hint" className="field-hint">
                            {t.destinationHint}
                          </p>
                          {suggestions.length > 0 && (
                            <ul className="suggestions" aria-label={t.destination}>
                              {suggestions.map((s) => (
                                <li key={s.id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      update('destination', s.label);
                                      setSuggestions([]);
                                    }}
                                  >
                                    {s.label}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          {suggestError && trip.mode === 'live' && (
                            <p className="field-hint">{t.suggestionError}</p>
                          )}
                        </div>
                        {!trip.destination && (
                          <label>
                            {t.direction}
                            <select
                              value={trip.direction}
                              onChange={(e) =>
                                update('direction', e.target.value as Trip['direction'])
                              }
                            >
                              {(['north', 'south', 'east', 'west'] as const).map((d) => (
                                <option key={d} value={d}>
                                  {t[d]}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        {number('driveHours', t.driveHours, 0.5, 12, 0.5)}
                      </>
                    )}
                    {step === 1 && (
                      <>
                        {date('departureDate', t.departureDate)}
                        <label>
                          {t.departureTime}
                          <input
                            type="time"
                            name="departureTime"
                            required
                            value={trip.departureTime}
                            onChange={(e) => update('departureTime', e.target.value)}
                          />
                        </label>
                        {date('checkIn', t.checkIn)}
                        {date('checkOut', t.checkOut)}
                        {number('breakEvery', t.breakEvery, 1, 4, 0.5)}
                        {number('breakMinutes', t.breakMinutes, 5, 90, 5)}
                        {number('stopWindow', t.window, 10, 90, 5)}
                      </>
                    )}
                    {step === 2 && (
                      <>
                        {number('adults', t.adults, 1, 8)}
                        {number('children', t.children, 0, 6)}
                        {number('budget', t.budget, 30, 3000)}
                        {number('maxDetour', t.detour, 5, 60)}
                        <label>
                          {t.stars}
                          <select
                            value={trip.minStars}
                            onChange={(e) => update('minStars', Number(e.target.value))}
                          >
                            <option value={0}>{t.any}</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                {n} ★
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {t.rating}
                          <select
                            value={trip.minRating}
                            onChange={(e) => update('minRating', Number(e.target.value))}
                          >
                            <option value={0}>{t.any}</option>
                            {[3, 3.5, 4, 4.5].map((n) => (
                              <option key={n} value={n}>
                                {n} / 5
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="checkbox-label full">
                          <input
                            type="checkbox"
                            checked={trip.breakfast}
                            onChange={(e) => update('breakfast', e.target.checked)}
                          />
                          {t.breakfast}
                        </label>
                        {trip.mode === 'live' && <p className="full field-hint">{t.liveFilters}</p>}
                      </>
                    )}
                  </div>
                  {error && (
                    <div
                      className="error-box"
                      role="alert"
                      aria-label={t.errorTitle}
                      tabIndex={-1}
                      ref={errorRef}
                    >
                      <strong>{t.errorTitle}</strong>
                      <p>{error}</p>
                    </div>
                  )}
                  <div className="form-footer">
                    <span className="small muted">{step + 1} / 3</span>
                    <div>
                      {step > 0 && (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => {
                            setStep(step - 1);
                            setError('');
                          }}
                        >
                          {t.back}
                        </button>
                      )}
                      <button type="submit" className="button">
                        {step === 2 ? t.find : t.next} <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </section>
            <p className="privacy">{t.privacy}</p>
          </>
        )}
      </main>
      <footer className="site-footer">
        <Link href="/" className="footer-brand">
          RoadTrip.
        </Link>
        <span>{t.footer}</span>
        <a
          href="https://github.com/Ladan94/roadtrip-stay-finder"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub ↗
        </a>
      </footer>
    </>
  );
}
