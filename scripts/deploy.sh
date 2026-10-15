#!/usr/bin/env bash
# Builds the site and publishes dist/ to the gh-pages branch, which GitHub Pages serves at
# stats.upcode.dev. The branch holds only the latest build, so it is force-pushed each time.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain)" ]; then
  echo "Commit or stash your changes first, so the deploy matches a commit." >&2
  exit 1
fi

REMOTE=$(git remote get-url origin)
SOURCE=$(git rev-parse --short HEAD)

npm run build
# No Jekyll processing: serve the files exactly as built.
touch dist/.nojekyll

cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git -c commit.gpgsign=false commit -qm "Deploy $SOURCE"
git push -qf "$REMOTE" gh-pages
rm -rf .git
echo "Deployed $SOURCE to gh-pages. GitHub Pages usually updates within a minute."
