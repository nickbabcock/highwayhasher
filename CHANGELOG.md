## v0.4.2 - 2022-12-11

- Correctly author ESM types for `/slim` users
- Bump target of output destined for bundlers to ES2022
- Remove node ESM output as it mixes require and imports

## v0.4.1 - 2022-12-05

- Fix exported types

## v0.4.0 - 2022-10-12

- Major updates to the Wasm implementation:
  - 70% reduction in size of Wasm module
  - Up to a 2x throughput improvement when hashing small payloads (less than 100 bytes)
  - Create limit of 292 Wasm instances

## v0.3.0 - 2022-03-20

- Add Neon SIMD implementation for aarch64 targets which enabled throughput improvements of over 4x. The downside with this implementation is that all aarch64 environments are assumed to support NEON SIMD. Thus, aarch64 environments without NEON SIMD are not supported.
- Add control over how Wasm is intantiated (from URL, buffer, etc).
- Add `/slim` package entrypoint where Wasm is not base64 inlined
- Add `HighwayHash.resetModule` if module needs to be reinitializated (it shouldn't)
- Allow the hash key to be omitted as an argument when creating a hasher.
- Fix `HighwayHash.load` executing incorrectly on native platforms

## v0.2.1 - 2021-12-14

Fix absence of node native modules in distribution

## v0.2.0 - 2021-12-14

Add Wasm SIMD implementation that will automatically be enabled when supported by the underlying Wasm runtime. If desired, it can be disabled with:

```ts
const hasher: IHash = await HighwayHash.load(keyData, { simd: true });
```

## v0.1.2 - 2021-11-09

- Delay native module loading until called

## v0.1.1 - 2021-11-08

- Provide apple silicon native build (though it won't be as hardware accelerated as x86 variants)

## v0.1.0 - 2021-02-07

- Minor dependency updates.

## v0.0.6 - 2021-01-05

- Fix release

## v0.0.5 - 2021-01-05

- Introduce non-streaming APIs to reduce performance impact of N-API calls
- Provide armv7-unknown-linux-gnueabihf builds
- Provide aarch64-unknown-linux-gnu builds 

## v0.0.4 - 2021-01-02

- Up to a 1.5x throughput increase when hashing in Wasm
- Up to a 1.5x throughput with linux native build

## v0.0.3 - 2021-01-01

Significant reduction in package size from 4MB to under 1MB

## v0.0.2 - 2021-01-01

Improperly created release

## v0.0.1 - 2021-01-01

Initial release