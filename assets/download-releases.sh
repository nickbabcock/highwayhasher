#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")"

RELEASE_URL="https://github.com/nickbabcock/highwayhasher/releases/download/latest"

download_version() {
    curl -o "../dist/node/es/$1" -L "$RELEASE_URL/$1"
    cp "../dist/node/es/$1" "../dist/node/cjs/$1"
}

download_version "highwayhasher.linux-x64-gnu.node"
download_version "highwayhasher.win32-x64-msvc.node"
download_version "highwayhasher.darwin-x64.node"