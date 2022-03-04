import type {
  HashCreator,
  HighwayLoadOptions,
  IHash,
  InitInput,
  WasmInput,
} from "./model";
import { validKey } from "./common";
import init, { WasmHighway } from "./wasm/highwayhasher_wasm";
import simdInit, {
  WasmHighway as WasmSimdHighway,
} from "./wasm-simd/highwayhasher_wasm";
import wasm from "./wasm/highwayhasher_wasm_bg.wasm";
import wasmSimd from "./wasm-simd/highwayhasher_wasm_bg.wasm";

class WasmHash extends WasmHighway implements IHash {
  constructor(key?: Uint8Array | null | undefined) {
    super(validKey(key));
  }
}

class WasmSimdHash extends WasmSimdHighway implements IHash {
  constructor(key?: Uint8Array | null | undefined) {
    super(validKey(key));
  }
}

const createModule = (
  create: (key: Uint8Array | null | undefined) => IHash
): HashCreator => {
  return {
    create,
    hash64: (
      key: Uint8Array | null | undefined,
      data: Uint8Array
    ): Uint8Array => {
      const hasher = create(key);
      hasher.append(data);
      return hasher.finalize64();
    },

    hash128: (
      key: Uint8Array | null | undefined,
      data: Uint8Array
    ): Uint8Array => {
      const hasher = create(key);
      hasher.append(data);
      return hasher.finalize128();
    },

    hash256: (
      key: Uint8Array | null | undefined,
      data: Uint8Array
    ): Uint8Array => {
      const hasher = create(key);
      hasher.append(data);
      return hasher.finalize256();
    },
  };
};

export const WasmModule = createModule((key) => new WasmHash(key));
export const WasmSimdModule = createModule((key) => new WasmSimdHash(key));

/**
 * A Highway hasher implemented in Web assembly.
 */
export class WasmHighwayHash {
  static async loadModule(
    options?: Partial<HighwayLoadOptions>
  ): Promise<HashCreator> {
    if (
      options?.wasm === undefined ||
      (typeof options.wasm === "object" && "simd" in options.wasm)
    ) {
      // Trust me, typescript, if the above conditional succeeds
      // the type should narrow to the following
      const wasm = options?.wasm as WasmInput | undefined;

      const useSimd = options?.simd ?? hasSimd();
      if (!useSimd) {
        await loadWasm(wasm?.sisd);
        return WasmModule;
      } else {
        await loadWasmSimd(wasm?.simd);
        return WasmSimdModule;
      }
    } else {
      await loadWasm(options.wasm);
      return WasmModule;
    }
  }

  static async load(
    key?: Uint8Array | null | undefined,
    options?: Partial<HighwayLoadOptions>
  ): Promise<IHash> {
    const module = await WasmHighwayHash.loadModule(options);
    return module.create(key);
  }

  static resetModule() {
    wasmInitialized = false;
    wasmSimdInitialized = false;
  }
}

let wasmInitialized = false;
let wasmSimdInitialized = false;
const loadWasmSimd = async (module?: InitInput) => {
  if (!wasmSimdInitialized) {
    // @ts-ignore
    await simdInit(module ?? wasmSimd());
    wasmSimdInitialized = true;
  }
};

const loadWasm = async (module?: InitInput) => {
  if (!wasmInitialized) {
    // @ts-ignore
    await init(module ?? wasm());
    wasmInitialized = true;
  }
};

// Extracted from the compiled file of:
// https://github.com/GoogleChromeLabs/wasm-feature-detect/blob/40269813c83f7e9ff370afc92cde3cc0456c557e/src/detectors/simd/module.wat
//
// Changes:
//  - Validation is cached so it needs to only run once
//  - There's no need to mark as async
let simdEnabled: boolean | undefined;
export const hasSimd = () =>
  simdEnabled ??
  (simdEnabled = WebAssembly.validate(
    new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10,
      1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
    ])
  ));
