export type { IHash, HashCreator, HighwayLoadOptions } from "./model.js";
export { WasmHighwayHash, hasSimd as hasWasmSimd } from "./wasm.js";
export { NativeHighwayHash as HighwayHash } from "./native.js";
import wasm from "./wasm/highwayhasher_wasm_bg.wasm";
import wasmSimd from "./wasm-simd/highwayhasher_wasm_bg.wasm";
import { setWasmInit, setWasmSimdInit } from "./wasm.js";

// @ts-ignore
setWasmInit(() => wasm());
// @ts-ignore
setWasmSimdInit(() => wasmSimd());
