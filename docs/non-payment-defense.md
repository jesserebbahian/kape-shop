# Kape Shop defense walkthrough

Use this walkthrough to demonstrate the storefront, backend, admin, AI, and PWA while Maya testing is paused. A working Gemini key is required for the live AI-assisted result.

| Time | Show | Say |
|---|---|---|
| 0:00–0:25 | Open the storefront at 390×844. Search for Benguet and open a product. | “Kape Shop groups orders into weekly roast batches. This is the mobile storefront and this product page has its own URL.” |
| 0:25–0:55 | Compare 250 g whole bean with 500 g espresso. Add two bags and open checkout. Apply WELCOME10 if the subtotal is at least ₱500, then try EXPIRED20. | “The API supplies the variant prices and computes the quote. A 500 g bag uses two roast units. The server enforces the coupon rules and reports the roast date.” |
| 0:55–1:25 | Use AI Finder for “chocolate notes for espresso.” Open a suggested product. On a separate local run without a Gemini key, show the keyword fallback. | “The backend retrieves catalog candidates and validates the recommended product IDs. The name and price come from the catalog. Keyword matches remain available when the AI service fails.” |
| 1:25–1:55 | In Chrome DevTools, set Network to Offline after visiting the catalog, a product, and your cart online. Reopen the cached product and cart. | “The service worker caches the app and public product requests. The cart is a saved view. Account actions and cart edits need a connection.” |
| 1:55–2:30 | Return online. Open Admin → Batches. Show a capacity adjustment and its log on a sandbox database. Open Swagger and run GET /products. | “Admin adjustments record the actor and reason. During checkout, the database conditionally reserves stock so two customers cannot claim the same last unit.” |

## Pre-submission evidence

- Add the actual **public GitHub**, **Vercel or Netlify frontend**, **Render API**, and **Swagger** URLs.
- Run Mobile Lighthouse against the deployed frontend and capture the required scores. Confirm the app installs in Chrome and capture the Manifest and Service Workers panels.
- Record the walkthrough above using your deployed app. The course's full recording checklist also calls for sandbox checkout evidence.
- Complete `contributions.md` with your own work, commit references, and signature. Add real peer-review or PR references to `code-review.md`.
- Import the Postman collection and its example environment. Run folders 1–4 to rehearse the non-payment API checks.

## Publish the app

1. Push the extracted project root to a public GitHub repository. Keep the real `.env` files out of Git. The repo should contain `backend/`, `frontend/`, `docs/` and `postman/`.
2. Create the Render web service from the repository root. Build with `npm ci --include=dev && npm run build` and start with `npm start`. Set `DATABASE_URL` and a private `JWT_SECRET` in Render. Set `GEMINI_API_KEY` there if you want the live AI demo. Prepare a seeded demo database as described in the root README.
3. Create the Vercel or Netlify project from the same repository. Use `frontend` as its root, `npm run build` as the build command and `dist` as the output. Set `VITE_API_BASE_URL` to your Render URL with `/api/v1` appended.
4. Set `ALLOWED_ORIGINS` and `APP_URL` on Render to the deployed frontend origin. Redeploy and verify `/products` in the browser and `/api-docs/` on Render.
5. Use the deployed frontend for the official mobile audit. The local report is a rehearsal. Check 360×800, 390×844, 412×915 and 800×600 in Chrome before recording.
