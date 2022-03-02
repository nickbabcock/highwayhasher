import type { HashCreator, HighwayLoadOptions, IHash } from "./model";
import os from "os";
import { validKey } from "./common";

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
  } else if (platform === "darwin" && arch === "arm") {
    return "aarch64-apple-darwin";
  } else if (platform === "win32" && arch == "x64") {
    return "x86_64-pc-windows-msvc";
  } else {
    throw new Error(`unknown platform-arch: ${platform}-${arch}`);
  }
};

const MODULE_NAME = "highwayhasher";
let native = undefined;
let InternalHasher = undefined;

class NativeHash implements IHash {
  private inner: any;
  constructor(key: Uint8Array | null | undefined) {
    this.inner = new InternalHasher(validKey(key));
  }

  static load = async (key: Uint8Array | null | undefined) =>
    new NativeHash(key);
  append = (data: Uint8Array): void => this.inner.append(data);
  finalize64 = (): Uint8Array => new Uint8Array(this.inner.finalize64().buffer);
  finalize128 = (): Uint8Array =>
    new Uint8Array(this.inner.finalize128().buffer);
  finalize256 = (): Uint8Array =>
    new Uint8Array(this.inner.finalize256().buffer);
}

export const NativeModule: HashCreator = class NativeModule {
  static create = (key: Uint8Array | null | undefined): IHash =>
    new NativeHash(key);
  static hash64 = (
    key: Uint8Array | null | undefined,
    data: Uint8Array
  ): Uint8Array => new Uint8Array(native.hash64(validKey(key), data).buffer);
  static hash128 = (
    key: Uint8Array | null | undefined,
    data: Uint8Array
  ): Uint8Array => new Uint8Array(native.hash128(validKey(key), data).buffer);
  static hash256 = (
    key: Uint8Array | null | undefined,
    data: Uint8Array
  ): Uint8Array => new Uint8Array(native.hash256(validKey(key), data).buffer);
};

export class NativeHighwayHash {
  static async loadModule(
    _options?: Partial<HighwayLoadOptions>
  ): Promise<HashCreator> {
    if (native === undefined) {
      native = require(`../${MODULE_NAME}-${getTriple()}.node`);
      InternalHasher = native.HighwayHasher;
    }

    return NativeModule;
  }

  static async load(
    key: Uint8Array | null | undefined,
    options?: Partial<HighwayLoadOptions>
  ): Promise<IHash> {
    const mod = await NativeHighwayHash.loadModule(options);
    return mod.create(key);
  }

  static resetModule() {
    native = undefined;
    InternalHasher = undefined;
  }
}
