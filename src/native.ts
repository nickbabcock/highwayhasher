import type { HashCreator, IHash } from "./model";
import { platform, arch } from "os";

const getAbi = (platform: string): string => {
  switch (platform) {
    case "linux":
      return "-gnu";
    case "win32":
      return "-msvc";
    default:
      return ""
  }
}

const MODULE_NAME = "highwayhasher";
const PLATFORM = platform();
const ABI = getAbi(PLATFORM);
const { createHighwayClass } = require(`./${MODULE_NAME}.${PLATFORM}-${arch()}${ABI}.node`);
const InternalHasher = createHighwayClass();

class NativeHash implements IHash {
  private inner: typeof InternalHasher;
  constructor(key: Uint8Array | null | undefined) {
    if (key && key.length != 32) {
      throw new Error("expected the key buffer to be 32 bytes long");
    }
    this.inner = new InternalHasher(key || new Uint8Array());
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
};

export class NativeHighwayHash {
  static async loadModule(): Promise<HashCreator> {
    return NativeModule;
  }

  static async load(key: Uint8Array | null | undefined): Promise<IHash> {
    return new NativeHash(key);
  }
}
