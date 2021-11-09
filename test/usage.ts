// File for testing typescript usage
import { HighwayHash, WasmHighwayHash, IHash, HashCreator } from "..";

const keyData = Uint8Array.from([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
]);

(async function () {
  const hasher: IHash = await HighwayHash.load(keyData);
  hasher.append(Uint8Array.from([0]));
  const out: Uint8Array = hasher.finalize64();
  console.log(out);

  const mod: HashCreator = await HighwayHash.loadModule();
  const hasher2: IHash = mod.create(keyData);
  hasher2.append(Uint8Array.from([0]));
  const out2: Uint8Array = hasher2.finalize64();
  console.log(out2);

  const hasher3: IHash = await WasmHighwayHash.load(keyData);
  hasher3.append(Uint8Array.from([0]));
  const out3: Uint8Array = hasher3.finalize64();
  console.log(out3);
})();
