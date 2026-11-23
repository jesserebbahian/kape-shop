# Kape: Roast-to-Order Coffee Shop

Orders are assigned to weekly roast batches. Each batch has a cut-off and a capacity. A 250 g bag uses 1 unit and a 500 g bag uses 2.

Stack: React, Express, Sequelize (ORM), PostgreSQL on Supabase, Maya Checkout Sandbox, Gemini.

## Set up the database (Supabase)

1. Create a project at supabase.com and save the database password you choose.
2. Open the project, click Connect, and copy the Session pooler connection string.
3. Replace `[YOUR-PASSWORD]` in it with your password. If the password has symbols, URL-encode them.
4. Put it in `.env` as `DATABASE_URL=...`

Tables, constraints, and sample data are created automatically the first time you run `npm run dev`.

## Run locally

1. Install Node.js 22.12+ (LTS), then run `npm ci`.
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `JWT_SECRET`, `MAYA_PUBLIC_KEY`, `MAYA_SECRET_KEY`, and optionally `GEMINI_API_KEY`.
3. `npm run dev`, then open http://localhost:3000
4. Run `npm run images` to link the bundled product photos. Sign in with `juan@kape.test` / `Customer123!` or `admin@kape.test` / `Admin123!`

## Test Maya Checkout in the sandbox

1. In the project’s `.env` (or the Render service’s Environment settings), set `PAYMENT_PROVIDER=maya`, `MAYA_BASE_URL=https://pg-sandbox.paymaya.com`, and both keys from the same [Maya Checkout sandbox application](https://developers.maya.ph/reference/about-maya-checkout). Use Maya Checkout keys for the standard non-Kount flow. Restart the local server or redeploy Render after changing variables.
2. Set `APP_URL` to the URL you open in your browser. For example, use `http://localhost:3000` locally or your public HTTPS URL on Render. Use the same address when signing in so the browser can restore your session on return.
3. Sign in as a customer, add a coffee to the cart, fill in the delivery details, and click **Pay with Maya**.
4. On the Maya sandbox page, choose Maya Wallet and use the successful test account from [Maya’s sandbox credentials](https://developers.maya.ph/reference/sandbox-credentials-and-cards). Sandbox checkout uses test credentials.
5. After Maya returns you to the order, check for **Paid**. If the result is still processing, click **Check payment status**. The server verifies the payment ID, amount, and currency with Maya before applying the result.

If the cart shows **HTTP 401 or 403**, check the key pair and confirm it belongs to the same Maya environment. For **HTTP 400 or 422**, use the displayed Maya code to look up the request rejection and check whether the merchant application requires Kount buyer details. If the Maya page opens but the test payment fails, check the sandbox wallet and OTP you used. Do not share API keys, .env files, or real payment credentials in screenshots.

Public webhooks are optional for local testing because the order page can check directly with Maya. On Render, use the webhook setup below for automatic updates, including when a customer closes the payment page.

## Commands

- `npm run dev` starts API and web app on one port
- `npm test` runs the integration tests on a built-in in-memory PostgreSQL. It needs no keys and never touches Supabase.
- `npm run seed` adds sample data
- `npm run reset` drops all tables in the database from `DATABASE_URL`, recreates them, and reseeds (development only)
- `npm run build` then `npm start` for production

API docs: `/api-docs`

## Product photos

Put one photo per coffee in `frontend/public/products`, named after the coffee in lowercase with dashes, for example `benguet-arabica.jpg` or `mt-apo-arabica.png` (jpg, jpeg, png, or webp). Then run `npm run images`. It links every matching photo and lists the files still missing. Coffees without a photo show a drawn bag.

To use one photo for every coffee that has none yet: `npm run images -- --fill=C:\path\to\photo.jpg`

Only use photos you took or that have a free license, and credit the photographer.

## Deploy on Render

1. Push the project to GitHub and create a Web Service on Render from it.
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Add every value from `.env` as an environment variable, including `DATABASE_URL`, and set `APP_URL` to your Render address.
5. For the required standalone PWA, deploy the `frontend/` directory to Vercel or Netlify as described in [frontend/README.md](frontend/README.md). Set the frontend's `VITE_API_BASE_URL` to your Render URL plus `/api/v1`. On Render set `APP_URL` and `ALLOWED_ORIGINS` to your frontend origin.
6. Run `npm run seed` and `npm run images` against a dedicated sandbox demo database before rehearsing. Use Admin → Batches if no open batch remains.
7. Set both Maya webhook PEM public keys and register `https://YOUR-APP.onrender.com/api/v1/webhooks/maya`. See [payment integration](docs/payment-integration.md) for setup and negative tests.

Import `postman/collection.json` and `postman/environment.example.json` for API testing. Fill the local environment's blank sample passwords with the test accounts above. Run folders 1–4 against a seeded sandbox database. Run the Maya folder separately to complete hosted checkout in a browser.

See [defense and submission](docs/defense.md) for the two-course checklist.
For a storefront, admin, AI and offline rehearsal, use the [non-payment defense walkthrough](docs/non-payment-defense.md).

## How transactions work

`withTransaction` in `backend/src/config/database.js` runs a function inside one database transaction. Sequelize is set to use async local storage, so every query made inside the function joins that transaction automatically. Reserving batch capacity is a single conditional UPDATE, so two buyers cannot take the same last bag.
