#!/bin/bash
set -e
npm install
npx expo export --platform web --output-dir dist
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=server_dist
