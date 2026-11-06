# Build RoadTrip Stay Finder with a working demo and Google discovery adapters

The repository previously contained only a README and license. This change adds a Next.js application with a three-step trip wizard, route and overnight-area planning, hotel ranking and selection, café/bakery stops, interactive maps, English/German/Persian RTL, and light/dark mode.

The default demo is usable without credentials and labels every fixture as fictional. Google live discovery is isolated behind validated, rate-limited server endpoints. It does not claim room prices, inventory, official stars, occupancy or breakfast inclusion. Booking.com Demand remains explicitly disconnected pending approved partner access and implementation against that partner contract.

Includes strict TypeScript, ESLint, Vitest unit/API/provider tests, desktop/mobile Playwright and axe checks, security headers, privacy guidance, GitHub Actions and Vercel deployment configuration. See the final delivery report for executed validation results; live Google requests and a public Vercel deployment require external credentials and account authorization.
