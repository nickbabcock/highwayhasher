# HighwayHasher

HighwayHasher is JS bindings to the [Rust implementation](https://github.com/nickbabcock/highway-rs) of [Google's HighwayHash](https://github.com/google/highwayhash), a fast, keyed and strong hash function.

## Features

- ✔ All-purpose: Run in both nodejs and the browser
- ✔ Fast: Generate hashes at over 500 MB/s when running in web assembly
- ✔ Faster: Generate hashes at over 8 GB/s when running on native hardware
- ✔ Fastest: highwayhash implementation on npm
- ✔ Self-contained: Zero runtime dependencies
- ✔ Accessible: Prebuilt native modules means no build dependencies
- ✔ Completeness: Generate 64, 128, and 256bit hashes
- ✔ Incremental: Hash data incrementally

## Install

```
npm i highwayhasher
```

## Quick Start

```js
const { HighwayHash } = require("highwayhasher");
// or import { HighwayHash } from "highwayhasher";

// The hash is based on a 32 byte key (optional)
const keyData = Uint8Array.from(new Array(32).fill(1));

// Load the hash function (compiles and caches the wasm if on browser).
const hash = await HighwayHash.load(keyData);

// Append any amount of data
hash.append(Uint8Array.from([0]));

// When all the data is appended, call the hash you want.
// Note, do not call any additional functions after finalization
let out = hash.finalize64();
let expected = Uint8Array.from([120, 221, 205, 199, 170, 67, 171, 126]);
expect(out).toEqual(expected);
```

That's it! Now your program will use native code on nodejs and Wasm in the browser (when bundled by webpack, rollup, or any other javascript bundler that respects [the `browser` package.json spec](https://github.com/defunctzombie/package-browser-field-spec)) without any bloat!

## Wasm-Only

Since Wasm is cross platform, one can drop any reliance on native dependencies by opting to only use the Wasm implementation

```js
const { WasmHighwayHash: HighwayHash } = require("highwayhasher");
const keyData = Uint8Array.from(new Array(32).fill(1));
const hash = await HighwayHash.load(keyData);
hash.append(Uint8Array.from([0]));
let out = hash.finalize64();
let expected = Uint8Array.from([120, 221, 205, 199, 170, 67, 171, 126]);
expect(out).toEqual(expected);
```

## Benchmarks

To run benchmarks:

```bash
npm install
npm run build
cd bench
npm install
node index.js
```

After running you will see output like:

> hashing data of size: 10000000
> hash native 1.38ms
> hash wasm 18.46ms
> 3rd party 2.60ms

Here you can see that the native highwayhasher hashes at 7.25 GB/s and the other npm highwayhash implementation hashes at 3.85 GB/s
