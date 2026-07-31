# Focusboard — private study dashboard

A responsive, static personal dashboard for study routines, habit tracking, timetables, and weekly reports.

## Free stack

- **React + Vite:** local development and static production build.
- **GitHub Pages:** free hosting from a private repository (the site itself is public on GitHub Free; use an unguessable URL or deploy privately through Cloudflare Access if true access control is required).
- **Browser local storage:** private-by-default records, with no account or database cost.
- **SheetJS (`xlsx`):** spreadsheet import handled in the browser; no workbook content is uploaded.

## Start locally

1. Install Node.js LTS.
2. Run `npm install`.
3. Run `npm run dev` and open the shown address.

## GitHub deployment

1. Create a **private** GitHub repository and push this folder.
2. Add a GitHub Actions workflow that runs `npm ci`, `npm run build`, and deploys `dist/` to GitHub Pages.
3. In the repository settings, enable Pages with **GitHub Actions** as the source.

For genuine private access, keep the repository private and host the build with Cloudflare Pages plus Cloudflare Access (free for up to 50 users), or run it locally only. GitHub Pages does not provide password protection.

## Spreadsheet import

The first worksheet is read. Use these headers (case-insensitive): `Date`, `Subject` or `Task`, and `Minutes` or `Duration`. New data is appended as study sessions. CSV, `.xlsx`, and `.xls` are supported.

## Project map

- `src/main.jsx` — screens, local data model, reports, import and backup.
- `src/styles.css` — responsive visual design.
- `index.html` — app entry point.

## Architecture

The interface reads one `study-dashboard-data` object from local storage. Every edit updates that object immediately. Spreadsheet import maps rows into `sessions`; reports aggregate those sessions by date. This keeps the starter usable offline and costs nothing. If you later need cross-device sync, replace the `load`/`save` helpers with a GitHub-backed API or an encrypted cloud database—never put a GitHub personal access token in the browser.
