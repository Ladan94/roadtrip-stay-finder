# Deployment and operational handoff

## Ready without accounts

The app runs a labeled fictional demo with no external keys or database. Install with `npm ci`; build with `npm run build`; serve with `npm start`. Use the existing isolated checkout, not an extra Git worktree. Restart the server after restoring a cloud filesystem snapshot; live processes are not retained.

## External prerequisites

- **Public deployment:** authorized Vercel project, GitHub repository connection and actual URL verification.
- **Live discovery:** Google Cloud billing, Geocoding, Routes, Places (New), Time Zone and Maps JavaScript access; restricted server and browser keys. Configure these in Vercel environment settings and redeploy.
- **Production abuse controls:** Upstash Redis REST URL/token, Google quotas and billing alerts. Missing Redis fails live requests closed in Vercel production.
- **Live reservations:** not implemented or enabled; requires approved Booking.com Demand partner access and a separately validated integration. Setting placeholder booking variables does not enable inventory.

## Release checks

1. CI must pass on the final commit.
2. Deploy the feature branch as a Vercel preview; do not merge until reviewed.
3. On the actual preview URL, complete a demo trip on desktop and mobile. Verify the fictional-data notice and all three language preferences.
4. If live mode is enabled, test a future departure with a real European origin and destination. Confirm Google attribution, a navigable route, plausible driving detours, and provider links. Check that unknown prices, breakfast, official stars and availability remain unknown.
5. Check provider/hosting quotas and error reporting without logging keys or trip bodies.
6. Merge only after review, then verify the production URL.

## Manual GitHub handoff if API authorization is unavailable

The feature branch is `feat/roadtrip-stay-finder`. Once pushed, open a pull request from that branch to `main` using the repository's **Compare & pull request** button. The reviewable PR description is in [PULL_REQUEST.md](PULL_REQUEST.md). Do not force-push or merge without review.

## Current limits

- No public deployment or genuine live-provider validation can be claimed until the corresponding account/keys are supplied and the actual requests pass.
- Opening hours are regular published hours, not a future-date guarantee. The app always marks opening at arrival unconfirmed.
- Overnight candidate timing and detours are estimates. Nearby search is bounded, and live searches inspect at most six unique lodging candidates and four break areas.
- No real hotel photos are fetched. Sample artwork is original; live results use a neutral placeholder.
- Date/occupancy/budget/breakfast filtering is fully demonstrated on fictional fixtures. Live discovery lacks booking inventory to verify those requirements.
