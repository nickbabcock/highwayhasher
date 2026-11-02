import type {
  HashCreator,
  HighwayLoadOptions,
  IHash,
  InitInput,
  WasmInput,
} from "./model.js";
import { validKey } from "./common.js";
import init, {
  checkpoint_len as sisd_checkpoint_len,
  new_hasher as sisd_new_hasher,
  append as sisd_append,
  finalize as sisd_finalize,
  hash as sisd_hash,
} from "./wasm/highwayhasher_wasm";
import simdInit, {
  checkpoint_len as simd_checkpoint_len,
  new_hasher as simd_new_hasher,
  append as simd_append,
  finalize as simd_finalize,
  hash as simd_hash,
} from "./wasm-simd/highwayhasher_wasm_simd";

let wasmInit: (() => InitInput) | undefined = undefined;
export const setWasmInit = (arg: () => InitInput) => {
  wasmInit = arg;
};

let wasmSimdInit: (() => InitInput) | undefined = undefined;
export const setWasmSimdInit = (arg: () => InitInput) => {
  wasmSimdInit = arg;
};

const isWasmInput = (
  x?: HighwayLoadOptions["wasm"],
): x is WasmInput | undefined =>
  x === undefined || (typeof x === "object" && "simd" in x);

/**
 * A Highway hasher implemented in Web assembly.
 */
export class WasmHighwayHash {
  static async loadModule(
    options?: Partial<HighwayLoadOptions>,
  ): Promise<HashCreator> {
    if (isWasmInput(options?.wasm)) {
      const useSimd = options?.simd ?? hasSimd();
      if (!useSimd) {
        return await loadWasm(options?.wasm?.sisd);
      } else {
        return await loadWasmSimd(options?.wasm?.simd);
      }
    } else {
      return await loadWasm(options?.wasm);
    }
  }

