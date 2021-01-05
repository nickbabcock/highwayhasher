#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")"

LATEST_TAG=$(git describe --tags --abbrev=0)
RELEASE_URL="https://github.com/nickbabcock/highwayhasher/releases/download/${LATEST_TAG}"

download_version() {
    echo "Downloading $RELEASE_URL/$1"
    curl -o "../dist/node/$1" -L "$RELEASE_URL/$1"
}

download_version "highwayhasher.x86_64-unknown-linux-gnu.node"
download_version "highwayhasher.aarch64-unknown-linux-gnu.node"
download_version "highwayhasher.armv7-unknown-linux-gnueabihf.node"
download_version "highwayhasher.x86_64-apple-darwin.node"
download_version "highwayhasher.x86_64-pc-windows-msvc.node"