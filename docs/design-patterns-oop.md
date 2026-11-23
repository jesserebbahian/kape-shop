# Design patterns and OOP

| Pattern | Live implementation | Design decision |
|---|---|---|
| MVC with layers | `backend/src/routes/index.js` routes to controllers, services, repositories and Sequelize models. `frontend/src/pages/` renders the returned API data. | Thin controllers keep HTTP details outside business logic. Putting pricing, validation and SQL directly in Express handlers would make checkout harder to audit. |
| Factory and Adapter | `patterns/PaymentFactory.js` selects `MayaProvider` or `PayMongoProvider`. The provider adapts gateway-specific sessions, statuses and webhooks to the shared contract. | Switching gateways changes provider configuration, while checkout calls the same operations. A controller switch statement would spread gateway-specific behavior into checkout and reconciliation. |
| Strategy | `patterns/strategies.js` selects the fixed or percentage discount used by `services/pricingService.js`. | Fixed caps and percentage rounding live near their own rule. A new calculation can be tested separately from the checkout flow. |
| Observer | `patterns/orderEvents.js` and `patterns/orderListeners.js` consume lifecycle changes to notify customers and consume or release reservations. | Checkout and reconciliation share the same side effects. Durable restart-safe delivery would need a transactional outbox. |
| Proxy and composition | `services/discoveryService.js` builds `new AiServiceProxy(new GeminiAiService())`. | The proxy owns the TTL cache and call budget. Each AI provider can focus on its own request/response format. |

Open `patterns/PaymentProvider.js` during defense. It prevents base-class instantiation and defines `createCheckout`, `retrieveCheckout`, and `parseWebhook`. Concrete subclasses implement the same operations. `services/paymentService.js` calls them polymorphically. Maya's private `#call` encapsulates authentication and HTTP error handling. The proxy holds its provider as a private dependency. This composition avoids coupling caching and rate limits to one provider inheritance tree.

Trace `POST /api/v1/checkout` from `cartController.checkout` to `checkoutService.checkout`, `pricingService.computeTotals`, the factory, and Maya. Then trace verification to the order state machine and observer. Without the state checks or gateway confirmation, a fake return URL could incorrectly drive fulfillment. Without the conditional batch update, concurrent orders could exceed capacity.

The frontend refactor moved route UI, shared controls, auth/cart/network state, the API client and formatting into their own modules. Checkout return routes now open directly and reconcile through the API.
