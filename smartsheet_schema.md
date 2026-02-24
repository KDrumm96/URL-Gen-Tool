# Smartsheet URL Registry Schema (v1)

Create a Smartsheet sheet with these columns (in this order). Keep values controlled and consistent.

## Columns
1. created_at (Text) — ISO timestamp when row was created (tool fills)
2. status (Dropdown) — Draft | Published | Redirected | Archived
3. title (Text) — The content title (source of slug)
4. market (Dropdown) — US | CA
5. content_type (Dropdown) — research | blog
6. industry (Dropdown) — retail | industrial | life-sciences
7. publish_year (Text/Number) — e.g., 2026
8. content_id (Text) — stable ID from CMS (preferred). If not available, blank.
9. slug (Text) — slugified title (tool fills)
10. url_path (Text) — unique path (tool fills). Example: /insights/research/retail/2026/q1-2026-retail-market-update-386797
11. full_url (Text) — domain + path (tool fills). Example: https://www.savills.us/insights/research/retail/2026/...
12. notes (Text) — optional notes

## Duplicate prevention
- In Smartsheet, you can add a helper column:
  - url_path_dupe_count (Formula): =COUNTIF([url_path]:[url_path], [url_path]@row)
  - Conditional formatting: highlight rows where url_path_dupe_count > 1

## Sync workflow with the web tool
- Export Smartsheet registry as CSV.
- Import CSV into the tool.
- Generate new URLs, save to local registry.
- Export CSV from tool.
- Append new rows into Smartsheet (copy/paste or import).
