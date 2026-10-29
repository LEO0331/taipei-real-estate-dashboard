# Issue 9 implementation and cleanup plan

One tracked feature: quarterly monitoring and reviewed import. Preserve existing converters, units, calculations and chart designs; no dependencies or live browser acquisition.

1. Protect the existing 72-test baseline before editing (passed 2026-10-29; build passed).
2. Replace filename/local-Downloads selection only for the four monitored datasets with a hash-pinned approval manifest. Validate schema, periods, complete category/district coverage, counts and numeric cells before converter writes.
3. Keep retained raw files as history; reject ambiguous duplicate identities and require explicit review of revisions. Stage in an isolated directory and regenerate with existing converter and summary commands before applying reviewed files.
4. Monitor official pages and their advertised downloads read-only. Deduplicate actionable findings in one issue per source, including closed issues; never commit data from Actions.
5. Remove deployment acquisition/conversion; validate committed data before artifact upload.
6. Test synthetic new quarters, revisions, invalid schemas, failed imports, issue deduplication and existing chart consumers; run full tests/typecheck/build and record actual results.
