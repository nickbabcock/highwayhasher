import type { HashCreator, IHash } from "./model";
import { platform, arch } from "os";
import { validKey } from "./common";

const getAbi = (platform: string): string => {
  switch (platform) {
    case "linux":
      return "-gnu";
    case "win32":
      return "-msvc";
    default:
      return "";
  }
};

const MODULE_NAME = "highwayhasher";
const PLATFORM = platform();
const ABI = getAbi(PLATFORM);
const {
  createHighwayClass,
  hash64: internalHash64,
  hash128: internalHash128,
  hash256: internalHash256,
} = require(`../${MODULE_NAME}.${PLATFORM}-${arch()}${ABI}.node`);
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
