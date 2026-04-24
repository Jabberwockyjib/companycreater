# Sales Data Generator

Interactive generator for realistic synthetic B2B product-company sales data.

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Test Commands

```bash
npm run test
npm run build
```

## LLM Configuration

The app runs without an LLM when `LLM_PROVIDER=none`. Provider-specific keys can be added in `.env.local` when model-backed research extraction is enabled.

## MVP Scope

This version fully supports fictional B2B product-company generation. Real-company-inspired mode has the server-side research and model abstraction in place, while generated operating data remains synthetic.

Generated tables include products, SKUs, customers, contacts, salespeople, territories, opportunities, orders, invoices, monthly revenue, supply events, returns, rejections, credits, and lifecycle events.

The export flow downloads CSV files, a JSON scenario bundle, and an assumptions report in a ZIP archive.
