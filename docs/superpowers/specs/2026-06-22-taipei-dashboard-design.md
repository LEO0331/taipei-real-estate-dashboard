# Taipei Dashboard Design

## Product surface

A mobile-first public-data workspace with six top-level views: market overview, district comparison, quarterly analysis, demographic context, data table, and data notes. Traditional Chinese is the default; a persistent toggle switches all interface copy and labels to English.

## Architecture

The browser reads only static JSON from `public/data`. Node/TypeScript scripts decode UTF-8 or CP950 CSVs, normalize uncertain fields with warnings, aggregate district/month/quarter summaries, and emit a conversion report. Shared models and pure parsing functions keep the conversion behavior testable without a backend.

## Visual direction

Use a civic-editorial style: warm paper background, near-black ink, Taipei-red accent, and cool blue for demographic context. The dashboard starts with a compact masthead and immediately exposes filters and working data. Summary metrics use typographic hierarchy and dividers rather than a dense card mosaic.

## Data behavior

- Weekly records map English and Chinese aliases tolerantly.
- ROC and Gregorian dates normalize to Gregorian year/month/quarter.
- Population aggregation uses only `性別=計` rows at district level to avoid double-counting male/female totals.
- District comparison joins the latest population month and latest quarterly record.
- Unknown values remain optional and produce conversion warnings.

## Scope

The first release omits the optional map, exact transaction pins, live API calls, backend pagination, and machine translation of official analysis prose. It includes all required public-data views, district comparisons, disclaimers, PWA shell, and GitHub Pages deployment.

## Verification

Use test-first checks for CSV parsing, dates, numbers, classification, district normalization, population aggregation, summaries, comparison joins, filtering, and sorting. Then run the full data pipeline, production build, and responsive browser checks in Chinese and English.
