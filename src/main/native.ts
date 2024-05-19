import type { HashCreator, HighwayLoadOptions, IHash } from "./model.js";
import os from "os";
import { validKey } from "./common.js";

const getTriple = (): string => {
  const platform = os.platform();
  const arch = os.arch();
  if (platform === "linux" && arch === "x64") {
    return "x86_64-unknown-linux-gnu";
  } else if (platform === "linux" && arch === "arm64") {
    return "aarch64-unknown-linux-gnu";
  } else if (platform === "linux" && arch === "arm") {
    return "armv7-unknown-linux-gnueabihf";
  } else if (platform === "darwin" && arch === "x64") {
    return "x86_64-apple-darwin";
  } else if (platform === "darwin" && arch === "arm64") {
    return "aarch64-apple-darwin";
  } else if (platform === "win32" && arch == "x64") {
    return "x86_64-pc-windows-msvc";
  } else {
    throw new Error(`unknown platform-arch: ${platform}-${arch}`);
  }
};

const MODULE_NAME = "highwayhasher";

interface NativeConstructor {
  new (key: ArrayBufferLike): IHash;
}

type HashModule = {
  hash64: (key: ArrayBufferLike, data: ArrayBufferLike) => Buffer;
  hash128: (key: ArrayBufferLike, data: ArrayBufferLike) => Buffer;
  hash256: (key: ArrayBufferLike, data: ArrayBufferLike) => Buffer;
  HighwayHasher: NativeConstructor;
};

let nativeHasher: HashCreator | undefined;
function initializeNative(native: HashModule): HashCreator {
  const NativeHash = class implements IHash {
    private inner: IHash;
    constructor(key: Uint8Array | null | undefined) {
      this.inner = new native.HighwayHasher(validKey(key));
    }

    append = (data: Uint8Array): void => this.inner.append(data);
    finalize64 = (): Uint8Array =>
      new Uint8Array(this.inner.finalize64().buffer);
    finalize128 = (): Uint8Array =>
      new Uint8Array(this.inner.finalize128().buffer);
    finalize256 = (): Uint8Array =>
      new Uint8Array(this.inner.finalize256().buffer);
  };

  return {
    create: (key) => new NativeHash(key),
    hash64: (key, data) =>
      new Uint8Array(native.hash64(validKey(key), data).buffer),
    hash128: (key, data) =>
      new Uint8Array(native.hash128(validKey(key), data).buffer),
    hash256: (key, data) =>
      new Uint8Array(native.hash256(validKey(key), data).buffer),
  };
}

export class NativeHighwayHash {
  static async loadModule(
    _options?: Partial<HighwayLoadOptions>,
  ): Promise<HashCreator> {
    if (nativeHasher === undefined) {
      const native: HashModule = require(
        `./${MODULE_NAME}-${getTriple()}.node`,
      );
      nativeHasher = initializeNative(native);
    }

    return nativeHasher;
  }

  static async load(
    key?: Uint8Array | null | undefined,
    options?: Partial<HighwayLoadOptions>,
  ): Promise<IHash> {
    const mod = await NativeHighwayHash.loadModule(options);
    return mod.create(key);
  }

  static resetModule() {
    nativeHasher = undefined;
  }
}
