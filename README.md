# Nagaad Municipal Risk Dashboard

Standalone, city-scoped risk dashboard (Beledweyne first). It is meant to be **embedded** in the Nagaad MIS Municipal Risk page (`/portal/risk?city=Beledweyne`). The MIS catalogues the URL and access rules; this app owns the map and indicators.

## Stack

- Vite + React + TypeScript + Tailwind
- MapLibre GL JS, PMTiles, Esri World Light Gray basemap (no API key)
- Docker ETL (GDAL/GeoPandas + tippecanoe)
- GitHub Pages (free, iframe-friendly)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173/beledweyne or http://localhost:5173/?embed=1 for the MIS iframe chrome.

Processed layers live in `public/data/beledweyne/`. If those files are missing, the UI still loads and shows an empty-data banner.

## Process Beledweyne data

Raw GIS is **not** in this repo (~5.9 GB). Point Docker at the local folder:

```powershell
copy .env.example .env
# .env already points at:
# D:/Municipal Risk Dashboards/DATA/risk_dashboard/beledweyne_data

npm run etl
```

This clips the Belet Weyne urban polygon, intersects buildings / roads / IDP sites with the historical flood mask, writes GeoJSON + `summary.json`, and builds PMTiles.

`public/data/beledweyne/investments.csv` is a placeholder (`name,type,status,lat,lng,cost`). Add rows when Nagaad works locations are available.

## Publish

1. Create a public GitHub repo named `nagaad-municipal-risk`.
2. Enable Pages (GitHub Actions source). The workflow in `.github/workflows/pages.yml` deploys on push to `main`.
3. Embed URL:

   `https://rogaaltech.github.io/nagaad-municipal-risk/beledweyne?embed=1`

4. In Nagaad MIS Admin → Municipal Risk, add that URL with city **Beledweyne**.

## Disclaimer

Figures are **indicative screening** from historical flood extents and available exposure layers. They are not a full probabilistic risk model.
