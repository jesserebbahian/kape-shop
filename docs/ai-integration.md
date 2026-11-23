# AI discovery integration

- Send `POST /api/v1/ai/discover` with `{"query":"Low acidity chocolate notes for espresso"}`.
- The backend calls Gemini through `GeminiAiService.js`. Set `GEMINI_API_KEY` and optionally `GEMINI_MODEL` on Render. The default is `gemini-2.5-flash`.
- For database retrieval, `discoveryService.js` tokenizes the query and retrieves up to 12 active catalog candidates. The request includes names, categories, tasting notes and database prices for those candidates.
- System instructions restrict the task to ranking catalog candidates. The customer text is delimited as untrusted data. The model is asked for JSON picks with product IDs and short reasons.
- Zod checks the output shape. Unknown IDs and duplicate picks are dropped. The API joins the surviving IDs to database records and returns up to three.
- Missing configuration, error, timeout, exhausted budget or invalid model output returns keyword picks with `aiAssisted: false` and a fallback reason. An endpoint rate-limit rejection remains a controlled HTTP 429.
- Limits include a 200-character query limit, 400 output tokens, an 8-second default timeout, 10 requests/min per IP, a 30 calls/min process budget, and five-minute memoization.
- The provider receives the query and catalog candidates. The prompt excludes account credentials, tokens, carts, shipping details and payment data. Use non-personal demo queries. React renders reasons as escaped text, with an AI-assisted disclosure.

For the demo, show an actual `aiAssisted: true` request first. Demonstrate fallback on an isolated local instance with no Gemini key. Confirm that the returned picks still open real product URLs.
