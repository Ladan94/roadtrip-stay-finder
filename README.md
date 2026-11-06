# RoadTrip Stay Finder

Plan a European road trip with room for a good night’s sleep, a great coffee and a slower pace. RoadTrip Stay Finder helps you explore overnight stops and bakery or café breaks through a friendly, step-by-step planner.

## Live Website

**[Open RoadTrip Stay Finder →](https://roadtrip-stay-finder.onrender.com/)**

The application is hosted on **Render**. If the Free service is asleep, the first visit may take a little longer while it wakes up.

> **Current demo:** the route, businesses, ratings, prices and breakfast details are fictional sample data. **Live hotel prices and availability are not connected**, and the app cannot confirm or reserve a room. Google route and place discovery is a separate, optional integration that requires credentials; it does not provide booking inventory.

## Main features

- **Plan at your pace:** enter a starting postal code and country, an optional destination, your departure time and how long you want to drive before an overnight stop.
- **Explore stays:** compare fictional hotel cards, review sample ratings and breakfast details, and refine results by budget, official star category, guest score and detour time.
- **See your journey:** explore an interactive sample route, select a stay and view its estimated driving impact.
- **Make time for breaks:** choose your break interval and discover sample bakery and café stops along the route.
- **Use your preferred language:** English, German and Persian, including right-to-left layouts, persistent language preferences, and light and dark modes.
- **Plan on any screen:** responsive layouts, keyboard-friendly controls and helpful loading, error and empty states.

The demo works without API keys and uses a fixed, illustrative **Berlin–Munich** route. Entered addresses do not change that sample route. Optional Google discovery supports real routes and place listings after configuration; room rates, availability and breakfast inclusion remain unverified.

## Installation and local development

Install **Node.js 24 LTS** and npm, then clone the repository:

```sh
git clone https://github.com/Ladan94/roadtrip-stay-finder.git
cd roadtrip-stay-finder
npm ci
npm run dev
```

If you already have a checkout, run the last two commands from its root.

Open the development server on port 3000. No credentials or `.env` file are needed for demo mode. To run a production build:

```sh
npm run build
npm start
```

Webpack is explicitly selected because Turbopack worker sockets are unsupported in some cloud sandboxes. Both are supported Next.js build options.

## Hosting on Render (primary)

The live website is hosted on **Render**. No provider credentials, database or paid API access is required to host the **fictional demo**. The checked-in [render.yaml](render.yaml) defines a Node.js Web Service with `plan: free`, where Render offers that plan for your account/region.

To deploy your own instance:

1. Sign in to [Render](https://dashboard.render.com/), connect GitHub and allow access to `Ladan94/roadtrip-stay-finder`.
2. Choose **New → Blueprint**, select this repository and branch `main`. Render reads `render.yaml` from the repository root.
3. Review the service and confirm the **Free** plan. Creating the Blueprint starts the initial deployment; do this only when ready to deploy. If Free is unavailable, stop and choose an acceptable plan yourself—this configuration never selects a paid plan automatically.
4. Keep the provided settings: Node.js **24**, build command `npm ci --include=dev && npm run build`, start command `npm start`, health check `/`, and `NODE_ENV=production`. Build dependencies are explicitly installed because Tailwind and TypeScript are needed at build time.
5. Leave Google, Booking.com and Redis variables unset for demo mode. Render supplies `PORT`; do not hardcode it. The existing `next start --hostname 0.0.0.0` command reads `PORT` automatically.
6. When Render reports the service healthy, open the service URL shown in the Render dashboard and complete a demo journey. Verify the fictional-data notices, German/Persian preferences, dark mode and mobile layout.

Automatic deploys are disabled in the Blueprint (`autoDeployTrigger: off`). After approving future changes, deploy the desired commit manually from Render. Review Blueprint synchronization settings in your dashboard too. Render creation/deployment is a separate action; no deployment is performed merely by committing this file.

You can also create a **Web Service** manually with the same settings and repository root, selecting the Free plan and turning off automatic deploys. The app must be a Web Service, not a Static Site, because trip planning uses server-side API routes.

Render Free services may spin down after inactivity and take time to wake up. Their filesystem is ephemeral, and usage/build/resource limits apply. No trip data or database is required. Check [Render Free service limitations](https://render.com/docs/free) for current eligibility and limits. A successful local build does not prove a Free-instance deployment fits every future workload.

### Optional live discovery on Render

Add the server-only Google key and Redis settings privately in Render's **Environment** panel; never add secret values to `render.yaml`. The only intentionally public key is `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`; restrict it to the Maps JavaScript API and your exact Render/custom-domain referrers. Rebuild after changing any `NEXT_PUBLIC_` value. Live Google usage may incur charges; it is unnecessary for the demo. Booking.com inventory remains disconnected pending an authorized integration.

### Verify Render-style startup locally

```sh
npm ci --include=dev
npm run build
PORT=10000 npm start
```

In another terminal, request port 10000 and complete a demo trip. No custom server or platform adapter is needed. See [deployment checklist](docs/DEPLOYMENT.md) for the release checks. Other Node.js hosts are also supported; no platform-specific adapter is required.

## Vercel (optional alternative)

Render is the primary hosting platform. If you prefer Vercel, import the repository using its Next.js preset and Node.js 24, and retain `npm run build`. The existing `vercel.json` provides optional serverless configuration; choose a plan that supports its function duration if enabling live discovery. No provider keys are required for the demo. Configure any optional secrets in Vercel’s environment settings and rebuild after changing `NEXT_PUBLIC_` values. A Vercel account is not needed to use or deploy the app on Render.

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

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for a shared Redis rate limiter before enabling live searches on any production host (including Render). Live production requests and autocomplete fail closed without this configuration. Local development and demo use per-process minute buckets. The host must overwrite trusted proxy headers: client buckets use `X-Forwarded-For`. Review your hosting proxy configuration before enabling paid live APIs. Set Google Cloud billing caps, quotas and abuse monitoring as additional safeguards. Rate limiting is not a complete anti-abuse system.

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
