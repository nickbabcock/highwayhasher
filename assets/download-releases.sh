#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")"

LATEST_TAG=$(git describe --tags --abbrev=0)
RELEASE_URL="https://github.com/nickbabcock/highwayhasher/releases/download/${LATEST_TAG}"

download_version() {
    echo "Downloading $RELEASE_URL/$1"
    curl -o "../dist/node/$1" -L "$RELEASE_URL/$1"
}

download_version "highwayhasher.linux-x64-gnu.node"
download_version "highwayhasher.win32-x64-msvc.node"
download_version "highwayhasher.darwin-x64.node"