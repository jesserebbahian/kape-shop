# Defense and submission

## Before submission

| Item | Evidence to submit |
|---|---|
| ITE 101 frontend | Public HTTPS Vercel or Netlify URL and public GitHub source link. Submit at least 24 hours before defense per the rubric. |
| ITPE 101 backend | Public Render API base URL ending in `/api/v1` and Swagger URL ending in `/api-docs`. Use the same deployed API when demonstrating the PWA. |
| Lighthouse and installability | Live mobile Lighthouse report or full-page capture. Thresholds: Performance 75, Accessibility 85, Best Practices 85 and SEO 80. Capture installability and service-worker evidence from Chrome. |
| Backup video | A 2–3 minute mobile walkthrough showing viewport checks, cached catalog/cart, sandbox checkout and AI discovery. Capture the signed payment event in the backend payment evidence. |
| Developer evidence | Commit the code, lockfiles, example environment files, OpenAPI spec, Postman collection and this documentation. Add real peer-review/PR records and sign the contribution statement. |
| Concept | Include the roast-to-order concept statement from business-rules.md and actual instructor approval if required. |

## Live walkthrough

1. **Customer and mobile**. Open the storefront at 390×844. Search for Benguet and open a product deep link. Compare a 250 g whole-bean bag with a 500 g espresso bag. Add coffee, apply a valid coupon and show the server quote and roast date. Use `EXPIRED20` to show a specific rejection.
2. **Maya**. Start hosted checkout, use a Maya sandbox wallet and return to Paid. Open Admin → Webhooks to show the delivery. Run the Postman unsigned webhook request for 401 and show the automated signed replay test. Explain missed-webhook reconciliation and the amount/currency check.
3. **Admin**. Open Products, Batches, Coupons and Orders. Show a stock adjustment and its inventory log, then move the paid order to Roasting. Explain why a customer JWT receives 403 on an admin API route.
4. **AI and offline**. Ask for “chocolate notes for espresso” and confirm the AI-assisted label. Demonstrate the controlled keyword fallback on an isolated local instance without a Gemini key. Once the installed service worker controls the page, cache a product and cart. Go offline and demonstrate cached views and disabled writes.
5. **Code**. Trace the checkout route through controller, pricing service, atomic reservation and provider factory. Open the ERD and explain the idempotency constraint. Show OpenAPI and run a Postman request.

## Practice questions

| Question | Kape-specific answer |
|---|---|
| What stops two buyers from taking the last roast unit? | The conditional UPDATE checks cutoff and remaining capacity in the checkout transaction. Only the successful transaction creates a reservation. |
| Can a buyer change the URL to mark an order paid? | Return pages only open an owned order and request reconciliation. The backend fetches Maya's payment status and compares recorded centavos and PHP currency. |
| What happens if the gateway sends the same event twice? | A valid signature is required on each delivery. The unique event ID allows one processing attempt for the same status and payment reference. The state machine also prevents a second paid transition. |
| Where are abstract classes and composition? | `PaymentProvider` defines the provider contract. The factory supplies a Maya or PayMongo adapter. `AiServiceProxy` wraps a Gemini service and adds budget and caching. |
| Can Gemini invent a coffee or price? | Discovery only accepts candidate IDs from the database lookup. The backend supplies product objects, including price, from those records. The UI labels AI-assisted reasons. |
| Which data works offline? | Static route bundles, cached public product reads and images, and a last-viewed cart snapshot. Account operations and order changes require the network. |
