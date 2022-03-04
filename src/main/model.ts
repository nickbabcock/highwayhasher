/**
 * A class that can perform highway hashing
 */
export interface IHash {
  /**
   * @param data data to append to the ongoing hash function
   */
  append(data: Uint8Array): void;

  /**
   * Generate a 8 byte long buffer that represents the 64bit hash output
   */
  finalize64(): Uint8Array;

  /**
   * Generate a 16 byte long buffer that represents the 128bit hash output
   */
  finalize128(): Uint8Array;

  /**
   * Generate a 32 byte long buffer that represents the 256bit hash output
   */
  finalize256(): Uint8Array;
}

/**
 * Class that can create highway hashers
 */
export interface HashCreator {
  /**
   * Create a highwayhasher based on the given 32 byte long buffer
   */
  create(key?: Uint8Array | null | undefined): IHash;

  /**
   * return 64bit hash of data with a given key
   */
  hash64(key: Uint8Array | null | undefined, data: Uint8Array): Uint8Array;

  /**
   * return 128bit hash of data with a given key
   */
  hash128(key: Uint8Array | null | undefined, data: Uint8Array): Uint8Array;

  /**
   * return 256bit hash of data with a given key
   */
  hash256(key: Uint8Array | null | undefined, data: Uint8Array): Uint8Array;
}

/**
 * Parameters able to instantiate the Wasm hasher
 */
export type InitInput =
  | RequestInfo
  | URL
  | Response
  | BufferSource
  | WebAssembly.Module;

export type WasmInput = {
  /** parameter that describes how to instantiate the non-SIMD enabled Wasm */
  sisd: InitInput;

  /** parameter that describes how to instantiate the SIMD enabled Wasm */
  simd: InitInput;
};

/**
 * Customize how highway modules are loaded
 */
export interface HighwayLoadOptions {
  /**
   * Execute HighwayHash with SIMD instructions. This option is only
   * applicable in a Wasm environment, as native hardware will detect SIMD at
   * runtime. `highwayhasher` will detect if Wasm SIMD is enabled if this
   * option is not set, so this option is used to override the heuristic.
   */
  simd?: boolean;

  /**
   * Controls how the Wasm module is instantiated. This option is only
   * applicable in browser environments or for users that opt to use the Wasm
   * hasher. If the `wasm` option is given a single instantiation parameter,
   * there is no SIMD check performed.
   */
  wasm?: WasmInput | InitInput;
}
