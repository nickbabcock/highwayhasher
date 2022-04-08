# HighwayHasher

![CI](https://github.com/nickbabcock/highwayhasher/workflows/CI/badge.svg)
[![npm](https://img.shields.io/npm/v/highwayhasher.svg)](http://npm.im/highwayhasher)
[![size](https://badgen.net/bundlephobia/minzip/highwayhasher)](https://bundlephobia.com/package/highwayhasher)

HighwayHasher is JS bindings to the [Rust implementation](https://github.com/nickbabcock/highway-rs) of [Google's HighwayHash](https://github.com/google/highwayhash), a fast, keyed and strong hash function.

## Features

- ✔ Isomorphic: Run on node and in the browser with the same API
- ✔ Fast: Generate hashes at over 2 GB/s when running on SIMD enabled web assembly
- ✔ Faster: Generate hashes at over 8 GB/s when running on native hardware
- ✔ Self-contained: Zero runtime dependencies
- ✔ Accessible: Prebuilt native modules means no build dependencies
- ✔ Completeness: Generate 64, 128, and 256bit hashes
- ✔ Incremental: Hash data incrementally
- ✔ Small: Less than 20kB when minified and gzipped (or 10KB when using the [slim entrypoint](#slim-module))

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

That's it! Now your program will use native code on nodejs and Wasm in the browser!

## Non-Streaming API

When executing on native hardware and the data to hash is known entirely, one can use one of the non-streaming APIs that operate more efficiently than their incremental counterparts on small data.

```js
import { HighwayHash } from "highwayhasher";

const keyData = Uint8Array.from(new Array(32).fill(1));
const hasher = await HighwayHash.loadModule();
const out = hasher.hash64(keyData, Uint8Array.from([0]));
```

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

## Slim Module

By default, the `highwayhasher` entrypoint includes Wasm that is base64 inlined. This is the default as most developers will probably not need to care. However some developers will care: those running the library in environments where Wasm is executable but not compilable, or those who are ambitious about reducing compute and bandwidth costs for their users.

To cater to these use cases, there is a `highwayhasher/slim` package that operates the exactly the same, except now it is expected for developers to prime initialization through some other means.

If you know the environment has Wasm SIMD enabled (for instance, deploying on Cloudflare workers):

```js
import { HighwayHash } from "highwayhasher/slim";
import wasm from "highwayhasher/simd.wasm";

const hasher = await HighwayHash.loadModule({ wasm });
```

If runtime detection of SIMD is preferred, both SIMD disabled and enabled modules can be referenced.

```js
import { HighwayHash } from "highwayhasher/slim";
import simd from "highwayhasher/simd.wasm";
import sisd from "highwayhasher/sisd.wasm";

const hasher = await HighwayHash.loadModule({
  wasm: {
    simd,
    sisd,
  }
});
```
