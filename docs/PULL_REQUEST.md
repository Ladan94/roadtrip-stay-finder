# Add Render Free Web Service deployment support

Adds a Render Blueprint for the existing Next.js app with Node 24, the production package scripts, a homepage health check and automatic deploys disabled. The existing start command binds `0.0.0.0` and reads Render's `PORT`; demo planning requires no Google, Booking.com or Redis credentials.

Makes production live-search rate-limit safeguards host-independent and documents Render setup, optional secret configuration, Free-plan limitations and manual deployment. Vercel remains optional. No deployment or merge has been performed.

Validation passed: production build, strict TypeScript, ESLint, formatting, 34 unit/API tests and 18 desktop/mobile browser tests including accessibility and translations. With `PORT=10000 npm start`, the server bound `0.0.0.0:10000`; homepage and credential-free demo API requests both returned HTTP 200. No Render service was created or deployed.
