# Civic Explorer component contract

Updated 2026-10-29. This documents the Dashboard's local React 19 navigation component. It is intentionally narrower than Portfolio's controlled generic explorer API.

## Public input

`src/CivicExplorer.tsx` exports `CivicExplorerGroup` as the local `ExplorerGroup` type and accepts:

```ts
type ExplorerGroup = {
  id: string;
  title: string;
  description: string;
  items: { id: number; label: string; keywords: string }[];
};

type Props = {
  groups: ExplorerGroup[];
  language: 'zh' | 'en';
  onNavigate: (id: number) => void;
  onBack: () => void;
};
```

The host supplies localized text for the current language. `id` is stable group identity; each item ID is an existing numeric dashboard tab, not a new route or source-record identity. The current adapter supplies five groups and 46 distinct targets. The item keyword string includes both language labels and existing search keywords.

`filterExplorerGroups` trims and case-normalizes a literal query, scopes it to the selected group, and returns filtered copies without mutating the catalogue. Preserve the catalogue integrity test when adding or changing a target. Do not infer a relationship between datasets from their decorative positions.

## Host responsibilities

`App.tsx` builds the adapter from `navigationCategories` and `dashboardModules`, rather than maintaining a second business catalogue. It owns language and the existing numeric tab state. The explorer owns only its temporary group, query and scene/list state. `onNavigate` selects an existing tab, closes the explorer and focuses the dashboard main region. `onBack` closes it and restores focus to the persistent entry button. The dashboard remains mounted under a hidden wrapper so its filter state survives a visit.

The component is lazy-loaded behind a return-capable error boundary. All targets are also native HTML buttons in an ordinary catalogue. SVG interaction is optional; the application still requires JavaScript. Status counts are announced with a polite live region. Escape clears a selected group. Group reset focuses the surviving catalogue heading in list mode or the previous hub in scene mode; clearing an empty search focuses the search input. The scoped styles provide visible focus, reduced motion and at least 44px button targets.

Navigation is intentionally in memory. Refresh returns to the default dashboard; Back/Forward does not track dataset sections. Do not present the numeric callback as a deep-link contract. A future URL model would need a separately justified change.

## What was reused

The native SVG hexagonal hub geometry was adapted from Portfolio v3.0.1 `HexIsland.tsx`; its MIT notice is retained in `CivicExplorer.tsx`. This component does not import Portfolio cases, providers, routing, stylesheet or runtime code, and it does not adopt Portfolio's full controlled generic API. Dashboard data acquisition, source health, analytics and detail rendering remain local.

Keep these deliberate copies independent. A shared package is not warranted by one small visual reuse across different React versions, state models and styling systems. Review a fix in both hosts only when it affects the common geometry or a shared behavioral assumption. No WebGL or rendering dependency is required.

## Verification and integration limits

`npm test` covers the actual catalogue's bilingual fields, unique target IDs and matching render branches. After building, `npm run test:browser` checks native navigation, keyboard reset paths, touch targets, responsiveness and local cache behavior. The same runner accepts `--url <base-url> --expected-sha <40-character-sha>` for hosted acceptance. It checks the generated release manifest before claiming the expected code version.

The implementation is maintained in this repository, not published as a package. Source freshness and interpretation limits belong to the data modules and existing Data Status view; the explorer must not duplicate or strengthen those claims. See the [maintenance report](civic-explorer-maintenance.md) for release gates and remaining operational acceptance.
