import { bench } from "vitest";
import { WasmHighwayHash } from "..";

beforeEach(() => {
  WasmHighwayHash.resetModule();
});

bench("wasm bench no simd", async () => {
  const module = await WasmHighwayHash.loadModule({ simd: false });
  const hasher = module.create();
  hasher.append(new Uint8Array(10240));
  const out = hasher.finalize256();
  expect(out).toHaveLength(32);
});

bench("wasm bench simd", async () => {
  const module = await WasmHighwayHash.loadModule({ simd: true });
  const hasher = module.create();
  hasher.append(new Uint8Array(10240));
  const out = hasher.finalize256();
  expect(out).toHaveLength(32);
});
