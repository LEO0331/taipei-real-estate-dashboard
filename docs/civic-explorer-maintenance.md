# Civic Explorer maintenance and release handoff

Updated 2026-10-29. This maintenance change follows the final cross-repository audit of Portfolio `632b81a4acdfdf344466a447affac3e58855895e` and Dashboard `d9c56757e7e01bbf1b6a5790cf7e1524daf15d56`. It fixes existing behavior and release evidence; it does not add a dataset, policy case, visualization engine or new dashboard integration.

## Findings and remedies

| Audit finding | Maintenance change | Acceptance boundary |
|---|---|---|
| P2: list-mode All topics removes the focused button | Reset focuses the surviving catalogue heading; scene reset still returns to the previous hub | Browser keyboard regression in both languages |
| P2: empty Clear filters loses focus | Clear returns focus to the search input after rendering | Browser keyboard regression in both languages |
| P3: some controls below 44px | Explorer buttons have a minimum 44px width and height | Measured touch-target checks |
| P3: trailing blank lines | Remove the two extra EOF blank lines | `git diff --check` |
| P2: tests precede data refresh | Repeat tests/source audit and validate release data after fetch/conversion, before build and upload | Failed validation prevents publication |
| P2: source copy warnings and data edition ambiguity | Validate retained local inputs explicitly, retain real quality warnings, and publish code/data identity | Source processing time is not publication freshness |
| P2: live browser/CDN/cache acceptance unavailable in audit environment | Add an expected-SHA hosted browser smoke gate after deployment | Gate must actually pass on the deployed candidate; instrumentation alone is not production acceptance |
| P3: reuse contract and stale handoff difficult to find | Link the [component contract](civic-explorer-api.md), current maintenance state and release commands from both README languages | Historical dated audits remain historical |

Portfolio source-link pinning and the external Render demo recheck are maintained on the separately reviewed Portfolio companion branch linked from the Dashboard Draft PR. Do not modify another repository through this PR or silently treat companion changes as merged.

## Reproducible release checks

Use Node.js 22 and locked dependencies. PowerShell can run the same commands as the documented Bash startup path:

```bash
npm ci
npm audit
npm test
npm run data:fetch
npm run data:convert
npm test
npm run data:audit:urban-renewal-evidence
npm run release:verify
npm run build
npx playwright install chromium
npm run test:browser
git diff --check
```

Acquisition can contact official sources and requires intentional review. Do not create empty placeholders to make a missing generated dataset pass. Some generated modules are produced during acquisition/conversion rather than present in every clean checkout; complete that pipeline or use an explicitly identified successful release artifact in an isolated verification staging directory.

`release:verify` validates required app data references, JSON/report shape and source integrity, then produces the ignored `public/release-manifest.json`. It includes `codeSha`, data hashes, Urban Renewal snapshot identity and conversion warnings so a source commit is not mistaken for a complete data edition. Preserve that manifest with the Pages artifact. Dataset publication, acquisition and processing dates remain distinct; unknown publication freshness stays unknown.

The deployment workflow retains its initial checks and runs validation again after data acquisition/conversion. After Pages deployment, hosted smoke checks run against the expected commit. A deployment may succeed while hosted acceptance fails; review both jobs. The hosted runner can also be invoked deliberately:

```bash
npm run test:browser -- --url https://leo0331.github.io/taipei-real-estate-dashboard/ --expected-sha <deployed-40-character-sha>
```

Playwright 1.59.1 is a development-only test dependency. Browser checks do not fetch new official datasets. Local checks use production preview on loopback, both languages and small/large widths. The cache name advances to `taipei-dashboard-v43-civic-explorer-maintenance`. A seeded previous-version cache and warm offline access can be tested locally; that is not proof of a live existing-user worker replacement or a cold offline first visit.

## Source and analytical preservation

Existing catalogue membership, filters, charts, exports, source strings and analytical calculations remain canonical. Urban Renewal retains the audited stock, designation and incentive evidence, the deterministic research-question methodology and snapshot `ure-c81e4ef44e6c9868`. Missing Xinyi rows do not mean zero cases, citywide building ages are not individual-building risk, and no current case status or redevelopment eligibility is inferred.

The four previously hardcoded user-download sources now require valid retained raw inputs or an explicit supplied replacement. To import a reviewed local replacement, set only the corresponding environment variable before its existing fetch command:

| Source | Explicit local input variable |
|---|---|
| Annual CPI | `CPI_ANNUAL_SOURCE_FILE` |
| Taipei electricity sales | `TAIPEI_ELECTRICITY_SOURCE_FILE` |
| Land value tax brackets | `LAND_VALUE_TAX_SOURCE_FILE` |
| Land-use zoning summary | `LAND_USE_ZONING_SOURCE_FILE` |

The variable points to a local CSV, not a URL. With no override, the checked-in retained CSV is validated. Invalid or missing inputs fail instead of producing a success claim. A retained file is not presented as a fresh download. Real duplicate-row warnings remain visible for review rather than being suppressed. Changed upstream Urban Renewal inputs still require the existing audit gate before acceptance.

## Verification record and limits

The final cross-repository audit established a baseline of 65 Dashboard unit tests and 159 external artifact-browser checks, with zero final dependency vulnerabilities. Those are dated baseline results, not results for this maintenance candidate.

**Candidate verification:** clean locked install, 72 unit tests, 44 browser regression checks, TypeScript/build, retained-source audit, release validation of 747 JSON files and dependency audit zero passed. Four genuine duplicate-row warnings remain disclosed. The full network acquisition pipeline was not replayed locally; positive release verification used the identified successful Pages data artifact in ignored staging, with the four new retained-input fetchers actually executed. Business snapshots were not edited. Manifest/expected-SHA verification is regenerated against the implementation commit before final delivery.

On 2026-10-29 the Playwright fallback successfully rendered both published mains: 43/43 live checks passed across English/Traditional Chinese and 390/1440px. Portfolio covered six domains, thirteen-item HTML navigation, selected evidence, Back/Forward/reload, search and core routes; Dashboard covered five groups, 46 items, HTML fallback, bilingual search and dataset navigation. No page errors were observed. This supersedes the earlier browser-access limitation for these published versions only; the maintenance candidate remains unmerged and its expected-SHA hosted job must run after deployment. Full screen-reader, cross-engine and real-device certification are not claimed.

## Maintenance-only scope and ownership

LEO0331 owns release decisions, source corrections, catalogue identifiers and PWA delivery. Keep the Dashboard adapter independent from Portfolio's cases and full explorer API. The shared MIT geometry does not justify a package; see the [component contract](civic-explorer-api.md).

Review and merge the single Dashboard Draft PR manually. After successful deployment and hosted acceptance, continue only dependency/security work, real production bug fixes and factual/source corrections. New policy cases, a major redesign, mandatory 3D rendering, another integration or package publication need a separate evidence-based decision. Existing source audits and the [Urban Renewal browser review](urban-renewal-browser-review.md) retain their original dates and scope.

Hosted identity checks also hash the served conversion report, Urban Renewal snapshot and real-price summary against the manifest. Other dataset hashes remain recorded without claiming a complete CDN byte sweep. Invalid retained uploads must match the dataset-specific expected column headers before replacing last-good bytes.