  static async load(
    key?: Uint8Array | null | undefined,
    options?: Partial<HighwayLoadOptions>,
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

/**
 * Layout of the scratch memory that the wrapper adds to the Wasm memory:
 *
 * - The first page holds the hasher state, the key, and the hash result.
 * - The second page holds the data to hash.
 *
 * The Wasm module does not keep hasher state between calls. Each JS hasher
 * owns its state, so a hasher that is not finalized is garbage collected and
 * does not hold Wasm memory.
 */
const SCRATCH_PAGES = 2;
const STATE_OFFSET = 0;
const KEY_OFFSET = 256;
const RESULT_OFFSET = 512;
const DATA_OFFSET = PAGE_SIZE;

class Scratch {
  readonly statePtr: number;
  readonly keyPtr: number;
  readonly resultPtr: number;
  readonly dataPtr: number;
  private view: Uint8Array;

  constructor(
    private memory: WebAssembly.Memory,
    base: number,
  ) {
    this.statePtr = base + STATE_OFFSET;
    this.keyPtr = base + KEY_OFFSET;
    this.resultPtr = base + RESULT_OFFSET;
    this.dataPtr = base + DATA_OFFSET;
    this.view = new Uint8Array(memory.buffer);
  }

  /** A view of all Wasm memory. Make a new view if the memory grew. */
  heap() {
    if (this.view.buffer !== this.memory.buffer) {
      this.view = new Uint8Array(this.memory.buffer);
    }
    return this.view;
  }
}

/**
 * The functions that each Wasm module (SIMD and not SIMD) exports. The
 * `out_len` argument is the size of the hash result: 8, 16, or 32 bytes.
 */
interface HashStrategy {
  checkpoint_len: () => number;
  new_hasher: (
    key_data_ptr: number,
    key_len: number,
    state_ptr: number,
  ) => void;
  append: (state_ptr: number, data_ptr: number, data_len: number) => void;
  finalize: (state_ptr: number, out_ptr: number, out_len: number) => void;
  hash: (
    key_data_ptr: number,
    key_len: number,
    data_ptr: number,
    data_len: number,
    out_ptr: number,
    out_len: number,
  ) => void;
}

function wasmHighway(scratch: Scratch, hasher: HashStrategy): HashCreator {
  // The Wasm module gives the size of the hasher state. The state must fit
  // before the key in the scratch memory.
  const stateLen = hasher.checkpoint_len();
  if (stateLen > KEY_OFFSET - STATE_OFFSET) {
    throw new Error(`hasher state is too large: ${stateLen} bytes`);
  }

  const WasmHash = class implements IHash {
    private readonly state = new Uint8Array(stateLen);
    constructor(key: Uint8Array | null | undefined) {
      key = validKey(key);
      scratch.heap().set(key, scratch.keyPtr);
      hasher.new_hasher(scratch.keyPtr, key.length, scratch.statePtr);
      this.saveState(scratch.heap());
    }

    private saveState(heap: Uint8Array) {
      const start = scratch.statePtr;
      this.state.set(heap.subarray(start, start + stateLen));
    }

    finalize(len: number): Uint8Array {
      const heap = scratch.heap();
      heap.set(this.state, scratch.statePtr);
      hasher.finalize(scratch.statePtr, scratch.resultPtr, len);
      return heap.slice(scratch.resultPtr, scratch.resultPtr + len);
    }

    append(data: Uint8Array) {
      const heap = scratch.heap();
      heap.set(this.state, scratch.statePtr);
      while (data.length != 0) {
        const toWrite = Math.min(data.length, PAGE_SIZE);
        heap.set(
          toWrite === data.length ? data : data.subarray(0, toWrite),
          scratch.dataPtr,
        );
        hasher.append(scratch.statePtr, scratch.dataPtr, toWrite);
        data = data.subarray(toWrite);
      }
      this.saveState(heap);
    }

    finalize64(): Uint8Array {
      return this.finalize(8);
    }

    finalize128(): Uint8Array {
      return this.finalize(16);
    }

    finalize256(): Uint8Array {
      return this.finalize(32);
    }
  };

  // Data that fits in the scratch memory is hashed in one Wasm call, with no
  // hasher state copied to JS. Longer data uses an incremental hasher.
  const hashData = (
    key: Uint8Array | null | undefined,
    data: Uint8Array,
    len: number,
  ): Uint8Array => {
    if (data.length > PAGE_SIZE) {
      const hash = new WasmHash(key);
      hash.append(data);
      return hash.finalize(len);
    }

    key = validKey(key);
    const heap = scratch.heap();
    heap.set(key, scratch.keyPtr);
    heap.set(data, scratch.dataPtr);
    hasher.hash(
      scratch.keyPtr,
      key.length,
      scratch.dataPtr,
      data.length,
      scratch.resultPtr,
      len,
    );
    return heap.slice(scratch.resultPtr, scratch.resultPtr + len);
  };

  return {
    create: (key) => new WasmHash(key),
    hash64: (key, data) => hashData(key, data, 8),
    hash128: (key, data) => hashData(key, data, 16),
    hash256: (key, data) => hashData(key, data, 32),
  };
}

/**
 * The scratch area of each Wasm memory. The Wasm module does not keep state
 * between calls, so all loads of the same module can use the same scratch
 * area. Thus, the memory does not grow again when the module is reset and
 * loaded again.
 */
const scratches = new WeakMap<WebAssembly.Memory, Scratch>();
const getScratch = (memory: WebAssembly.Memory) => {
  let scratch = scratches.get(memory);
  if (scratch === undefined) {
    const prevPages = memory.grow(SCRATCH_PAGES);
    scratch = new Scratch(memory, prevPages * PAGE_SIZE);
    scratches.set(memory, scratch);
  }
  return scratch;
};

let sisdMemory: Promise<HashCreator> | undefined;
let simdMemory: Promise<HashCreator> | undefined;
const loadWasmSimd = async (module?: InitInput) => {
  if (simdMemory === undefined) {
    const input = module || wasmSimdInit?.();
    simdMemory = simdInit(input ? { module_or_path: input } : undefined).then(
      (x) =>
        wasmHighway(getScratch(x.memory), {
          checkpoint_len: simd_checkpoint_len,
          new_hasher: simd_new_hasher,
          append: simd_append,
          finalize: simd_finalize,
          hash: simd_hash,
        }),
    );
  }
  return await simdMemory;
};

const loadWasm = async (module?: InitInput) => {
  if (sisdMemory === undefined) {
    const input = module || wasmInit?.();
    sisdMemory = init(input ? { module_or_path: input } : undefined).then((x) =>
      wasmHighway(getScratch(x.memory), {
        checkpoint_len: sisd_checkpoint_len,
        new_hasher: sisd_new_hasher,
        append: sisd_append,
        finalize: sisd_finalize,
        hash: sisd_hash,
      }),
    );
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
    ]),
  ));
