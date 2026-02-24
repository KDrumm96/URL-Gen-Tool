# Savills URL Builder (Demo + Seed for Production)

This is a lightweight, static web tool you can host on GitHub Pages to standardize **Research** and **Blog**
URLs by **industry** (Retail / Industrial / Life Sciences) and **market** (US / CA). It also includes a
simple registry to prevent duplicate URL paths.

## What it does
- Generates SEO-friendly slugs from titles.
- Produces a URL path using a strict convention:
  `/insights/{content_type}/{industry}/{year}/{slug}{-content_id?}`
- Prevents duplicates by:
  - Appending `-{content_id}` when provided (preferred), otherwise
  - Auto-incrementing suffixes `-2`, `-3`, ...
- Maintains a registry in your browser (localStorage).
- Imports/exports registry as CSV so you can sync with Smartsheet.

## Quick start (local)
1. Download this repo.
2. Open `index.html` in Chrome/Edge.

## Host on GitHub Pages
1. Create a new repo (e.g., `savills-url-tool`).
2. Upload all files from this folder to the repo root.
3. In GitHub:
   - Settings → Pages
   - Source: `Deploy from a branch`
   - Branch: `main` / root
4. Your tool will be live at the Pages URL.

## Smartsheet workflow (recommended)
- Create a Smartsheet sheet using the columns in `smartsheet_schema.md`.
- Export Smartsheet registry as CSV periodically:
  - Smartsheet → File → Export → CSV
- In the tool:
  - Import CSV (Registry)
  - Generate new URLs
  - Export CSV (New rows or full registry)
- Append new rows back into Smartsheet.

## Configuration
Edit `config.json`:
- domains per market
- roots per content type
- allowed industries
- whether to include year in the URL

## Notes
- This is a **front-end only** demo to avoid corporate network restrictions and credentials.
- If you later want real-time Smartsheet API sync, add a small server/proxy (or a serverless function)
  because Smartsheet API calls from the browser are often blocked by CORS/security policies.
