#!/usr/bin/env bash
# Merges all 4 member folders + shared/ into ./full-project so you can run the app.
set -e
rm -rf full-project && mkdir full-project
for d in shared arjun abiraj aninditha leonardo; do
  cp -r $d/. full-project/
done
rm -rf full-project/docs
echo "Done. Now: cd full-project && bun install && bun run dev  (or npm install && npm run dev)"
