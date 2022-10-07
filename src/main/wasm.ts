import type {
  HashCreator,
  HighwayLoadOptions,
  IHash,
  InitInput,
  WasmInput,
} from "./model";
import { validKey } from "./common";
import init, {
  new_hasher as newWasmHighway,
  append as sisdAppend,
  finalize64 as sisdFinalize64,
  finalize128 as sisdFinalize128,
  finalize256 as sisdFinalize256,
} from "./wasm/highwayhasher_wasm";
import simdInit, {
  new_hasher as newSimdHighway,
  append as simdAppend,
  finalize64 as simdFinalize64,
  finalize128 as simdFinalize128,
  finalize256 as simdFinalize256,
} from "./wasm-simd/highwayhasher_wasm";

let wasmInit: (() => InitInput) | undefined = undefined;
export const setWasmInit = (arg: () => InitInput) => {
  wasmInit = arg;
};

let wasmSimdInit: (() => InitInput) | undefined = undefined;
export const setWasmSimdInit = (arg: () => InitInput) => {
  wasmSimdInit = arg;
};

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
        return await loadWasm(wasm?.sisd);
      } else {
        return await loadWasmSimd(wasm?.simd);
      }
    } else {
      return await loadWasm(options.wasm);
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
    sisdMemory = undefined;
    simdMemory = undefined;
  }
}

const PAGE_SIZE = 65536;
class Allocator {
  private slots: boolean[] = [];
  constructor(public memory: WebAssembly.Memory, private offset: number) {}
  newAllocation() {
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] === false) {
        this.slots[i] = true;
        return i;
      }
    }

    const result = this.slots.length;
    this.slots.push(true);
    return result;
  }

  returnSlot(slot: number) {
    this.slots[slot] = false;
  }

  appendBufferOffset() {
    return this.offset;
  }

  resultBufferOffset = this.appendBufferOffset;
  keyBufferOffset = this.resultBufferOffset;
}

interface HashStrategy {
  new_hasher: (key_data_ptr: number, key_len: number, idx: number) => number;
  append: (data_ptr: number, data_len: number, idx: number) => void;
  finalize64: (data_ptr: number, idx: number) => void;
  finalize128: (data_ptr: number, idx: number) => void;
  finalize256: (data_ptr: number, idx: number) => void;
}

function wasmHighway(alloc: Allocator, hasher: HashStrategy): HashCreator {
  const WasmHash = class implements IHash {
    readonly idx: number;
    constructor(key: Uint8Array | null | undefined) {
      key = validKey(key);
      this.idx = alloc.newAllocation();
      const offset = alloc.keyBufferOffset();
      const keyDest = new Uint8Array(alloc.memory.buffer, offset);
      keyDest.set(key ?? new Uint8Array());
      const hasherSlot = hasher.new_hasher(
        offset,
        key?.byteLength ?? 0,
        this.idx
      );
      if (hasherSlot !== this.idx) {
        throw new Error("unable to allocate hasher in slot");
      }
    }

    append(data: Uint8Array) {
      while (data.length != 0) {
        const toWrite = Math.min(data.length, PAGE_SIZE);
        const source = data.subarray(0, toWrite);
        const dataOffset = alloc.appendBufferOffset();
        (new Uint8Array(alloc.memory.buffer, dataOffset, toWrite)).set(source);
        hasher.append(dataOffset, toWrite, this.idx);
        data = data.subarray(toWrite);
      }
    }

    finalize64(): Uint8Array {
      const resultOffset = alloc.resultBufferOffset();
      hasher.finalize64(resultOffset, this.idx);
      const out = new Uint8Array(alloc.memory.buffer, resultOffset, 8);
      const result = new Uint8Array(8);
      result.set(out);
      alloc.returnSlot(this.idx);
      return result;
    }

    finalize128(): Uint8Array {
      const resultOffset = alloc.resultBufferOffset();
      hasher.finalize128(resultOffset, this.idx);
      const out = new Uint8Array(alloc.memory.buffer, resultOffset, 16);
      const result = new Uint8Array(16);
      result.set(out);
      alloc.returnSlot(this.idx);
      return result;
    }

    finalize256(): Uint8Array {
      const resultOffset = alloc.resultBufferOffset();
      hasher.finalize256(resultOffset, this.idx);
      const out = new Uint8Array(alloc.memory.buffer, resultOffset, 32);
      const result = new Uint8Array(32);
      result.set(out);
      alloc.returnSlot(this.idx);
      return result;
    }
  };

  return {
    create: (key) => new WasmHash(key),
    hash64(key, data) {
      const hasher = new WasmHash(key);
      hasher.append(data);
      return hasher.finalize64();
    },
    hash128(key, data) {
      const hasher = new WasmHash(key);
      hasher.append(data);
      return hasher.finalize128();
    },
    hash256(key, data) {
      const hasher = new WasmHash(key);
      hasher.append(data);
      return hasher.finalize256();
    },
  };
}

let sisdMemory: Promise<HashCreator> | undefined;
let simdMemory: Promise<HashCreator> | undefined;
const loadWasmSimd = async (module?: InitInput) => {
  if (simdMemory === undefined) {
    simdMemory = simdInit(module ?? wasmSimdInit()).then((x) => {
      const prevLength = x.memory.grow(1);
      const alloc = new Allocator(x.memory, prevLength);
      return wasmHighway(alloc, {
        new_hasher: newSimdHighway,
        append: simdAppend,
        finalize64: simdFinalize64,
        finalize128: simdFinalize128,
        finalize256: simdFinalize256,
      });
    });
  }
  return await simdMemory;
};

const loadWasm = async (module?: InitInput) => {
  if (sisdMemory === undefined) {
    sisdMemory = init(module ?? wasmInit()).then((x) => {
      // grow by 1 page to hold key, results, and data hashing
      const prevLength = x.memory.grow(1);
      const alloc = new Allocator(x.memory, prevLength);
      return wasmHighway(alloc, {
        new_hasher: newWasmHighway,
        append: sisdAppend,
        finalize64: sisdFinalize64,
        finalize128: sisdFinalize128,
        finalize256: sisdFinalize256,
      });
    });
  }
  return await sisdMemory;
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
