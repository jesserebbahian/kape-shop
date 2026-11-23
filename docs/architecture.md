# Architecture and checkout

```mermaid
flowchart TD
    PWA["React PWA on Vercel or Netlify"] -->|HTTPS REST /api/v1| ROUTES["Express routes and middleware on Render"]
    PWA -->|Hosted payment redirect| MAYA["Maya Checkout sandbox"]
    ROUTES --> CTL["Controllers and response envelopes"]
    CTL --> SVC["Catalog, checkout, inventory, orders and discovery services"]
    SVC --> REPO["Repositories and Sequelize"]
    REPO --> PG[("Supabase PostgreSQL")]
    SVC -->|Rank catalog candidates| GEMINI["Gemini"]
    SVC -->|Create or retrieve payment| MAYA
    MAYA -->|Signed notification| ROUTES
```

The Express application deploys as a single layered API. Maya and Gemini are external integrations. The React build has its own dependencies and public configuration. The service worker precaches route bundles, caches public catalog GETs and product photos, and never handles private API data in its runtime cache. The browser stores a separate last-viewed cart snapshot for offline display.

```mermaid
sequenceDiagram
    participant User as React PWA
    participant API as Express
    participant DB as PostgreSQL
    participant Maya
    User->>API: POST checkout with JWT and Idempotency-Key
    API->>DB: Price cart, reserve batch, save pending order
    API->>Maya: Create hosted checkout in PHP
    Maya-->>API: Checkout ID and HTTPS URL
    API->>DB: Save gateway reference and URL
    API-->>User: Pending order and hosted URL
    User->>Maya: Open sandbox payment page
    alt Signed webhook arrives
        Maya->>API: Send signed payment event
        API->>DB: Insert unique event
        API->>Maya: Retrieve verified payment
    else Webhook missed
        Maya-->>User: Redirect to payment return page
        User->>API: Open order and request reconciliation
        API->>Maya: Retrieve verified payment
    end
    Maya-->>API: Payment status, amount, currency
    API->>DB: Apply allowed state transition after validation
    User->>API: GET own order
    API-->>User: Authoritative state and status history
```

The return URL contains only the order identifier. Ownership checks apply on read and reconciliation. The admin can also reconcile from the order list. A valid payment received after cancellation or expiry is flagged for review.
