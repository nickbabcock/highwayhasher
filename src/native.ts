import type { HashCreator, IHash } from "./model";
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
const {
  createHighwayClass,
  hash64: internalHash64,
  hash128: internalHash128,
  hash256: internalHash256,
} = require(`../${MODULE_NAME}-${getTriple()}.node`);
const InternalHasher = createHighwayClass();

class NativeHash implements IHash {
  private inner: typeof InternalHasher;
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
  ): Uint8Array => new Uint8Array(internalHash64(validKey(key), data).buffer);
  static hash128 = (
    key: Uint8Array | null | undefined,
    data: Uint8Array
  ): Uint8Array => new Uint8Array(internalHash128(validKey(key), data).buffer);
  static hash256 = (
    key: Uint8Array | null | undefined,
    data: Uint8Array
  ): Uint8Array => new Uint8Array(internalHash256(validKey(key), data).buffer);
};

export class NativeHighwayHash {
  static async loadModule(): Promise<HashCreator> {
    return NativeModule;
  }

  static async load(key: Uint8Array | null | undefined): Promise<IHash> {
    return new NativeHash(key);
  }
}
