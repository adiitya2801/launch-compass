# Launch Compass

An offline research dashboard for make.fun Token Radar. Reads the sealed protocol snapshot, generates ranked candidates on the development snapshot, and separates recorded tokens from launch candidates. Valuation uses TVL, category peer multiples, capped seven-day growth and listing age; values are illustrative scenarios, not forecasts.

Run with Node 22.18 or newer:

```sh
node main.ts --input /path/to/snapshot.json --output /path/to/output
```

Open output/dashboard/index.html in a browser. The dashboard supports search, category and watchlist filters, sorting, protocol detail, recorded-token comparables, and model notes. Screenshots are real browser captures of the development snapshot. All code runs offline using Node standard library and the unchanged official dossier helper.

Participation plans are conditional and must be verified against official documentation. The input does not establish token absence, eligibility, rewards, or verified app URLs. No deposits or transactions are performed by this program.
