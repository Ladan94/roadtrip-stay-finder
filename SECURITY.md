# Security policy

Please report vulnerabilities privately through GitHub's **Report a vulnerability** feature if enabled. Otherwise contact the repository maintainer through their GitHub profile to arrange a private channel. Do not open public issues containing secrets, trip data or exploitable details.

The current main branch is the supported version. Rotate any exposed provider keys immediately in the provider console. Never post keys in an issue or support conversation.

## Security model

- Provider secrets exist only in server environment variables. The browser Maps key is intentionally public and must be HTTP-referrer and API restricted.
- Requests are validated, size-bounded, time-limited and rate-limited. API responses use `Cache-Control: no-store`. Google requests do not disable TLS verification.
- Shared Redis limiting is required for live planning and autocomplete on every production host, including Render. Local limits are per process and do not protect a distributed deployment. Client buckets read `X-Forwarded-For`; trust it only behind a platform that overwrites it.
- Route/Places payloads are transient. No database or trip history is stored. Hosting logs and provider data processing are governed by the respective services.
- CSP, HSTS, nosniff, referrer and permissions headers are configured. Next.js hydration and Google Maps require inline scripts/styles in the present CSP; this is a documented hardening limitation. A nonce-based CSP is a possible future improvement.
- There is no authentication, payment flow or internal reservation system. Provider links use safe new-tab relations. No server endpoint fetches user-provided URLs.

Before public production use, configure quotas and billing alerts, test actual provider access, review retention and privacy disclosures for your jurisdiction, and run the repository's checks. Automated tests and a successful build do not establish that an externally configured service is authorized or healthy.
