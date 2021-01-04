import type { HashCreator, IHash } from "./model";
import init, { WasmHighway } from "./web/highwayhasher_web";
import wasm from "./web/highwayhasher_web_bg.wasm";

class WasmHash extends WasmHighway implements IHash {
  constructor(key: Uint8Array | null | undefined) {
    if (key && key.length != 32) {
      throw new Error("expected the key buffer to be 32 bytes long");
    }
    super(key || new Uint8Array());
  }
}

export const WasmModule: HashCreator = class WasmModule {
  static create = (key: Uint8Array | null | undefined): IHash =>
    new WasmHash(key);
  static hash64 = (
    key: Uint8Array | null | undefined,
    data: Uint8Array
  ): Uint8Array => {
    const hasher = WasmModule.create(key);
    hasher.append(data);
    return hasher.finalize64();
  };
  static hash128 = (
    key: Uint8Array | null | undefined,
    data: Uint8Array
  ): Uint8Array => {
    const hasher = WasmModule.create(key);
    hasher.append(data);
    return hasher.finalize128();
  };
  static hash256 = (
    key: Uint8Array | null | undefined,
    data: Uint8Array
  ): Uint8Array => {
    const hasher = WasmModule.create(key);
    hasher.append(data);
    return hasher.finalize256();
  };
};

/**
 * A Highway hasher implemented in Web assembly.
 */
export class WasmHighwayHash {
  static async loadModule(): Promise<HashCreator> {
    await loadWasm();
    return WasmModule;
  }

  static async load(key: Uint8Array | null | undefined): Promise<IHash> {
    await loadWasm();
    return new WasmHash(key);
  }
}

let wasm_initialized = false;
const loadWasm = async () => {
  if (!wasm_initialized) {
    // @ts-ignore
    await init(wasm());
    wasm_initialized = true;
  }
};
