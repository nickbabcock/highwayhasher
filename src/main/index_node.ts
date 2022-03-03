export type { IHash, HashCreator, HighwayLoadOptions } from "./model";
export { WasmHighwayHash, hasSimd as hasWasmSimd } from "./wasm";
export { NativeHighwayHash as HighwayHash } from "./native";
import wasm from "./wasm/highwayhasher_wasm_bg.wasm";
import wasmSimd from "./wasm-simd/highwayhasher_wasm_bg.wasm";
import { setWasmInit, setWasmSimdInit } from "./wasm";

// @ts-ignore
setWasmInit(() => wasm());
// @ts-ignore
setWasmSimdInit(() => wasmSimd());
