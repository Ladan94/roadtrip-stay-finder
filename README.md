# RoadTrip Stay Finder

A thoughtful European road-trip planner built with Next.js, React, strict TypeScript and Tailwind CSS. Plan your driving rhythm, choose an overnight area, compare stays, and discover coffee and bakery breaks. English, German and Persian (RTL), with persistent language and light/dark preferences.

**Status:** fully usable fictional demo; Google live discovery integration implemented and tested with mocked provider contracts. Real Google responses, live room inventory and public deployment require external access and have not been verified. This is not a reservation service.

## Run locally

Requires Node.js 24 LTS and npm. Use the existing checkout; a separate Git worktree is unnecessary.

```sh
npm ci
npm run dev
```

Open the development server on port 3000. No credentials or `.env` file are needed for demo mode. To run a production build:

```sh
npm run build
npm start
```

Webpack is explicitly selected because Turbopack worker sockets are unsupported in some cloud sandboxes. Both are supported Next.js build options.

## What you can do

- Three-step wizard: origin postal code and country, optional destination, departure time, driving duration, dates, party size, total nightly EUR budget, breakfast, official star category, guest score, maximum detour, overnight window and break rhythm.
- Sample route, selectable hotel markers, hotel ranking, price and breakfast refinement, guest-score sorting, empty states and route impact summaries.
- Traffic-aware Google driving routes, time-based position estimation, three candidate overnight areas, driving detour comparisons, and nearby lodging/café/bakery/rest-stop discovery.
- Keyboard-accessible controls, responsive layouts and localized interfaces. Location/business names, Google opening hours, detailed provider diagnostics and data limitations may remain in the provider's English. Automated axe checks supplement, rather than certify, accessibility.

## Demo versus live discovery

| Capability                     | Demo                                       | Live Google discovery                                          |
| ------------------------------ | ------------------------------------------ | -------------------------------------------------------------- |
| Route                          | Fixed illustrative Berlin–Munich corridor  | Actual entered origin and destination                          |
| Businesses, ratings, reviews   | Explicitly fictional                       | Google Places                                                  |
| Nightly EUR price / taxes      | Fictional sample rate                      | Unknown; never invented                                        |
| Breakfast in displayed rate    | Fictional sample status                    | Unknown                                                        |
| Official hotel stars           | Fictional sample category                  | Unknown; distinct from guest rating                            |
| Date / party-size availability | Not real inventory                         | Not verified                                                   |
| Driving detour                 | Illustrative sample                        | Extra driving between common route anchors via candidate       |
| Opening at predicted arrival   | Unconfirmed                                | Unconfirmed; regular opening hours are displayed when supplied |
| Hotel photo                    | Original sample illustration               | Placeholder; no unlicensed photo scraping                      |
| Navigation / booking           | No external links for fictional businesses | Google provider / navigation links; no reservation integration |

Demo input addresses and direction **do not change its sample route**. Without a destination it is explicitly exploratory. Live mode requires a destination and never invents a precise directional route. Demo sample timestamps use UTC+01:00; live departure uses the Google Time Zone API at the origin. Arrival times display in the device time zone.

Unknown live prices and breakfast remain visible as **discovery only**, with a prominent explanation that budget, dates, capacity and breakfast requirements are not verified. An official-star filter excludes unknown classifications, potentially leaving no live results. The app never presents Google listings as available rooms. Refine controls narrow the current result set; edit the trip to broaden the initial search.

## Google Maps setup (optional, paid)

Create a billing-enabled Google Cloud project, review Google Maps Platform terms and quotas, and enable:

- Geocoding API
- Routes API
- Places API (New), including autocomplete and nearby search
- Time Zone API
- Maps JavaScript API (browser map)

Copy `.env.example` to `.env.local` and enter keys privately. Never commit that file.

- `GOOGLE_MAPS_SERVER_KEY`: server-only key restricted to the first four APIs. Apply suitable server restrictions for your hosting/network model. Do not use `NEXT_PUBLIC_` for this key.
- `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`: deliberately public key, restricted to Maps JavaScript API and your exact deployment HTTP referrers. Include your development referrer when needed.

Google data is fetched server-side with TLS verification, timeouts and `cache: no-store`. No cross-request provider content cache is used. Browser maps retain Google's attribution. Provider links remain visible on every live hotel and stop. Consult Google terms before adding caching or persistence. No scraping.

Live search checks two lodging candidates in each of three overnight areas (deduplicated), plus up to four break locations. Detour calls are bounded. Small search areas and provider ranking mean results are not exhaustive. Route timing distributes the traffic-aware duration over timed route steps; this is an estimate, not an exact prediction. Break schedules and detours are displayed separately. Regular hours alone cannot confirm opening on a future arrival date or a holiday.

