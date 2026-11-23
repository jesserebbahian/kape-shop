# Code review findings

This records the fixes identified during project review. Add real peer reviewers, PR links and approval dates from your repository before submission where applicable.

| Finding | Correction | Evidence |
|---|---|---|
| Maya checkout collapsed every gateway error into a generic rejection. | Use actionable HTTP status and provider codes. Generate unique request references. | Provider API test rejects a simulated invalid credential response. |
| Payment verification used the checkout creation resource path. | Retrieve payment details from Maya Payments using the secret checkout key and validate amount/currency. | Provider verification test and order amount-mismatch integration test. |
| Maya webhook relied on a query token. | Verify signed payload and timestamp with the Maya RSA keys and retain event deduplication. | Signed webhook, modified body and duplicate delivery integration tests. |
| Frontend used hash navigation and lacked an installable shell. | Split route/page/state modules and add a manifest, Workbox rules and static host rewrites. | Production build generates the manifest, route bundles and service worker. |
| Initial dependency audit showed high-severity Vite and Zod advisories. | Upgrade tooling and request validation, and preserve partial-product patch behavior under the new validator. | Both audits report zero high or critical findings. The price-only update test verifies that other product fields are preserved. |
