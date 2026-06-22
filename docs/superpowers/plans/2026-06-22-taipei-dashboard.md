# Taipei Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable bilingual Taipei real-estate and demographics dashboard from the supplied CSV files.

**Architecture:** Node/TypeScript scripts convert mixed-encoding CSV files into static JSON. A Vite React application loads those summaries, applies client-side filters, and renders responsive charts and tables without a backend.

**Tech Stack:** Vite, React, TypeScript, Recharts, Node `TextDecoder`, Node test runner, CSS.

---

### Task 1: Project and tests

**Files:** `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `scripts/data.test.ts`

- [ ] Add the minimal Vite/React/TypeScript package configuration.
- [ ] Write failing tests for parsing, normalization, classification, aggregation, filtering, and sorting.
- [ ] Run `npm test` and confirm failures are caused by missing implementations.

### Task 2: Data conversion

**Files:** `scripts/data.ts`, six requested script entry points, `data/raw/**`, `public/data/**`

- [ ] Implement encoding detection, CSV parsing, tolerant column lookup, dates, prices, areas, districts, and classifications.
- [ ] Implement weekly, quarterly, population, summary, and comparison conversion.
- [ ] Run `npm test` until all conversion tests pass.
- [ ] Run `npm run data:convert` and inspect every generated JSON file.

### Task 3: Dashboard application

**Files:** `src/models.ts`, `src/i18n.ts`, `src/dashboard.ts`, `src/App.tsx`, `src/main.tsx`, `src/styles.css`

- [ ] Add pure filter/sort helpers under test.
- [ ] Build the six bilingual views with compact shared metric/chart/table primitives.
- [ ] Use Recharts only for charts that materially improve comparisons.
- [ ] Add accessible mobile navigation, collapsible filters, search, sorting, and pagination.

### Task 4: Delivery surface

**Files:** `public/manifest.webmanifest`, `public/sw.js`, `public/icon.svg`, `.github/workflows/deploy.yml`, `README.md`

- [ ] Add PWA metadata and a conservative app-shell/data cache.
- [ ] Add GitHub Pages deployment with the project-site base path.
- [ ] Document sources, limitations, conversion, development, build, and deployment.

### Task 5: Verification

- [ ] Run `npm test`.
- [ ] Run `npm run data:convert`.
- [ ] Run `npm run build`.
- [ ] Open the production app at mobile and desktop widths.
- [ ] Verify Chinese default, English toggle, filters, sorting, pagination, charts, disclaimers, manifest, and zero console errors.
- [ ] Review the final diff for scope, generated data size, and accidental causal/predictive language.
