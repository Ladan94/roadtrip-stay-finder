# Contributing

Use Node.js 24 LTS and `npm ci`. Create a feature branch in the existing checkout, run `npm run dev`, and use demo mode for development. Do not add real provider keys or user trip data to fixtures, screenshots, issues or logs.

Before a pull request, run `npm run check`, `npm run format:check`, and `npm run test:e2e` (install Playwright Chromium first, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`). Tests must not need paid API access. Add provider-contract tests when changing adapters. Keep official star categories, guest reviews, breakfast availability, rate inclusion and live room availability distinct.

Use `npm run format` to format changes. Keep dependency lockfile updates in the same PR as manifest changes. Explain behavioral changes, validation, and provider limitations. Never represent demo fixtures as real businesses or confirmed rates. Changes to Google caching, branding, attribution, photos or storage require review against current provider terms.

For a Booking.com integration, obtain approved partner access first; implement only documented and authorized operations, verify against the partner sandbox, and test price/fee, occupancy, cancellation and breakfast semantics before enabling the adapter.

The automated accessibility suite is a baseline. Test keyboard focus order, mobile layout, screen-reader labels, dark mode, and Persian RTL when changing UI components.

ESLint 10 and its native TypeScript/Next/React Hooks plugins are used to avoid unsupported legacy plugin peers. The manifest overrides `minimatch` to the patched 11.0.5 release for the tooling denial-of-service advisory GHSA-g3hv-75wg-m249. Recheck lint and tests when changing this override.
