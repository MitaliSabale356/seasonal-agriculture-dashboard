# Seasonal Agriculture Dashboard

An interactive dashboard that compares **Kharif, Rabi and Zaid** farming seasons on yield, profit, climate, irrigation and crop mix. Built for the VOIS AICTE major project, *Seasonal Agriculture Performance Analysis*.

## Key findings

From the 4,000 farm records:

- **Kharif is the strongest season.** Mean profit is about ₹1.79 lakh and 57.8% of farms are profitable.
- **Zaid is the weakest.** Mean profit is about -₹24.8K and only 35.5% of farms are profitable. Zaid is also the smallest group (594 records), so its averages are less reliable.
- **Rabi's average hides a problem.** Mean profit is positive (about ₹87.7K), but the median is about -₹3.2K, so roughly half of Rabi farms lose money and a few high earners lift the average.
- **Crop choice matters more than season.** Sugarcane (about ₹8.2 lakh) and chilli (about ₹7.5 lakh) have the highest mean profit. Wheat, rice and maize have negative mean profit.
- **Drip irrigation leads on yield, with one exception.** Excluding sugarcane, drip gives the highest yield in Kharif and Rabi, but sprinkler is ahead in Zaid.
- **Kharif has the highest pest and disease risk** (54.5%, against 40.5% in Rabi and 38.2% in Zaid) and the highest rainfall (about 852 mm).
- **Sugarcane distorts yield comparisons** (about 47 t/ha against about 1.8 t/ha for other crops), so the dashboard also shows yield excluding sugarcane.

These insights are also calculated live from the filtered data inside the dashboard.

## Features

- Filter by season, state, crop and irrigation method
- KPI cards: farms in view, yield (with and without sugarcane), mean and median profit, rainfall, share of profitable farms
- Charts: season performance, season mix, climate profile, crop yield, irrigation vs yield, profit by crop, profit by state, rainfall vs yield, resource use
- Insights generated from the current filters
- Searchable, paginated farm table and CSV download

## Data

- 4,000 farm records, 28 columns (location, crop, season, climate, soil, inputs, yield, cost, revenue, profit)
- Missing values: rainfall (48), soil moisture (40) and yield (32). Averages skip blanks.
- **This is a synthetic dataset.** State and district pairings are not geographically accurate (for example, Rajkot appears under Andhra Pradesh), so state-level results are illustrative only.

## Tech stack

- HTML
- CSS 
- Vanilla JavaScript with [Chart.js](https://www.chartjs.org/) for charts.


## Run locally

Do not open `index.html` as a file (`file://`), because the CSV is loaded with `fetch`.                       
-bash : python -m http.server 8000                                    
Then open <http://localhost:8000>.
