# stats.upcode.dev

Delivery numbers for the projects Upcode builds, as a static site on GitHub Pages.

- `/` lists the projects.
- `/cinderblock/` shows Cinderblock Mobile: builds, merged MRs, commits, churn and code size.

Only aggregate numbers are published; no names or per-person figures.

## Refresh the numbers

The data is committed JSON in `public/data/<project>/`. To refresh Cinderblock, with a `cb-mobile`
checkout next to this repo and `glab` signed in to its GitLab:

```bash
npm run collect:cinderblock   # git + GitLab -> public/data/cinderblock/*.json, then the preview image
git commit -am "Refresh Cinderblock stats" && git push
npm run deploy
```

The preview image (`public/cinderblock/og.png`, used by Slack and other link previews) is
rendered with headless Chrome from the same totals.

## Develop

```bash
npm ci --ignore-scripts
npm run dev     # local dev server
npm run build   # static site in dist/
npm run serve   # serve the built site on http://localhost:4173
```

## Deploy

```bash
npm run deploy   # build, then publish dist/ to the gh-pages branch
```

Deploys run from your machine: `scripts/deploy.sh` builds the site and force-pushes `dist/` to
the `gh-pages` branch, which GitHub Pages serves at stats.upcode.dev. It refuses to run with
uncommitted changes, so every deploy matches a commit on `main`.
