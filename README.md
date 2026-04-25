# Sales Data Generator

Interactive generator for realistic synthetic B2B product-company sales data.

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The dev script raises the local file-descriptor limit before starting Next.js to reduce watcher `EMFILE` errors on macOS. For a watcher-free verification pass, run `npm run build` and then `npm start`.

## Test Commands

```bash
npm run test
npm run build
```

## LLM Configuration

The app runs without an LLM when `LLM_PROVIDER=none`. To enable Gemini-backed public research extraction, add these values to `.env.local`:

```bash
LLM_PROVIDER=gemini
LLM_MODEL=<gemini-model-id>
GOOGLE_GENERATIVE_AI_API_KEY=<your-key>
```

The model is only used to extract public signals such as product families, markets, geographies, launches, buyer segments, and industry language. Private sales, customer, order, quota, return, rejection, churn, and revenue records remain synthetic.

## Scenario Persistence

Generated scenarios can be saved and reloaded from the Scenario Library in the app. The local SQLite database defaults to `data/scenarios.sqlite` and can be changed with:

```bash
SCENARIO_DB_PATH=/absolute/path/to/scenarios.sqlite
```

The API surface is `GET /api/scenarios`, `POST /api/scenarios`, and `GET /api/scenarios/:id`.

## MVP Scope

This version fully supports fictional B2B product-company generation. Real-company-inspired mode has the server-side research and model abstraction in place, while generated operating data remains synthetic.

Generated tables include products, SKUs, customers, contacts, salespeople, territories, opportunities, orders, invoices, monthly revenue, supply events, returns, rejections, credits, and lifecycle events.

The export flow downloads CSV files, a JSON scenario bundle, and an assumptions report in a ZIP archive.
