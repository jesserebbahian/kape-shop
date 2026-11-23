# Kape Shop concept and business rules

Kape is a Philippine coffee shop that roasts beans after orders are received. Customers choose an origin, bag size and grind, then reserve capacity in one weekly roast run. A shop administrator manages coffee records and roasting capacity and fulfills paid orders. The design supports two business-specific workflows: scheduling orders into finite roast batches, and pricing custom bag/grind variants. Record instructor concept approval separately.

| Rule | UI and enforcement | Expected rejection or outcome |
|---|---|---|
| One roast batch per order, with cutoff and capacity | Shop roast strip, checkout quote, and Admin Batches. `GET /batches`, `POST /checkout/quote`, `POST /checkout`. A 250 g bag uses one unit. A 500 g bag uses two. The earliest fitting, open batch is reserved atomically. | `BATCH_CLOSED` or `BATCH_FULL` (409). Unpaid failure/expiration releases capacity. |
| Bag and grind customization | Product details, cart and checkout. `GET /products/:id`, `POST /cart/items`, and checkout. Filter grind adds ₱10 per 250 g. Espresso adds ₱15 per 250 g. The 500 g bag receives 5% off the doubled price, rounded to a centavo. | Invalid sizes and grinds return 422. The client cannot supply prices. Order items preserve size, grind and server price. |
| Cart capacity, coupon and pricing checks | Cart mutations and checkout. Checks active products and capacity, and calculates discounts and shipping from trusted records. Percentage discounts round down to a centavo. Fixed discounts cap at subtotal. Shipping is ₱100 below a discounted subtotal of ₱1,500. | `INSUFFICIENT_CAPACITY` (409) or a specific coupon error (422). |
| Fulfillment | Admin Orders and customer order history. `pending_payment → paid → roasting → shipped → delivered`. Pending orders can also become cancelled or expired. | Illegal transitions return 409. Only a verified matching payment makes an order paid. |
| Capacity adjustment | `POST /admin/batches/:id/adjust` records the actor, old and new totals and reason. | An adjustment below reserved units returns 409. |

For defense, select 500 g espresso on a real product and compare its server price to the 250 g variant. Then show batch allocation in checkout and use the concurrency test to demonstrate the capacity limit.