### Live production rate limiting

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for a shared Redis rate limiter before enabling live searches on Vercel production. Live production requests and autocomplete fail closed without this configuration. Local development and demo use per-process minute buckets. Production must trust the hosting platform's forwarded IP headers; configure equivalent trusted-proxy handling before deploying elsewhere. Set Google Cloud billing caps, quotas and abuse monitoring as additional safeguards. Rate limiting is not a complete anti-abuse system.

### Booking.com Demand API

The booking adapter explicitly reports disconnected. Merely adding a token does **not** enable it. Demand access requires approved partner authorization, an affiliate ID, contract-specific request/response mapping, cancellation/fee and breakfast semantics, occupancy including child ages, and sandbox validation. No approved access was supplied. Credentials are documented as placeholders for that future integration; they are not sent anywhere by this app. Do not scrape Booking.com. Until an authorized booking integration is implemented and tested, rates, dates, occupancy, official stars and breakfast inclusion remain unverified in live discovery.

## Architecture

```text
app/                      Next.js App Router pages and security boundary
  api/plan/route.ts        Validated, rate-limited trip planning endpoint
  api/autocomplete/       Private Google autocomplete proxy
components/               Wizard, recommendation dashboard, interactive maps
lib/validation.ts         Country-specific postal and trip validation
lib/planning.ts           Timed route interpolation, filtering and ranking
lib/providers/demo.ts     Isolated, unmistakably fictional fixtures
lib/providers/google.ts   Geocoding, time zones, Routes and Places adapter
lib/providers/booking.ts  Explicit disconnected booking capability
lib/rate-limit.ts         Redis production limiter / expiring local buckets
lib/i18n.ts               English, German and Persian UI messages
public/                   Original local illustrations (MIT)
tests/                    Unit and API integration tests with provider mocks
e2e/                      Desktop/mobile journeys and automated accessibility
```

No database, user accounts, payments, trip history or server-side trip persistence. The browser retains only language and theme. Live trip inputs are sent to Google. Application handlers do not log request bodies or credentials; review hosting access-log retention and privacy policies before a public launch. Anonymous hashed rate-limit buckets expire after at most two minutes.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
npm run format:check
```

For a managed environment with a preinstalled Chromium, avoid downloading another browser:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Set `CI=true` to run browser tests against `npm start` after a build. GitHub Actions performs lint, strict type checking, unit/API tests, production build and desktop/mobile browser checks. No external API keys are required by tests. Actual live-provider and paid API validation are separate, credential-dependent checks.

## Deploy on Vercel

1. Import `Ladan94/roadtrip-stay-finder` from GitHub in Vercel, with the repository root as the project root.
2. Choose Node.js 24 and the Next.js preset; retain the `npm run build` command. `vercel.json` configures 60-second serverless functions. Use a Vercel plan supporting that duration for live planning.
3. Deploy with **no environment variables** to publish the working fictional demo.
4. Optionally add the Google keys and Upstash settings above, configure Google referrer/API restrictions and billing quotas, and redeploy. Public `NEXT_PUBLIC_` variables are read at build time.
5. Open the actual Vercel URL, complete a demo journey, then verify a real route with live mode and inspect provider usage/errors before advertising live discovery.

Deployment requires an authorized Vercel account and repository connection. No public URL should be claimed until it is actually deployed and verified. See [deployment checklist](docs/DEPLOYMENT.md).

## Troubleshooting

- **403 / domain forbidden / proxy connection refused:** use the environment's configured network route. Google calls need `maps.googleapis.com`, `routes.googleapis.com` and `places.googleapis.com`; browser maps need Google's map/static/content domains listed in `next.config.ts`. Do not disable TLS or bypass network policies.
- **Missing server key:** use demo or configure the server-only key and restart. A browser key cannot replace it.
- **Google rejects the request:** check billing, enabled APIs, API/referrer restrictions, route coverage, future departure time and provider quotas. Provider errors never trigger an unlabeled demo fallback.
- **No hotels:** lower official-star requirements or guest rating, increase sample budget or maximum detour; edit the trip to broaden initial filters. Unknown detours are excluded. Live official stars are not supplied by Google Places.
- **No map:** demo needs no external key. For live mode, configure and rebuild with the restricted public browser key. Place lists remain available if the map fails.
- **No breaks:** a break is not scheduled at the overnight arrival itself. Shorten the interval or increase driving time.
- **Production 503:** confirm Redis settings and connectivity, Google API credentials, quotas and the function timeout.
- **Cloud build worker errors:** the scripts use Webpack; do not remove the flag in sandboxes that prohibit Turbopack worker sockets.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). MIT licensed; existing copyright preserved in [LICENSE](LICENSE).
