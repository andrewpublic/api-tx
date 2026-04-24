#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "▸ Installing dependencies..."
(cd "$REPO_ROOT/lambdas" && npm install --silent)

echo "▸ Building lambdas..."
(cd "$REPO_ROOT/lambdas" && node build.mjs)

echo "Done."
