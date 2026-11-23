# Kape Shop PWA

This is the standalone React client. Use Node.js 22.12 or later. Run `npm ci`, then `npm run dev` in this directory. Start the Express API on port 3000 first for local proxy mode. Alternatively, set `VITE_API_BASE_URL` to your deployed HTTPS API base URL ending in `/api/v1`.

For Vercel or Netlify, deploy this directory as the project root. Use `npm ci`, `npm run build` and output directory `dist`. Set the public API URL before building. The host rewrite files support direct links to products, orders and payment results. On Render, configure the deployed frontend origin under `APP_URL` and `ALLOWED_ORIGINS`.

Run the offline and installability checks against a production build on localhost or HTTPS. Let the service worker activate, revisit the catalog, open a product and view your cart while online. Then turn on Offline in Chrome DevTools and repeat. The public catalog and product detail can reopen when cached. An offline cart uses a last-viewed snapshot. Authentication, cart edits, checkout, payments and AI requests require a connection.

Run Mobile Lighthouse on the published URL and include the report in your submission. Required scores are Performance ≥75, Accessibility ≥85, Best Practices ≥85, SEO ≥80, plus installability. If Lighthouse has no separate PWA category, capture Chrome's Manifest and Service Workers panels, along with the install action, and confirm the accepted proof format with your instructor.

The local viewport checks covered 360×800, 390×844, 412×915 and 800×600. See `../docs/test-plan.md` for recorded checks and `../docs/defense.md` for the evidence checklist.
