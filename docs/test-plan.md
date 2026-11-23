# Test plan and results

## Local automated API tests

Run `npm ci` then `npm test` from the project root. The default database is an isolated in-memory PostgreSQL-compatible instance. Use a disposable database if overriding it with `TEST_DATABASE_URL`; the tests recreate its schema.

| Scenario | Expected | Local result |
|---|---|---|
| Registration and wrong password | Duplicate email 409, incorrect credentials 401 | Passed |
| Admin route access | Anonymous 401, customer 403, admin 200 | Passed |
| Price tampering | Checkout rejects client-supplied total with 422 and uses the server quote | Passed |
| Last available roast unit | Concurrent checkouts yield one order and one `BATCH_FULL` | Passed |
| Repeated checkout key | Same order returned without a duplicate | Passed |
| Maya notification | Altered signed body 401, valid signed delivery applies payment, replay is a duplicate | Passed with generated test signing keys and a simulated payment lookup |
| Amount mismatch | Pending order is flagged | Passed |
| Expired coupon | 422 `COUPON_EXPIRED`, unchanged totals | Passed |
| AI unavailable | Validated database-backed keyword suggestions | Passed |
| Illegal fulfillment transition | 409, unchanged history | Passed |
| Maya session and verification | Public key creates checkout, secret key retrieves amount and currency, simulated auth error is actionable | Passed with simulated HTTP responses |
| Coffee customization | Server returns variant prices, and 500 g uses two roast units | Passed |
| Cache privacy | Cart sends no-store and public catalog can be cached | Passed |
| Partial product update | A price-only update preserves item visibility, description and tasting notes | Passed |

The test runner reported 14 passed and 0 failed.

## Postman and local PWA

- Newman ran 31 requests in folders 1–4 against an isolated seeded API. All 74 assertions passed. The four manual sandbox requests in folder 5 require a configured Maya sandbox.
- Built both the root project and the standalone frontend. Both generated the web app manifest, lazy route bundles, service worker and precache assets.
- Local Chromium checked the bundled and standalone PWA at 360×800, 390×844, 412×915 and 800×600. The catalog had no document-level horizontal overflow. The bottom nav met the 44 px height target, and the catalog used two mobile columns and three landscape columns.
- Browser smoke checks passed for public catalog and detail deep link, customer login, add to cart, optimistic quantity update, coupon application, AI keyword fallback, offline cached catalog and cart, disabled offline edits, public-only API cache, a payment return that verifies order ownership, and the custom 404.

## Dependency audit

Ran `npm audit` in the project root and the frontend directory. After updating Vite, React Router and Zod, the root reported six moderate findings and the frontend four. Both reported zero high and zero critical findings. The remaining findings involve the Workbox build-time glob dependency chain and, in the root, Sequelize’s transitive UUID dependency. Keep the Vite development server local and serve the production build for the deployed demo.

## Live evidence pending

Capture the live frontend and API URLs, a successful sandbox transaction and signed delivery, Gemini assisted output with the deployed key, Mobile Lighthouse and browser installability proof, and the backup recording. The local results above do not supply those live artifacts. Run the smoke checks again against the deployed frontend and API using the four required screen sizes.

Offline product requests are available once those URLs have been viewed under the active service worker. The cart snapshot is for display. The current webhook handler verifies with the provider before responding and relies on provider delivery retries for temporary failures.

## Local Mobile Lighthouse rehearsal

Open [lighthouse-local-mobile.html](lighthouse-local-mobile.html) in Chrome. The audit used the standalone frontend and an isolated, seeded local API. Accessibility, Best Practices and SEO each scored 100. Performance was unverified because the local headless browser did not provide the screenshots Lighthouse needed for performance metrics. The report displays a zero for that incomplete measurement. Run a fresh Mobile Lighthouse audit in Chrome against the public HTTPS URL before submission.
